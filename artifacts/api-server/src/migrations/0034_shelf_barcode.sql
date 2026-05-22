ALTER TABLE shelf_products ADD COLUMN IF NOT EXISTS barcode TEXT;
CREATE INDEX IF NOT EXISTS shelf_products_barcode_idx ON shelf_products(barcode);
