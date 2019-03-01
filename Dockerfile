FROM node:8.15.0-alpine

RUN apk update && apk add --no-cache git

WORKDIR /usr/src/app

COPY dist .

ENTRYPOINT [ "node", "dti-backup-git.js" ]
