import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { addStartup } from '@/lib/api/startups';
import { supabase } from '@/lib/supabase';
import { insertScraperRun } from '@/lib/api/scraperRuns';

// Vercel: hasta 5 minutos para el scraper
export const maxDuration = 300;

const MODEL = 'claude-sonnet-4-5';
const GITHUB_API = 'https://api.github.com/search/repositories';
const DAYS_BACK = 30;
const ALLOWED_LANGUAGES = new Set(['TypeScript', 'Python', 'Go', 'Rust', 'JavaScript']);
const HOT_LANGUAGES = new Set(['Rust', 'Go']);

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface GHRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  language: string | null;
  topics: string[];
  owner: {
    login: string;
    type: string;
  };
}

interface GHSearchResponse {
  total_count: number;
  items: GHRepo[];
}

interface ClaudeStartupCheck {
  is_startup: boolean;
  name: string;
  sector: string;
  stage: string;
  description: string;
  tags: string[];
  location: string;
  reasoning: string;
}

function getDateNDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function calcTractionScore(stars: number): number {
  if (stars >= 1000) return 90;
  if (stars >= 500)  return 80;
  return 70;
}

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

async function classifyWithClaude(repo: GHRepo): Promise<ClaudeStartupCheck | null> {
  const hasOwnDomain =
    !!repo.homepage &&
    !repo.homepage.includes('github.io') &&
    !repo.homepage.includes('github.com') &&
    repo.homepage.trim() !== '';

  const prompt = `Analiza este repositorio de GitHub y determina si pertenece a una startup comercial real.

NOMBRE: ${repo.name}
DESCRIPCIÓN: ${repo.description ?? 'Sin descripción'}
ORGANIZACIÓN: ${repo.owner.login} (type: ${repo.owner.type})
LENGUAJE PRINCIPAL: ${repo.language ?? 'N/A'}
TOPICS: ${repo.topics.join(', ') || 'ninguno'}
ESTRELLAS: ${repo.stargazers_count}
WEBSITE PROPIO: ${repo.homepage ?? 'ninguno'}
TIENE DOMINIO PROPIO (no github.io): ${hasOwnDomain ? 'SÍ' : 'NO'}

CRITERIOS para is_startup=true:
- Es una empresa o producto comercial (SaaS, dev tool con empresa detrás, plataforma, etc.)
- Proyectos open-source CON empresa detrás SÍ cuentan (como Supabase, Cal.com, PostHog, Vercel, PlanetScale)
- Tener dominio propio (no github.io) es señal fuerte de startup
- Alta tracción (muchas estrellas) + organización + descripción clara = probable startup

CRITERIOS para is_startup=false:
- Proyectos puramente open-source/community sin empresa (ej: colecciones awesome-*, tutoriales, librerías sin modelo de negocio)
- Frameworks de uso general sin empresa clara detrás
- Side projects personales de un developer
- Repos de aprendizaje o ejemplos

Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto extra):
{
  "is_startup": true/false,
  "name": "nombre comercial del producto o startup",
  "sector": "uno de: AI / ML, FinTech, HealthTech, CleanTech, EdTech, Cybersecurity, Logistics, AgriTech, SpaceTech, RetailTech, SaaS, DevTools, Other",
  "stage": "uno de: Pre-Seed, Seed, Series A, Series B, Series C+",
  "description": "descripción del producto en 1-2 frases en español",
  "tags": ["tag1", "tag2", "tag3"],
  "location": "ciudad o país si se puede inferir, si no 'Remote / Unknown'",
  "reasoning": "1 frase explicando la decisión"
}`;

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: 'Eres un analista de venture capital experto en startups tech. Clasifica repositorios de GitHub en JSON exacto sin texto adicional.',
      messages: [{ role: 'user', content: prompt }],
    });

    if (message.content[0].type !== 'text') return null;
    const raw = message.content[0].text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as ClaudeStartupCheck;
  } catch (e) {
    console.error('[github-scraper] Claude error:', e);
    return null;
  }
}

