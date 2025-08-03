# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:1.25-alpine

# Copy custom nginx configuration
# It's better to copy to conf.d to avoid replacing the main nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built application from the 'build' stage
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 8080 as defined in our nginx.conf
EXPOSE 8080

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
