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

echo "==> Updating labwc autostart..."
mkdir -p "$HOME/.config/labwc"
cp "$(dirname "$0")/config/labwc-autostart" "$HOME/.config/labwc/autostart"

echo "==> Rebooting..."
sudo reboot
