$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")

& (Join-Path $PSScriptRoot "prepare-tauri-sidecar.ps1")
npm --prefix (Join-Path $root "frontend") run build
if ($LASTEXITCODE -ne 0) { throw "Frontend production build failed." }
