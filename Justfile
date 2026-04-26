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
    @echo "🔧 Environment Management:"
    @echo "  up SERVICE        - Start environment (dev|staging|prod|ngrok)"
    @echo "  down SERVICE      - Stop environment (dev|staging|prod)"
    @echo "  logs SERVICE      - Show real-time logs (dev|staging|prod)"
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

# Environment management commands
up SERVICE:
    #!/usr/bin/env bash
    case "{{SERVICE}}" in
        dev)
            {{_docker_cmd}} up --build --wait
            ;;
        staging)
            {{_docker_cmd}} -f docker-compose.yml -f docker-compose.staging.yml --profile ngrok up --build -d traefik backend ngrok
            ;;
        prod)
            {{_docker_cmd}} -f docker-compose.yml -f docker-compose.prod.yml up --build -d
            ;;
        ngrok)
            {{_docker_cmd}} --profile ngrok up -d
            ;;
        *)
            echo "❌ Invalid service. Use: dev, staging, prod, or ngrok"
            exit 1
            ;;
    esac

down SERVICE:
    #!/usr/bin/env bash
    case "{{SERVICE}}" in
        dev)
            {{_docker_cmd}} down
            ;;
        staging)
            {{_docker_cmd}} -f docker-compose.yml -f docker-compose.staging.yml --profile ngrok down
            ;;
        prod)
            {{_docker_cmd}} -f docker-compose.yml -f docker-compose.prod.yml down
            ;;
        *)
            echo "❌ Invalid service. Use: dev, staging, or prod"
            exit 1
            ;;
    esac

logs SERVICE:
    #!/usr/bin/env bash
    case "{{SERVICE}}" in
        dev)
            {{_docker_cmd}} logs -f
            ;;
        staging)
            {{_docker_cmd}} -f docker-compose.yml -f docker-compose.staging.yml --profile ngrok logs -f
            ;;
        prod)
            {{_docker_cmd}} -f docker-compose.yml -f docker-compose.prod.yml logs -f
            ;;
        *)
            echo "❌ Invalid service. Use: dev, staging, or prod"
            exit 1
            ;;
    esac

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
