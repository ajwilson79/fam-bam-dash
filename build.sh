#!/bin/bash

# Fam Bam Dash - Build Script

set -e

echo "🏗️  Building Fam Bam Dash..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env with your API keys before deploying!"
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Build Docker image
echo "🐳 Building Docker image..."
docker-compose build

echo "✅ Build complete!"
echo ""
echo "To start the dashboard, run:"
echo "  docker-compose up -d"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop:"
echo "  docker-compose down"
