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
$AttributionsPath = Join-Path $RepoRoot "web\assets\ATTRIBUTIONS.md"
$CampusRegionId = "tsinghua_campus"

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
  'mobile-tab" data-view="queryView"',
  'mobile-tab" data-view="foodView"',
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
  "diaryExportButton",
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
  "loadRegionPack",
  "reloadCurrentDataset",
  "renderRegionPackStatus",
  "routableNodeIds",
  "routableNodes",
  "isRoutableNode",
  "kmpContains",
  "kmpTable",
  "diaryCompressionRatio",
  "spotSearchText",
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
  "handleRecommendClick",
  "searchFacilities",
  "handleFacilitySearchClick",
  "recommendFood",
  "handleDiarySearchClick",
  "handleFoodRecommendClick",
  "exportDiariesJson",
  "downloadJson",
  "formatTimestampForFilename",
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

$RoutableUiRequirements = @(
  'fillNodeSelect(byId("startSelect"), routableNodes())',
  'fillNodeSelect(byId("goalSelect"), routableNodes())',
  'fillNodeSelect(byId("facilityOriginSelect"), routableNodes())',
  'routableNodes().filter((node) => Number(node.spot_id) > 0)'
)
foreach ($Needle in $RoutableUiRequirements) {
  if ($AppText -notlike "*$Needle*") {
    throw "Route and facility selectors must use routable nodes only: $Needle"
  }
}

$ExplicitButtonHandlers = @(
  'byId("recommendButton").addEventListener("click", handleRecommendClick)',
  'byId("facilitySearchButton").addEventListener("click", handleFacilitySearchClick)',
  'byId("diarySearchButton").addEventListener("click", handleDiarySearchClick)',
  'byId("foodRecommendButton").addEventListener("click", handleFoodRecommendClick)',
  "focusResultRegion"
)
foreach ($Needle in $ExplicitButtonHandlers) {
  if ($AppText -notlike "*$Needle*") {
    throw "Primary action buttons must use explicit handlers with visible result focus: $Needle"
  }
}

$RecommendationSearchRequirements = @(
  'const keyword = keywordInput;',
  'spotSearchText(spot)',
  'const node = findNodeBySpot(spot.id)'
)
foreach ($Needle in $RecommendationSearchRequirements) {
  if ($AppText -notlike "*$Needle*") {
    throw "Recommendation keyword search must not hard-filter by preference input and must include linked map node text: $Needle"
  }
}

