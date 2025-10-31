#!/bin/bash

# Setup script for local development HTTPS certificates using mkcert
# This script generates self-signed certificates for local development

set -e

echo "Setting up local HTTPS certificates for development..."

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
  cat << EOF
Error: mkcert is not installed

Please install mkcert first.
Installation instructions: https://github.com/FiloSottile/mkcert#installation
EOF
  exit 1
fi

# Install local CA if not already installed
mkcert -install

# Create certs directory if it doesn't exist
mkdir -p certs

mkcert -cert-file certs/localhost.pem -key-file certs/localhost-key.pem \
    localhost api.localhost admin.localhost traefik.localhost 127.0.0.1 ::1 # "*.localhost"

cat << EOF
Development URLs (HTTPS):
  - Backend API:       https://api.localhost
  - Back-office:       https://admin.localhost
  - Traefik Dashboard: https://traefik.localhost

You can now run: docker compose up
EOF
