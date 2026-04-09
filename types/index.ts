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
  country?: string;    // derivado de location en BD
  founded?: number;    // no disponible en BD actual
  employees?: number;  // no disponible en BD actual
  pipelineStage: PipelineStage;
  tags: string[];
  website?: string;
  growth?: string;
  notes?: string;
}
