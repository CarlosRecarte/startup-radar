import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { addStartup } from '@/lib/api/startups';
import { supabase } from '@/lib/supabase';
import { insertScraperRun } from '@/lib/api/scraperRuns';

// Vercel: hasta 5 minutos para el scraper
export const maxDuration = 300;

const MODEL = 'claude-sonnet-4-5';
const PH_API = 'https://api.producthunt.com/v2/api/graphql';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Sectores "calientes" que merecen market_score más alto
const HOT_SECTORS = new Set(['AI / ML', 'Cybersecurity', 'HealthTech', 'CleanTech', 'FinTech']);

const POSTS_QUERY = `
  query {
    posts(first: 30, order: VOTES) {
      edges {
        node {
          id
          name
          tagline
          description
          url
          votesCount
          commentsCount
          createdAt
          topics {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    }
  }
`;

interface PHPost {
  id: string;
  name: string;
  tagline: string;
  description: string | null;
  url: string;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  topics: { edges: Array<{ node: { name: string } }> };
}

interface PHResponse {
  data: {
    posts: { edges: Array<{ node: PHPost }> };
  };
  errors?: Array<{ message: string }>;
}

interface ClaudeClassification {
  is_startup: boolean;
  name: string;
  sector: string;
  stage: string;
  description: string;
  tags: string[];
  location: string;
}

/** Calcula traction_score a partir de votos en Product Hunt */
function calcTractionScore(votes: number): number {
  if (votes >= 500) return 90;
  if (votes >= 200) return 80;
  if (votes >= 100) return 70;
  return 60;
}

/** Calcula el radar score ponderado */
function calcRadarScore(
  growthRate: number,
  teamScore: number,
  marketScore: number,
  tractionScore: number,
  capitalScore: number,
): number {
  return Math.round(
    growthRate    * 0.30 +
    teamScore     * 0.25 +
    marketScore   * 0.20 +
    tractionScore * 0.15 +
    capitalScore  * 0.10,
  );
}

/** Pide a Claude que clasifique el producto de PH */
async function classifyWithClaude(post: PHPost): Promise<ClaudeClassification | null> {
  const topics = post.topics.edges.map((e) => e.node.name).join(', ');

  const prompt = `Analiza este producto de Product Hunt y determina si es una startup comercial real.

NOMBRE: ${post.name}
TAGLINE: ${post.tagline}
DESCRIPCIÓN: ${(post.description ?? '').slice(0, 800)}
URL: ${post.url}
VOTOS: ${post.votesCount}
TOPICS: ${topics || 'ninguno'}

IMPORTANTE: Product Hunt incluye muchos plugins, extensiones, herramientas gratuitas y side projects que NO son startups. Sé estricto:
- is_startup=true SOLO si: tiene empresa detrás con modelo de negocio claro, es B2B SaaS, plataforma comercial, o producto con planes de pago
- is_startup=false si: es un plugin, extensión de browser, template gratuito, side project personal, app de productividad simple sin modelo de negocio, bot, herramienta open-source sin empresa

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto extra):
{
  "is_startup": true/false,
  "name": "nombre de la startup o producto",
  "sector": "uno de: AI / ML, FinTech, HealthTech, CleanTech, EdTech, Cybersecurity, Logistics, AgriTech, SpaceTech, RetailTech, SaaS, DevTools, Other",
  "stage": "uno de: Pre-Seed, Seed, Series A, Series B, Series C+",
  "description": "descripción en 1-2 frases en español",
  "tags": ["tag1", "tag2", "tag3"],
  "location": "ciudad o país si se menciona, si no 'Remote / Unknown'"
}`;

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: 'Eres un analista de venture capital. Clasifica productos de Product Hunt en JSON exacto sin texto adicional.',
      messages: [{ role: 'user', content: prompt }],
    });

    if (message.content[0].type !== 'text') return null;
    const raw = message.content[0].text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as ClaudeClassification;
  } catch (e) {
    console.error('[ph-scraper] Claude error:', e);
    return null;
  }
}

