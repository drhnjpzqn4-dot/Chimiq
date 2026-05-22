-- Mark single-analysis cache rows without verdictSummary as stale for background revalidation.

UPDATE analysis_cache
SET
  created_at = '2020-01-01'::timestamptz,
  updated_at = '2020-01-01'::timestamptz,
  flagged_outdated = true
WHERE scan_type = 'single'
  AND (result_json::jsonb ->> 'verdictSummary') IS NULL;
