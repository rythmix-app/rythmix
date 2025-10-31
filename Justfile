# Automatic detection of the Docker tool
_docker_cmd := if `command -v docker-compose >/dev/null 2>&1; echo $?` == "0" { "docker-compose" } else { "docker compose" }

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
    @echo "  sh-backend      - Enter backend container shell"
    @echo "  sh-backoffice   - Enter back-office container shell"
    @echo "  sh-db           - Enter database container shell"
    @echo ""
    @echo "🗃️  Database:"
    @echo "  make-model NAME   - Create a new AdonisJS model"
    @echo "  make-migration NAME - Create a new migration"
    @echo "  migrate           - Run pending migrations"
    @echo ""
    @echo "🧪 Testing:"
    @echo "  backend-test      - Run backend tests"
    @echo "  backend-coverage  - Run backend tests with coverage report"
    @echo ""

# Show detected Docker tool
docker-status:
    @echo "🐳 Detected Docker tool: {{_docker_cmd}}"

# Complete installation for development
install-dev:
    @echo "🚀 Installing development environment..."
    @echo ""
    @echo "📁 Copying environment files..."
    find backend back-office -type f -name ".env*.example" -exec sh -c 'cp "$1" "${1%.example}"' _ {} \;
    @echo "✅ Environment files copied"
    @echo ""
    @echo "🔐 Generating development SSL certificates..."
    ( cd traefik && ./setup-dev-certs.sh )
    @echo "✅ Development SSL certificates generated"
    @echo ""
    @echo "🐳 Stopping existing containers (if any)..."
    {{_docker_cmd}} -f docker-compose.yml -f docker-compose.prod.yml down -v || true
    @echo ""
    @echo "🐳 Building and starting containers..."
    {{_docker_cmd}} up --build -d
    @echo ""
    @echo "⏳ Waiting for services to start..."
    sleep 10
    @echo ""
    @echo "🔑 Generating APP_KEY for backend..."
    {{_docker_cmd}} exec backend node ace generate:key || true
    @echo ""
    @echo "🗃️ Running migrations..."
    just migrate || true
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
    @echo "🚀 Installation de l'environnement de production..."
    @echo ""
    @echo "📁 Copie des fichiers d'environnement..."
    cp backend/.env.prod.example backend/.env.prod
    cp backend/.env.example backend/.env
    cp back-office/.env.prod.example back-office/.env.prod
    cp back-office/.env.example back-office/.env
    @echo "✅ Fichiers d'environnement copiés"
    @echo ""
    @echo "⚠️  IMPORTANT: Vérifiez et modifiez les fichiers .env.prod avec vos valeurs de production"
    @echo ""
    @echo "🐳 Arrêt des conteneurs existants (s'il y en a)..."
    {{_docker_cmd}} -f docker-compose.yml -f docker-compose.prod.yml down -v || true
    @echo ""
    @echo "🐳 Construction et lancement des conteneurs en mode production..."
    {{_docker_cmd}} -f docker-compose.yml -f docker-compose.prod.yml up --build -d
    @echo ""
    @echo "⏳ Attente que les services se lancent..."
    sleep 15
    @echo ""
    @echo "🗃️ Exécution des migrations..."
    {{_docker_cmd}} exec -T backend node ace migration:run || true
    @echo ""
    @echo "✅ Installation de production terminée !"
    @echo ""

# Commandes Docker pour le développement
up-dev:
    {{_docker_cmd}} up --build -d

down-dev:
    {{_docker_cmd}} down

logs-dev:
    {{_docker_cmd}} logs -f

# Commandes Docker pour la production
up-prod:
    {{_docker_cmd}} -f docker-compose.yml -f docker-compose.prod.yml up --build -d

down-prod:
    {{_docker_cmd}} -f docker-compose.yml -f docker-compose.prod.yml down

logs-prod:
    {{_docker_cmd}} -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Commandes shell/bash des conteneurs
sh-backend:
    {{_docker_cmd}} exec backend sh

sh-backoffice:
    {{_docker_cmd}} exec back-office sh

sh-db:
    {{_docker_cmd}} exec database sh

# Commandes AdonisJS
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

backend-test:
    {{_docker_cmd}} exec backend node ace test

backend-coverage:
    {{_docker_cmd}} exec backend npm run test:coverage