export async function POST() {
  const startTime  = Date.now();
  const startedAt  = new Date().toISOString();
  const errors: string[] = [];
  let startupsFound = 0;
  let newStartups   = 0;

  console.log('[github-scraper] START');

  const since = getDateNDaysAgo(DAYS_BACK);
  const url = `${GITHUB_API}?q=created:>${since}+stars:>100&sort=stars&order=desc&per_page=30`;

  let repos: GHRepo[];
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'startup-radar',
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    const data = (await res.json()) as GHSearchResponse;
    repos = data.items;
    console.log(`[github-scraper] Fetched ${repos.length} repos (total: ${data.total_count})`);
  } catch (e) {
    console.error('[github-scraper] Failed to fetch repos:', e);
    await insertScraperRun({ source: 'github', started_at: startedAt, finished_at: new Date().toISOString(), status: 'error', processed: 0, startups_found: 0, new_startups: 0, errors: [String(e)], elapsed_seconds: 0 });
    return NextResponse.json({ error: 'No se pudo conectar con la API de GitHub.' }, { status: 502 });
  }

  // Filtrar: solo repos con description, owner.type=Organization, lenguaje permitido
  const candidates = repos.filter(
    (r) =>
      r.description &&
      r.description.trim().length > 10 &&
      r.owner.type === 'Organization' &&
      r.language &&
      ALLOWED_LANGUAGES.has(r.language),
  );
  console.log(`[github-scraper] ${candidates.length} candidates after filter`);

  for (const repo of candidates) {
    try {
      console.log(`[github-scraper] Processing: "${repo.full_name}" (${repo.stargazers_count}★)`);

      const classification = await classifyWithClaude(repo);
      if (!classification) {
        errors.push(`Claude no pudo clasificar: ${repo.full_name}`);
        continue;
      }

      if (!classification.is_startup) {
        console.log(`[github-scraper] Not a startup: "${repo.full_name}" — ${classification.reasoning}`);
        continue;
      }

      startupsFound++;
      console.log(`[github-scraper] Startup found: "${classification.name}" (${classification.sector})`);

      // Deduplicación por nombre
      const { data: existing } = await supabase
        .from('startups')
        .select('id')
        .ilike('name', classification.name.trim())
        .maybeSingle();

      if (existing) {
        console.log(`[github-scraper] Duplicate skipped: "${classification.name}"`);
        continue;
      }

      const tractionScore = calcTractionScore(repo.stargazers_count);
      const marketScore   = HOT_LANGUAGES.has(repo.language ?? '') ? 85 : 75;
      const teamScore     = 78;
      const capitalScore  = 70;
      const growthRate    = 55;
      const radarScore    = calcRadarScore(growthRate, teamScore, marketScore, tractionScore, capitalScore);

      const website = repo.homepage && repo.homepage.trim() !== '' ? repo.homepage : undefined;

      await addStartup({
        name:           classification.name.trim(),
        sector:         classification.sector,
        stage:          classification.stage,
        description:    classification.description,
        tags:           classification.tags,
        location:       classification.location !== 'Remote / Unknown' ? classification.location : undefined,
        website,
        growth_rate:    growthRate,
        team_score:     teamScore,
        market_score:   marketScore,
        traction_score: tractionScore,
        capital_score:  capitalScore,
        radar_score:    radarScore,
        source:         'github',
        source_url:     repo.html_url,
        initialPhase:   'Discovery',
      });

      newStartups++;
      console.log(`[github-scraper] Saved: "${classification.name}" (score: ${radarScore})`);

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[github-scraper] Error processing "${repo.full_name}":`, msg);
      errors.push(`Error en "${repo.full_name}": ${msg}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[github-scraper] DONE — candidates: ${candidates.length}, found: ${startupsFound}, new: ${newStartups}, errors: ${errors.length}, time: ${elapsed}s`);

  await insertScraperRun({
    source:         'github',
    started_at:     startedAt,
    finished_at:    new Date().toISOString(),
    status:         errors.length > 0 && newStartups === 0 ? 'error' : 'success',
    processed:      candidates.length,
    startups_found: startupsFound,
    new_startups:   newStartups,
    errors,
    elapsed_seconds: Number(elapsed),
  });

  return NextResponse.json({
    processed:       candidates.length,
    startups_found:  startupsFound,
    new_startups:    newStartups,
    errors,
    elapsed_seconds: Number(elapsed),
  });
}
