FROM node:20 AS build
WORKDIR /app/frontend

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

RUN npm run build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html

RUN rm -rf ./*

COPY --from=build /app/frontend/dist .

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]