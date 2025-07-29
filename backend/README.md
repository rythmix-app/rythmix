# Rythmix Backend – AdonisJS API

This is the backend of the **Rythmix** project, built with **AdonisJS** and **PostgreSQL**, fully containerized using **Docker** with multi-stage builds for development and production.

---

## 🛠 Tech Stack

- [AdonisJS](https://adonisjs.com/)
- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- Docker + Docker Compose

---

## 📦 Project Setup

### 1. Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/)
- Copy the environment examples:

```bash
cp .env.example .env
cp .env.dev.example .env.dev
cp .env.prod.example .env.prod

Make sure to fill in the variables according to your environment.

---

## 🚀 Running the Containers

### 🧪 Development Mode

```bash
docker-compose up adonis-dev
```

* Exposes the API at: `http://localhost:3333`
* Uses `.env.dev`
* Includes hot-reloading

---

### 🏗️ Production Mode

```bash
docker-compose up adonis-prod
```

* Runs the compiled API
* Uses `.env.prod`
* Production-ready container

---

### 🔁 Build and Launch Everything

```bash
docker-compose up --build -d
```

* Builds and launches all services in detached mode.

---

## 📁 Project Structure

```
.
├── .dockerignore
├── Dockerfile                # Multi-stage (deps, build, dev, prod)
├── docker-compose.yml        # Services for API + DB
├── .env.dev.example          # Dev environment variables
├── .env.prod.example         # Prod environment variables
├── .env.example              # Base environment variables
└── ...
```

---
