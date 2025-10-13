# Traefik Reverse Proxy Setup

This directory contains the Traefik reverse proxy configuration for the Rythmix application.

## Overview

Traefik routes traffic to the backend API and back-office frontend with automatic HTTPS:
- **Development**: Self-signed certificates using mkcert
- **Production**: Let's Encrypt certificates using HTTP-01 challenge

## Development Setup

### Prerequisites

Install [mkcert](https://github.com/FiloSottile/mkcert#installation) for local HTTPS certificates.

### Generate Certificates

Run the setup script from the project root:

```bash
./traefik/setup-dev-certs.sh
```

This will:
1. Install the local CA in your system trust store
2. Generate certificates for all localhost domains
3. Place certificates in `traefik/certs/`

### Start Services

```bash
docker compose up
```

### Access Points (Development)

All services are accessible via HTTPS:
- **Backend API**: https://api.localhost
- **Back-office**: https://admin.localhost
- **Traefik Dashboard**: https://traefik.localhost

HTTP requests are automatically redirected to HTTPS.

## Production Setup

### Prerequisites

1. **Domain Names**: Update the domains in `docker-compose.prod.yml`:
   - `api.yourdomain.com` → your actual backend domain
   - `admin.yourdomain.com` → your actual admin domain
   - `traefik.yourdomain.com` → your Traefik dashboard domain

2. **Email**: Update the Let's Encrypt email in `docker-compose.prod.yml`:
   ```yaml
   - --certificatesresolvers.letsencrypt.acme.email=admin@example.com
   ```
   Change to your actual email address.

3. **DNS**: Ensure all domains point to your server's IP address.

### Deploy

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Let's Encrypt

Traefik automatically:
1. Requests certificates from Let's Encrypt using HTTP-01 challenge
2. Stores certificates in the `traefik-certs` Docker volume
3. Renews certificates automatically before expiry

Certificate storage: `/etc/traefik/acme/acme.json` (inside the container)

### Security Notes

- The Traefik dashboard should be protected with authentication in production
- Consider adding middleware for rate limiting, IP whitelisting, or basic auth
- Monitor certificate renewal logs for any issues

## Configuration Files

### `dynamic/tls.yml`

Dynamic TLS configuration for development certificates. Defines:
- Certificate paths for mkcert-generated certificates
- Default certificate store

This file is only used in development mode.

## Traefik Architecture

```
                                   ┌─────────────────┐
                                   │   Traefik       │
                                   │  (Reverse Proxy)│
                                   └────────┬────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
              ┌─────▼─────┐          ┌─────▼─────┐          ┌─────▼─────┐
              │  Backend  │          │Back-office│          │ Dashboard │
              │  (API)    │          │  (Admin)  │          │           │
              │  :3333    │          │  :4200/80 │          │           │
              └───────────┘          └───────────┘          └───────────┘
```

### Networks

- **frontend**: Traefik ↔ Back-office
- **backend**: Traefik ↔ Backend, Backend ↔ Back-office
- **database**: Backend ↔ PostgreSQL

### Routing

All routing is configured via Docker labels on services:
- `traefik.http.routers.<name>.rule`: Defines the routing rule (e.g., Host)
- `traefik.http.routers.<name>.entrypoints`: HTTP/HTTPS entrypoint
- `traefik.http.routers.<name>.tls`: Enable TLS
- `traefik.http.services.<name>.loadbalancer.server.port`: Backend port

## Troubleshooting

### Development: Certificate Not Trusted

If your browser doesn't trust the certificate:
1. Run `./setup-dev-certs.sh` again
2. Ensure mkcert CA is installed: `mkcert -install`
3. Restart your browser

### Production: Certificate Not Issued

Check Traefik logs:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs traefik
```

Common issues:
- DNS not pointing to server
- Port 80 not accessible (required for HTTP-01 challenge)
- Rate limiting from Let's Encrypt (5 certs per domain per week)

### Connection Refused

Ensure services are on the correct networks and Traefik can reach them:
```bash
docker network inspect rythmix_backend
docker network inspect rythmix_frontend
```

## Adding New Services

To add a new service behind Traefik:

1. Add the service to `docker-compose.yml`
2. Connect it to the appropriate network (`backend` or `frontend`)
3. Add Traefik labels:

```yaml
services:
  new-service:
    networks:
      - frontend
    labels:
      - traefik.enable=true
      - traefik.http.routers.newservice.rule=Host(`new.localhost`)
      - traefik.http.routers.newservice.entrypoints=websecure
      - traefik.http.routers.newservice.tls=true
      - traefik.http.services.newservice.loadbalancer.server.port=8080
```

For production, add to `docker-compose.prod.yml` with Let's Encrypt:

```yaml
services:
  new-service:
    labels:
      - traefik.http.routers.newservice.rule=Host(`new.yourdomain.com`)
      - traefik.http.routers.newservice.tls.certresolver=letsencrypt
```
