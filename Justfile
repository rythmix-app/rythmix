# Détection automatique de l'outil Docker
_docker_cmd := if `command -v docker-compose >/dev/null 2>&1; echo $?` == "0" { "docker-compose" } else { "docker compose" }

# Afficher l'aide avec toutes les commandes disponibles
help:
    @echo "Commandes disponibles :"
    @echo ""
    @echo "📋 Aide :"
    @echo "  help              - Affiche cette aide"
    @echo "  docker-status     - Affiche l'outil Docker détecté"
    @echo ""
    @echo "⚡ Installation :"
    @echo "  install-dev       - Installation complète pour le développement"
    @echo "  install-prod      - Installation complète pour la production"
    @echo ""
    @echo "🔧 Développement :"
    @echo "  up-dev            - Lance l'environnement de développement"
    @echo "  down-dev          - Arrête l'environnement de développement"
    @echo "  logs-dev          - Affiche les logs en temps réel (dev)"
    @echo ""
    @echo "🚀 Production :"
    @echo "  up-prod           - Lance l'environnement de production"
    @echo "  down-prod         - Arrête l'environnement de production"
    @echo "  logs-prod         - Affiche les logs en temps réel (prod)"
    @echo ""
    @echo "🐚 Shell des conteneurs :"
    @echo "  bash-backend      - Entrer dans le bash du conteneur backend"
    @echo "  bash-backoffice   - Entrer dans le bash du conteneur back-office"
    @echo "  bash-db           - Entrer dans le bash du conteneur base de données"
    @echo ""
    @echo "🗃️  Base de données :"
    @echo "  make-model NAME   - Créer un nouveau modèle AdonisJS"
    @echo "  make-migration NAME - Créer une nouvelle migration"
    @echo "  migrate           - Exécuter les migrations en attente"
    @echo ""

# Affiche l'outil Docker détecté
docker-status:
    @echo "🐳 Outil Docker détecté: {{_docker_cmd}}"

# Installation complète pour le développement
install-dev:
    @echo "🚀 Installation de l'environnement de développement..."
    @echo ""
    @echo "📁 Copie des fichiers d'environnement..."
    cp backend/.env.dev.example backend/.env.dev
    cp backend/.env.example backend/.env
    cp back-office/.env.dev.example back-office/.env.dev
    cp back-office/.env.example back-office/.env
    @echo "✅ Fichiers d'environnement copiés"
    @echo ""
    @echo "🐳 Arrêt des conteneurs existants (s'il y en a)..."
    {{_docker_cmd}} -f docker-compose.prod.yml down -v || true
    @echo ""
    @echo "🐳 Construction et lancement des conteneurs..."
    {{_docker_cmd}} up --build -d
    @echo ""
    @echo "⏳ Attente que les services se lancent..."
    sleep 10
    @echo ""
    @echo "🗃️ Exécution des migrations..."
    docker exec -it rythmix-backend-1 node ace migration:run || true
    @echo ""
    @echo "✅ Installation terminée !"
    @echo ""
    @echo "🌐 Points d'accès :"
    @echo "  - Backend API: http://localhost:3333"
    @echo "  - Back-office: http://localhost:4200"
    @echo "  - Base de données: localhost:5432"
    @echo ""

# Installation complète pour la production
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
    {{_docker_cmd}} -f docker-compose.prod.yml down -v || true
    @echo ""
    @echo "🐳 Construction et lancement des conteneurs en mode production..."
    {{_docker_cmd}} -f docker-compose.prod.yml up --build -d
    @echo ""
    @echo "⏳ Attente que les services se lancent..."
    sleep 15
    @echo ""
    @echo "🗃️ Exécution des migrations..."
    docker exec -it rythmix-backend-1 node ace migration:run || true
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
    {{_docker_cmd}} -f docker-compose.prod.yml up --build -d

down-prod:
    {{_docker_cmd}} -f docker-compose.prod.yml down

logs-prod:
    {{_docker_cmd}} -f docker-compose.prod.yml logs -f

# Commandes shell/bash des conteneurs
sh-backend:
    docker exec -it rythmix-backend-1 sh

sh-backoffice:
    docker exec -it rythmix-back-office-1 sh

sh-db:
    docker exec -it rythmix-database-1 sh

# Commandes AdonisJS
make-model NAME:
    docker exec -it rythmix-backend-1 node ace make:model {{NAME}}

make-migration NAME:
    docker exec -it rythmix-backend-1 node ace make:migration {{NAME}}

migrate:
    docker exec -it rythmix-backend-1 node ace migration:run