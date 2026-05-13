-- V14: Extend allowed routine_slot values on shelf_products (TEXT column).
-- Keeps morning, evening, both; adds occasional, wishlist for SS-023-style UX.

ALTER TABLE shelf_products DROP CONSTRAINT IF EXISTS shelf_products_routine_slot_check;

ALTER TABLE shelf_products
  ADD CONSTRAINT shelf_products_routine_slot_check
  CHECK (routine_slot IN ('morning', 'evening', 'both', 'occasional', 'wishlist'));
