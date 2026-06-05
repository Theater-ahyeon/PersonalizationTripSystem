$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RepoRoot

$GitName = "Theater-ahyeon"
$GitEmail = "Theater-ahyeon@users.noreply.github.com"

if (Test-Path ".git\rebase-merge") {
    Write-Host "Rebase in progress: staging conflict resolution..."
    git add web/app.js
    git -c "user.name=$GitName" -c "user.email=$GitEmail" rebase --continue
} else {
    Write-Host "1/4 Fetch remote..."
    git fetch origin my-feature

    Write-Host "2/4 Stage files (excluding .env)..."
    git add .env.example .gitignore `
      web/scripts/aigc-proxy.py web/scripts/aigc-proxy.mjs `
      web/scripts/start-aigc.ps1 web/scripts/start-demo.ps1 `
      web/scripts/push-to-github.ps1 `
      web/app.js web/index.html web/styles.css

    $pending = git diff --cached --name-only
    if ($pending) {
        Write-Host "3/4 Commit..."
        git -c "user.name=$GitName" -c "user.email=$GitEmail" commit -m "Switch AIGC defaults to economical free-tier models." -m "Use qwen-turbo, wanx2.0-t2i-turbo, and wanx2.1-t2v-turbo to maximize Bailian free quotas, and improve proxy env reload and audio mode reporting."
    }

    Write-Host "4/4 Pull rebase + push..."
    git pull --rebase origin my-feature
}

git push -u origin HEAD

Write-Host ""
Write-Host "Done."
Write-Host "Commit: $(git rev-parse HEAD)"
Write-Host "Branch: $(git branch --show-current)"
Write-Host "Remote: $(git remote get-url origin)"
