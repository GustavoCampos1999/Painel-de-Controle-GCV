FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-optional && npm cache clean --force
COPY . .
EXPOSE 3000
CMD [ "npm", "start" ]