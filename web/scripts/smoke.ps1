$ErrorActionPreference = "Stop"

function New-Text {
  param([int[]]$CodePoints)
  return -join ($CodePoints | ForEach-Object { [char]$_ })
}

$TextSummerPalaceSystem = New-Text @(39056,21644,22253,20010,24615,21270,26053,28216,31995,32479)
$TextEastGate = New-Text @(39056,21644,22253,19996,23467,38376)
$TextSuzhouStreet = New-Text @(33487,24030,34903,20837,21475)
$TextAcceptanceDesk = New-Text @(39564,25910,21488)

$WebRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$RepoRoot = Resolve-Path (Join-Path $WebRoot "..")
$Index = Join-Path $WebRoot "index.html"
$Styles = Join-Path $WebRoot "styles.css"
$App = Join-Path $WebRoot "app.js"
$Assets = Join-Path $WebRoot "assets\spots"
$OsmNodes = Join-Path $RepoRoot "cpp\data\osm_nodes.json"
$OsmEdges = Join-Path $RepoRoot "cpp\data\osm_edges.json"
$SpotsPath = Join-Path $RepoRoot "cpp\data\spots.json"
$RestaurantsPath = Join-Path $RepoRoot "cpp\data\restaurants.json"
$FacilitiesPath = Join-Path $RepoRoot "cpp\data\facilities.json"
$UsersPath = Join-Path $RepoRoot "cpp\data\users.json"
$DiariesPath = Join-Path $RepoRoot "cpp\data\diaries\index.json"
$RegionsPath = Join-Path $RepoRoot "cpp\data\regions\manifest.json"

foreach ($Path in @($Index, $Styles, $App, $Assets, $OsmNodes, $OsmEdges, $SpotsPath, $RestaurantsPath, $FacilitiesPath, $UsersPath, $DiariesPath, $RegionsPath)) {
  if (-not (Test-Path $Path)) {
    throw "Missing required web demo path: $Path"
  }
}

# Also verify web/data/ copies exist for HTTP serving
$WebDataDirs = @("web\data", "web\data\diaries", "web\data\regions")
foreach ($Dir in $WebDataDirs) {
  $FullPath = Join-Path $RepoRoot $Dir
  if (-not (Test-Path $FullPath)) {
    throw "Missing web/data directory required for HTTP serving: $FullPath. Run setup-data.ps1 first."
  }
}
$WebDataFiles = @("osm_nodes.json", "osm_edges.json", "spots.json", "restaurants.json", "facilities.json", "users.json")
foreach ($File in $WebDataFiles) {
  $FullPath = Join-Path $RepoRoot "web\data\$File"
  if (-not (Test-Path $FullPath)) {
    throw "Missing web/data file: $FullPath. Run setup-data.ps1 to copy from cpp/data/."
  }
}

$IndexText = Get-Content -Raw -Encoding UTF8 -Path $Index
$StyleText = Get-Content -Raw -Encoding UTF8 -Path $Styles
$AppText = Get-Content -Raw -Encoding UTF8 -Path $App
$AllText = @(
  $IndexText,
  $StyleText,
  $AppText,
  (Get-Content -Raw -Encoding UTF8 -Path $OsmNodes),
  (Get-Content -Raw -Encoding UTF8 -Path $OsmEdges),
  (Get-Content -Raw -Encoding UTF8 -Path $SpotsPath),
  (Get-Content -Raw -Encoding UTF8 -Path $RestaurantsPath),
  (Get-Content -Raw -Encoding UTF8 -Path $FacilitiesPath),
  (Get-Content -Raw -Encoding UTF8 -Path $UsersPath),
  (Get-Content -Raw -Encoding UTF8 -Path $DiariesPath),
  (Get-Content -Raw -Encoding UTF8 -Path $RegionsPath)
) -join "`n"

$ForbiddenMojibake = @(
  (New-Text @(28598,57413,31673)),
  (New-Text @(38007)),
  (New-Text @(37734,26495,27992)),
  (New-Text @(23005,12520)),
  (New-Text @(26976,25123)),
  (New-Text @(37719,27697,22719)),
  (New-Text @(37905)),
  (New-Text @(29882,57884)),
  (New-Text @(79,83,77,23059)),
  ([char]0xfffd)
)
foreach ($Needle in $ForbiddenMojibake) {
  if ($AllText.Contains($Needle)) {
    throw "Detected mojibake text in frontend/data output."
  }
}

