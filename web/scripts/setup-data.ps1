$ErrorActionPreference = "Stop"

# Copy cpp/data JSON files into web/data/ so the HTTP server can serve them.
# Run from project root whenever cpp/data files change.

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot ".." | Join-Path -ChildPath "..")
$SourceData = Join-Path $RepoRoot "cpp\data"
$DestData = Join-Path $RepoRoot "web\data"

function ConvertTo-WebManifestPaths {
    param([string]$ManifestPath)
    if (-not (Test-Path -LiteralPath $ManifestPath)) { return }
    $Regions = Get-Content -Raw -Encoding UTF8 -LiteralPath $ManifestPath | ConvertFrom-Json
    foreach ($Region in @($Regions)) {
        foreach ($Field in @("nodes_path", "edges_path", "spots_path", "roads_path", "facilities_path", "restaurants_path", "diaries_path")) {
            if (-not $Region.PSObject.Properties[$Field]) { continue }
            $Value = [string]$Region.$Field
            $Value = $Value -replace '^\.\./cpp/data/', './data/'
            $Value = $Value -replace '^\.\.\\cpp\\data\\', './data/'
            $Value = $Value -replace '\\', '/'
            $Region.$Field = $Value
        }
    }
    $Regions | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 -LiteralPath $ManifestPath
}

Write-Host "Copying data files from $SourceData ..."

# Ensure destination directories exist
foreach ($SubDir in @("", "diaries", "regions")) {
    $Target = if ($SubDir) { Join-Path $DestData $SubDir } else { $DestData }
    if (-not (Test-Path $Target)) {
        New-Item -ItemType Directory -Force -Path $Target | Out-Null
    }
}

# Copy all JSON files
Copy-Item -Path (Join-Path $SourceData "*.json") -Destination $DestData -Force
Copy-Item -Path (Join-Path $SourceData "diaries\*") -Destination (Join-Path $DestData "diaries") -Force
Copy-Item -Path (Join-Path $SourceData "regions\*") -Destination (Join-Path $DestData "regions") -Recurse -Force
ConvertTo-WebManifestPaths -ManifestPath (Join-Path $DestData "regions\manifest.json")

Write-Host "Data files copied to $DestData"
Write-Host "Done. Run 'python -m http.server 5173 --directory web' to start the frontend."
