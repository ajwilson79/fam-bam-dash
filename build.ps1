# Fam Bam Dash - Build Script (PowerShell)

Write-Host "🏗️  Building Fam Bam Dash..." -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  No .env file found. Copying from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "📝 Please edit .env with your API keys before deploying!" -ForegroundColor Yellow
}

# Build Docker image
Write-Host "🐳 Building Docker image..." -ForegroundColor Cyan
docker-compose build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start the dashboard, run:" -ForegroundColor White
    Write-Host "  docker-compose up -d" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To view logs:" -ForegroundColor White
    Write-Host "  docker-compose logs -f" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To stop:" -ForegroundColor White
    Write-Host "  docker-compose down" -ForegroundColor Yellow
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
