$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")

& (Join-Path $PSScriptRoot "prepare-tauri-sidecar.ps1") -SkipIfExists
npm --prefix (Join-Path $root "frontend") run dev
if ($LASTEXITCODE -ne 0) { throw "Frontend development process failed." }
