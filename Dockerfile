# See https://malcoded.com/posts/angular-docker
# Stage 1 - Build
FROM node:8.15.0-alpine as buildContainer

WORKDIR /usr/src/app

# To invalidate node_modules cache when package.json changes
COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run test

RUN npm run build

# Stage 2 - Prepare for execution
FROM node:8.15.0-alpine

COPY --from=buildContainer /usr/src/app/dist/ /usr/src/app

WORKDIR /usr/src/app

ENTRYPOINT [ "node", "dti-backup-git.js" ]
