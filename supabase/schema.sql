-- ============================================================
-- Startup Radar — Schema
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLA: startups
-- ============================================================
create table if not exists public.startups (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  sector          text not null check (sector in (
                    'AI/ML', 'FinTech', 'HealthTech', 'CleanTech',
                    'SaaS', 'Web3', 'BioTech', 'EdTech',
                    'Logistics', 'Cybersecurity', 'AgriTech',
                    'SpaceTech', 'RetailTech'
                  )),
  stage           text not null check (stage in (
                    'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+'
                  )),
  location        text,
  description     text,
  funding         numeric(10, 2),           -- en millones USD
  revenue         text,                     -- ej: "2.4M ARR"
  growth_rate     integer,                  -- porcentaje YoY
  team_score      integer check (team_score between 0 and 100),
  market_score    integer check (market_score between 0 and 100),
  traction_score  integer check (traction_score between 0 and 100),
  capital_score   integer check (capital_score between 0 and 100),
  radar_score     integer check (radar_score between 0 and 100),
  founders        text,
  website         text,
  tags            text[] default '{}',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- TABLA: pipeline_status
-- ============================================================
create table if not exists public.pipeline_status (
  id          uuid primary key default gen_random_uuid(),
  startup_id  uuid not null references public.startups (id) on delete cascade,
  phase       text not null check (phase in (
                'discovery', 'screening', 'deepdive', 'outreach',
                'duediligence', 'ic', 'portfolio'
              )),
  notes       text,
  entered_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Índice para búsquedas por startup
create index if not exists idx_pipeline_startup_id on public.pipeline_status (startup_id);

-- ============================================================
-- TABLA: scores_history
-- ============================================================
create table if not exists public.scores_history (
  id              uuid primary key default gen_random_uuid(),
  startup_id      uuid not null references public.startups (id) on delete cascade,
  radar_score     integer check (radar_score between 0 and 100),
  growth_score    integer check (growth_score between 0 and 100),
  team_score      integer check (team_score between 0 and 100),
  market_score    integer check (market_score between 0 and 100),
  traction_score  integer check (traction_score between 0 and 100),
  capital_score   integer check (capital_score between 0 and 100),
  calculated_at   timestamptz default now()
);

create index if not exists idx_scores_startup_id on public.scores_history (startup_id);

-- ============================================================
-- TRIGGER: actualiza updated_at automáticamente
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_startups_updated_at
  before update on public.startups
  for each row execute function public.set_updated_at();

create or replace trigger trg_pipeline_updated_at
  before update on public.pipeline_status
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS (Row Level Security) — habilitar pero permitir todo
-- por ahora hasta implementar autenticación
-- ============================================================
alter table public.startups       enable row level security;
alter table public.pipeline_status enable row level security;
alter table public.scores_history  enable row level security;

-- Política temporal: acceso total con anon key
create policy "allow_all_startups"        on public.startups        for all using (true) with check (true);
create policy "allow_all_pipeline"        on public.pipeline_status for all using (true) with check (true);
create policy "allow_all_scores_history"  on public.scores_history  for all using (true) with check (true);
