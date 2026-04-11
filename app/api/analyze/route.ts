import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { Startup } from '@/types';

// Vercel: permite hasta 60 s a esta función serverless
export const maxDuration = 60;

const MODEL = 'claude-sonnet-4-5';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildPrompt(s: Startup): string {
  const funding =
    s.funding != null
      ? s.funding >= 1_000_000
        ? `$${(s.funding / 1_000_000).toFixed(1)}M`
        : `$${(s.funding / 1_000).toFixed(0)}K`
      : 'No disponible';

  return `Analiza esta startup para un fondo de venture capital.

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

Proporciona el análisis estructurado con estas secciones exactas:

**EVALUACIÓN GENERAL**
[3-4 líneas de evaluación concisa]

**FORTALEZAS CLAVE**
- [fortaleza 1 con datos concretos del caso]
- [fortaleza 2 con datos concretos del caso]
- [fortaleza 3 con datos concretos del caso]

**RIESGOS IDENTIFICADOS**
- [ALTO] [descripción del riesgo]
- [MEDIO] [descripción del riesgo]
- [BAJO] [descripción del riesgo]

**ACCIONES RECOMENDADAS**
1. [acción específica y accionable]
2. [acción específica y accionable]
3. [acción específica y accionable]
4. [acción específica y accionable]

**VEREDICTO**
INVERTIR / OBSERVAR / DESCARTAR
[1-2 líneas de justificación]`;
}

/** Convierte un error del SDK en un mensaje legible */
function toUserMessage(err: unknown): string {
  const e = err as { status?: number; message?: string; error?: { type?: string } };
  const status  = e.status;
  const message = e.message ?? String(err);

  if (status === 401) return `API key inválida (401). Verifica ANTHROPIC_API_KEY en Vercel.`;
  if (status === 403) return `Acceso denegado (403). Verifica los permisos de la API key.`;
  if (status === 404) return `Modelo no encontrado (404): ${MODEL}. Verifica el nombre del modelo.`;
  if (status === 429) return `Rate limit alcanzado (429). Espera unos segundos e inténtalo.`;
  if (status === 529) return `API de Anthropic sobrecargada (529). Inténtalo en unos minutos.`;
  if (status != null) return `Error de la API (${status}): ${message}`;

  if (message.toLowerCase().includes('timeout') || message.includes('ETIMEDOUT'))
    return `Timeout: la IA tardó demasiado. Inténtalo de nuevo.`;
  if (message.toLowerCase().includes('fetch failed') || message.toLowerCase().includes('econnrefused'))
    return `No se pudo conectar a la API de IA. Comprueba la conectividad.`;

  return `Error inesperado: ${message}`;
}

export async function POST(req: NextRequest) {
  try {
    const startup: Startup = await req.json();

    if (!startup?.name) {
      return NextResponse.json({ error: 'Datos de startup inválidos.' }, { status: 400 });
    }

    console.log(`[analyze] START — startup: "${startup.name}", model: ${MODEL}`);

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        'Eres un analista experto de venture capital con 20 años de experiencia. ' +
        'Analizas startups de forma rigurosa, cuantitativa y directa. ' +
        'Respondes siempre en español con el formato exacto que se te indica.',
      messages: [{ role: 'user', content: buildPrompt(startup) }],
    });

    // Log completo de la respuesta de Anthropic para depuración
    console.log('[analyze] RESPONSE — stop_reason:', message.stop_reason);
    console.log('[analyze] RESPONSE — usage:', JSON.stringify(message.usage));
    console.log('[analyze] RESPONSE — content blocks:', message.content.length);
    console.log('[analyze] RESPONSE — raw text:', JSON.stringify(message.content[0]));

    if (message.content[0].type !== 'text') {
      console.error('[analyze] Unexpected content type:', message.content[0].type);
      return NextResponse.json(
        { error: `Tipo de respuesta inesperado de la IA: ${message.content[0].type}` },
        { status: 500 }
      );
    }

    const text = message.content[0].text;

    if (!text?.trim()) {
      console.error('[analyze] Empty text response');
      return NextResponse.json(
        { error: 'La IA devolvió una respuesta vacía. Inténtalo de nuevo.' },
        { status: 500 }
      );
    }

    // Devuelve el texto plano — sin parseo JSON, sin transformación
    return NextResponse.json({ text });

  } catch (err) {
    const e = err as { status?: number; message?: string; error?: { type?: string }; stack?: string };

    console.error('[analyze] ERROR:', {
      status:    e.status,
      errorType: e.error?.type,
      message:   e.message,
      stack:     e.stack,
    });

    return NextResponse.json(
      { error: toUserMessage(err) },
      { status: e.status ?? 500 }
    );
  }
}