$CampusUiRequirements = @(
  (New-Text @(28165,21326,22823,23398,26657,22253,25968,25454,21253)),
  (New-Text @(29983,25104,27169,25311,26085,35760,33609,31295)),
  (New-Text @(29983,25104,27169,25311,20998,38236)),
  (New-Text @(24403,21069,20026,35268,21017,33050,26412,27169,25311,65292,26410,25509,20837,30495,23454,32,65,73,71,67,32,27169,22411)),
  (New-Text @(23548,20986,26085,35760,32,74,83,79,78)),
  "diaries-index-export-"
)
foreach ($Needle in $CampusUiRequirements) {
  if ($AllText -notlike "*$Needle*") {
    throw "P0 campus/diary/AIGC UI text is missing: $Needle"
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
$CampusPack = @($Regions | Where-Object { $_.id -eq $CampusRegionId })
if ($CampusPack.Count -ne 1) {
  throw "Expected one manifest entry for $CampusRegionId."
}
if ($CampusPack[0].status -ne "active") {
  throw "$CampusRegionId must be active so the demo proves campus routing is available."
}
foreach ($Field in @("nodes_path", "edges_path", "spots_path", "roads_path", "facilities_path", "restaurants_path")) {
  if (-not $CampusPack[0].PSObject.Properties[$Field] -or -not $CampusPack[0].$Field) {
    throw "$CampusRegionId manifest is missing $Field."
  }
}

$EdgeNodeIds = @{}
foreach ($Edge in @($Edges)) {
  $EdgeNodeIds[[int]$Edge.from] = $true
  $EdgeNodeIds[[int]$Edge.to] = $true
}
$OrphanNodes = @($Nodes | Where-Object { -not $EdgeNodeIds.ContainsKey([int]$_.id) })
$OrphanCampusNodes = @($OrphanNodes | Where-Object { [int]$_.id -ge 5000 })
if ($OrphanCampusNodes.Count -ne 53) {
  throw "Expected 53 Beijing university display nodes outside the route graph, found $($OrphanCampusNodes.Count)"
}
if ($OrphanNodes.Count -ne $OrphanCampusNodes.Count) {
  throw "Only Beijing university display nodes should be outside the route graph; found $($OrphanNodes.Count) orphan nodes total."
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
$RealJpgs = @(Get-ChildItem -Path (Join-Path $Assets "real") -Filter *.jpg -File)
if ($RealJpgs.Count -lt 8) {
  throw "Expected at least 8 real JPG assets, found $($RealJpgs.Count)"
}
if (-not (Test-Path $AttributionsPath)) {
  throw "Missing image attribution file: $AttributionsPath"
}
$AttributionsText = Get-Content -Raw -Encoding UTF8 -Path $AttributionsPath
foreach ($Needle in @("TsinghuaUniversityGate.JPG", "Former_gate_of_Tsinghua_University.JPG", "Grand_hall_of_Tsinghua_University.JPG", (New-Text @(50,48,49,56,24180,28165,33775,32769,39208,27491,38272,46,106,112,103)), "Main_building_of_Tsinghua_University", "The_Long_Corridor", "Seventeen-Arch_Bridge")) {
  if ($AttributionsText -notlike "*$Needle*") {
    throw "Attribution file must include source: $Needle"
  }
}

function Test-RegionDataPack {
  param(
    [string]$BaseDir,
    [string]$Label
  )
  $PackDir = Join-Path $BaseDir "regions\$CampusRegionId"
  if (-not (Test-Path $PackDir)) {
    throw "Missing $Label campus data pack directory: $PackDir"
  }
  $CampusNodes = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $PackDir "osm_nodes.json") | ConvertFrom-Json
  $CampusEdges = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $PackDir "osm_edges.json") | ConvertFrom-Json
  $CampusSpots = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $PackDir "spots.json") | ConvertFrom-Json
  $CampusRoads = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $PackDir "roads.json") | ConvertFrom-Json
  $CampusFacilities = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $PackDir "facilities.json") | ConvertFrom-Json
  $CampusRestaurants = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $PackDir "restaurants.json") | ConvertFrom-Json

  if (@($CampusNodes).Count -ne 14) { throw "$Label campus pack must contain exactly 14 nodes, found $(@($CampusNodes).Count)" }
  if (@($CampusSpots).Count -ne 14) { throw "$Label campus pack must contain exactly 14 spots, found $(@($CampusSpots).Count)" }
  if (@($CampusEdges).Count -lt 30) { throw "$Label campus pack must contain at least 30 directed edges, found $(@($CampusEdges).Count)" }
  if (@($CampusRoads).Count -lt 15) { throw "$Label campus pack must contain at least 15 spot roads, found $(@($CampusRoads).Count)" }
  if (@($CampusFacilities).Count -lt 8) { throw "$Label campus pack must contain at least 8 facilities, found $(@($CampusFacilities).Count)" }
  if (@($CampusRestaurants).Count -lt 6) { throw "$Label campus pack must contain at least 6 restaurants, found $(@($CampusRestaurants).Count)" }

  $CampusEdgeNodeIds = @{}
  foreach ($Edge in @($CampusEdges)) {
    $CampusEdgeNodeIds[[int]$Edge.from] = $true
    $CampusEdgeNodeIds[[int]$Edge.to] = $true
  }
  $CampusOrphans = @($CampusNodes | Where-Object { -not $CampusEdgeNodeIds.ContainsKey([int]$_.id) })
  if ($CampusOrphans.Count -ne 0) {
    throw "$Label campus pack has non-routable campus nodes; first orphan: $($CampusOrphans[0].name)"
  }
  foreach ($Node in @($CampusNodes)) {
    $LocalImage = Join-Path $RepoRoot $Node.image
    if (-not (Test-Path $LocalImage)) {
      throw "$Label campus node references missing image: $($Node.image)"
    }
    if (-not $Node.description -or $Node.description.Length -lt 18) {
      throw "$Label campus node needs a real description: $($Node.name)"
    }
  }
  if (-not (Find-ShortestPathWithEdges -Edges $CampusEdges -Start 1 -Goal 4 -Mode "walk")) {
    throw "$Label campus pack route from node 1 to node 4 must be reachable"
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

function Find-ShortestPathWithEdges {
  param(
    [object[]]$Edges,
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

Test-RegionDataPack -BaseDir (Join-Path $RepoRoot "cpp\data") -Label "cpp/data"
Test-RegionDataPack -BaseDir (Join-Path $RepoRoot "web\data") -Label "web/data"

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
