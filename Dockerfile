FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM deps AS build
WORKDIR /app
COPY tsconfig.backend.json ./
COPY src ./src
COPY database ./database
RUN npm run backend:build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY database ./database
EXPOSE 4000
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/server.js"]

