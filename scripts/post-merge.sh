#!/bin/bash
set -e
pnpm install --no-frozen-lockfile
# pipe a newline to auto-accept drizzle-kit's "no truncate" default prompt
echo "" | pnpm --filter db push
