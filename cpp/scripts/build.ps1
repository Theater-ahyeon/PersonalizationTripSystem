$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$buildDir = Join-Path $projectRoot "build"
$output = Join-Path $buildDir "tripsystem.exe"

New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

g++ -std=c++20 `
  -I"$projectRoot\include" `
  "$projectRoot\src\main.cpp" `
  "$projectRoot\src\app\cli_app.cpp" `
  "$projectRoot\src\core\data_manager.cpp" `
  -o "$output"

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "Build finished:" $output
