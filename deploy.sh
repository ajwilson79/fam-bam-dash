#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "==> Fetching latest from remote..."
git fetch
git reset --hard origin/main

echo "==> Installing dependencies..."
cd app
npm install

echo "==> Building..."
npm run build

echo "==> Restarting service..."
sudo systemctl restart fam-bam-dash
