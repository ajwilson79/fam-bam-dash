# Fam Bam Dash - First Time Setup Script (PowerShell)

Write-Host "🎉 Welcome to Fam Bam Dash Setup!" -ForegroundColor Cyan
Write-Host ""

# Check for Docker
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first:" -ForegroundColor Red
    Write-Host "   https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Yellow
    exit 1
}

# Check for Docker Compose
try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not installed. It should come with Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Create .env if it doesn't exist
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Cyan
    Copy-Item .env.example .env
    Write-Host "✅ .env file created" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Edit .env file with your API keys and settings!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opening .env in notepad..." -ForegroundColor Cyan
    Start-Process notepad .env
    Read-Host "Press Enter after you've edited and saved the .env file"
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "🐳 Building Docker image..." -ForegroundColor Cyan
docker-compose build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start the dashboard:" -ForegroundColor White
    Write-Host "  docker-compose up -d" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To view logs:" -ForegroundColor White
    Write-Host "  docker-compose logs -f" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To stop:" -ForegroundColor White
    Write-Host "  docker-compose down" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Access your dashboard at: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📚 For more information, see:" -ForegroundColor White
    Write-Host "  - README.md for overview" -ForegroundColor Gray
    Write-Host "  - DEPLOYMENT.md for deployment options" -ForegroundColor Gray
    Write-Host "  - DEVELOPMENT.md for development guide" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ Setup failed!" -ForegroundColor Red
    exit 1
}
