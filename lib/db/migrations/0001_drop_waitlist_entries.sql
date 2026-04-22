-- Drop the legacy waitlist_entries table.
--
-- The waitlist feature (form, hook, API route, schema) was removed in a prior
-- task. The historical signups have been exported to
-- attached_assets/archive/waitlist_entries_final_dump.json prior to this drop.
-- See task #49.

DROP TABLE IF EXISTS waitlist_entries CASCADE;
