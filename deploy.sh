#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Fetching latest from remote..."
cd "$REPO_DIR"
git fetch
git reset --hard origin/main

echo "==> Installing dependencies..."
cd "$REPO_DIR/app"
npm install

echo "==> Building..."
npm run build

echo "==> Updating labwc autostart..."
mkdir -p "$HOME/.config/labwc"
cp "$REPO_DIR/config/labwc-autostart" "$HOME/.config/labwc/autostart"

echo "==> Rebooting..."
sudo reboot
