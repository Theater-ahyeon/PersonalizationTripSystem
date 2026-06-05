$ErrorActionPreference = "Stop"

$WebRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$RepoRoot = Resolve-Path (Join-Path $WebRoot "..")
$Index = Join-Path $WebRoot "index.html"
$Styles = Join-Path $WebRoot "styles.css"
$App = Join-Path $WebRoot "app.js"
$Assets = Join-Path $WebRoot "assets\spots"
$AttributionsPath = Join-Path $WebRoot "assets\ATTRIBUTIONS.md"
$CppData = Join-Path $RepoRoot "cpp\data"
$WebData = Join-Path $RepoRoot "web\data"

foreach ($Path in @($Index, $Styles, $App, $Assets, $AttributionsPath, $CppData, $WebData)) {
  if (-not (Test-Path -LiteralPath $Path)) { throw "Missing required path: $Path" }
}

function Read-Json {
  param([string]$Path)
  return Get-Content -Raw -Encoding UTF8 -Path $Path | ConvertFrom-Json
}

function New-Text {
  param([int[]]$CodePoints)
  return -join ($CodePoints | ForEach-Object { [char]$_ })
}

function New-EdgeAdjacency {
  param([object[]]$Edges, [string]$Mode)
  $Adjacency = @{}
  foreach ($Edge in @($Edges)) {
    if ($Edge.mode -ne "both" -and $Edge.mode -ne $Mode) { continue }
    $From = [int]$Edge.from
    if (-not $Adjacency.ContainsKey($From)) { $Adjacency[$From] = [System.Collections.ArrayList]::new() }
    [void]$Adjacency[$From].Add($Edge)
  }
  return $Adjacency
}

function Find-ShortestPathWithEdgeData {
  param([object[]]$Edges, [int]$Start, [int]$Goal, [string]$Mode)
  $Adjacency = New-EdgeAdjacency -Edges $Edges -Mode $Mode
  $Dist = @{}
  $Prev = @{}
  $PrevEdge = @{}
  $Queue = [System.Collections.ArrayList]::new()
  $Dist[$Start] = 0.0
  [void]$Queue.Add([pscustomobject]@{ Node = $Start; Distance = 0.0 })

  while ($Queue.Count -gt 0) {
    $Current = @($Queue | Sort-Object Distance)[0]
    [void]$Queue.Remove($Current)
    if ([double]$Current.Distance -ne [double]$Dist[[int]$Current.Node]) { continue }
    if ([int]$Current.Node -eq $Goal) { break }
    $Outgoing = if ($Adjacency.ContainsKey([int]$Current.Node)) { $Adjacency[[int]$Current.Node] } else { @() }
    foreach ($Edge in @($Outgoing)) {
      $NextDistance = [double]$Current.Distance + [double]$Edge.distance
      if (-not $Dist.ContainsKey([int]$Edge.to) -or $NextDistance -lt [double]$Dist[[int]$Edge.to]) {
        $Dist[[int]$Edge.to] = $NextDistance
        $Prev[[int]$Edge.to] = [int]$Current.Node
        $PrevEdge[[int]$Edge.to] = $Edge
        [void]$Queue.Add([pscustomobject]@{ Node = [int]$Edge.to; Distance = $NextDistance })
      }
    }
  }
  if (-not $Dist.ContainsKey($Goal)) {
    return [pscustomobject]@{ Nodes = @(); Edges = @(); Distance = [double]::PositiveInfinity }
  }
  $Path = [System.Collections.ArrayList]::new()
  $PathEdges = [System.Collections.ArrayList]::new()
  for ($Node = $Goal; $Node -ne $null; $Node = $Prev[$Node]) {
    [void]$Path.Insert(0, [int]$Node)
    if ([int]$Node -eq $Start) { break }
    [void]$PathEdges.Insert(0, $PrevEdge[[int]$Node])
  }
  return [pscustomobject]@{ Nodes = @($Path); Edges = @($PathEdges); Distance = [double]$Dist[$Goal] }
}

