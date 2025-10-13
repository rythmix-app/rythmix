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

# Setup HTTPS certificates for development
./setup-dev-certs.sh

# Start with Docker
docker compose up
```

### Access Points

All services are accessible via HTTPS through Traefik reverse proxy:

- **Backend API**: https://api.localhost
- **Back-office**: https://admin.localhost
- **Traefik Dashboard**: https://traefik.localhost
- **Database**: localhost:5432 (direct connection)

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
- **Reverse Proxy**: Traefik v3.2 with automatic HTTPS

## Production Deployment

Before deploying to production:

1. Update domain names in `docker-compose.prod.yml` (replace `yourdomain.com`)
2. Update Let's Encrypt email in `docker-compose.prod.yml`
3. Ensure DNS records point to your server
4. Deploy:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Traefik will automatically obtain and renew SSL certificates from Let's Encrypt.

See `traefik/README.md` for detailed Traefik configuration and troubleshooting.
