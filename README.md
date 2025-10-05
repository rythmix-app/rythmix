# Rythmix

Full-stack application with AdonisJS backend, Angular admin interface, and React Native mobile app.

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose

### Setup

```bash
# Clone and setup environment files
git clone <repository-url>
cd rythmix
# Copy environment files
find backend back-office -type f -name ".env*.example" -exec sh -c 'cp "$1" "${1%.example}"' _ {} \;

# Start with Docker
docker compose up
```

### Access Points

- **Backend API**: http://localhost:3333
- **Back-office**: http://localhost:4200
- **Database**: localhost:5432

## Development

### All services with Docker

```bash
docker compose up                    # Development
docker compose -f docker-compose.yml -f docker-compose.prod.yml up  # Production
```

### Individual services

```bash
# Backend (AdonisJS)
cd backend
npm install && npm run dev

# Back-office (Angular)
cd back-office
npm install && npm start

# Mobile (Expo)
cd front-mobile
npm install && npm start
```

## Project Structure

```
rythmix/
├── backend/        # AdonisJS API + PostgreSQL
├── back-office/    # Angular admin interface
├── front-mobile/   # Expo React Native app
└── docker-compose.yml
```

## Tech Stack

- **Backend**: AdonisJS 6, TypeScript, PostgreSQL
- **Admin**: Angular 20, TypeScript, SCSS
- **Mobile**: Expo 53, React Native, TypeScript

## CI

- Push changes sur la branche `staging` pour déclencher l'analyse SonarQube.
