-- Función normalize_text() para búsqueda sin acentos
-- Requerida por lib/queries/project-list.ts y lib/queries/visit-list.ts
--
-- Ejecutar en nuevos ambientes:
--   psql $DATABASE_URL -f scripts/ensure-normalize-text.sql

CREATE EXTENSION IF NOT EXISTS "unaccent";

CREATE OR REPLACE FUNCTION normalize_text(text) RETURNS text AS $$
  SELECT lower(public.unaccent($1))
$$ LANGUAGE SQL IMMUTABLE PARALLEL SAFE;
