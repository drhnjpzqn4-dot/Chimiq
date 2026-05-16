ALTER TABLE public.cached_products
ADD COLUMN IF NOT EXISTS source text DEFAULT 'chimiq'
CHECK (source IN ('chimiq', 'obf', 'user'));

ALTER TABLE public.cached_products
ADD COLUMN IF NOT EXISTS analysis_cache_hash text,
ADD COLUMN IF NOT EXISTS analysis_result_json jsonb;
