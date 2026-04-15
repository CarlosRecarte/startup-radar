import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { addStartup } from '@/lib/api/startups';
import { supabase } from '@/lib/supabase';
import { insertScraperRun } from '@/lib/api/scraperRuns';

// Vercel: hasta 5 minutos para el scraper
export const maxDuration = 300;

const MODEL = 'claude-sonnet-4-5';
const HN_TOP_STORIES = 'https://hacker-news.firebaseio.com/v0/showstories.json';
const HN_ITEM        = (id: number) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
const FETCH_COUNT    = 30;
const DAYS_BACK      = 7;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Sectores "calientes" que merecen market_score más alto
const HOT_SECTORS = new Set(['AI / ML', 'Cybersecurity', 'HealthTech', 'CleanTech', 'FinTech']);

interface HNItem {
  id: number;
  title: string;
  url?: string;
  text?: string;
  score: number;
  time: number;
  by: string;
  descendants?: number;
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

/** Descarga un item de HN con timeout */
async function fetchHNItem(id: number): Promise<HNItem | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(HN_ITEM(id), { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json() as HNItem;
  } catch {
    return null;
  }
}

/** Pide a Claude que clasifique el post de HN */
async function classifyWithClaude(item: HNItem): Promise<ClaudeClassification | null> {
  const prompt = `Analiza este post de Hacker News y determina si describe una startup real.

TÍTULO: ${item.title}
URL: ${item.url ?? 'Sin URL'}
DESCRIPCIÓN: ${(item.text ?? '').slice(0, 800)}
VOTOS: ${item.score}

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto extra):
{
  "is_startup": true/false,
  "name": "nombre de la startup o producto",
  "sector": "uno de: AI / ML, FinTech, HealthTech, CleanTech, EdTech, Cybersecurity, Logistics, AgriTech, SpaceTech, RetailTech, SaaS, DevTools, Other",
  "stage": "uno de: Pre-Seed, Seed, Series A, Series B, Series C+",
  "description": "descripción en 1-2 frases en español",
  "tags": ["tag1", "tag2", "tag3"],
  "location": "ciudad o país si se menciona, si no 'Remote / Unknown'"
}

is_startup debe ser false si es: artículo, tool open-source sin empresa, pregunta, job post, o contenido no relacionado con startups.`;

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: 'Eres un analista de venture capital. Clasifica posts de HN en JSON exacto sin texto adicional.',
      messages: [{ role: 'user', content: prompt }],
    });

    if (message.content[0].type !== 'text') return null;

    const raw = message.content[0].text.trim();
    // Extrae JSON del texto por si acaso hay texto antes/después
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as ClaudeClassification;
    return parsed;
  } catch (e) {
    console.error('[hn-scraper] Claude classification error:', e);
    return null;
  }
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
    capitalScore  * 0.10
  );
}

/** Calcula traction score a partir de HN votes (0–500 → 50–95) */
function calcTractionScore(hnScore: number): number {
  return Math.min(95, 50 + Math.round((hnScore / 500) * 45));
}

export async function POST() {
  const startTime  = Date.now();
  const startedAt  = new Date().toISOString();
  const errors: string[] = [];
  let startupsFound = 0;
  let newStartups   = 0;

  console.log('[hn-scraper] START');

  // 1. Obtener los primeros IDs de Show HN
  let ids: number[];
  try {
    const res = await fetch(HN_TOP_STORIES);
    if (!res.ok) throw new Error(`HN API error: ${res.status}`);
    const allIds = (await res.json()) as number[];
    ids = allIds.slice(0, FETCH_COUNT);
    console.log(`[hn-scraper] Fetched ${ids.length} IDs`);
  } catch (e) {
    console.error('[hn-scraper] Failed to fetch story IDs:', e);
    await insertScraperRun({ source: 'hackernews', started_at: startedAt, finished_at: new Date().toISOString(), status: 'error', processed: 0, startups_found: 0, new_startups: 0, errors: [String(e)], elapsed_seconds: 0 });
    return NextResponse.json({ error: 'No se pudo conectar con la API de Hacker News.' }, { status: 502 });
  }

  // 2. Descargar todos los items en paralelo
  const items = (await Promise.all(ids.map(fetchHNItem))).filter((i): i is HNItem => i !== null);
  console.log(`[hn-scraper] Loaded ${items.length} items`);

  // 3. Filtrar: solo "Show HN:" con URL externa, en los últimos 7 días
  const cutoff = Date.now() / 1000 - DAYS_BACK * 86400;
  const candidates = items.filter(
    (item) =>
      item.title.startsWith('Show HN:') &&
      item.url &&
      item.time >= cutoff
  );
  console.log(`[hn-scraper] ${candidates.length} candidates after filter`);

  // 4. Procesar cada candidato secuencialmente para no saturar la API de Claude
  for (const item of candidates) {
    try {
      console.log(`[hn-scraper] Processing: "${item.title}"`);

      // Clasificar con Claude
      const classification = await classifyWithClaude(item);
      if (!classification) {
        errors.push(`Claude no pudo clasificar: ${item.title}`);
        continue;
      }

      if (!classification.is_startup) {
        console.log(`[hn-scraper] Not a startup: "${item.title}"`);
        continue;
      }

      startupsFound++;
      console.log(`[hn-scraper] Startup found: "${classification.name}" (${classification.sector})`);

      // Verificar duplicado en Supabase (ilike para evitar distinción de mayúsculas)
      const { data: existing } = await supabase
        .from('startups')
        .select('id')
        .ilike('name', classification.name.trim())
        .maybeSingle();

      if (existing) {
        console.log(`[hn-scraper] Duplicate skipped: "${classification.name}"`);
        continue;
      }

      // Calcular scores
      const tractionScore = calcTractionScore(item.score);
      const marketScore   = HOT_SECTORS.has(classification.sector) ? 85 : 70;
      const teamScore     = 70;
      const capitalScore  = 70;
      const growthRate    = 50;
      const radarScore    = calcRadarScore(growthRate, teamScore, marketScore, tractionScore, capitalScore);

      // Guardar en Supabase
      await addStartup({
        name:          classification.name.trim(),
        sector:        classification.sector,
        stage:         classification.stage,
        description:   classification.description,
        tags:          classification.tags,
        location:      classification.location !== 'Remote / Unknown' ? classification.location : undefined,
        website:       item.url,
        growth_rate:   growthRate,
        team_score:    teamScore,
        market_score:  marketScore,
        traction_score: tractionScore,
        capital_score: capitalScore,
        radar_score:   radarScore,
        source:        'hackernews',
        source_url:    `https://news.ycombinator.com/item?id=${item.id}`,
        initialPhase:  'Discovery',
      });

      newStartups++;
      console.log(`[hn-scraper] Saved: "${classification.name}" (score: ${radarScore})`);

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[hn-scraper] Error processing "${item.title}":`, msg);
      errors.push(`Error en "${item.title}": ${msg}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[hn-scraper] DONE — processed: ${candidates.length}, found: ${startupsFound}, new: ${newStartups}, errors: ${errors.length}, time: ${elapsed}s`);

  await insertScraperRun({
    source:         'hackernews',
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
