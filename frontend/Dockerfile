FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_WS_URL=
ARG VITE_SPEECH_KEY=
ARG VITE_SPEECH_REGION=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_WS_URL=$VITE_WS_URL \
    VITE_SPEECH_KEY=$VITE_SPEECH_KEY \
    VITE_SPEECH_REGION=$VITE_SPEECH_REGION
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
