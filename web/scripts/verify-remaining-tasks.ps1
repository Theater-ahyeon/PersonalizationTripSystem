$ErrorActionPreference = "Stop"

$WebRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$RepoRoot = Resolve-Path (Join-Path $WebRoot "..")
$Index = Join-Path $WebRoot "index.html"
$App = Join-Path $WebRoot "app.js"
$ScriptsDir = Join-Path $WebRoot "scripts"
$Styles = Join-Path $WebRoot "styles.css"
$SetupData = Join-Path $ScriptsDir "setup-data.ps1"
$StartAigc = Join-Path $ScriptsDir "start-aigc.ps1"
$StartDemo = Join-Path $ScriptsDir "start-demo.ps1"
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
$StartAigcText = Get-Content -Raw -Encoding UTF8 -Path $StartAigc
$StartDemoText = Get-Content -Raw -Encoding UTF8 -Path $StartDemo
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
if ($SplitScriptText -match 'transport\s*:\s*\{') {
  throw "Route strategy definitions must not include transport."
}
if ($SplitScriptText -like "*电瓶车*" -or $SplitScriptText -match 'mode\s*===\s*"cart"') {
  throw "Frontend route code must use bike instead of electric cart."
}

if ($AppText -notmatch 'ROUTE_STRATEGIES\s*=\s*\{\s*distance:' -and $SplitScriptText -notmatch 'ROUTE_STRATEGIES\s*=\s*\{\s*distance:') {
  throw "Route strategies must be defined in split scripts."
}

foreach ($Needle in @("indoor-route-meta", "indoor-step-list", "indoor-visualization-note")) {
  if ($StyleText -notlike "*$Needle*" -and $AppText -notlike "*$Needle*" -and $SplitScriptText -notlike "*$Needle*") {
    throw "Indoor visualization hook missing: $Needle"
  }
}

foreach ($Needle in @("hasBrowserAigcConfig", "callBrowserAigcStoryboard", "proxyConfigured", "browser-direct-storyboard")) {
  if ($SplitScriptText -notlike "*$Needle*") {
    throw "Browser AIGC settings must be wired into storyboard generation: $($Needle)"
  }
}
foreach ($Needle in @("scheduleAigcStatusRetry", "aigcStatusRetryTimer")) {
  if ($SplitScriptText -notlike "*$Needle*") {
    throw "AIGC status should auto-retry for demo startup timing: $($Needle)"
  }
}
foreach ($Needle in @("PYTHONDONTWRITEBYTECODE", "python -B -u", "/api/aigc/health")) {
  if ($StartAigcText -notlike "*$Needle*") {
    throw "AIGC startup script must be stable for demo launch: $($Needle)"
  }
}
foreach ($Needle in @("web/index.html", "--directory `$RepoRoot")) {
  if ($StartDemoText -notlike "*$Needle*") {
    throw "Demo startup script must expose the same route used in browser acceptance: $($Needle)"
  }
}
if ($IndexText -like "*标题精确*") {
  throw "Diary title search UI should say 标题检索, not 标题精确."
}
if ($SplitScriptText -like "*exactTitleCandidates*") {
  throw "Diary title search must not be truncated by exact-title candidates."
}
if ($SplitScriptText -like '*mode === "title") return String(diary.title || "").trim().toLowerCase() === keyword*') {
  throw "Diary title search must use title contains matching, not whole-title equality."
}

foreach ($EnglishCopy in @(">About Us<", ">Safety Guide<", ">Terms of Service<", ">Privacy Policy<", ">Contact<", ">Status<", ">Settings<", ">Indoor Navigation<")) {
  if ($IndexText -like "*$EnglishCopy*") {
    throw "Demo UI must not expose English placeholder copy: $($EnglishCopy)"
  }
}

if ($SplitScriptText -like "*课程模拟*") {
  throw "Indoor source copy must not expose course-simulation wording."
}

foreach ($Needle in @("indoor-route-card", "indoor-map-shell", "indoor-node.start-node", "indoor-node.goal-node")) {
  if ($StyleText -notlike "*$Needle*" -and $SplitScriptText -notlike "*$Needle*") {
    throw "Indoor premium display hook missing: $($Needle)"
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
