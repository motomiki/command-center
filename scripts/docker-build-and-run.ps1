# Supabase を本番用に埋め込んで Docker ビルド・実行するスクリプト
# 使い方: プロジェクトルートで .\scripts\docker-build-and-run.ps1 を実行
# 前提: .env に VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY が設定されていること

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $ProjectRoot

$envPath = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envPath)) {
    Write-Error ".env が見つかりません。.env.example をコピーして VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。"
}

$envContent = Get-Content $envPath -Raw
$url = $null
$key = $null
foreach ($line in (Get-Content $envPath)) {
    if ($line -match '^\s*VITE_SUPABASE_URL=(.+)$') { $url = $matches[1].Trim() }
    if ($line -match '^\s*VITE_SUPABASE_ANON_KEY=(.+)$') { $key = $matches[1].Trim() }
}

if (-not $url -or -not $key -or $url -eq "https://your-project-ref.supabase.co" -or $key -eq "your-anon-key-here") {
    Write-Error ".env に本番用の VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。"
}

Write-Host "Docker イメージをビルドしています（Supabase を埋め込み）..." -ForegroundColor Cyan
docker build `
    --build-arg "VITE_SUPABASE_URL=$url" `
    --build-arg "VITE_SUPABASE_ANON_KEY=$key" `
    -t campusclub-dashboard .

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "コンテナを起動しています。http://localhost:8080 でアクセスできます。" -ForegroundColor Green
Write-Host "停止するには Ctrl+C を押してください。" -ForegroundColor Yellow
docker run --rm -p 8080:8080 campusclub-dashboard
