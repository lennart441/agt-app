FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY sync-server.js .
COPY tokens.json .

EXPOSE 3000

CMD ["node", "sync-server.js"]