$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$BuildScript = Join-Path $Root "scripts\build.ps1"
$Exe = Join-Path $Root "build\tripsystem.exe"
$SourceData = Join-Path $Root "data"
$SmokeData = Join-Path ([System.IO.Path]::GetTempPath()) "tripsystem-remaining-data"

& powershell -ExecutionPolicy Bypass -File $BuildScript | Out-Host

if (Test-Path -LiteralPath $SmokeData) {
  Remove-Item -LiteralPath $SmokeData -Recurse -Force
}
Copy-Item -Path $SourceData -Destination $SmokeData -Recurse

function Invoke-TripSystem {
  param([string[]]$Lines)
  $InputText = ($Lines -join [Environment]::NewLine) + [Environment]::NewLine
  $Output = $InputText | & $Exe $SmokeData 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    Write-Host $Output
    throw "TripSystem exited with code $LASTEXITCODE"
  }
  return $Output
}

$DistanceOutput = Invoke-TripSystem @("2", "1", "1", "9", "walk", "distance", "0")
$TimeOutput = Invoke-TripSystem @("2", "1", "1", "9", "walk", "time", "0")
$RecommendOutput = Invoke-TripSystem @("2", "1", "1", "9", "walk", "recommend", "0")

foreach ($Output in @($DistanceOutput, $TimeOutput, $RecommendOutput)) {
  if ($Output -notmatch "strategy=") { throw "Route output must include strategy=..." }
  if ($Output -notmatch "minutes=") { throw "Route output must include estimated minutes." }
}

if ($DistanceOutput -notmatch "strategy=distance") { throw "Distance route must report strategy=distance." }
if ($TimeOutput -notmatch "strategy=time") { throw "Time route must report strategy=time." }
if ($RecommendOutput -notmatch "strategy=recommend") { throw "Recommend route must report strategy=recommend." }
if ($DistanceOutput -eq $TimeOutput -and $DistanceOutput -eq $RecommendOutput) {
  throw "Route strategies must produce distinguishable output."
}

$RestaurantJson = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $SmokeData "restaurants.json")
if ($RestaurantJson -notmatch '"image"\s*:\s*"web/assets/food/') {
  throw "C++ save must preserve restaurant image fields."
}

Write-Host "C++ remaining-task verification passed."
