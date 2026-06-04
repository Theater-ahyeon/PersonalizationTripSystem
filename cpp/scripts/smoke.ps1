$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Repo = Resolve-Path (Join-Path $Root "..")
$BuildScript = Join-Path $Root "scripts\build.ps1"
$Exe = Join-Path $Root "build\tripsystem.exe"
$SourceData = Join-Path $Root "data"
$SmokeData = Join-Path ([System.IO.Path]::GetTempPath()) "tripsystem-smoke-data"

& powershell -ExecutionPolicy Bypass -File $BuildScript | Out-Host

if (Test-Path $SmokeData) {
  Remove-Item -LiteralPath $SmokeData -Recurse -Force
}
Copy-Item -Path $SourceData -Destination $SmokeData -Recurse

$InputLines = @(
  "2",
  "1",
  "1",
  "9",
  "walk",
  "2",
  "2",
  "1",
  "8",
  "bike",
  "2",
  "3",
  "1",
  "3 5 9",
  "walk",
  "1",
  "",
  "0",
  "3",
  "ta",
  "5",
  "1",
  "",
  "0",
  "4",
  "2",
  "0"
)

$InputText = ($InputLines -join [Environment]::NewLine) + [Environment]::NewLine
$Output = $InputText | & $Exe $SmokeData 2>&1 | Out-String

if ($LASTEXITCODE -ne 0) {
  Write-Host $Output
  throw "Smoke run exited with code $LASTEXITCODE"
}

$Expected = @(
  "Spot shortest path",
  "OSM A*",
  "TSP multi-stop",
  "Visit order",
  "Top-10",
  "KMP",
  "Top-5",
  "rating="
)

foreach ($Text in $Expected) {
  if ($Output -notlike "*$Text*") {
    Write-Host $Output
    throw "Smoke output did not contain expected text: $Text"
  }
}

Write-Host "Smoke verification passed."
