# Dockerfile for setting up Chart of Accounts in production
FROM node:20-alpine

# Install dependencies for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/
COPY lib/generated ./lib/generated/

# Install dependencies
RUN npm ci --only=production

# Copy seed scripts
COPY prisma/seed-production-coa-final.ts ./prisma/
COPY scripts/deploy-setup-coa.sh ./scripts/

# Make script executable
RUN chmod +x scripts/deploy-setup-coa.sh

# Set production environment
ENV NODE_ENV=production

# Run the setup script
CMD ["sh", "scripts/deploy-setup-coa.sh"]