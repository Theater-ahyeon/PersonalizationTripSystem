$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$AigcScript = Join-Path $RepoRoot "web\scripts\start-aigc.ps1"

Write-Host "Starting AIGC proxy in background..."
Start-Process powershell -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $AigcScript
) -WindowStyle Minimized

Start-Sleep -Seconds 2

Write-Host "Starting web demo on http://127.0.0.1:5173 ..."
Set-Location $RepoRoot
python -m http.server 5173 --directory web
