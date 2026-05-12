/**
 * Shared Drizzle schema lives in `@workspace/db` (see `lib/db/src/schema/`).
 * Re-export for documentation alignment with the API server layout.
 */
export { recallsTable } from "@workspace/db";
export type { Recall, InsertRecall } from "@workspace/db";
