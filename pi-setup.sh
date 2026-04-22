#!/bin/bash
# Fam Bam Dash — Raspberry Pi Setup
#
# Run this once on a fresh Raspberry Pi OS (Bookworm) installation.
# It installs Node.js, configures the app, installs it as a systemd service,
# sets up Chromium in kiosk mode, and optionally configures a PIR motion sensor.
#
# Usage:
#   chmod +x pi-setup.sh
#   ./pi-setup.sh

set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$REPO_DIR/app"
SERVICE_FILE=/etc/systemd/system/fam-bam-dash.service
CURRENT_USER="${SUDO_USER:-$USER}"
AUTOSTART_FILE="$HOME/.config/labwc/autostart"

# Detect Pi model — Pi 5 uses wlr-randr for rotation; Pi 4 and earlier use config.txt
PI_MODEL=$(cat /proc/device-tree/model 2>/dev/null | tr -d '\0' || echo "unknown")
IS_PI5=false
echo "$PI_MODEL" | grep -q "Raspberry Pi 5" && IS_PI5=true

# ── Colours ───────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

header()  { echo -e "\n${BOLD}${CYAN}━━━  $*  ━━━${RESET}"; }
step()    { echo -e "${CYAN}▸ $*${RESET}"; }
ok()      { echo -e "${GREEN}✓ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $*${RESET}"; }
fail()    { echo -e "${RED}✗ $*${RESET}"; exit 1; }
ask()     { echo -en "${BOLD}$* ${RESET}"; }

# ── Preflight ─────────────────────────────────────────────────────────────────

header "Fam Bam Dash — Raspberry Pi Setup"
echo ""
echo "This script will:"
echo "  1. Install Node.js 20"
echo "  2. Configure app/.env.local (API keys, timezone, admin PIN)"
echo "  3. Build the app"
echo "  4. Install fam-bam-dash as a systemd service"
echo "  5. Set up Chromium kiosk mode"
echo "  6. Set up boot splash screen and session wallpaper"
echo "  7. Optionally configure portrait display rotation"
echo "  8. Optionally set up the PIR motion sensor service"
echo "  9. Optionally set up a weekly reboot schedule"
echo ""
ask "Continue? [Y/n]:"
read -r REPLY
[[ -z "$REPLY" || "$REPLY" =~ ^[Yy]$ ]] || exit 0

if [ "$EUID" -eq 0 ]; then
    fail "Do not run this script as root. Run as your normal Pi user; sudo will be used when needed."
fi

if ! ping -c 1 8.8.8.8 &>/dev/null; then
    fail "No internet connection detected. Connect to the network and try again."
fi

# ── Step 1: Node.js ───────────────────────────────────────────────────────────

header "Step 1 of 9: Node.js"

NODE_OK=false
if command -v node &>/dev/null; then
    NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VER" -ge 20 ]; then
        ok "Node.js $(node --version) already installed."
        NODE_OK=true
    else
        warn "Node.js $(node --version) is too old (need 20+). Upgrading..."
    fi
fi

if [ "$NODE_OK" = false ]; then
    step "Installing Node.js 20 via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >/dev/null
    sudo apt-get install -y nodejs >/dev/null
    ok "Node.js $(node --version) installed."
fi

# ── Step 2: Configure .env.local ─────────────────────────────────────────────

header "Step 2 of 9: Environment Variables"

ENV_FILE="$APP_DIR/.env.local"

if [ -f "$ENV_FILE" ]; then
    warn "app/.env.local already exists."
    ask "Reconfigure it? [y/N]:"
    read -r RECONFIGURE
    if [[ ! "$RECONFIGURE" =~ ^[Yy]$ ]]; then
        ok "Keeping existing app/.env.local."
        SKIP_ENV=true
    fi
fi

if [ "${SKIP_ENV:-false}" = false ]; then
    echo ""
    echo "  Enter your configuration values."
    echo "  Press Enter to leave optional values blank — they can be set later in the browser."
    echo ""

    ask "  Google OAuth Client ID (VITE_GOOGLE_CLIENT_ID) [optional]:"; read -r GCLIENT_ID
    ask "  Google OAuth Client Secret (GOOGLE_CLIENT_SECRET) [optional]:"; read -r GCLIENT_SECRET
    ask "  Google Calendar iCal URL (GCAL_ICAL_URL) [optional]:"; read -r GICAL_URL
    ask "  Timezone (VITE_TIMEZONE) [America/New_York]:"; read -r TIMEZONE
    TIMEZONE="${TIMEZONE:-America/New_York}"
    echo ""
    echo "  Admin PIN — required to open Settings, upload/delete photos, or connect"
    echo "  Google accounts. The dashboard itself works without it (clock, weather,"
    echo "  calendar, checking off todos). Recommended."
    ask "  Admin PIN (FAM_BAM_ADMIN_PIN) [leave blank to disable]:"; read -r ADMIN_PIN

    cat > "$ENV_FILE" << EOF