function Assert-RegionDataPack {
  param(
    [string]$DataDir,
    [string]$Label,
    [int]$ExpectedPoi,
    [int]$ExpectedSpots,
    [int]$MinEdges,
    [int]$MinFacilities,
    [int]$MinRestaurants,
    [int]$MinDiaries,
    [object[]]$Routes
  )

  $Nodes = Read-Json (Join-Path $DataDir "osm_nodes.json")
  $Edges = Read-Json (Join-Path $DataDir "osm_edges.json")
  $Spots = Read-Json (Join-Path $DataDir "spots.json")
  $Restaurants = Read-Json (Join-Path $DataDir "restaurants.json")
  $Facilities = Read-Json (Join-Path $DataDir "facilities.json")
  $Diaries = Read-Json (Join-Path $DataDir "diaries\index.json")

  $PoiNodes = @($Nodes | Where-Object { [int]$_.spot_id -gt 0 })
  $RoadNodes = @($Nodes | Where-Object { [int]$_.spot_id -eq 0 })
  if ($PoiNodes.Count -ne $ExpectedPoi) { throw "$Label must contain $ExpectedPoi selectable POI nodes, found $($PoiNodes.Count)" }
  if ($RoadNodes.Count -lt 400 -or $RoadNodes.Count -gt 700) { throw "$Label transition nodes must be 400-700, found $($RoadNodes.Count)" }
  if (@($Edges).Count -lt $MinEdges) { throw "$Label must contain at least $MinEdges directed OSM edges, found $(@($Edges).Count)" }
  if (@($Spots).Count -ne $ExpectedSpots) { throw "$Label must contain $ExpectedSpots spots, found $(@($Spots).Count)" }
  if (@($Restaurants).Count -lt $MinRestaurants) { throw "$Label must contain at least $MinRestaurants restaurants, found $(@($Restaurants).Count)" }
  if (@($Facilities).Count -lt $MinFacilities) { throw "$Label must contain at least $MinFacilities facilities, found $(@($Facilities).Count)" }
  if (@($Diaries).Count -lt $MinDiaries) { throw "$Label must contain at least $MinDiaries diary entries, found $(@($Diaries).Count)" }

  $NodeById = @{}
  foreach ($Node in @($Nodes)) { $NodeById[[int]$Node.id] = $Node }

  $MaxEdge = 0.0
  foreach ($Edge in @($Edges)) {
    $From = $NodeById[[int]$Edge.from]
    $To = $NodeById[[int]$Edge.to]
    if (-not $From -or -not $To) { throw "$Label edge references missing node: $($Edge.from)->$($Edge.to)" }
    if ([int]$From.spot_id -gt 0 -and [int]$To.spot_id -gt 0) {
      throw "$Label must not contain direct POI-to-POI OSM edge: $($Edge.from)->$($Edge.to)"
    }
    $MaxEdge = [Math]::Max($MaxEdge, [double]$Edge.distance)
  }
  if ($MaxEdge -gt 120.1) { throw "$Label must keep output route segments near 120m or less; max edge was $MaxEdge" }

  foreach ($Poi in @($PoiNodes)) {
    $AccessEdges = @($Edges | Where-Object {
      [int]$_.from -eq [int]$Poi.id -or [int]$_.to -eq [int]$Poi.id
    } | Where-Object {
      $OtherId = if ([int]$_.from -eq [int]$Poi.id) { [int]$_.to } else { [int]$_.from }
      $Other = $NodeById[$OtherId]
      $Other -and [int]$Other.spot_id -eq 0
    })
    if ($AccessEdges.Count -eq 0) { throw "$Label POI has no transition-node access edge: $($Poi.name)" }
  }

  foreach ($Pair in @($Routes)) {
    $Route = Find-ShortestPathWithEdgeData -Edges $Edges -Start $Pair[0] -Goal $Pair[1] -Mode "walk"
    if ($Route.Nodes.Count -lt 3) { throw "$Label route $($Pair[0])->$($Pair[1]) must include transition nodes." }
    $TransitionCount = @($Route.Nodes | Where-Object {
      $NodeById[[int]$_] -and [int]$NodeById[[int]$_].spot_id -eq 0
    }).Count
    if ($TransitionCount -eq 0) { throw "$Label route $($Pair[0])->$($Pair[1]) did not use transition nodes." }
    $RouteMaxEdge = 0.0
    foreach ($Edge in @($Route.Edges)) { $RouteMaxEdge = [Math]::Max($RouteMaxEdge, [double]$Edge.distance) }
    if ($RouteMaxEdge -gt 120.1) {
      throw "$Label route $($Pair[0])->$($Pair[1]) has a segment longer than 120m: $RouteMaxEdge"
    }
  }

  foreach ($Poi in @($PoiNodes)) {
    $PoiImage = [string]$Poi.image
    if (-not $PoiImage) { throw "$Label POI must include an image: $($Poi.name)" }
    if ($Label -like "*Summer Palace*" -and $PoiImage -like "*.svg") {
      throw "$Label POI must use a real photo instead of SVG placeholder: $($Poi.name) -> $PoiImage"
    }
  }

  $ImagePaths = @($Nodes | ForEach-Object { $_.image } | Sort-Object -Unique)
  foreach ($ImagePath in $ImagePaths) {
    if ([string]$ImagePath -match '^https?://') { continue }
    $LocalImage = Join-Path $RepoRoot $ImagePath
    if (-not (Test-Path -LiteralPath $LocalImage)) { throw "$Label references missing image asset: $ImagePath" }
  }
}

