FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_DEMO_MODE=true
ARG VITE_DATA_SOURCE=mock
ARG VITE_API_BASE_URL=
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE \
    VITE_DATA_SOURCE=$VITE_DATA_SOURCE \
    VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ || exit 1
