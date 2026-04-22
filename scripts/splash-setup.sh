#!/bin/bash
# Fam Bam Dash — Boot splash and session wallpaper setup
#
# - Plymouth theme: shows assets/splash-boot.png during boot (pre-rotated,
#   displayed before the OS handles display rotation)
# - Session wallpaper: shows assets/splash.png via wbg in the labwc session
#   (displayed after Wayland starts, while the dashboard app is loading)
#
# Called automatically by pi-setup.sh, or run standalone:
#   chmod +x scripts/splash-setup.sh
#   ./scripts/splash-setup.sh

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS_DIR="$REPO_DIR/assets"
AUTOSTART_FILE="$HOME/.config/labwc/autostart"
THEME_NAME="fam-bam-dash"
THEME_DIR="/usr/share/plymouth/themes/$THEME_NAME"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}✓ $*${RESET}"; }
step() { echo -e "${CYAN}▸ $*${RESET}"; }
warn() { echo -e "${YELLOW}⚠ $*${RESET}"; }

BOOT_IMAGE="$ASSETS_DIR/splash-boot.png"
WALL_IMAGE="$ASSETS_DIR/splash.png"

if [ ! -f "$BOOT_IMAGE" ]; then
    warn "assets/splash-boot.png not found — skipping Plymouth setup."
    SKIP_PLYMOUTH=true
fi
if [ ! -f "$WALL_IMAGE" ]; then
    warn "assets/splash.png not found — skipping wallpaper setup."
    SKIP_WALLPAPER=true
fi

# ── Plymouth boot splash ──────────────────────────────────────────────────────

if [ "${SKIP_PLYMOUTH:-false}" = false ]; then
    step "Installing Plymouth..."
    sudo apt-get install -y plymouth plymouth-themes >/dev/null
    ok "Plymouth installed."

    step "Creating Plymouth theme: $THEME_NAME..."
    sudo mkdir -p "$THEME_DIR"
    sudo cp "$BOOT_IMAGE" "$THEME_DIR/splash.png"

    # Plymouth script theme — centres the image on a black background
    sudo tee "$THEME_DIR/$THEME_NAME.plymouth" > /dev/null << EOF
[Plymouth Theme]
Name=Fam Bam Dash
Description=Fam Bam Dash boot splash
ModuleName=script

[script]
ImageDir=$THEME_DIR
ScriptFile=$THEME_DIR/$THEME_NAME.script
EOF

    sudo tee "$THEME_DIR/$THEME_NAME.script" > /dev/null << 'EOF'
wallpaper_image = Image("splash.png");
screen_width    = Window.GetWidth();
screen_height   = Window.GetHeight();
img_width       = wallpaper_image.GetWidth();
img_height      = wallpaper_image.GetHeight();

# Display at native size, centred on a black background — no scaling
sprite = Sprite(wallpaper_image);
sprite.SetX(Math.Int((screen_width  - img_width)  / 2));
sprite.SetY(Math.Int((screen_height - img_height) / 2));
sprite.SetZ(-100);
EOF

    step "Activating Plymouth theme..."
    sudo plymouth-set-default-theme -R "$THEME_NAME"
    ok "Plymouth theme set — splash-boot.png will show on next boot."
fi

# ── Session wallpaper (wbg) ───────────────────────────────────────────────────

if [ "${SKIP_WALLPAPER:-false}" = false ]; then
    step "Installing wbg (Wayland wallpaper)..."
    sudo apt-get install -y wbg >/dev/null
    ok "wbg installed."

    # Copy wallpaper to a stable system path so the autostart reference doesn't
    # break if the repo is moved
    WALLPAPER_DEST="/usr/local/share/fam-bam-dash/wallpaper.png"
    sudo mkdir -p "$(dirname "$WALLPAPER_DEST")"
    sudo cp "$WALL_IMAGE" "$WALLPAPER_DEST"

    if [ -f "$AUTOSTART_FILE" ]; then
        # Remove any existing wbg line to avoid duplicates on re-run
        sed -i '/^wbg /d' "$AUTOSTART_FILE"

        # Insert wbg as the first line (before display rotation and Chromium)
        # so the wallpaper is set as early as possible in the session
        sed -i "1i wbg $WALLPAPER_DEST &" "$AUTOSTART_FILE"
        ok "Wallpaper added to kiosk autostart."
    else
        warn "Kiosk autostart not found at $AUTOSTART_FILE."
        warn "Add this line manually at the top of your autostart:"
        echo "  wbg $WALLPAPER_DEST &"
    fi
fi

echo ""
echo -e "${GREEN}${BOLD}Splash setup complete.${RESET}"
echo "  Boot splash:  assets/splash-boot.png → Plymouth (visible during boot)"
echo "  Wallpaper:    assets/splash.png → wbg (visible while dashboard loads)"
echo ""
echo "To update images later, replace the files in assets/ and re-run this script."
