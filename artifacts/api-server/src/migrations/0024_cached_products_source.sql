ALTER TABLE public.cached_products
ADD COLUMN IF NOT EXISTS source text DEFAULT 'chimiq'
CHECK (source IN ('chimiq', 'obf', 'user'));
