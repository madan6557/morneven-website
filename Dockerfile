FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=https://backend.dev.morneven.com
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/server.mjs ./server.mjs
COPY --from=build /app/package.json ./package.json

EXPOSE 8080

CMD ["node", "server.mjs"]
