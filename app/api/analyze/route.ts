import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { Startup } from '@/types';

// Vercel: permite hasta 60 s a esta función serverless (plan Pro/hobby soporta hasta 60 s)
export const maxDuration = 60;

// claude-sonnet-4-6 es el modelo Sonnet más reciente disponible (abril 2026)
const MODEL = 'claude-sonnet-4-6';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildPrompt(s: Startup): string {
  const funding =
    s.funding != null
      ? s.funding >= 1_000_000
        ? `$${(s.funding / 1_000_000).toFixed(1)}M`
        : `$${(s.funding / 1_000).toFixed(0)}K`
      : 'No disponible';

  return `Analiza esta startup para un fondo de venture capital:

DATOS DE LA STARTUP:
- Nombre: ${s.name}
- Sector: ${s.sector}
- Etapa de inversión: ${s.stage}
- Fase en pipeline: ${s.pipelineStage}
- Ubicación: ${s.location ?? s.country ?? 'No especificada'}
- Revenue anual: ${s.revenue}
- Crecimiento YoY: ${s.growth ?? 'No disponible'}
- Funding total: ${funding}
- Radar Score: ${s.radarScore}/100
  - Growth Score: ${s.growthRate ?? 'N/A'}
  - Team Score: ${s.teamScore ?? 'N/A'}
  - Market Score: ${s.marketScore ?? 'N/A'}
  - Traction Score: ${s.tractionScore ?? 'N/A'}
  - Capital Score: ${s.capitalScore ?? 'N/A'}
- Descripción: ${s.description}
- Tags / Tecnologías: ${s.tags.join(', ') || 'N/A'}
- Founders: ${s.founders ?? 'No especificado'}
- Website: ${s.website ?? 'No disponible'}

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto adicional fuera del JSON) con este esquema exacto:
{
  "evaluacion": "evaluación general en 3-4 líneas",
  "fortalezas": [
    "fortaleza 1 con datos concretos del caso",
    "fortaleza 2 con datos concretos del caso",
    "fortaleza 3 con datos concretos del caso"
  ],
  "riesgos": [
    { "descripcion": "descripción del riesgo identificado", "nivel": "Alto" },
    { "descripcion": "descripción del riesgo identificado", "nivel": "Medio" },
    { "descripcion": "descripción del riesgo identificado", "nivel": "Bajo" }
  ],
  "acciones": [
    "acción recomendada 1 específica y accionable",
    "acción recomendada 2 específica y accionable",
    "acción recomendada 3 específica y accionable",
    "acción recomendada 4 específica y accionable"
  ],
  "veredicto": "INVERTIR",
  "justificacion_veredicto": "una o dos líneas que justifican el veredicto"
}

El campo "veredicto" debe ser exactamente uno de: "INVERTIR", "OBSERVAR" o "DESCARTAR".`;
}

/** Convierte un error del SDK de Anthropic en un mensaje legible para el usuario */
function toUserMessage(err: unknown): string {
  const e = err as { status?: number; message?: string; error?: { type?: string } };
  const status  = e.status;
  const message = e.message ?? String(err);

  if (status === 401) return `API key inválida o no autorizada (401). Verifica ANTHROPIC_API_KEY en Vercel.`;
  if (status === 403) return `Acceso denegado a la API de IA (403). Verifica permisos de la API key.`;
  if (status === 429) return `Rate limit alcanzado (429). Espera unos segundos e inténtalo de nuevo.`;
  if (status === 529) return `API de Anthropic sobrecargada (529). Inténtalo en unos minutos.`;
  if (status === 500) return `Error interno de la API de Anthropic (500). Inténtalo de nuevo.`;
  if (status != null) return `Error de la API de IA (${status}): ${message}`;

  if (message.toLowerCase().includes('timeout') || message.includes('ETIMEDOUT'))
    return `Timeout: la IA tardó demasiado en responder. Inténtalo de nuevo.`;
  if (message.toLowerCase().includes('econnrefused') || message.toLowerCase().includes('fetch failed'))
    return `No se pudo conectar a la API de IA. Comprueba la conectividad.`;

  return `Error inesperado: ${message}`;
}

export async function POST(req: NextRequest) {
  try {
    const startup: Startup = await req.json();

    if (!startup?.name) {
      return NextResponse.json({ error: 'Datos de startup inválidos.' }, { status: 400 });
    }

    console.log(`[analyze] Iniciando análisis de "${startup.name}" con modelo ${MODEL}`);

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system:
        'Eres un analista experto de venture capital con 20 años de experiencia. Analizas startups de forma rigurosa, cuantitativa y directa. Respondes siempre en español.',
      messages: [{ role: 'user', content: buildPrompt(startup) }],
    });

    console.log(`[analyze] Respuesta recibida — stop_reason: ${message.stop_reason}, tokens: ${message.usage?.output_tokens}`);

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';

    // Elimina fences de markdown por si el modelo los incluye
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let analysis: unknown;
    try {
      analysis = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error('[analyze] JSON parse fallido. Raw de la IA:', raw);
      console.error('[analyze] Parse error:', parseErr);
      return NextResponse.json(
        { error: 'La IA devolvió una respuesta que no se pudo procesar. Inténtalo de nuevo.' },
        { status: 500 }
      );
    }

    return NextResponse.json(analysis);

  } catch (err) {
    const e = err as { status?: number; message?: string; error?: { type?: string }; stack?: string };

    console.error('[analyze] Error llamando a Anthropic:', {
      status:    e.status,
      errorType: e.error?.type,
      message:   e.message,
      stack:     e.stack,
    });

    const userMessage = toUserMessage(err);
    return NextResponse.json({ error: userMessage }, { status: e.status ?? 500 });
  }
}
