# Rythmix

Full-stack application with AdonisJS backend, Angular admin interface, and React Native mobile app.

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- [just](https://github.com/casey/just) command runner (recommended)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd rythmix

# Using just (recommended)
just init          # Initialize environment and dependencies
just dev            # Start development environment


### Access Points
- **Backend API**: http://localhost:3333
- **Back-office**: http://localhost:4200
- **Database**: localhost:5432

## Development

### Using just (recommended)
```bash
just --list         # Show all available commands
just dev            # Start all services
just backend-dev    # Run backend only
just office-dev     # Run back-office only
just mobile-dev     # Run mobile app only
just test-all       # Run all tests
just lint-all       # Run all lints
just info           # Show project information
```

### Manual Docker commands
```bash
docker compose up                    # Development
docker compose -f docker-compose.yml -f docker-compose.prod.yml up  # Production
```

### Individual services (manual)
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