-- ============================================================
-- Migración: añadir campos source y source_url a startups
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS source     TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT NULL;
