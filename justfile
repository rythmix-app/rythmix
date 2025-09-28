# -*- mode: makefile -*-
# Rythmix Development Commands
#
# A justfile for managing the Rythmix full-stack application
# Run 'just --list' to see all available commands

set shell := ["bash", "-c"]

# Default recipe - show available commands
default:
    @just --list

# =============================================================================
# Project Setup & Initialization
# =============================================================================

# Initialize project (copy .env files and generate keys)
init:
    @echo "🚀 Setting up Rythmix environment..."
    @echo "📁 Copying environment files..."
    find backend back-office -type f -name ".env*.example" -exec sh -c 'cp "$1" "${1%.example}"' _ {} \;
    @echo "🔑 Generating AdonisJS APP_KEY..."
    cd backend && npm install && node ace generate:key
    @echo "✅ Project initialized! Run 'just dev' to start development."

# Install dependencies for all projects
install:
    @echo "📦 Installing dependencies..."
    cd backend && npm install
    cd back-office && npm install
    cd front-mobile && npm install
    @echo "✅ All dependencies installed!"

# =============================================================================
# Docker Environment Management
# =============================================================================

# Start development environment
dev:
    docker compose up

# Start development environment in background
dev-d:
    docker compose up -d

# Start production environment
prod:
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up

# Start production environment in background
prod-d:
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Start only the database
db:
    docker compose up database

# Start database in background
db-d:
    docker compose up -d database

# Stop all services
stop:
    docker compose down

# Stop all services and remove volumes
clean:
    @echo "🧹 Cleaning up Docker resources..."
    docker compose down -v

# Remove all unused Docker resources (containers, images, volumes, networks)
clean-all:
    @echo "🧹 Cleaning up all Docker resources..."
    docker system prune -a --volumes -f

# Rebuild containers and start development
rebuild:
    @echo "🔄 Rebuilding containers..."
    docker compose down
    docker compose build --no-cache
    docker compose up

# Show status of all services
status:
    docker compose ps

# View logs (optionally filter by service)
logs service="":
    #!/usr/bin/env bash
    if [ "{{service}}" = "" ]; then
        docker compose logs -f
    else
        docker compose logs -f "{{service}}"
    fi

# =============================================================================
# Backend (AdonisJS) Commands
# =============================================================================

# Run backend in development mode
backend-dev:
    cd backend && npm run dev

# Build backend for production
backend-build:
    cd backend && npm run build

# Run backend tests
backend-test:
    cd backend && npm run test

# Lint backend code
backend-lint:
    cd backend && npm run lint

# Type check backend code
backend-typecheck:
    cd backend && npm run typecheck

# Format backend code
backend-format:
    cd backend && npm run format

# Run all backend checks (lint + typecheck + test)
backend-check:
    cd backend && npm run lint && npm run typecheck && npm run test

# =============================================================================
# Back-office (Angular) Commands
# =============================================================================

# Run back-office in development mode
office-dev:
    cd back-office && npm start

# Build back-office for production
office-build:
    cd back-office && npm run build

# Run back-office tests
office-test:
    cd back-office && npm run test

# Run back-office tests in watch mode
office-test-watch:
    cd back-office && npm run test -- --watch

# =============================================================================
# Front-mobile (Expo) Commands
# =============================================================================

# Start Expo development server
mobile-dev:
    cd front-mobile && npm start

# Run on Android
mobile-android:
    cd front-mobile && npm run android

# Run on iOS
mobile-ios:
    cd front-mobile && npm run ios

# Run on web
mobile-web:
    cd front-mobile && npm run web

# Lint mobile code
mobile-lint:
    cd front-mobile && npm run lint

# =============================================================================
# Quality Assurance
# =============================================================================

# Run all linting across projects
lint-all:
    @echo "🔍 Running lints for all projects..."
    cd backend && npm run lint
    @echo "⚠️  Back-office: No lint command configured"
    cd front-mobile && npm run lint

# Run all tests across projects
test-all:
    @echo "🧪 Running tests for all projects..."
    cd backend && npm run test
    cd back-office && npm run test

# Type check all TypeScript projects
typecheck-all:
    @echo "🔍 Type checking all projects..."
    cd backend && npm run typecheck
    @echo "⚠️  Back-office: No typecheck command configured"
    @echo "⚠️  Front-mobile: No typecheck command configured"

# Run complete quality check (lint + typecheck + test)
check-all:
    @echo "🔍 Running complete quality check..."
    just lint-all
    just typecheck-all
    just test-all
    @echo "✅ All quality checks completed!"

# Format all code
format-all:
    @echo "🎨 Formatting all projects..."
    cd backend && npm run format
    @echo "⚠️  Back-office: No format command configured"
    @echo "⚠️  Front-mobile: No format command configured"

# =============================================================================
# Utilities
# =============================================================================

# Show project information
info:
    @echo "📋 Rythmix Project Information"
    @echo "============================="
    @echo "Backend:     AdonisJS 6 + TypeScript + PostgreSQL"
    @echo "Back-office: Angular 20 + TypeScript"
    @echo "Mobile:      Expo 53 + React Native + TypeScript"
    @echo ""
    @echo "Ports:"
    @echo "  Backend (dev):     http://localhost:3333"
    @echo "  Backend (prod):    http://localhost:3334"
    @echo "  Back-office (dev): http://localhost:4200"
    @echo "  Back-office (prod): http://localhost:8080"
    @echo "  Database:          localhost:5432"