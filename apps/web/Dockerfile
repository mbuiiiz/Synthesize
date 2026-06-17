# apps/web/Dockerfile
# Using Node 22 as required by your README
FROM node:22-slim

# Install the exact version of pnpm specified in your README
RUN npm install -g pnpm@9.15.0

# Set the working directory to the root of the monorepo inside the container
WORKDIR /app

# Copy the dependency lockfiles and workspace configuration first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy the rest of the monorepo (this ensures apps/web has access to packages/shared)
COPY . .

# Install dependencies across the entire workspace
RUN pnpm install

# Expose standard development ports (3000 for React/Next, 5173 for Vite)
EXPOSE 3000 5173

# Run the exact web command from your README
CMD ["pnpm", "dev:web"]