$ErrorActionPreference = "Stop"

$WebRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$RepoRoot = Resolve-Path (Join-Path $WebRoot "..")
$Index = Join-Path $WebRoot "index.html"
$App = Join-Path $WebRoot "app.js"
$ScriptsDir = Join-Path $WebRoot "scripts"
$Styles = Join-Path $WebRoot "styles.css"
$SetupData = Join-Path $ScriptsDir "setup-data.ps1"
$WebManifest = Join-Path $WebRoot "data\regions\manifest.json"
$UtilsHeader = Join-Path $RepoRoot "cpp\include\tripsystem\utils.hpp"
$DataManagerHeader = Join-Path $RepoRoot "cpp\include\tripsystem\data_manager.hpp"

$IndexText = Get-Content -Raw -Encoding UTF8 -Path $Index
$AppText = Get-Content -Raw -Encoding UTF8 -Path $App
$SplitScriptText = (Get-ChildItem -LiteralPath $ScriptsDir -Filter "*.js" | Sort-Object Name | ForEach-Object {
  Get-Content -Raw -Encoding UTF8 -Path $_.FullName
}) -join "`n"
$StyleText = Get-Content -Raw -Encoding UTF8 -Path $Styles
$SetupText = Get-Content -Raw -Encoding UTF8 -Path $SetupData
$ManifestText = Get-Content -Raw -Encoding UTF8 -Path $WebManifest
$UtilsText = Get-Content -Raw -Encoding UTF8 -Path $UtilsHeader
$DataManagerText = Get-Content -Raw -Encoding UTF8 -Path $DataManagerHeader

$ExpectedScripts = @(
  "scripts/core.js",
  "scripts/data.js",
  "scripts/map-controller.js",
  "scripts/route-indoor.js",
  "scripts/recommend-search.js",
  "scripts/diary-aigc.js",
  "scripts/food.js",
  "scripts/startup.js"
)

foreach ($Script in $ExpectedScripts) {
  $Path = Join-Path $WebRoot $Script
  if (-not (Test-Path -LiteralPath $Path)) { throw "Missing split script: $Script" }
  if ($IndexText -notlike "*$Script*") { throw "index.html must include $Script" }
}

if ($IndexText -like "*app.js?v=*") { throw "index.html must not load monolithic app.js." }
if ($IndexText -notmatch '<option value="distance">') { throw "Route selector missing distance option." }
if ($IndexText -notmatch '<option value="time">') { throw "Route selector missing time option." }
if ($IndexText -notmatch '<option value="recommend">') { throw "Route selector missing recommend option." }
foreach ($Removed in @("congestion", "transport")) {
  if ($IndexText -like "*value=`"$Removed`"*") { throw "Route selector must not expose $Removed." }
}

if ($AppText -notmatch 'ROUTE_STRATEGIES\s*=\s*\{\s*distance:' -and $SplitScriptText -notmatch 'ROUTE_STRATEGIES\s*=\s*\{\s*distance:') {
  throw "Route strategies must be defined in split scripts."
}

foreach ($Needle in @("indoor-route-meta", "indoor-step-list", "indoor-visualization-note")) {
  if ($StyleText -notlike "*$Needle*" -and $AppText -notlike "*$Needle*" -and $SplitScriptText -notlike "*$Needle*") {
    throw "Indoor visualization hook missing: $Needle"
  }
}

foreach ($Needle in @("routeQuickSummary", "route-quick-summary")) {
  if ($IndexText -notlike "*$Needle*" -and $StyleText -notlike "*$Needle*" -and $SplitScriptText -notlike "*$Needle*") {
    throw "Route time integration hook missing: $Needle"
  }
}

foreach ($Needle in @("diaryComposeToggle", "diaryComposePanel", "toggleDiaryCompose", "diary-compose-collapsed")) {
  if ($IndexText -notlike "*$Needle*" -and $StyleText -notlike "*$Needle*" -and $SplitScriptText -notlike "*$Needle*") {
    throw "Diary compose collapse hook missing: $Needle"
  }
}

foreach ($Needle in @("hero-carousel", "hero-crossfade")) {
  if ($IndexText -notlike "*$Needle*" -and $StyleText -notlike "*$Needle*") {
    throw "Homepage carousel hook missing: $Needle"
  }
}

foreach ($Needle in @("indoorPlanViewport", "indoorZoomIn", "indoorZoomOut", "resetIndoorPlanView", "indoor-plan-pannable")) {
  if ($IndexText -notlike "*$Needle*" -and $StyleText -notlike "*$Needle*" -and $SplitScriptText -notlike "*$Needle*") {
    throw "Indoor map interaction hook missing: $Needle"
  }
}

foreach ($Needle in @("jsonNumber() accepts signed integers and decimals", "JSON parser field coverage")) {
  if ($UtilsText -notlike "*$Needle*" -and $DataManagerText -notlike "*$Needle*") {
    throw "C++ JSON parser documentation missing: $Needle"
  }
}

if ($ManifestText -like "*../cpp/data/*") { throw "web/data manifest must use web-local ./data paths." }
if ($SetupText -notlike "*ConvertTo-WebManifestPaths*") { throw "setup-data.ps1 must rewrite region manifest paths for web serving." }

Write-Host "Web remaining-task verification passed."
