FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
# Use npm install to avoid lockfile mismatch during CI builds
RUN npm install --omit=dev --no-audit --no-fund

# Copy application code
COPY . .

# Use non-root user
RUN useradd --user-group --create-home --shell /bin/false appuser && chown -R appuser:appuser /usr/src/app
USER appuser

# Port that the app listens on
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
