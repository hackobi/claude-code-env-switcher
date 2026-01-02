FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm run build || true

EXPOSE 3001 3011 3012

CMD ["npm", "run", "orchestrator"]
