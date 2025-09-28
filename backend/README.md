# Backend

AdonisJS 6 API with TypeScript and PostgreSQL.

## Setup

```bash
# Install dependencies
npm install

# Copy environment files
cp .env.example .env
cp .env.dev.example .env.dev
cp .env.prod.example .env.prod

# Generate application key
node ace generate:key

# Run migrations
node ace migration:run
```

## Development

```bash
npm run dev          # Start with hot reload
npm run build        # Production build
npm run test         # Run tests
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

## Project Structure

```
backend/
├── app/
│   ├── controllers/     # HTTP controllers
│   ├── models/         # Lucid ORM models
│   ├── middleware/     # Custom middleware
│   └── services/       # Business logic
├── database/
│   └── migrations/     # Database migrations
├── start/
│   └── routes.ts       # Route definitions
└── tests/              # Unit & functional tests
```

## Path Aliases

```typescript
import User from '#models/user'
import UserController from '#controllers/user_controller'
```

## Database

```bash
node ace migration:run        # Run migrations
node ace make:migration name  # Create migration
node ace make:model Model     # Create model
```

## Authentication

Uses AdonisJS Auth with access tokens. Include token in `Authorization: Bearer <token>` header.