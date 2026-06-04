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
$GppPath = if ($Gpp) { $Gpp.Source } else { $null }
if (-not $GppPath) {
  $Candidates = @(
    "C:\msys64\ucrt64\bin\g++.exe",
    "C:\msys64\mingw64\bin\g++.exe",
    "C:\msys64\clang64\bin\g++.exe"
  )
  foreach ($Candidate in $Candidates) {
    if (Test-Path $Candidate) {
      $GppPath = $Candidate
      break
    }
  }
}
if (-not $GppPath) {
  throw "g++ was not found in PATH or common MSYS2 paths. Install MinGW-w64 or add g++ to PATH, then rerun this script."
}

$CompilerBin = Split-Path -Parent $GppPath
$env:PATH = "$CompilerBin;$env:PATH"

& $GppPath -std=c++17 -O2 -Wall -Wextra -static -static-libgcc -static-libstdc++ -I $IncludeDir $Sources -o $Out
if ($LASTEXITCODE -ne 0) {
  throw "g++ failed with exit code $LASTEXITCODE"
}
if (-not (Test-Path $Out) -or (Get-Item $Out).Length -le 0) {
  throw "Build completed without producing $Out"
}

Write-Host "Built $Out"
