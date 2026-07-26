# ============================================================
# GymBud - Project Initialization Script (PowerShell)
# ============================================================
# Run this from the repository root: .\scripts\init-project.ps1
#
# What it does:
#   1. Creates a Python virtual environment for the backend
#   2. Installs backend dependencies
#   3. Copies .env.example -> .env (if .env doesn't exist)
#   4. Installs mobile (React Native) dependencies
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GymBud - Project Initialization" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$repoRoot = Split-Path -Parent $PSScriptRoot

# ──────────────────────────────────────────────
# 1. Backend Setup
# ──────────────────────────────────────────────
Write-Host "[1/4] Setting up Python backend..." -ForegroundColor Yellow
Set-Location "$repoRoot\backend"

# Create virtual environment
if (-not (Test-Path ".venv")) {
    Write-Host "  Creating Python virtual environment..."
    python -m venv .venv
} else {
    Write-Host "  Virtual environment already exists."
}

# Activate and install dependencies
Write-Host "  Installing Python dependencies..."
& ".venv\Scripts\Activate.ps1"
pip install -r requirements.txt --quiet

# Copy .env.example if .env doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "  Copying .env.example -> .env (fill in your secrets!)"
    Copy-Item ".env.example" ".env"
} else {
    Write-Host "  .env already exists - skipping."
}

Write-Host "  ✅ Backend setup complete!" -ForegroundColor Green
Write-Host ""

# ──────────────────────────────────────────────
# 2. Mobile Setup
# ──────────────────────────────────────────────
Write-Host "[2/4] Setting up React Native mobile app..." -ForegroundColor Yellow
Set-Location "$repoRoot\mobile"

Write-Host "  Installing npm dependencies..."
npm install --silent

Write-Host "  ✅ Mobile setup complete!" -ForegroundColor Green
Write-Host ""

# ──────────────────────────────────────────────
# 3. Verify installations
# ──────────────────────────────────────────────
Write-Host "[3/4] Verifying installations..." -ForegroundColor Yellow

Set-Location "$repoRoot\backend"
$pythonVer = python --version 2>&1
Write-Host "  Python:   $pythonVer"
Write-Host "  FastAPI:  $(pip show fastapi 2>$null | Select-String 'Version')"

Set-Location "$repoRoot\mobile"
$nodeVer = node --version 2>&1
Write-Host "  Node.js:  $nodeVer"
$expoVer = npx expo --version 2>&1
Write-Host "  Expo CLI: $expoVer"

Write-Host ""

# ──────────────────────────────────────────────
# 4. Print next steps
# ──────────────────────────────────────────────
Write-Host "[4/4] Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Fill in backend\.env with your Supabase and Gemini keys" -ForegroundColor White
Write-Host "  2. Run Supabase migrations in your SQL Editor:" -ForegroundColor White
Write-Host "     - supabase\migrations\001_initial_schema.sql" -ForegroundColor Gray
Write-Host "     - supabase\migrations\002_storage_buckets.sql" -ForegroundColor Gray
Write-Host "  3. Start the backend:" -ForegroundColor White
Write-Host "     cd backend && .venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "     uvicorn app.main:app --reload" -ForegroundColor Gray
Write-Host "  4. Start the mobile app:" -ForegroundColor White
Write-Host "     cd mobile && npx expo start" -ForegroundColor Gray
Write-Host "  5. Push to GitHub and connect to Render for auto-deploy" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup complete! Happy building 🚀" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Set-Location $repoRoot
