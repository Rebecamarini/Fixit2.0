#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Esta pasta já possui Git; confira git remote -v."
  exit 1
fi
git init -b main
git remote add origin https://github.com/Rebecamarini/Fixit2.0.git
git remote -v
