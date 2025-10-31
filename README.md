# 🎵 Rythmix

> 🚀 **Full-stack music platform** with AdonisJS backend, Angular admin interface, and React Native mobile app.

---

## ⚡ Quick Start

### 📋 Prerequisites
- 📦 **Node.js** 18+
- 🐳 **Docker & Docker Compose**
- ⚙️ **[just](https://github.com/casey/just)** command runner *(recommended)*

### 🛠️ Installing just

**[just](https://github.com/casey/just)** is a handy way to save and run project-specific commands. [Install it](https://github.com/casey/just#installation) first:

### 🔧 Project Setup

```bash
# 📥 Clone the repository
git clone <repository-url>
cd rythmix

# 🚀 Complete development setup
just install-dev

# 🏭 Or for production
just install-prod
```

### 🌐 Access Points
All services are accessible via HTTPS through Traefik reverse proxy:

- 🔗 **Backend API**: <https://api.localhost>
- 💼 **Back-office**: <https://admin.localhost>
- 🗃️ **Database**: `localhost:5432` (direct connection)
- 📊 **Traefik Dashboard**: <https://traefik.localhost>

---

## 🛠️ Development

### 🎯 Using just *(recommended)*

#### 🔥 Development Environment
```bash
just up-dev          # 🚀 Start development containers
just down-dev         # 🛑 Stop development containers
just logs-dev         # 📋 View development logs
```

#### 🏭 Production Environment
```bash
just up-prod          # 🚀 Start production containers
just down-prod        # 🛑 Stop production containers
just logs-prod        # 📋 View production logs
```

#### 🐚 Container Shell Access
```bash
just sh-backend       # 🖥️ Enter backend service shell
just sh-backoffice    # 🖥️ Enter back-office service shell
just sh-db           # 🖥️ Enter database service shell
```

#### 🗃️ Database Operations
```bash
just make-model MyModel              # 📝 Create new AdonisJS model
just make-migration create_my_table  # 🔄 Create new migration
just migrate                        # ⚡ Run pending migrations
```

#### 📚 Help & Status
```bash
just help            # ❓ Show all available commands
just docker-status   # 🐳 Check which Docker tool is being used
```

### 🔄 Alternative: Direct Docker commands
```bash
# 🔥 Development
docker compose up --build -d         # or docker-compose up --build -d

# 🏭 Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

### 🎯 Individual services *(without Docker)*
```bash
# 🔙 Backend (AdonisJS)
cd backend
npm install && npm run dev

# 💼 Back-office (Angular)
cd back-office
npm install && npm start

# 📱 Mobile (Expo)
cd front-mobile
npm install && npm start
```

---

## 📁 Project Structure

```
🎵 rythmix/
├── 🔙 backend/              # AdonisJS API + PostgreSQL
├── 💼 back-office/          # Angular admin interface
├── 📱 front-mobile/         # Expo React Native app
├── 🔀 traefik/              # Traefik reverse proxy configuration
├── 🐳 docker-compose.yml           # Base docker configuration
├── 🐳 docker-compose.override.yml  # Development overrides (auto-merged)
├── 🐳 docker-compose.prod.yml      # Production overrides
└── ⚙️ Justfile                     # Task automation commands
```

---

## 🚀 Production Deployment

Before deploying to production:

1. **Update domain names** in `docker-compose.prod.yml` (replace `yourdomain.com`)
2. **Update Let's Encrypt email** in `docker-compose.prod.yml`
3. **Configure DNS records** to point to your server
4. **Run production setup**:

   ```bash
   just install-prod
   ```

Traefik will automatically obtain and renew SSL certificates from Let's Encrypt.

> 📖 See `traefik/README.md` for detailed Traefik configuration and troubleshooting.

---

## ⚙️ Justfile Commands

> 🎯 This project uses **[just](https://github.com/casey/just)** for task automation. The Justfile automatically detects whether to use `docker-compose` or `docker compose` based on your system.

### 📋 Available Commands

| 🎯 Command | 📝 Description |
|------------|----------------|
| `just help` | ❓ Show all available commands |
| `just docker-status` | 🐳 Check which Docker tool is detected |
| **⚡ Installation** | |
| `just install-dev` | 🚀 Complete development environment setup |
| `just install-prod` | 🏭 Complete production environment setup |
| **🔥 Development** | |
| `just up-dev` | 🚀 Start development containers |
| `just down-dev` | 🛑 Stop development containers |
| `just logs-dev` | 📋 View development logs |
| **🏭 Production** | |
| `just up-prod` | 🚀 Start production containers |
| `just down-prod` | 🛑 Stop production containers |
| `just logs-prod` | 📋 View production logs |
| **🐚 Service Access** | |
| `just sh-backend` | 🖥️ Enter backend service shell |
| `just sh-backoffice` | 🖥️ Enter back-office service shell |
| `just sh-db` | 🖥️ Enter database service shell |
| **🗃️ Database** | |
| `just make-model NAME` | 📝 Create new AdonisJS model |
| `just make-migration NAME` | 🔄 Create new migration |
| `just migrate` | ⚡ Run pending migrations |

---

## 🛠️ Tech Stack

<div align="center">

### 🔙 Backend

[![AdonisJS](https://img.shields.io/badge/AdonisJS-6-5A45FF?style=for-the-badge&logo=adonisjs&logoColor=white)](https://adonisjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

### 💼 Admin Interface

[![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SCSS](https://img.shields.io/badge/SCSS-CC6699?style=for-the-badge&logo=sass&logoColor=white)](https://sass-lang.com/)

### 📱 Mobile App

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

### 🛠️ DevOps & Tools

[![just](https://img.shields.io/badge/just-FF6B35?style=for-the-badge&logo=rust&logoColor=white)](https://github.com/casey/just)
[![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Traefik](https://img.shields.io/badge/Traefik-24A1C1?style=for-the-badge&logo=traefikproxy&logoColor=white)](https://traefik.io/)

</div>
