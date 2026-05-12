-- EU Safety Gate / RAPEX-style recalls cache (cosmetics & chemical products).

CREATE TABLE IF NOT EXISTS recalls (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  product_name TEXT,
  published_at TIMESTAMPTZ,
  source_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recalls_published_at_idx ON recalls (published_at);

CREATE UNIQUE INDEX IF NOT EXISTS recalls_source_url_unique ON recalls (source_url);