export async function POST() {
  const startTime  = Date.now();
  const startedAt  = new Date().toISOString();
  const errors: string[] = [];
  let startupsFound = 0;
  let newStartups   = 0;

  console.log('[ph-scraper] START');

  // 1. Obtener posts de Product Hunt via GraphQL
  let posts: PHPost[];
  try {
    const res = await fetch(PH_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PRODUCTHUNT_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query: POSTS_QUERY }),
    });

    if (!res.ok) throw new Error(`Product Hunt API error: ${res.status} ${res.statusText}`);

    const data = (await res.json()) as PHResponse;

    if (data.errors?.length) throw new Error(data.errors[0].message);

    posts = data.data.posts.edges.map((e) => e.node);
    console.log(`[ph-scraper] Fetched ${posts.length} posts`);
  } catch (e) {
    console.error('[ph-scraper] Failed to fetch posts:', e);
    await insertScraperRun({ source: 'producthunt', started_at: startedAt, finished_at: new Date().toISOString(), status: 'error', processed: 0, startups_found: 0, new_startups: 0, errors: [String(e)], elapsed_seconds: 0 });
    return NextResponse.json({ error: 'No se pudo conectar con la API de Product Hunt.' }, { status: 502 });
  }

  // 2. Procesar cada post secuencialmente para no saturar la API de Claude
  for (const post of posts) {
    try {
      console.log(`[ph-scraper] Processing: "${post.name}" (${post.votesCount} votes)`);

      const classification = await classifyWithClaude(post);
      if (!classification) {
        errors.push(`Claude no pudo clasificar: ${post.name}`);
        continue;
      }

      if (!classification.is_startup) {
        console.log(`[ph-scraper] Not a startup: "${post.name}"`);
        continue;
      }

      startupsFound++;
      console.log(`[ph-scraper] Startup found: "${classification.name}" (${classification.sector})`);

      // Verificar duplicado en Supabase
      const { data: existing } = await supabase
        .from('startups')
        .select('id')
        .ilike('name', classification.name.trim())
        .maybeSingle();

      if (existing) {
        console.log(`[ph-scraper] Duplicate skipped: "${classification.name}"`);
        continue;
      }

      // Calcular scores
      const tractionScore = calcTractionScore(post.votesCount);
      const marketScore   = HOT_SECTORS.has(classification.sector) ? 85 : 70;
      const teamScore     = 72;
      const capitalScore  = 70;
      const growthRate    = 50;
      const radarScore    = calcRadarScore(growthRate, teamScore, marketScore, tractionScore, capitalScore);

      await addStartup({
        name:           classification.name.trim(),
        sector:         classification.sector,
        stage:          classification.stage,
        description:    classification.description,
        tags:           classification.tags,
        location:       classification.location !== 'Remote / Unknown' ? classification.location : undefined,
        website:        post.url,
        growth_rate:    growthRate,
        team_score:     teamScore,
        market_score:   marketScore,
        traction_score: tractionScore,
        capital_score:  capitalScore,
        radar_score:    radarScore,
        source:         'producthunt',
        source_url:     post.url,
        initialPhase:   'Discovery',
      });

      newStartups++;
      console.log(`[ph-scraper] Saved: "${classification.name}" (score: ${radarScore})`);

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[ph-scraper] Error processing "${post.name}":`, msg);
      errors.push(`Error en "${post.name}": ${msg}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[ph-scraper] DONE — processed: ${posts.length}, found: ${startupsFound}, new: ${newStartups}, errors: ${errors.length}, time: ${elapsed}s`);

  await insertScraperRun({
    source:         'producthunt',
    started_at:     startedAt,
    finished_at:    new Date().toISOString(),
    status:         errors.length > 0 && newStartups === 0 ? 'error' : 'success',
    processed:      posts.length,
    startups_found: startupsFound,
    new_startups:   newStartups,
    errors,
    elapsed_seconds: Number(elapsed),
  });

  return NextResponse.json({
    processed:       posts.length,
    startups_found:  startupsFound,
    new_startups:    newStartups,
    errors,
    elapsed_seconds: Number(elapsed),
  });
}
