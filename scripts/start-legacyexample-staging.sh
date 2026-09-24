#!/bin/sh
set -eu

mkdir -p /app/output/.legacyexample-staging/assets
chown node:node /app/output
chown -R node:node /app/output/.legacyexample-staging

exec gosu node:node npm run start --prefix apps/dashboard
