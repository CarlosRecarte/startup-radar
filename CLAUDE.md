@AGENTS.md

# Startup Radar — Instrucciones para Claude Code

## Qué es este proyecto
Startup Radar es una plataforma de inteligencia para inversores y fondos de venture capital. Permite descubrir, analizar y hacer seguimiento de startups en fases tempranas con alto potencial de crecimiento.

## Stack tecnológico
- **Frontend:** Next.js 16.2.3 (App Router) con TypeScript y Tailwind CSS v4
- **React:** 19.2.4
- **Drag & Drop:** @dnd-kit/core + @dnd-kit/sortable (usado en KanbanBoard)
- **Base de datos:** Supabase (PostgreSQL) — pendiente de integrar; credenciales en .env.local
- **Hosting:** Vercel (deploy automático desde GitHub)
- **IA:** API de Claude (Anthropic) para análisis de startups — pendiente de integrar

## Estructura de carpetas
```
startup-radar/
├── app/                        # App Router de Next.js
│   ├── layout.tsx              # Layout raíz: Sidebar + main
│   ├── page.tsx                # Dashboard principal (ruta /)
│   ├── globals.css             # Estilos globales (Tailwind)
│   ├── discover/
│   │   └── page.tsx            # Vista de descubrimiento de startups
│   └── pipeline/
│       └── page.tsx            # Vista de pipeline (Kanban)
├── components/                 # Componentes React reutilizables
│   ├── Sidebar.tsx             # Navegación lateral (Dashboard, Discover, Pipeline)
│   ├── StartupCard.tsx         # Tarjeta de startup con Radar Score
│   ├── RadarScoreRing.tsx      # Anillo SVG animado del Radar Score
│   └── KanbanBoard.tsx         # Tablero Kanban del pipeline (dnd-kit)
├── data/
│   └── startups.ts             # Datos de ejemplo estáticos (10 startups realistas)
├── types/
│   └── index.ts                # Tipos TypeScript: Startup, PipelineStage, StartupStage
├── public/                     # Assets estáticos (SVGs)
├── .env.local                  # Credenciales (NUNCA en el código)
├── next.config.ts
├── tsconfig.json
└── package.json
```

## Tipos principales (`types/index.ts`)
- `Startup` — entidad principal con: id, name, sector, stage, radarScore, revenue, description, country, founded, employees, pipelineStage, tags, website?, growth?
- `PipelineStage` — union type de las 7 fases del pipeline
- `StartupStage` — Pre-Seed | Seed | Series A | Series B | Series C+

## Convenciones de código
- TypeScript estricto, nunca JavaScript puro
- Componentes React funcionales con hooks
- Tailwind CSS v4 para estilos, nunca CSS inline ni archivos .css separados (excepto globals.css)
- Nombres de variables y funciones en inglés
- Comentarios en español cuando sean útiles
- Directiva `'use client'` solo cuando sea necesario (interactividad, hooks de cliente)

## Tema visual
- Fondo principal: `bg-zinc-950` (#09090b)
- Texto: `text-white` / `text-zinc-400`
- Acento primario: violeta/índigo (`violet-600`, `indigo-600`)
- Acento secundario: `violet-400` para estados activos
- Bordes: `border-zinc-800`
- **Nunca fondo blanco. Tema oscuro siempre.**

## Radar Score
Índice de 0 a 100 que mide el potencial de una startup. Componentes:
- Velocidad de Crecimiento (30%)
- Calidad del Equipo (25%)
- Timing de Mercado (20%)
- Tracción y Validación (15%)
- Eficiencia de Capital (10%)

## Pipeline de Inversión
7 fases en orden: `Discovery` → `Screening` → `Deep Dive` → `Outreach` → `Due Diligence` → `Comité IC` → `Portfolio`

Definidas en `data/startups.ts` como `PIPELINE_STAGES`.

## Variables de entorno (.env.local)

### Supabase (base de datos)
- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase (expuesta al navegador)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clave anon pública de Supabase (expuesta al navegador)
- Cliente disponible en `/lib/supabase.ts`

### Anthropic (IA)
- `ANTHROPIC_API_KEY` — clave de la API de Claude. **Solo servidor** — NO usar prefijo `NEXT_PUBLIC_`, nunca exponer al navegador
- Usar exclusivamente en Route Handlers (`app/api/`) o Server Actions
- Ejemplo de uso: `const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`

## Reglas importantes
- NUNCA poner credenciales en el código, siempre `.env.local`
- NUNCA borrar datos de la base de datos sin confirmación explícita
- Hacer git commit después de completar cada función
- Tema oscuro siempre, nunca fondo blanco
- Los datos de ejemplo deben ser startups realistas del ecosistema tech actual

## Comandos útiles
```bash
npm run dev    # Servidor de desarrollo
npm run build  # Build de producción
npm run lint   # Linting con ESLint
```
