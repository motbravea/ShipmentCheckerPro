$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"

if (Test-Path $cargoBin) {
    $env:Path = "$cargoBin;$env:Path"
}

Push-Location -LiteralPath $root
try {
    & (Join-Path $root "node_modules\.bin\tauri.cmd") build
    if ($LASTEXITCODE -ne 0) { throw "Desktop build failed." }
}
finally {
    Pop-Location
}
