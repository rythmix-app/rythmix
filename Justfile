# Automatic detection of the Docker tool
_docker_cmd := if `command -v docker compose >/dev/null 2>&1; echo $?` == "0" { "docker compose" } else { "docker-compose" }

# Show help with all available commands
help:
    @echo "Available commands:"
    @echo ""
    @echo "📋 Help:"
    @echo "  help              - Show this help"
    @echo "  docker-status     - Show detected Docker tool"
    @echo ""
    @echo "⚡ Installation:"
    @echo "  install-dev       - Complete installation for development"
    @echo "  install-prod      - Complete installation for production"
    @echo "  setup-env         - Copy environment file templates"
    @echo "  setup-dev-certs   - Generate development SSL certificates"
    @echo ""
    @echo "🔧 Development:"
    @echo "  up-dev            - Start development environment"
    @echo "  down-dev          - Stop development environment"
    @echo "  logs-dev          - Show real-time logs (dev)"
    @echo ""
    @echo "🚀 Production:"
    @echo "  up-prod           - Start production environment"
    @echo "  down-prod         - Stop production environment"
    @echo "  logs-prod         - Show real-time logs (prod)"
    @echo ""
    @echo "🐚 Container shells:"
    @echo "  sh-backend        - Enter backend container shell"
    @echo "  sh-backoffice     - Enter back-office container shell"
    @echo "  sh-db             - Enter database container shell"
    @echo "  psql-db           - Enter PostgreSQL interactive shell"
    @echo ""
    @echo "🗃️  Database:"
    @echo "  make-model NAME      - Create a new AdonisJS model"
    @echo "  make-controller NAME - Create a new AdonisJS controller"
    @echo "  make-service NAME    - Create a new AdonisJS service"
    @echo "  make-migration NAME  - Create a new migration"
    @echo "  migrate              - Run pending migrations"
    @echo "  seeder               - Run database seeders"
    @echo ""
    @echo "🧪 Testing:"
    @echo "  test SERVICE         - Run tests on SERVICE (backend, backoffice)"
    @echo "  coverage SERVICE     - Run tests with coverage report on SERVICE (backend, backoffice)"
    @echo ""

# Show detected Docker tool
docker-status:
    @echo "🐳 Detected Docker tool: {{_docker_cmd}}"

setup-env:
    find backend back-office -type f -name ".env*.example" -exec sh -c 'cp "$1" "${1%.example}"' _ {} \;

setup-dev-certs:
    ( cd traefik && ./setup-dev-certs.sh )

# Complete installation for development
install-dev:
    @echo "🚀 Installing development environment..."
    @echo ""
    @echo "📁 Copying environment files..."
    just setup-env
    @echo "✅ Environment files copied"
    @echo ""
    @echo "🔐 Generating development SSL certificates..."
    just setup-dev-certs
    @echo "✅ Development SSL certificates generated"
    @echo ""
    @echo "🐳 Building and starting containers..."
    {{_docker_cmd}} up --build -d
    @echo ""
    @echo "🔑 Generating APP_KEY for backend..."
    {{_docker_cmd}} exec backend node ace generate:key
    @echo ""
    @echo "🗃️ Running migrations..."
    just migrate
    @echo ""
    @echo "✅ Installation complete!"
    @echo ""
    @echo "🌐 Access points:"
    @echo "  - Backend API: https://api.localhost"
    @echo "  - Back-office: https://admin.localhost"
    @echo "  - Traefik Dashboard: https://traefik.localhost"
    @echo "  - Database: localhost:5432 (direct connection)"
    @echo ""

# Complete installation for production
install-prod:
    @echo "🚀 Installing production environment..."
    @echo ""
    @echo "📁 Copying environment files..."
    just setup-env
    @echo "✅ Environment files copied"
    @echo ""
    @echo "⚠️  IMPORTANT: Check and update the .env.prod files with your production values"
    @echo ""
    @echo "🐳 Building and starting containers in production mode..."
    {{_docker_cmd}} -f docker-compose.yml -f docker-compose.prod.yml up --build -d
    @echo ""
    @echo "🗃️ Running migrations..."
    just migrate
    @echo ""
    @echo "✅ Production installation complete!"
    @echo ""

# Docker commands for development
up-dev:
    {{_docker_cmd}} up --build --wait && docker compose --profile ngrok up -d

down-dev:
    {{_docker_cmd}} down

logs-dev:
    {{_docker_cmd}} logs -f

# Docker commands for production
up-prod:
    {{_docker_cmd}} -f docker-compose.yml -f docker-compose.prod.yml up --build -d

down-prod:
    {{_docker_cmd}} -f docker-compose.yml -f docker-compose.prod.yml down

logs-prod:
    {{_docker_cmd}} -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Container shell/bash commands
sh-backend:
    {{_docker_cmd}} exec backend sh

sh-backoffice:
    {{_docker_cmd}} exec back-office sh

sh-db:
    {{_docker_cmd}} exec database sh

psql-db:
    {{_docker_cmd}} exec database sh -c 'psql -U $POSTGRES_USER -d $POSTGRES_DB'

# AdonisJS commands
make-model NAME:
    {{_docker_cmd}} exec backend node ace make:model {{NAME}}

make-controller NAME:
    {{_docker_cmd}} exec backend node ace make:controller {{NAME}}

make-service NAME:
    {{_docker_cmd}} exec backend node ace make:service {{NAME}}

make-migration NAME:
    {{_docker_cmd}} exec backend node ace make:migration {{NAME}}

migrate:
    {{_docker_cmd}} exec backend node ace migration:run

seeder:
    {{_docker_cmd}} exec backend node ace db:seed

backend-check:
    {{_docker_cmd}} exec backend npm run check

# Test commands
test SERVICE:
    {{_docker_cmd}} exec {{SERVICE}} npm run test

coverage SERVICE:
    {{_docker_cmd}} exec {{SERVICE}} npm run test:coverage