$RequiredIndex = @(
  $TextSummerPalaceSystem,
  "tourTabs",
  "recommendView",
  "routeView",
  "queryView",
  "diaryView",
  "foodView",
  "mapRegionSelect",
  "datasetMapButton",
  "mapDataNotice",
  "regionPackSelect",
  "regionPackStatus",
  "recommendAlgorithmNote",
  "recommendKeyword",
  "recommendSort",
  "diaryAlgorithmNote",
  "foodAlgorithmNote",
  "foodSortSelect",
  "facilityRangeSelect",
  "diaryCreateButton",
  "diaryTitleInput",
  "diaryDestinationInput",
  "diaryContentInput",
  "diaryMediaFileInput",
  "indoorStartSelect",
  "indoorGoalSelect",
  "aigcAnimationButton",
  "aigcStoryboard",
  "storyboard-placeholder",
  "diarySearchMode",
  "routeStrategySelect",
  "leaflet.css",
  "leaflet.js",
  "map",
  "detail-panel"
)
foreach ($Needle in $RequiredIndex) {
  if ($IndexText -notlike "*$Needle*") {
    throw "index.html does not contain required text: $Needle"
  }
}

$RequiredCss = @(
  ".app-shell",
  ".tour-tabs",
  ".view-panel",
  ".map-canvas",
  ".detail-panel",
  ".result-card",
  ".algorithm-note",
  ".map-data-notice",
  ".region-pack-status"
)
foreach ($Needle in $RequiredCss) {
  if ($StyleText -notlike "*$Needle*") {
    throw "styles.css does not contain required selector: $Needle"
  }
}

$RequiredJs = @(
  "initializeMap",
  "renderNodeMarkers",
  "renderFacilityMapMarkers",
  "focusMapRegion",
  "updateLocalOverlayVisibility",
  "geohashEncode",
  "buildFacilityGeoIndex",
  "nearbyFacilitiesByGeoHash",
  "buildSimilarityIndexes",
  "buildLshIndex",
  "getLshCandidates",
  "simhashSignature",
  "lshBandKeys",
  "topK",
  "heapPush",
  "heapSink",
  "fillRegionPackSelect",
  "selectRegionPack",
  "renderRegionPackStatus",
  "kmpContains",
  "kmpTable",
  "diaryCompressionRatio",
  "matchesSpotSearch",
  "spotSortScore",
  "recommendSortLabel",
  "createDiaryEntry",
  "buildDiaryTitleIndex",
  "huffmanCompressedBytes",
  "bindDiaryButtons",
  "foodSortScore",
  "foodSortLabel",
  "runIndoorRoute",
  "generateAigcStoryboard",
  "MAP_REGIONS",
  "runShortestPath",
  "runMultiStopRoute",
  "fitMapToData",
  "addMapResetControl",
  "recommendSpots",
  "searchFacilities",
  "recommendFood",
  "renderDiaryList",
  "matchesDiarySearch",
  "ROUTE_STRATEGIES",
  "routeStrategyInfo",
  "edgeWeight",
  "facilityIconText",
  "drawRoute",
  "invalidateSize",
  "circleMarker"
)
foreach ($Needle in $RequiredJs) {
  if ($AppText -notlike "*$Needle*") {
    throw "app.js does not contain required function or call: $Needle"
  }
}

foreach ($Needle in @("renderDataOverview", "dataOverview", $TextAcceptanceDesk)) {
  if ($IndexText -like "*$Needle*" -or $AppText -like "*$Needle*" -or $StyleText -like "*$Needle*") {
    throw "Removed acceptance-lab page/code should not remain in frontend: $Needle"
  }
}

$Nodes = Get-Content -Raw -Encoding UTF8 -Path $OsmNodes | ConvertFrom-Json
$Edges = Get-Content -Raw -Encoding UTF8 -Path $OsmEdges | ConvertFrom-Json
$Spots = Get-Content -Raw -Encoding UTF8 -Path $SpotsPath | ConvertFrom-Json
$Restaurants = Get-Content -Raw -Encoding UTF8 -Path $RestaurantsPath | ConvertFrom-Json
$Facilities = Get-Content -Raw -Encoding UTF8 -Path $FacilitiesPath | ConvertFrom-Json
$Users = Get-Content -Raw -Encoding UTF8 -Path $UsersPath | ConvertFrom-Json
$Diaries = Get-Content -Raw -Encoding UTF8 -Path $DiariesPath | ConvertFrom-Json
$Regions = Get-Content -Raw -Encoding UTF8 -Path $RegionsPath | ConvertFrom-Json