function Assert-Manifest {
  param([string]$DataDir, [string]$Label)
  $Regions = Read-Json (Join-Path $DataDir "regions\manifest.json")
  if (@($Regions).Count -ne 2) { throw "$Label manifest must contain exactly 2 regions, found $(@($Regions).Count)" }
  $Names = @($Regions | Sort-Object id | ForEach-Object { $_.name })
  $ExpectedNames = @(
    (New-Text @(39056, 21644, 22253)),
    (New-Text @(28165, 21326, 22823, 23398))
  )
  if (($Names -join "|") -ne ($ExpectedNames -join "|")) { throw "$Label manifest names must be Summer Palace and Tsinghua University, found $($Names -join ', ')" }
  foreach ($Region in @($Regions)) {
    foreach ($Field in @("nodes_path", "edges_path", "spots_path", "facilities_path", "restaurants_path", "diaries_path")) {
      if (-not $Region.PSObject.Properties[$Field] -or -not $Region.$Field) { throw "$Label manifest region $($Region.id) missing $Field" }
    }
    if ([string]$Region.name -like "*数据集*" -or [string]$Region.name -like "*数据包*") {
      throw "$Label manifest region name must not include 数据集/数据包: $($Region.name)"
    }
  }
}

Assert-Manifest -DataDir $CppData -Label "cpp/data"
Assert-Manifest -DataDir $WebData -Label "web/data"

Assert-RegionDataPack -DataDir $CppData -Label "cpp/data Summer Palace" -ExpectedPoi 20 -ExpectedSpots 20 -MinEdges 1000 -MinFacilities 50 -MinRestaurants 50 -MinDiaries 10 -Routes @(@(1, 8), @(9, 13), @(20, 6))
Assert-RegionDataPack -DataDir $WebData -Label "web/data Summer Palace" -ExpectedPoi 20 -ExpectedSpots 20 -MinEdges 1000 -MinFacilities 50 -MinRestaurants 50 -MinDiaries 10 -Routes @(@(1, 8), @(9, 13), @(20, 6))
Assert-RegionDataPack -DataDir (Join-Path $CppData "regions\tsinghua_campus") -Label "cpp/data Tsinghua" -ExpectedPoi 14 -ExpectedSpots 14 -MinEdges 800 -MinFacilities 8 -MinRestaurants 6 -MinDiaries 10 -Routes @(@(1, 4), @(14, 10), @(3, 8))
Assert-RegionDataPack -DataDir (Join-Path $WebData "regions\tsinghua_campus") -Label "web/data Tsinghua" -ExpectedPoi 14 -ExpectedSpots 14 -MinEdges 800 -MinFacilities 8 -MinRestaurants 6 -MinDiaries 10 -Routes @(@(1, 4), @(14, 10), @(3, 8))