# Google OAuth — required for Calendar OAuth and Google Photos
VITE_GOOGLE_CLIENT_ID=${GCLIENT_ID}
GOOGLE_CLIENT_SECRET=${GCLIENT_SECRET}

# Google Calendar iCal feed (server-side proxy, simpler alternative to OAuth)
GCAL_ICAL_URL=${GICAL_URL}

# Timezone for calendar display
VITE_TIMEZONE=${TIMEZONE}

# Admin PIN — gates Settings, photo upload/delete, and OAuth. Blank disables.
FAM_BAM_ADMIN_PIN=${ADMIN_PIN}

# Fallback weather coordinates — enter your ZIP in the app instead
VITE_LAT=37.7749
VITE_LON=-122.4194
EOF
    ok "Wrote app/.env.local."
fi

# ── Step 3: Build ─────────────────────────────────────────────────────────────

header "Step 3 of 9: Build"

step "Installing npm dependencies..."
cd "$APP_DIR"
npm install --silent
ok "Dependencies installed."

step "Building app..."
npm run build
ok "Build complete."
cd "$REPO_DIR"

# ── Step 4: App systemd service ───────────────────────────────────────────────

header "Step 4 of 9: App Service"

if [ -f "$SERVICE_FILE" ]; then
    warn "fam-bam-dash service already exists — reinstalling."
    sudo systemctl stop fam-bam-dash 2>/dev/null || true
fi

step "Creating systemd service..."
sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=Fam Bam Dash
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/npm run preview
Restart=always
RestartSec=5
User=${CURRENT_USER}

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable fam-bam-dash
sudo systemctl start fam-bam-dash
ok "fam-bam-dash service installed and started."

# Verify it came up
sleep 3
if ! systemctl is-active --quiet fam-bam-dash; then
    warn "Service may not have started correctly. Check: journalctl -u fam-bam-dash -n 20"
else
    ok "Service is running at http://localhost:12000"
fi

# ── Step 5: Kiosk mode ────────────────────────────────────────────────────────

header "Step 5 of 9: Kiosk Mode"

KIOSK_SCRIPT="$REPO_DIR/kiosk-setup.sh"
if [ ! -f "$KIOSK_SCRIPT" ]; then
    warn "kiosk-setup.sh not found — skipping. Run it manually when ready."
else
    chmod +x "$KIOSK_SCRIPT"
    bash "$KIOSK_SCRIPT"
fi

# ── Step 6: Splash screen and wallpaper ──────────────────────────────────────

header "Step 6 of 9: Boot Splash & Wallpaper"

SPLASH_SCRIPT="$REPO_DIR/scripts/splash-setup.sh"
if [ ! -f "$SPLASH_SCRIPT" ]; then
    warn "scripts/splash-setup.sh not found — skipping."
elif [ ! -f "$REPO_DIR/assets/splash-boot.png" ] && [ ! -f "$REPO_DIR/assets/splash.png" ]; then
    warn "No images found in assets/ — skipping splash setup."
    warn "Add assets/splash-boot.png (boot) and assets/splash.png (wallpaper) and re-run to configure."
else
    chmod +x "$SPLASH_SCRIPT"
    bash "$SPLASH_SCRIPT"
fi

# ── Step 7: Portrait rotation ─────────────────────────────────────────────────

header "Step 7 of 9: Display Rotation"

echo "  The dashboard is optimised for portrait (vertical) orientation."
if [ "$IS_PI5" = true ]; then
    echo "  Detected: ${PI_MODEL}"
    echo "  Pi 5 uses wlr-randr (Wayland) — rotation is applied at session start."
fi
echo ""
ask "  Rotate display to portrait mode? [y/N]:"
read -r DO_ROTATE

