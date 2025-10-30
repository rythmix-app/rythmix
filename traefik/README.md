# Traefik Configuration

Traefik reverse proxy setup for Rythmix with automatic HTTPS.

## Quick Start

### Development

1. Generate local certificates:
```bash
./setup-dev-certs.sh
```

2. Start services:
```bash
docker compose up
```

3. Access services:
- Backend: https://api.localhost
- Back-office: https://admin.localhost
- Dashboard: https://traefik.localhost

### Production

1. Update domains in `docker-compose.prod.yml`
2. Update Let's Encrypt email
3. Point DNS to your server
4. Deploy:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Configuration Files

- `traefik.yml` - Static configuration (entrypoints, providers)
- `dynamic/tls.yml` - Development TLS certificates

## Networks

- `frontend` - Traefik ↔ Backend, Back-office
- `backend` - Backend ↔ Back-office
- `database` - Backend ↔ PostgreSQL

## How It Works

**Development**: Uses mkcert self-signed certificates from `certs/`

**Production**: Uses Let's Encrypt with HTTP-01 challenge, certificates stored in `traefik-certs` volume

All routing configured via Docker labels on services. HTTP automatically redirects to HTTPS.
