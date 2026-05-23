CREATE TABLE IF NOT EXISTS public.product_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode text NOT NULL,
  reported_by uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_reports_barcode_idx ON public.product_reports (barcode);
CREATE INDEX IF NOT EXISTS product_reports_reported_by_created_at_idx
  ON public.product_reports (reported_by, created_at DESC);

ALTER TABLE public.product_reports ENABLE ROW LEVEL SECURITY;