if [[ "$DO_ROTATE" =~ ^[Yy]$ ]]; then
    echo ""
    echo "  Looking at your mounted portrait display:"
    echo "  Where is the physical bottom of the monitor (ports, stand, logo)?"
    echo "    1) On the LEFT  side"
    echo "    2) On the RIGHT side"
    ask "  Choose [1/2]:"
    read -r ROTATE_DIR

    if [ "$IS_PI5" = true ]; then
        # ── Pi 5: wlr-randr via Wayland ───────────────────────────────────────
        # display_rotate in config.txt does not work on Pi 5.
        # Instead, wlr-randr sets rotation inside the Wayland session,
        # so we prepend it to the labwc autostart before Chromium launches.

        if ! command -v wlr-randr &>/dev/null; then
            step "Installing wlr-randr..."
            sudo apt-get install -y wlr-randr >/dev/null
            ok "wlr-randr installed."
        fi

        echo ""
        echo "  What display connection are you using?"
        echo "    1) HDMI (default — micro-HDMI port 1)"
        echo "    2) Official Raspberry Pi touchscreen (DSI)"
        ask "  Choose [1/2]:"
        read -r DISPLAY_TYPE
        if [[ "$DISPLAY_TYPE" == "2" ]]; then
            OUTPUT_NAME="DSI-1"
        else
            OUTPUT_NAME="HDMI-A-1"
        fi

        if [[ "$ROTATE_DIR" == "2" ]]; then
            TRANSFORM="90"    # physical bottom on right
        else
            TRANSFORM="270"   # physical bottom on left
        fi

        ROTATE_CMD="wlr-randr --output ${OUTPUT_NAME} --transform ${TRANSFORM}"

        if [ -f "$AUTOSTART_FILE" ]; then
            # Insert rotation command before the chromium launch line
            sed -i "/^chromium/i ${ROTATE_CMD}" "$AUTOSTART_FILE"
            ok "Rotation added to kiosk autostart: ${ROTATE_CMD}"
        else
            warn "Kiosk autostart not found at ${AUTOSTART_FILE}."
            warn "Add this line manually before the Chromium entry:"
            echo "  ${ROTATE_CMD}"
        fi

    else
        # ── Pi 4 and earlier: display_rotate in config.txt ────────────────────
        CONFIG_FILE="/boot/firmware/config.txt"
        [ -f "$CONFIG_FILE" ] || CONFIG_FILE="/boot/config.txt"

        if [[ "$ROTATE_DIR" == "2" ]]; then
            ROTATE_VAL=1   # physical bottom on right
        else
            ROTATE_VAL=3   # physical bottom on left
        fi

        if grep -q "^display_rotate=" "$CONFIG_FILE" 2>/dev/null; then
            sudo sed -i "s/^display_rotate=.*/display_rotate=${ROTATE_VAL}/" "$CONFIG_FILE"
        else
            echo "display_rotate=${ROTATE_VAL}" | sudo tee -a "$CONFIG_FILE" > /dev/null
        fi
        ok "Display rotation set in ${CONFIG_FILE} (takes effect after reboot)."
    fi

else
    if [ "$IS_PI5" = true ]; then
        ok "Skipped — add 'wlr-randr --output HDMI-A-1 --transform 90' to ${AUTOSTART_FILE} if needed later."
    else
        ok "Skipped — add 'display_rotate=1' to /boot/firmware/config.txt if needed later."
    fi
fi

# ── Step 8: Motion sensor ─────────────────────────────────────────────────────

header "Step 8 of 9: Motion Sensor (optional)"

echo "  A PIR motion sensor on GPIO pin 17 can wake the screen on motion,"
echo "  switch between dashboard and picture frame modes by time of day,"
echo "  and turn the screen off when no motion is detected."
echo ""
ask "  Do you have a PIR sensor wired to GPIO pin 17? [y/N]:"
read -r HAS_SENSOR

if [[ "$HAS_SENSOR" =~ ^[Yy]$ ]]; then
    SENSOR_SCRIPT="$REPO_DIR/scripts/motion-sensor-setup.sh"
    if [ ! -f "$SENSOR_SCRIPT" ]; then
        warn "scripts/motion-sensor-setup.sh not found — skipping."
    else
        chmod +x "$SENSOR_SCRIPT"
        bash "$SENSOR_SCRIPT"
    fi
else
    ok "Skipped — you can run scripts/motion-sensor-setup.sh later if you add a sensor."
fi

# ── Step 9: Reboot schedule ───────────────────────────────────────────────────

header "Step 9 of 9: Reboot Schedule (optional)"

echo "  A weekly scheduled reboot keeps the Pi healthy on long kiosk runs."
echo "  This also verifies all services are set to restart on boot."
echo ""
ask "  Set up a weekly reboot schedule? [Y/n]:"
read -r DO_SCHEDULE

if [[ -z "$DO_SCHEDULE" || "$DO_SCHEDULE" =~ ^[Yy]$ ]]; then
    SCHED_SCRIPT="$REPO_DIR/scripts/reboot-schedule.sh"
    if [ ! -f "$SCHED_SCRIPT" ]; then
        warn "scripts/reboot-schedule.sh not found — skipping."
    else
        chmod +x "$SCHED_SCRIPT"
        bash "$SCHED_SCRIPT"
    fi
else
    ok "Skipped — run scripts/reboot-schedule.sh later to configure."
fi

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}━━━  Setup complete!  ━━━${RESET}"
echo ""
echo "  Dashboard:    http://localhost:12000"
echo "  App service:  sudo systemctl status fam-bam-dash"
echo "  App logs:     journalctl -u fam-bam-dash -f"
if [[ "$HAS_SENSOR" =~ ^[Yy]$ ]]; then
echo "  Sensor logs:  journalctl -u fam-bam-motion -f"
fi
echo ""
echo "  Remote admin: open http://$(hostname -I | awk '{print $1}'):12000 from any device on your network"
echo ""
ask "Reboot now to apply all changes? [Y/n]:"
read -r DO_REBOOT
if [[ -z "$DO_REBOOT" || "$DO_REBOOT" =~ ^[Yy]$ ]]; then
    sudo reboot
fi
