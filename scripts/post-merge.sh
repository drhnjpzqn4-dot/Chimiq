#!/bin/bash
set -e
pnpm install --no-frozen-lockfile
# Apply explicit SQL migrations (e.g. table drops) before pushing the schema,
# so drizzle-kit doesn't prompt about destructive changes it would otherwise
# detect from a missing schema definition.
pnpm --filter db migrate
# pipe a newline to auto-accept drizzle-kit's "no truncate" default prompt
echo "" | pnpm --filter db push
