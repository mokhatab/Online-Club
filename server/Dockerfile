FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .
ENV NODE_ENV=production PORT=4000 DATABASE_PATH=/data/online-club.db
EXPOSE 4000
CMD ["node", "src/index.js"]
