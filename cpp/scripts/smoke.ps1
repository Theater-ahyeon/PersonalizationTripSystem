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
  "distance",
  "2",
  "2",
  "1",
  "8",
  "mixed",
  "transport",
  "2",
  "4",
  "tsinghua_hospital",
  "J0",
  "J21",
  "1",
  "1",
  "pku_library",
  "pku_1_east",
  "pku_4_rare",
  "2",
  "4",
  "wenchang",
  "entrance",
  "porcelain_gallery",
  "2",
  "3",
  "1",
  "3 5 9",
  "walk",
  "recommend",
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
  "6",
  "2",
  "SmokeUser",
  "history,photo",
  "walk",
  "6",
  "1",
  "11",
  "4",
  "1",
  "Smoke User Diary",
  "4.8",
  "user11-private-keyword",
  "4",
  "2",
  "4",
  "3",
  "4",
  "5",
  "4",
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
  "mode=mixed",
  "congestion=",
  "Indoor route",
  "tsinghua_hospital",
  "pku_library",
  "wenchang",
  "entry-to-elevator",
  "floor-transfer",
  "floor-to-room",
  "TSP multi-stop",
  "return-to-start",
  "strategy=",
  "minutes=",
  "Visit order",
  "Top-10",
  "KMP",
  "Top-5",
  "rating=",
  "Current user",
  "Registered user",
  "Switched user",
  "My diaries",
  "All diaries",
  "Smoke User Diary",
  "Deleted diary"
)

foreach ($Text in $Expected) {
  if ($Output -notlike "*$Text*") {
    Write-Host $Output
    throw "Smoke output did not contain expected text: $Text"
  }
}

Write-Host "Smoke verification passed."

$CampusData = Join-Path $SourceData "regions\tsinghua_campus"
if (-not (Test-Path $CampusData)) {
  throw "Missing Tsinghua region data for C++ smoke: $CampusData"
}

$CampusSmokeData = Join-Path ([System.IO.Path]::GetTempPath()) "tripsystem-tsinghua-smoke-data"
if (Test-Path $CampusSmokeData) {
  Remove-Item -LiteralPath $CampusSmokeData -Recurse -Force
}
Copy-Item -Path $CampusData -Destination $CampusSmokeData -Recurse

$CampusInputLines = @(
  "2",
  "2",
  "1",
  "4",
  "walk",
  "distance",
  "1",
  "",
  "0",
  "5",
  "3",
  "",
  "0"
)

$CampusInputText = ($CampusInputLines -join [Environment]::NewLine) + [Environment]::NewLine
$CampusOutput = $CampusInputText | & $Exe $CampusSmokeData 2>&1 | Out-String

if ($LASTEXITCODE -ne 0) {
  Write-Host $CampusOutput
  throw "Tsinghua smoke run exited with code $LASTEXITCODE"
}

foreach ($Text in @("OSM A*", "Top-10", "Top-5", "rating=")) {
  if ($CampusOutput -notlike "*$Text*") {
    Write-Host $CampusOutput
    throw "Tsinghua smoke output did not contain expected text: $Text"
  }
}

Write-Host "Tsinghua smoke verification passed."
