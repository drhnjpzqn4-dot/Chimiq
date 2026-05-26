ALTER TABLE public.cached_products
  ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'skincare';

COMMENT ON COLUMN public.cached_products.product_type IS
  'Produktkategori: skincare | cosmetics | haircare | other';
