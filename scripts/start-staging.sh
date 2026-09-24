#!/bin/sh
set -eu

mkdir -p /app/output/.calinium-example-staging/assets
chown node:node /app/output
chown -R node:node /app/output/.calinium-example-staging

exec gosu node:node npm run start --prefix apps/dashboard
