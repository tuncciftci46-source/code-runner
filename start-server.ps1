$ErrorActionPreference = "Stop"
$env:PORT = "5000"
$env:NODE_ENV = "development"
Write-Host "Starting API server on port 5000..."
pnpm exec tsx artifacts/api-server/src/index.ts