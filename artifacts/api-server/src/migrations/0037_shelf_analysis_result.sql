-- Migration 0037: Add analysis_result_json to shelf_products
-- Fixes: analysis result was never persisted for shelf items — PATCH /api/shelf/:id
-- silently did nothing because the column didn't exist.
-- After this migration: ProductDetailSheet's handleAnalyze correctly saves the AI
-- analysis to Supabase so it survives navigation / app restarts.

ALTER TABLE shelf_products
  ADD COLUMN IF NOT EXISTS analysis_result_json jsonb;
