#!/bin/bash
# Setup Saleor e-commerce store

echo "Setting up self-hosted e-commerce store..."

# Create project structure
mkdir -p docker/data
mkdir -p docker/www

# Write docker-compose
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  saleor:
    image: saleor/saleor:stable
    ports:
      - "8000:8000"
    volumes:
      - ./docker/data:/app/data
    environment:
      - DEBUG=True
      - DATABASE_URL=postgres://postgres:postgres@postgres:5432/saleor
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=saleor_secret_key
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - ./docker/data/pgdata:/var/lib/postgresql/data
  redis:
    image: redis:alpine
    volumes:
      - ./docker/data/redisdata:/data
EOF

echo "✅ Docker config created"
