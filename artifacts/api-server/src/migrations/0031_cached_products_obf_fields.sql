ALTER TABLE public.cached_products
  ADD COLUMN IF NOT EXISTS quantity text,
  ADD COLUMN IF NOT EXISTS categories text,
  ADD COLUMN IF NOT EXISTS labels text;

COMMENT ON COLUMN public.cached_products.quantity IS 'Förpackningsstorlek från OBF, t.ex. "50 ml", "200 g"';
COMMENT ON COLUMN public.cached_products.categories IS 'OBF-kategorier, kommaseparerade, t.ex. "Face creams,Moisturizers"';
COMMENT ON COLUMN public.cached_products.labels IS 'OBF-certifieringar, kommaseparerade, t.ex. "Vegan,Organic"';
