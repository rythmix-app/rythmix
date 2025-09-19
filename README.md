# Rythmix

A multi-component music application with containerized microservices architecture.

## Architecture

Rythmix consists of three main services:

- **backend**: AdonisJS 6 API with PostgreSQL database
- **back-office**: Angular 20 administration interface  
- **front-mobile**: Expo/React Native mobile application

## Docker Compose Setup

The project uses a multi-file Docker Compose configuration:

- `docker-compose.yml`: Base configuration with common services (postgres, base service definitions)
- `docker-compose.override.yml`: Development environment (loaded by default)
- `docker-compose.prod.yml`: Production environment overrides

## Development

### Start Development Environment

```bash
# Start all services (uses docker-compose.yml + docker-compose.override.yml automatically)
docker-compose up

# Start specific services
docker-compose up adonis      # Backend only
docker-compose up angular     # Back-office only
docker-compose up postgres    # Database only
```

### Start Production Environment

```bash
# Start all production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up

# Start specific production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up adonis
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up angular
```

## Services Details

### Backend (AdonisJS)
- **Development**: Runs on port 3333 with hot reload
- **Production**: Runs on port 3334
- Uses path imports (`#controllers/*`, `#models/*`)
- Environment files: `.env.dev` (development), `.env.prod` (production)

### Back-office (Angular)
- **Development**: Runs on port 4200 with hot reload
- **Production**: Runs on port 8080
- Angular 20 with standalone components

### Database (PostgreSQL)
- Runs in all environments
- Data persisted in `pgdata` volume
- Configuration via environment variables

## Environment Setup

The project uses environment files for configuration:

- `.env`: Base environment variables (database credentials, shared settings)
- `.env.dev`: Development-specific overrides (loaded automatically in development)
- `.env.prod`: Production-specific overrides (used explicitly for production)

Setup required environment files:
```bash
# Root level environment files
cp .env.example .env                    # Base configuration
cp .env.dev.example .env.dev            # Development overrides
cp .env.prod.example .env.prod          # Production overrides

# Backend-specific environment files (if needed for internal backend configs)
cp backend/.env.example backend/.env
cp backend/.env.dev.example backend/.env.dev  
cp backend/.env.prod.example backend/.env.prod
```

### Environment File Priority

- **Development**: `.env` → `.env.dev` (override)
- **Production**: `.env` → `.env.prod` (override)

## Container Management

```bash
# View running containers
docker-compose ps

# Enter containers for debugging
docker-compose exec adonis sh    # Backend
docker-compose exec angular sh   # Back-office
docker-compose exec postgres sh  # Database

# View logs
docker-compose logs adonis       # Backend logs
docker-compose logs angular      # Back-office logs
docker-compose logs -f postgres  # Database logs (follow)
```

## Front-mobile (Expo)

The mobile application runs outside of Docker:

```bash
cd front-mobile
npm install
npx expo start       # Development server
npm run android      # Android emulator
npm run ios          # iOS simulator  
npm run web          # Web version
```