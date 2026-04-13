import { supabase } from '@/lib/supabase';

export interface SavedAnalysis {
  id: string;
  startup_id: string;
  analysis_text: string;
  model_used: string;
  created_at: string;
  updated_at: string;
}

/** Obtiene el análisis guardado de una startup, o null si no existe */
export async function getAnalysis(startupId: string): Promise<SavedAnalysis | null> {
  try {
    const { data, error } = await supabase
      .from('ai_analyses')
      .select('*')
      .eq('startup_id', startupId)
      .maybeSingle();

    if (error) throw error;
    return data as SavedAnalysis | null;
  } catch (e) {
    throw new Error(`Error al obtener análisis: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Guarda o sobreescribe el análisis de una startup (upsert por startup_id) */
export async function saveAnalysis(
  startupId: string,
  text: string,
  model: string,
): Promise<SavedAnalysis> {
  try {
    const { data, error } = await supabase
      .from('ai_analyses')
      .upsert(
        {
          startup_id:    startupId,
          analysis_text: text,
          model_used:    model,
          updated_at:    new Date().toISOString(),
        },
        { onConflict: 'startup_id' },
      )
      .select()
      .single();

    if (error) throw error;
    return data as SavedAnalysis;
  } catch (e) {
    throw new Error(`Error al guardar análisis: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Borra el análisis guardado de una startup */
export async function deleteAnalysis(startupId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_analyses')
      .delete()
      .eq('startup_id', startupId);

    if (error) throw error;
  } catch (e) {
    throw new Error(`Error al eliminar análisis: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Devuelve el conjunto de startup_id que tienen análisis guardado */
export async function getAnalysedStartupIds(): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('ai_analyses')
      .select('startup_id');

    if (error) throw error;
    return new Set((data ?? []).map((r: { startup_id: string }) => r.startup_id));
  } catch {
    return new Set(); // fallo silencioso — sin badges, no es crítico
  }
}
