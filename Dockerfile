# ==========================================
# STAGE 1: Development Base & Dependencies
# ==========================================
FROM node:20-alpine AS development

WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy application source code
COPY . .

# ==========================================
# STAGE 2: Build Application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY --from=development /usr/src/app/node_modules ./node_modules
COPY . .

# Compile TypeScript to JavaScript in /dist
RUN npm run build

# Set node environment and prune devDependencies
ENV NODE_ENV=production
RUN npm prune --production

# ==========================================
# STAGE 3: Production Runtime
# ==========================================
FROM node:20-alpine AS production

WORKDIR /usr/src/app

# Set environment
ENV NODE_ENV=production

# Copy compiled code and production node_modules from builder
COPY package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

# Use non-privileged node user for security
USER node

# Expose HTTP port
EXPOSE 3000

# Entrypoint command
CMD ["node", "dist/main.js"]
