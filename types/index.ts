export type PipelineStage =
  | 'Discovery'
  | 'Screening'
  | 'Deep Dive'
  | 'Outreach'
  | 'Due Diligence'
  | 'Comité IC'
  | 'Portfolio';

export type StartupStage =
  | 'Pre-Seed'
  | 'Seed'
  | 'Series A'
  | 'Series B'
  | 'Series C+';

export interface Startup {
  id: string;
  name: string;
  sector: string;
  stage: StartupStage;
  radarScore: number;
  revenue: string;
  description: string;
  country?: string;      // derivado de location en BD
  location?: string;     // ubicación completa "Ciudad, País"
  founded?: number;      // no disponible en BD actual
  employees?: number;    // no disponible en BD actual
  pipelineStage: PipelineStage;
  tags: string[];
  website?: string;
  growth?: string;       // formateado, ej: "+150% YoY"
  notes?: string;
  // Dimensiones del Radar Score
  teamScore?: number;
  marketScore?: number;
  tractionScore?: number;
  capitalScore?: number;
  growthRate?: number;   // numérico, ej: 150 para 150%
  funding?: number;      // en dólares
  founders?: string;
  createdAt?: string;
  source?: string;      // 'manual' | 'hackernews' | 'producthunt' | 'github' | etc.
  sourceUrl?: string;   // enlace original (ej: post de HN)
}
