#!/usr/bin/env bash
set -e
pnpm install --frozen-lockfile
pnpm run typecheck:libs
pnpm --filter @workspace/api-server run build