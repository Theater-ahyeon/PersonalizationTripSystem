$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$EnvFile = Join-Path $RepoRoot ".env"
$HealthUrl = "http://127.0.0.1:5174/api/aigc/health"

$env:PYTHONDONTWRITEBYTECODE = "1"

function Test-AigcProxyHealth {
    try {
        $health = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 2
        return [bool]$health.ok
    } catch {
        return $false
    }
}

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            Set-Item -Path "Env:$name" -Value $value
        }
    }
}

if (Test-AigcProxyHealth) {
    Write-Host "AIGC proxy already running on $HealthUrl"
    return
}

Write-Host "Starting AIGC proxy on http://127.0.0.1:5174 ..."
if (-not $env:DASHSCOPE_API_KEY) {
    Write-Host "Warning: DASHSCOPE_API_KEY not set. Copy .env.example to .env and add your DashScope key."
}

python -B -u (Join-Path $RepoRoot "web\scripts\aigc-proxy.py")
