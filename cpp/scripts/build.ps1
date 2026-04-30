$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$BuildDir = Join-Path $Root "build"
$SrcDir = Join-Path $Root "src"
$IncludeDir = Join-Path $Root "include"
$Out = Join-Path $BuildDir "tripsystem.exe"

New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null

$Sources = Get-ChildItem -Path $SrcDir -Filter *.cpp -Recurse | ForEach-Object { $_.FullName }
if (-not $Sources) {
  throw "No C++ source files found under $SrcDir"
}

$Gpp = Get-Command g++ -ErrorAction SilentlyContinue
if (-not $Gpp) {
  throw "g++ was not found in PATH. Install MinGW-w64 or add g++ to PATH, then rerun this script."
}

& g++ -std=c++17 -O2 -Wall -Wextra -I $IncludeDir @Sources -o $Out

Write-Host "Built $Out"