$CppFacilitiesRaw = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $CppData "facilities.json")
$WebFacilitiesRaw = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $WebData "facilities.json")
if ($CppFacilitiesRaw -ne $WebFacilitiesRaw) { throw "Summer Palace facilities must be byte-identical between cpp/data and web/data." }
$SummerFacilities = $CppFacilitiesRaw | ConvertFrom-Json
$SummerSpots = Read-Json (Join-Path $CppData "spots.json")
$SummerSpotIds = @{}
foreach ($Spot in @($SummerSpots)) { $SummerSpotIds[[int]$Spot.id] = $true }
$FacilityTypes = @{}
$PlaceholderRecommendPoint = New-Text @(25512, 33616, 28857)
$PlaceholderServiceFacility = New-Text @(26381, 21153, 35774, 26045)
foreach ($Facility in @($SummerFacilities)) {
  if (-not $SummerSpotIds.ContainsKey([int]$Facility.near_spot_id)) { throw "Facility references missing spot id: $($Facility.name)" }
  if ([double]$Facility.lat -lt 39.9850 -or [double]$Facility.lat -gt 40.0120 -or [double]$Facility.lon -lt 116.2550 -or [double]$Facility.lon -gt 116.3050) {
    throw "Facility outside Summer Palace bbox: $($Facility.name)"
  }
  if ([string]$Facility.name -match '\d+$') { throw "Facility name must not keep generated numeric suffix: $($Facility.name)" }
  if ([string]$Facility.name -like "*$PlaceholderRecommendPoint*" -or [string]$Facility.name -like "*$PlaceholderServiceFacility*") { throw "Facility name must be realistic, found placeholder wording: $($Facility.name)" }
  $FacilityTypes[[string]$Facility.type] = $true
}
$RequiredFacilityTypes = @(
  (New-Text @(21355, 29983, 38388)),
  (New-Text @(28216, 23458, 26381, 21153)),
  (New-Text @(21806, 31080, 22788)),
  (New-Text @(39278, 27700, 28857)),
  (New-Text @(24613, 25937, 28857)),
  (New-Text @(20572, 36710, 22330)),
  (New-Text @(22320, 38081, 31449)),
  (New-Text @(21830, 24215)),
  (New-Text @(35266, 26223, 21488))
)
foreach ($RequiredType in $RequiredFacilityTypes) {
  if (-not $FacilityTypes.ContainsKey($RequiredType)) { throw "Summer Palace facilities missing type: $RequiredType" }
}

$IndexText = Get-Content -Raw -Encoding UTF8 -Path $Index
$StyleText = Get-Content -Raw -Encoding UTF8 -Path $Styles
$AppText = Get-Content -Raw -Encoding UTF8 -Path $App

foreach ($Needle in @("mapRegionSelect", "datasetMapButton", "MAP_REGIONS", "全国视野", "上海", "广州", "深圳", "成都", "西安", "杭州", "武汉", "重庆")) {
  if ($IndexText -like "*$Needle*" -or $AppText -like "*$Needle*") {
    throw "Frontend active UI/code must not contain stale map option/reference: $Needle"
  }
}
foreach ($Needle in @("fixed-map-region", "regionPackSelect", "selectableRouteNodes", "renderRoadNetwork", "route-summary", "diaries_path")) {
  if ($IndexText -notlike "*$Needle*" -and $AppText -notlike "*$Needle*" -and $StyleText -notlike "*$Needle*") {
    throw "Frontend missing expected dual-region hook: $Needle"
  }
}
foreach ($Needle in @("spotReviewSnippets", "spot-review-list", "diaryScopeSelect", "vagabond.diaryScope", "vagabond.aigcConfig", "loadAigcConfig", "callAigcApi", "generateAigcStoryboard", "renderAigcMotion", "aigc-motion-stage", "spotInvertedIndex", "diaryInvertedIndex", "routeConsistencyCheck")) {
  if ($IndexText -notlike "*$Needle*" -and $AppText -notlike "*$Needle*" -and $StyleText -notlike "*$Needle*") {
    throw "Frontend missing planned optimization hook: $Needle"
  }
}
if ($IndexText -like "*数据集*" -or $IndexText -like "*数据包*") {
  throw "Visible region UI must not use 数据集/数据包 naming."
}
if ($AppText -like '*edge.from < edge.to && edgeSupportsMode(edge, state.mode)*' -or $AppText -like '*edgeLayers.push(layer)*') {
  throw "Frontend must not render the full road network by default."
}

$AttributionsText = Get-Content -Raw -Encoding UTF8 -Path $AttributionsPath
foreach ($Needle in @("OpenStreetMap", "ODbL", "The_Long_Corridor", "Seventeen-Arch_Bridge", "TsinghuaUniversityGate", "Main_building_of_Tsinghua_University")) {
  if ($AttributionsText -notlike "*$Needle*") { throw "Attribution file must include source: $Needle" }
}

Write-Host "Frontend smoke verification passed for Summer Palace and Tsinghua regions."
