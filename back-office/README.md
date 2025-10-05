# Back-office

Angular 20 administration interface with TypeScript and SCSS.

## Setup

```bash
# Install dependencies
npm install

# Copy environment files
cp .env.example .env
cp .env.dev.example .env.dev
cp .env.prod.example .env.prod
```

## Development

```bash
npm start            # Start development server
npm run build        # Production build
npm run test         # Run unit tests
npm run watch        # Build in watch mode
```

## Project Structure

```
back-office/
├── src/
│   ├── app/
│   │   ├── components/     # Reusable components
│   │   ├── services/       # Angular services
│   │   ├── guards/         # Route guards
│   │   ├── app.config.ts   # Application configuration
│   │   └── app.routes.ts   # Route definitions
│   ├── assets/            # Static assets
│   └── styles/            # Global SCSS styles
└── public/                # Public assets
```

## Code Generation

```bash
ng generate component feature/component-name
ng generate service shared/service-name
ng generate guard auth/auth-guard
```

## Environment Configuration

```bash
# .env.dev
API_URL=http://localhost:3333
APP_ENV=development
```