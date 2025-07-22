# Base stage
FROM node:alpine AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Prod build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Dev stage
FROM build AS dev
EXPOSE 3333
CMD ["npm", "run", "dev"]

# Prod stage
FROM base AS prod
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
EXPOSE 3333
CMD ["node", "build/bin/server.js"]