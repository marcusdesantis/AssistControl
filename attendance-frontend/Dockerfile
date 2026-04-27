FROM node:20-alpine AS build
WORKDIR /app

# ARG recibe el valor en docker build --build-arg VITE_API_URL=...
# ENV lo expone a Vite durante npm run build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install
COPY . .
RUN npx vite build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
