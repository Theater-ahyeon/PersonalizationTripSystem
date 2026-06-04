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
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing required path: $Path"
  }
}

function Read-Json {
  param([string]$Path)
  return Get-Content -Raw -Encoding UTF8 -Path $Path | ConvertFrom-Json
}

function New-EdgeAdjacency {
  param(
    [object[]]$Edges,
    [string]$Mode
  )
  $Adjacency = @{}
  foreach ($Edge in @($Edges)) {
    if ($Edge.mode -ne "both" -and $Edge.mode -ne $Mode) { continue }
    $From = [int]$Edge.from
    if (-not $Adjacency.ContainsKey($From)) {
      $Adjacency[$From] = [System.Collections.ArrayList]::new()
    }
    [void]$Adjacency[$From].Add($Edge)
  }
  return $Adjacency
}

function Find-ShortestPathWithEdgeData {
  param(
    [object[]]$Edges,
    [int]$Start,
    [int]$Goal,
    [string]$Mode
  )
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

function Assert-SummerDataPack {
  param(
    [string]$DataDir,
    [string]$Label
  )

  $Nodes = Read-Json (Join-Path $DataDir "osm_nodes.json")
  $Edges = Read-Json (Join-Path $DataDir "osm_edges.json")
  $Spots = Read-Json (Join-Path $DataDir "spots.json")
  $Restaurants = Read-Json (Join-Path $DataDir "restaurants.json")
  $Facilities = Read-Json (Join-Path $DataDir "facilities.json")
  $Users = Read-Json (Join-Path $DataDir "users.json")
  $Diaries = Read-Json (Join-Path $DataDir "diaries\index.json")
  $Regions = Read-Json (Join-Path $DataDir "regions\manifest.json")

  $PoiNodes = @($Nodes | Where-Object { [int]$_.spot_id -gt 0 })
  $RoadNodes = @($Nodes | Where-Object { [int]$_.spot_id -eq 0 })
  if ($PoiNodes.Count -ne 20) { throw "$Label must contain exactly 20 selectable POI nodes, found $($PoiNodes.Count)" }
  if ($RoadNodes.Count -lt 400 -or $RoadNodes.Count -gt 700) { throw "$Label transition nodes must be 400-700, found $($RoadNodes.Count)" }
  if (@($Edges).Count -lt 1000) { throw "$Label must contain at least 1000 directed OSM edges, found $(@($Edges).Count)" }
  if (@($Spots).Count -ne 20) { throw "$Label must contain exactly 20 spots, found $(@($Spots).Count)" }
  if (@($Restaurants).Count -lt 50) { throw "$Label must contain at least 50 restaurants, found $(@($Restaurants).Count)" }
  if (@($Facilities).Count -lt 50) { throw "$Label must contain at least 50 facilities, found $(@($Facilities).Count)" }
  if (@($Users).Count -lt 10) { throw "$Label must contain at least 10 users, found $(@($Users).Count)" }
  if (@($Diaries).Count -lt 10) { throw "$Label must contain at least 10 diary entries, found $(@($Diaries).Count)" }
  if (@($Regions).Count -ne 1 -or $Regions[0].id -ne "summer_palace") {
    throw "$Label manifest must contain only summer_palace."
  }

  $NodeById = @{}
  foreach ($Node in @($Nodes)) {
    $NodeById[[int]$Node.id] = $Node
    if ([string]$Node.name -like "*清华*" -or [string]$Node.image -like "*tsinghua*") {
      throw "$Label must not contain active Tsinghua node/image data: $($Node.name)"
    }
  }

  $MaxEdge = 0.0
  foreach ($Edge in @($Edges)) {
    $From = $NodeById[[int]$Edge.from]
    $To = $NodeById[[int]$Edge.to]
    if (-not $From -or -not $To) {
      throw "$Label edge references missing node: $($Edge.from)->$($Edge.to)"
    }
    if ([int]$From.spot_id -gt 0 -and [int]$To.spot_id -gt 0) {
      throw "$Label must not contain direct POI-to-POI OSM edge: $($Edge.from)->$($Edge.to)"
    }
    $MaxEdge = [Math]::Max($MaxEdge, [double]$Edge.distance)
  }
  if ($MaxEdge -gt 120.1) {
    throw "$Label must keep output route segments near 120m or less; max edge was $MaxEdge"
  }

  foreach ($Poi in @($PoiNodes)) {
    $AccessEdges = @($Edges | Where-Object {
      [int]$_.from -eq [int]$Poi.id -or [int]$_.to -eq [int]$Poi.id
    } | Where-Object {
      $OtherId = if ([int]$_.from -eq [int]$Poi.id) { [int]$_.to } else { [int]$_.from }
      $Other = $NodeById[$OtherId]
      $Other -and [int]$Other.spot_id -eq 0
    })
    if ($AccessEdges.Count -eq 0) {
      throw "$Label POI has no transition-node access edge: $($Poi.name)"
    }
  }

  foreach ($Pair in @(@(1, 8), @(9, 13), @(20, 6))) {
    $Route = Find-ShortestPathWithEdgeData -Edges $Edges -Start $Pair[0] -Goal $Pair[1] -Mode "walk"
    if ($Route.Nodes.Count -lt 3) {
      throw "$Label route $($Pair[0])->$($Pair[1]) must include transition nodes."
    }
    $TransitionCount = @($Route.Nodes | Where-Object {
      $NodeById[[int]$_] -and [int]$NodeById[[int]$_].spot_id -eq 0
    }).Count
    if ($TransitionCount -eq 0) {
      throw "$Label route $($Pair[0])->$($Pair[1]) did not use transition nodes."
    }
    $RouteMaxEdge = 0.0
    foreach ($Edge in @($Route.Edges)) {
      $RouteMaxEdge = [Math]::Max($RouteMaxEdge, [double]$Edge.distance)
    }
    if ($RouteMaxEdge -gt 120.1) {
      throw "$Label route $($Pair[0])->$($Pair[1]) has a segment longer than 120m: $RouteMaxEdge"
    }
  }

  $ImagePaths = @($Nodes | ForEach-Object { $_.image } | Sort-Object -Unique)
  foreach ($ImagePath in $ImagePaths) {
    $LocalImage = Join-Path $RepoRoot $ImagePath
    if (-not (Test-Path -LiteralPath $LocalImage)) {
      throw "$Label references missing image asset: $ImagePath"
    }
  }
}

Assert-SummerDataPack -DataDir $CppData -Label "cpp/data"
Assert-SummerDataPack -DataDir $WebData -Label "web/data"

$IndexText = Get-Content -Raw -Encoding UTF8 -Path $Index
$StyleText = Get-Content -Raw -Encoding UTF8 -Path $Styles
$AppText = Get-Content -Raw -Encoding UTF8 -Path $App

foreach ($Needle in @("mapRegionSelect", "datasetMapButton", "MAP_REGIONS", "全国视野", "上海", "广州", "深圳", "成都", "西安", "杭州", "武汉", "重庆", "清华", "tsinghua")) {
  if ($IndexText -like "*$Needle*" -or $AppText -like "*$Needle*") {
    throw "Frontend active UI/code must not contain stale option/reference: $Needle"
  }
}

foreach ($Needle in @("fixed-map-region", "mapDataNotice", "regionPackSelect", "selectableRouteNodes", "renderRoadNetwork", "route-summary")) {
  if ($IndexText -notlike "*$Needle*" -and $AppText -notlike "*$Needle*" -and $StyleText -notlike "*$Needle*") {
    throw "Frontend missing expected single-dataset/performance hook: $Needle"
  }
}

if ($AppText -notlike '*fillNodeSelect(byId("startSelect"), selectableRouteNodes())*' -or
    $AppText -notlike '*fillNodeSelect(byId("goalSelect"), selectableRouteNodes())*' -or
    $AppText -notlike '*fillNodeSelect(byId("facilityOriginSelect"), selectableRouteNodes())*') {
  throw "Route and facility selectors must use selectable POI nodes only."
}

if ($AppText -like '*edge.from < edge.to && edgeSupportsMode(edge, state.mode)*' -or $AppText -like '*edgeLayers.push(layer)*') {
  throw "Frontend must not render the full road network by default."
}

$AttributionsText = Get-Content -Raw -Encoding UTF8 -Path $AttributionsPath
foreach ($Needle in @("OpenStreetMap", "ODbL", "The_Long_Corridor", "Seventeen-Arch_Bridge")) {
  if ($AttributionsText -notlike "*$Needle*") {
    throw "Attribution file must include source: $Needle"
  }
}
foreach ($Needle in @("Tsinghua", "TsinghuaUniversityGate", "Former_gate_of_Tsinghua_University", "Grand_hall_of_Tsinghua_University", "Main_building_of_Tsinghua_University")) {
  if ($AttributionsText -like "*$Needle*") {
    throw "Attribution file must not include stale Tsinghua source: $Needle"
  }
}

$RealJpgs = @(Get-ChildItem -Path (Join-Path $Assets "real") -Filter *.jpg -File)
if ($RealJpgs.Count -lt 4) {
  throw "Expected Summer Palace real JPG assets to remain, found $($RealJpgs.Count)"
}

Write-Host "Frontend smoke verification passed for Summer Palace single dataset."