if (@($Nodes).Count -lt 220) { throw "Expected at least 220 OSM nodes, found $(@($Nodes).Count)" }
if (@($Edges).Count -lt 400) { throw "Expected at least 400 directed OSM edges, found $(@($Edges).Count)" }
if (@($Spots).Count -lt 200) { throw "Expected at least 200 scenic/campus destinations, found $(@($Spots).Count)" }
if (@($Restaurants).Count -lt 50) { throw "Expected at least 50 restaurants, found $(@($Restaurants).Count)" }
if (@($Facilities).Count -lt 50) { throw "Expected at least 50 facilities, found $(@($Facilities).Count)" }
if (@($Users).Count -lt 10) { throw "Expected at least 10 users, found $(@($Users).Count)" }
if (@($Diaries).Count -lt 10) { throw "Expected at least 10 diary entries, found $(@($Diaries).Count)" }
if (@($Regions).Count -lt 4) { throw "Expected at least 4 region pack manifest entries, found $(@($Regions).Count)" }
if (-not (@($Regions | Where-Object { $_.status -eq "active" }).Count)) {
  throw "Expected at least one active region data pack."
}

$FacilityTypes = @($Facilities | ForEach-Object { $_.type } | Sort-Object -Unique)
if ($FacilityTypes.Count -lt 10) {
  throw "Expected at least 10 facility types, found $($FacilityTypes.Count)"
}

$SummerPalaceNodes = @($Nodes | Where-Object { [int]$_.id -lt 5000 })
$OutOfBeijingBox = @($SummerPalaceNodes | Where-Object {
  [double]$_.lat -lt 39.9850 -or [double]$_.lat -gt 40.0120 -or
  [double]$_.lon -lt 116.2550 -or [double]$_.lon -gt 116.3050
})
if ($OutOfBeijingBox.Count -gt 0) {
  throw "Expected Summer Palace OSM nodes to be inside the bbox; first bad node: $($OutOfBeijingBox[0].name)"
}

if (-not (@($Nodes | Where-Object { $_.name -eq $TextEastGate }).Count)) {
  throw "Node dataset must include East Gate named anchor"
}
if (-not (@($Nodes | Where-Object { $_.name -eq $TextSuzhouStreet }).Count)) {
  throw "Node dataset must include Suzhou Street named anchor"
}

$ImagePaths = @($Nodes | ForEach-Object { $_.image } | Sort-Object -Unique)
foreach ($ImagePath in $ImagePaths) {
  $LocalImage = Join-Path $RepoRoot $ImagePath
  if (-not (Test-Path $LocalImage)) {
    throw "Missing node image asset referenced by osm_nodes.json: $ImagePath"
  }
}

function Find-ShortestPath {
  param(
    [int]$Start,
    [int]$Goal,
    [string]$Mode
  )
  $Dist = @{}
  $Queue = [System.Collections.ArrayList]::new()
  $Dist[$Start] = 0.0
  [void]$Queue.Add([pscustomobject]@{ Node = $Start; Distance = 0.0 })
  while ($Queue.Count -gt 0) {
    $Ordered = @($Queue | Sort-Object Distance)
    $Current = $Ordered[0]
    [void]$Queue.Remove($Current)
    if ([double]$Current.Distance -ne [double]$Dist[[int]$Current.Node]) { continue }
    if ([int]$Current.Node -eq $Goal) { break }
    foreach ($Edge in @($Edges | Where-Object {
      $_.from -eq [int]$Current.Node -and ($_.mode -eq "both" -or $_.mode -eq $Mode)
    })) {
      $NextDistance = [double]$Current.Distance + [double]$Edge.distance
      if (-not $Dist.ContainsKey([int]$Edge.to) -or $NextDistance -lt [double]$Dist[[int]$Edge.to]) {
        $Dist[[int]$Edge.to] = $NextDistance
        [void]$Queue.Add([pscustomobject]@{ Node = [int]$Edge.to; Distance = $NextDistance })
      }
    }
  }
  return $Dist.ContainsKey($Goal)
}

if (-not (Find-ShortestPath -Start 1 -Goal 8 -Mode "walk")) {
  throw "Expected walk route from node 1 to node 8 to be reachable"
}

if ($IndexText -notlike "*./vendor/leaflet.css*" -or $IndexText -notlike "*./vendor/leaflet.js*") {
  throw "index.html must use local Leaflet assets so the demo works without CDN access"
}

$Images = Get-ChildItem -Path $Assets -Filter *.svg -File
if ($Images.Count -lt 12) {
  throw "Expected at least 12 local node image assets, found $($Images.Count)"
}

Write-Host "Frontend smoke verification passed for Beijing Summer Palace demo."
