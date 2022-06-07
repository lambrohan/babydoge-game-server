FROM node:16.15.0-alpine

WORKDIR /app

COPY package*.json yarn.lock ./

RUN yarn

COPY . .

EXPOSE 2567

CMD ["yarn", "start"]