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
  country: string;
  founded: number;
  employees: number;
  pipelineStage: PipelineStage;
  tags: string[];
  website?: string;
  growth?: string;
}
