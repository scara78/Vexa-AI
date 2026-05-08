FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY . .

EXPOSE 8787

CMD ["node", "server.js"]
