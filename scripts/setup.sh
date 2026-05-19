#!/bin/bash

# Electric Service ERP - Local Setup Script

echo "======================================"
echo "Electric Service ERP - Setup"
echo "======================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

echo "✓ Docker found"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✓ Docker Compose found"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env 2>/dev/null || echo ".env created with default values"
fi

# Build and start containers
echo ""
echo "Building and starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo ""
echo "Waiting for services to start..."
sleep 10

# Run migrations
echo ""
echo "Running Django migrations..."
docker-compose exec -T backend python manage.py migrate

# Seed local demo data and default admin
echo ""
echo "Seeding local data..."
docker-compose exec -T backend python manage.py seed_local

# Collect static files
echo ""
echo "Collecting static files..."
docker-compose exec -T backend python manage.py collectstatic --no-input

echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Access the application:"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:8000"
echo "  API Docs:  http://localhost:8000/api/docs/"
echo "  pgAdmin:   http://localhost:5050"
echo ""
echo "Default Admin:"
echo "  Email: admin@example.com"
echo "  Password: admin123"
echo ""
echo "To stop services: docker-compose down"
echo ""
