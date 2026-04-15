import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export type ScraperRun = Database['public']['Tables']['scraper_runs']['Row'];

/** Inserta un registro de ejecución del scraper. Fallo silencioso — no rompe el scraper. */
export async function insertScraperRun(data: {
  source: string;
  started_at: string;
  finished_at: string;
  status: 'success' | 'error';
  processed: number;
  startups_found: number;
  new_startups: number;
  errors: string[];
  elapsed_seconds: number;
}): Promise<void> {
  try {
    const { error } = await supabase.from('scraper_runs').insert({
      source:         data.source,
      started_at:     data.started_at,
      finished_at:    data.finished_at,
      status:         data.status,
      processed:      data.processed,
      startups_found: data.startups_found,
      new_startups:   data.new_startups,
      errors:         data.errors,
      elapsed_seconds: data.elapsed_seconds,
    });
    if (error) console.error('[scraper_runs] Insert error:', error.message);
  } catch (e) {
    console.error('[scraper_runs] Insert exception:', e);
  }
}

/** Devuelve el último run de cada fuente como un mapa source → ScraperRun */
export async function getLastRunPerSource(): Promise<Record<string, ScraperRun>> {
  try {
    const { data, error } = await supabase
      .from('scraper_runs')
      .select('*')
      .order('started_at', { ascending: false });

    if (error) throw error;

    const result: Record<string, ScraperRun> = {};
    for (const run of (data ?? []) as ScraperRun[]) {
      if (!result[run.source]) result[run.source] = run;
    }
    return result;
  } catch {
    return {};
  }
}

/** Cuenta las startups por fuente */
export async function getStartupCountsBySource(): Promise<Record<string, number>> {
  try {
    const sources = ['hackernews', 'producthunt', 'github'];
    const counts: Record<string, number> = {};

    await Promise.all(
      sources.map(async (src) => {
        const { count, error } = await supabase
          .from('startups')
          .select('*', { count: 'exact', head: true })
          .eq('source', src);
        counts[src] = error ? 0 : (count ?? 0);
      }),
    );

    return counts;
  } catch {
    return {};
  }
}
