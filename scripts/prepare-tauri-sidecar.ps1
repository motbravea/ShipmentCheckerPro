param(
    [switch]$SkipIfExists
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$project = Join-Path $root "backend\ShipmentCheckerPro.Api.csproj"
$publishDir = Join-Path $root "artifacts\sidecar"
$sourceExe = Join-Path $publishDir "ShipmentCheckerPro.Api.exe"
$binaryDir = Join-Path $root "src-tauri\binaries"
$targetExe = Join-Path $binaryDir "ShipmentCheckerPro.Api-x86_64-pc-windows-msvc.exe"

if ($SkipIfExists -and (Test-Path $targetExe)) {
    Write-Host "Using existing Tauri backend sidecar: $targetExe"
    exit 0
}

Write-Host "Publishing backend API sidecar..."
dotnet publish $project `
    -c Release `
    -r win-x64 `
    --self-contained true `
    --output $publishDir `
    /p:PublishSingleFile=true `
    /p:IncludeNativeLibrariesForSelfExtract=true `
    /p:EnableCompressionInSingleFile=true `
    /p:DebugType=None `
    /p:DebugSymbols=false

if ($LASTEXITCODE -ne 0) { throw "Backend sidecar publish failed." }
if (-not (Test-Path -LiteralPath $sourceExe)) { throw "Published backend sidecar was not found." }

New-Item -ItemType Directory -Force -Path $binaryDir | Out-Null
Copy-Item -Force -LiteralPath $sourceExe -Destination $targetExe

Write-Host "Prepared Tauri backend sidecar: $targetExe"
