FROM node:18-alpine

WORKDIR /app

# Install dependencies. package-lock.json is optional in this local-dev repo.
COPY package*.json ./
RUN npm install

# Copy project
COPY . .

# Expose port
EXPOSE 5173

# Run development server
CMD ["npm", "run", "dev"]
