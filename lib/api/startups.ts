import { supabase } from '@/lib/supabase';
import type { Startup, PipelineStage, StartupStage } from '@/types';
import type { Database } from '@/lib/database.types';

type DbPhase = Database['public']['Tables']['pipeline_status']['Row']['phase'];
type StartupRow = Database['public']['Tables']['startups']['Row'];

// Mapeo entre fases del pipeline en la app y en la BD
const DB_TO_PIPELINE: Record<DbPhase, PipelineStage> = {
  discovery: 'Discovery',
  screening: 'Screening',
  deepdive: 'Deep Dive',
  outreach: 'Outreach',
  duediligence: 'Due Diligence',
  ic: 'Comité IC',
  portfolio: 'Portfolio',
};

const PIPELINE_TO_DB: Record<PipelineStage, DbPhase> = {
  Discovery: 'discovery',
  Screening: 'screening',
  'Deep Dive': 'deepdive',
  Outreach: 'outreach',
  'Due Diligence': 'duediligence',
  'Comité IC': 'ic',
  Portfolio: 'portfolio',
};

type PipelineStatusEntry = {
  phase: string;
  notes: string | null;
  entered_at: string;
};

// Convierte una fila de Supabase + su pipeline al tipo Startup de la app
function mapRowToStartup(
  row: StartupRow & { pipeline_status: PipelineStatusEntry[] }
): Startup {
  // Extrae el país de la ubicación (ej. "San Francisco, USA" → "USA")
  const location = row.location ?? '';
  const country = location.includes(',')
    ? location.split(',').pop()!.trim()
    : location || undefined;

  // Toma la entrada de pipeline más reciente
  const phases = [...(row.pipeline_status ?? [])].sort(
    (a, b) => new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime()
  );
  const latestPhase = phases[0];
  const pipelineStage: PipelineStage = latestPhase
    ? (DB_TO_PIPELINE[latestPhase.phase as DbPhase] ?? 'Discovery')
    : 'Discovery';

  return {
    id: row.id,
    name: row.name,
    sector: row.sector,
    stage: row.stage as StartupStage,
    radarScore: row.radar_score ?? 0,
    revenue: row.revenue ?? '—',
    description: row.description ?? '',
    country,
    pipelineStage,
    tags: row.tags ?? [],
    website: row.website ?? undefined,
    growth: row.growth_rate != null ? `+${row.growth_rate}% YoY` : undefined,
    notes: latestPhase?.notes ?? undefined,
  };
}

// ─── Funciones de consulta ────────────────────────────────────────────────────

/** Obtiene todas las startups con su fase de pipeline actual */
export async function getStartups(): Promise<Startup[]> {
  const { data, error } = await supabase
    .from('startups')
    .select('*, pipeline_status(phase, notes, entered_at)')
    .order('radar_score', { ascending: false });

  if (error) throw new Error(`Error al cargar startups: ${error.message}`);

  return (data ?? []).map((row) =>
    mapRowToStartup(row as StartupRow & { pipeline_status: PipelineStatusEntry[] })
  );
}

/** Obtiene una startup por su ID */
export async function getStartupById(id: string): Promise<Startup | null> {
  const { data, error } = await supabase
    .from('startups')
    .select('*, pipeline_status(phase, notes, entered_at)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Error al cargar startup ${id}: ${error.message}`);
  if (!data) return null;

  return mapRowToStartup(data as StartupRow & { pipeline_status: PipelineStatusEntry[] });
}

/** Obtiene startups filtradas por fase del pipeline */
export async function getStartupsByPhase(phase: PipelineStage): Promise<Startup[]> {
  const all = await getStartups();
  return all.filter((s) => s.pipelineStage === phase);
}

// ─── Funciones de escritura ───────────────────────────────────────────────────

/** Mueve una startup a otra fase en pipeline_status */
export async function updateStartupPhase(
  startupId: string,
  newPhase: PipelineStage,
  notes?: string
): Promise<void> {
  const { error } = await supabase.from('pipeline_status').insert({
    startup_id: startupId,
    phase: PIPELINE_TO_DB[newPhase],
    notes: notes ?? null,
  });

  if (error) throw new Error(`Error al actualizar fase: ${error.message}`);
}

/** Añade una nueva startup y la coloca en Discovery por defecto */
export async function addStartup(data: {
  name: string;
  sector: string;
  stage: string;
  tags?: string[];
  location?: string;
  description?: string;
  funding?: number;
  revenue?: string;
  growth_rate?: number;
  team_score?: number;
  market_score?: number;
  traction_score?: number;
  capital_score?: number;
  radar_score?: number;
  founders?: string;
  website?: string;
  initialPhase?: PipelineStage;
}): Promise<Startup> {
  const { initialPhase = 'Discovery', ...startupData } = data;

  // Supabase requiere null (no undefined) para campos nullable
  const insertRow: Database['public']['Tables']['startups']['Insert'] = {
    name: startupData.name,
    sector: startupData.sector,
    stage: startupData.stage,
    tags: startupData.tags ?? [],
    location: startupData.location ?? null,
    description: startupData.description ?? null,
    funding: startupData.funding ?? null,
    revenue: startupData.revenue ?? null,
    growth_rate: startupData.growth_rate ?? null,
    team_score: startupData.team_score ?? null,
    market_score: startupData.market_score ?? null,
    traction_score: startupData.traction_score ?? null,
    capital_score: startupData.capital_score ?? null,
    radar_score: startupData.radar_score ?? null,
    founders: startupData.founders ?? null,
    website: startupData.website ?? null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('startups')
    .insert(insertRow)
    .select('id')
    .single();

  if (insertError) throw new Error(`Error al añadir startup: ${insertError.message}`);

  const { error: phaseError } = await supabase.from('pipeline_status').insert({
    startup_id: inserted.id,
    phase: PIPELINE_TO_DB[initialPhase],
  });

  if (phaseError) throw new Error(`Error al crear fase inicial: ${phaseError.message}`);

  const startup = await getStartupById(inserted.id);
  if (!startup) throw new Error('No se pudo recuperar la startup recién creada');
  return startup;
}

/** Actualiza las notas de una startup en su entrada de pipeline más reciente */
export async function updateStartupNotes(
  startupId: string,
  notes: string
): Promise<void> {
  // Busca la entrada de pipeline más reciente para esta startup
  const { data: entries, error: fetchError } = await supabase
    .from('pipeline_status')
    .select('id')
    .eq('startup_id', startupId)
    .order('entered_at', { ascending: false })
    .limit(1);

  if (fetchError) throw new Error(`Error al buscar pipeline: ${fetchError.message}`);
  if (!entries || entries.length === 0)
    throw new Error(`No hay entrada de pipeline para la startup ${startupId}`);

  const { error: updateError } = await supabase
    .from('pipeline_status')
    .update({ notes })
    .eq('id', entries[0].id);

  if (updateError) throw new Error(`Error al actualizar notas: ${updateError.message}`);
}
