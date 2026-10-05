#!/bin/sh
set -eu
pnpm db:migrate
exec node dist/main.js
