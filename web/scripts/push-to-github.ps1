$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RepoRoot

$GitName = "Theater-ahyeon"
$GitEmail = "Theater-ahyeon@users.noreply.github.com"

if (Test-Path ".git\rebase-merge") {
    Write-Host "Rebase in progress. Finish or abort it first:"
    Write-Host "  git rebase --continue   OR   git rebase --abort"
    exit 1
}

Write-Host "1/5 Fetch remote..."
git fetch origin my-feature

Write-Host "2/5 Stage files (never .env)..."
git add `
  web/index.html `
  web/styles.css `
  web/scripts/core.js `
  web/scripts/route-indoor.js `
  web/scripts/data.js `
  web/scripts/startup.js `
  web/scripts/map-controller.js `
  web/scripts/generate-osm-data.mjs `
  web/scripts/push-to-github.ps1

$pending = git diff --cached --name-only
if (-not $pending) {
    Write-Host "No staged changes. Showing status:"
    git status -sb
    exit 0
}

Write-Host "Staged:"
$pending | ForEach-Object { Write-Host "  $_" }

Write-Host "3/5 Commit..."
$CommitBody = @"
Show per-segment walk/cart colors on the map, surface segment breakdown in the route panel, and translate OSM road names for the Summer Palace demo.
"@
git -c "user.name=$GitName" -c "user.email=$GitEmail" commit -m "Add mixed-route segment display and localized road labels." -m $CommitBody

Write-Host "4/5 Pull rebase..."
git pull --rebase origin my-feature

Write-Host "5/5 Push..."
git push -u origin HEAD

Write-Host ""
Write-Host "Done."
Write-Host "Commit: $(git rev-parse HEAD)"
Write-Host "Branch: $(git branch --show-current)"
Write-Host "Remote: $(git remote get-url origin)"
