# Dockerfile para frontend React+Vite
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV VITE_PORT=5143
ENV VITE_API_URL=http://localhost:5000
EXPOSE 5143
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5143"]
