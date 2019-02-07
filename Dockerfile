FROM node:8.15.0-alpine

WORKDIR /usr/src/app

COPY dist .

ENTRYPOINT [ "node", "dti-backup-git.js" ]
