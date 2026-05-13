#!/usr/bin/env bash
set -e
pnpm install --frozen-lockfile
pnpm run typecheck:libs
# Build frontend (mac-takip) so api-server can serve it
export BASE_PATH=${BASE_PATH:-/}
pnpm --filter @workspace/mac-takip run build
# Build api-server
pnpm --filter @workspace/api-server run build