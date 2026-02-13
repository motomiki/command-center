# Cloud Run deploy: injects Supabase + Vertex AI from .env and fixed URL.
# Run from project root. If run from scripts/, moves to project root.

$ErrorActionPreference = "Stop"
$ProjectRoot = if ($PSScriptRoot) {
    (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
} else {
    $PWD.Path
}

Set-Location $ProjectRoot
if (-not (Test-Path "cloudbuild.yaml")) {
    Write-Error "cloudbuild.yaml not found. Run from project root."
}
if (-not (Test-Path ".env")) {
    Write-Error ".env not found. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
}

$ViteSupabaseUrl = ""
$ViteSupabaseAnonKey = ""
Get-Content .env -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim().TrimStart([char]0xFEFF)
    if ($line -match '^\s*#') { return }
    if ($line -match '^VITE_SUPABASE_URL=(.+)$') { $script:ViteSupabaseUrl = $matches[1].Trim().Trim('"').Trim("'") }
    if ($line -match '^VITE_SUPABASE_ANON_KEY=(.+)$') { $script:ViteSupabaseAnonKey = $matches[1].Trim().Trim('"').Trim("'") }
}

if (-not $ViteSupabaseUrl -or -not $ViteSupabaseAnonKey) {
    Write-Error ".env must set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
}

$VertexUrl = "https://asia-northeast1-campusclub-dashboard.cloudfunctions.net/campusclub-vertex-ai"
Write-Host "Project root: $ProjectRoot"
Write-Host "Supabase URL length: $($ViteSupabaseUrl.Length)"
Write-Host "Supabase Anon Key length: $($ViteSupabaseAnonKey.Length)"
Write-Host "Vertex AI URL: $VertexUrl"
Write-Host ""
Write-Host "Submitting to Cloud Build (may take several minutes)..."
$subs = "_VITE_SUPABASE_URL=$ViteSupabaseUrl,_VITE_SUPABASE_ANON_KEY=$ViteSupabaseAnonKey,_VITE_VERTEX_AI_FUNCTION_URL=$VertexUrl"
& gcloud builds submit --config=cloudbuild.yaml . --substitutions="$subs" --project=campusclub-dashboard
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build or deploy failed. Check the log above."
    exit $LASTEXITCODE
}
Write-Host ""
Write-Host "Deploy done. If you get 403, run add-iam-policy-binding (see DEPLOY_CLOUD_RUN.md)."
