FROM node:20-alpine

WORKDIR /app

# Install wrangler globally
RUN npm install -g wrangler@latest

# Copy all source files
COPY . .

# Expose port
EXPOSE 8787

# Run wrangler in local mode (no Cloudflare account needed)
CMD ["wrangler", "dev", "--local", "--port", "8787", "--host", "0.0.0.0", "--no-bundle"]
