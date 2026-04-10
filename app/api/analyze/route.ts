import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { Startup } from '@/types';

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

export async function POST(req: NextRequest) {
  try {
    const startup: Startup = await req.json();

    if (!startup?.name) {
      return NextResponse.json({ error: 'Datos de startup inválidos.' }, { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system:
        'Eres un analista experto de venture capital con 20 años de experiencia. Analizas startups de forma rigurosa, cuantitativa y directa. Respondes siempre en español.',
      messages: [{ role: 'user', content: buildPrompt(startup) }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';

    // Elimina posibles fences de markdown por si el modelo los incluye
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const analysis = JSON.parse(jsonText);

    return NextResponse.json(analysis);
  } catch (err) {
    console.error('[POST /api/analyze]', err);

    const msg = err instanceof Error ? err.message : '';
    const isAuth = msg.includes('401') || msg.toLowerCase().includes('authentication');

    return NextResponse.json(
      {
        error: isAuth
          ? 'Error de autenticación con la API de IA. Verifica la ANTHROPIC_API_KEY.'
          : 'No se pudo generar el análisis. Inténtalo de nuevo.',
      },
      { status: 500 }
    );
  }
}
