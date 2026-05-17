CREATE TABLE IF NOT EXISTS public.app_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  source text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_ratings ENABLE ROW LEVEL SECURITY;
