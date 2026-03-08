#!/bin/bash

# Fam Bam Dash - First Time Setup Script

set -e

echo "🎉 Welcome to Fam Bam Dash Setup!"
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check for Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file with your API keys and settings!"
    echo ""
    read -p "Press Enter to open .env in your default editor..."
    ${EDITOR:-nano} .env
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🐳 Building Docker image..."
docker-compose build

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the dashboard:"
echo "  docker-compose up -d"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop:"
echo "  docker-compose down"
echo ""
echo "Access your dashboard at: http://localhost:3000"
echo ""
echo "📚 For more information, see:"
echo "  - README.md for overview"
echo "  - DEPLOYMENT.md for deployment options"
echo "  - DEVELOPMENT.md for development guide"
