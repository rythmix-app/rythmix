# Traefik Configuration

Traefik v3.2 reverse proxy with automatic HTTPS for Rythmix.

## Quick Start

### Development

1. Generate certificates:

   ```bash
   ./setup-dev-certs.sh
   ```

2. Start services:

   ```bash
   docker compose up
   ```

3. Access:
   - Backend: <https://api.localhost>
   - Back-office: <https://admin.localhost>
   - Dashboard: <https://traefik.localhost>

### Production

1. Update domains in `docker-compose.prod.yml`
2. Update Let's Encrypt email
3. Point DNS to your server
4. Deploy:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

---

## Configuration Files

- `traefik.yml` - Static config (entrypoints, providers)
- `dynamic/tls.yml` - Dev TLS certificates

## Docker Compose Labels

Labels are split across three files:

- **docker-compose.yml** - Common labels (enable, entrypoints, tls, ports)
- **docker-compose.override.yml** - Dev labels (`.localhost` domains)
- **docker-compose.prod.yml** - Prod labels (real domains, Let's Encrypt)

## How It Works

**Development**: mkcert self-signed certificates from `certs/`

**Production**: Let's Encrypt with HTTP-01 challenge, stored in `traefik-certs` volume

All routing via Docker labels. HTTP redirects to HTTPS automatically.

---

## Troubleshooting

### Certificate warnings

```bash
mkcert -install
./setup-dev-certs.sh
docker compose restart traefik
```

### Let's Encrypt issues

- Verify DNS points to server
- Ensure port 80 is accessible
- Check logs: `docker compose logs traefik`

### Service not accessible

Check dashboard at <https://traefik.localhost> and verify service labels
