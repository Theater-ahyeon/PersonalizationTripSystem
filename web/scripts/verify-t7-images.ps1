$ErrorActionPreference = "Stop"

$WebRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$RepoRoot = Resolve-Path (Join-Path $WebRoot "..")
$CppData = Join-Path $RepoRoot "cpp\data"
$WebData = Join-Path $RepoRoot "web\data"

function Read-Json {
  param([string]$Path)
  return Get-Content -Raw -Encoding UTF8 -Path $Path | ConvertFrom-Json
}

function Read-JsonArray {
  param([string]$Path)
  $Data = Read-Json $Path
  if ($null -eq $Data) { return @() }
  return @($Data | ForEach-Object { $_ })
}

function Assert-LocalImage {
  param(
    [string]$Label,
    [object]$Item,
    [string]$ExpectedPrefix
  )

  $Image = [string]$Item.image
  if (-not $Image) {
    throw "$Label is missing an image field: $($Item.name)$($Item.title)"
  }
  if (-not $Image.StartsWith($ExpectedPrefix)) {
    throw "$Label image must start with $ExpectedPrefix, found: $Image"
  }
  if ($Image -match '^https?://') {
    throw "$Label image must be local, found remote URL: $Image"
  }

  $LocalPath = Join-Path $RepoRoot $Image
  if (-not (Test-Path -LiteralPath $LocalPath)) {
    throw "$Label references missing local image asset: $Image"
  }

  $File = Get-Item -LiteralPath $LocalPath
  if ($File.Length -lt 20480) {
    throw "$Label image asset is unexpectedly small: $Image ($($File.Length) bytes)"
  }
}

function Assert-RestaurantImages {
  param([string]$Path, [string]$Label)
  $Restaurants = Read-JsonArray $Path
  if ($Restaurants.Count -eq 0) { throw "$Label has no restaurant data" }
  foreach ($Restaurant in $Restaurants) {
    Assert-LocalImage -Label "$Label restaurant" -Item $Restaurant -ExpectedPrefix "web/assets/food/"
  }
}

function Assert-DiaryImages {
  param([string]$Path, [string]$Label)
  $Diaries = Read-JsonArray $Path
  if ($Diaries.Count -eq 0) { throw "$Label has no diary data" }
  foreach ($Diary in $Diaries) {
    Assert-LocalImage -Label "$Label diary" -Item $Diary -ExpectedPrefix "web/assets/diaries/"
  }

  $Groups = $Diaries | Group-Object image
  $MaxReuse = ($Groups | Measure-Object Count -Maximum).Maximum
  if ($MaxReuse -gt 2) {
    throw "$Label diary images are too repetitive; one image is reused $MaxReuse times"
  }
}

function Assert-PlanRestaurantImageMap {
  param(
    [string]$DataRoot,
    [string]$Label
  )

  $PlanDir = Join-Path $RepoRoot "plan"
  $PlanImages = @(Get-ChildItem -LiteralPath $PlanDir -File -Filter "*.png")
  if ($PlanImages.Count -ne 22) {
    throw "$Label expected 22 plan food images, found $($PlanImages.Count)"
  }

  $Datasets = @(
    @{
      Id = "summer_palace"
      Path = Join-Path $DataRoot "restaurants.json"
      AssetPrefix = "web/assets/food/summer_palace"
    },
    @{
      Id = "tsinghua_campus"
      Path = Join-Path $DataRoot "regions\tsinghua_campus\restaurants.json"
      AssetPrefix = "web/assets/food/tsinghua_campus"
    }
  )

  $Restaurants = @()
  foreach ($Dataset in $Datasets) {
    foreach ($Restaurant in (Read-JsonArray $Dataset.Path)) {
      $Restaurants += [pscustomobject]@{
        Dataset = $Dataset.Id
        AssetPrefix = $Dataset.AssetPrefix
        Data = $Restaurant
        Name = [string]$Restaurant.name
      }
    }
  }

  foreach ($ImageFile in $PlanImages) {
    $BaseName = [System.IO.Path]::GetFileNameWithoutExtension($ImageFile.Name)
    $Matches = @($Restaurants | Where-Object { $_.Name -eq $BaseName })
    if ($Matches.Count -eq 0) {
      $Matches = @($Restaurants | Where-Object { $_.Name.Contains($BaseName) -or $BaseName.Contains($_.Name) })
    }
    if ($Matches.Count -eq 0) {
      throw "$Label has no restaurant matching plan image: $($ImageFile.Name)"
    }
    if ($Matches.Count -gt 1) {
      $Names = ($Matches | ForEach-Object { $_.Name }) -join ", "
      throw "$Label plan image $($ImageFile.Name) matches multiple restaurants: $Names"
    }

    $Match = $Matches[0]
    $Expected = "$($Match.AssetPrefix)/$($ImageFile.Name)"
    $Actual = [string]$Match.Data.image
    if ($Actual -ne $Expected) {
      throw "$Label restaurant $($Match.Name) must use $Expected, found: $Actual"
    }
    Assert-LocalImage -Label "$Label restaurant $($Match.Name)" -Item $Match.Data -ExpectedPrefix "web/assets/food/"
  }
}

Assert-RestaurantImages -Path (Join-Path $CppData "restaurants.json") -Label "Summer Palace"
Assert-RestaurantImages -Path (Join-Path $CppData "regions\tsinghua_campus\restaurants.json") -Label "Tsinghua"
Assert-PlanRestaurantImageMap -DataRoot $CppData -Label "cpp/data"
Assert-DiaryImages -Path (Join-Path $CppData "diaries\index.json") -Label "Summer Palace"
Assert-DiaryImages -Path (Join-Path $CppData "regions\tsinghua_campus\diaries\index.json") -Label "Tsinghua"

Assert-RestaurantImages -Path (Join-Path $WebData "restaurants.json") -Label "web/data Summer Palace"
Assert-RestaurantImages -Path (Join-Path $WebData "regions\tsinghua_campus\restaurants.json") -Label "web/data Tsinghua"
Assert-PlanRestaurantImageMap -DataRoot $WebData -Label "web/data"
Assert-DiaryImages -Path (Join-Path $WebData "diaries\index.json") -Label "web/data Summer Palace"
Assert-DiaryImages -Path (Join-Path $WebData "regions\tsinghua_campus\diaries\index.json") -Label "web/data Tsinghua"

Write-Host "T7 image verification passed for restaurant and diary data."
