#!/bin/bash
# Fam Bam Dash — Weekly reboot scheduler + boot dependency checker
#
# Sets up a cron job to reboot the Pi on a schedule, then verifies that
# all services and the kiosk autostart are configured to come back up cleanly.
#
# Usage:
#   chmod +x scripts/reboot-schedule.sh
#   ./scripts/reboot-schedule.sh

set -e

AUTOSTART_FILE="$HOME/.config/labwc/autostart"
APP_URL="http://localhost:12000"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

header() { echo -e "\n${BOLD}${CYAN}━━━  $*  ━━━${RESET}"; }
step()   { echo -e "${CYAN}▸ $*${RESET}"; }
ok()     { echo -e "${GREEN}✓ $*${RESET}"; }
warn()   { echo -e "${YELLOW}⚠ $*${RESET}"; }
fail()   { echo -e "${RED}✗ $*${RESET}"; exit 1; }
ask()    { echo -en "${BOLD}$* ${RESET}"; }

# ── Preflight ─────────────────────────────────────────────────────────────────

if [ "$EUID" -eq 0 ]; then
    fail "Do not run as root. Run as your normal Pi user; sudo will be used when needed."
fi

header "Fam Bam Dash — Reboot Schedule + Boot Check"

# ── Step 1: Choose reboot schedule ───────────────────────────────────────────

echo ""
echo "  The Pi will reboot on a weekly schedule — recommended during night hours"
echo "  when the motion sensor already has the screen off."
echo ""
echo "  Days: 0=Sun  1=Mon  2=Tue  3=Wed  4=Thu  5=Fri  6=Sat"
echo ""
ask "  Day of week [0 = Sunday]:"; read -r DOW
DOW="${DOW:-0}"
ask "  Hour (0–23) [3]:"; read -r HOUR
HOUR="${HOUR:-3}"
ask "  Minute (0–59) [0]:"; read -r MIN
MIN="${MIN:-0}"

# Sanitise
[[ "$DOW"  =~ ^[0-6]$                  ]] || { warn "Invalid day, using 0 (Sunday)";  DOW=0;  }
[[ "$HOUR" =~ ^([0-9]|1[0-9]|2[0-3])$ ]] || { warn "Invalid hour, using 3";          HOUR=3; }
[[ "$MIN"  =~ ^([0-9]|[1-5][0-9])$    ]] || { warn "Invalid minute, using 0";         MIN=0;  }

DAY_NAMES=(Sunday Monday Tuesday Wednesday Thursday Friday Saturday)
CRON_ENTRY="${MIN} ${HOUR} * * ${DOW} /sbin/reboot"

# ── Step 2: Install cron job ──────────────────────────────────────────────────

header "Step 1 of 4: Cron Job"

step "Installing cron job: ${CRON_ENTRY}"

EXISTING=$(sudo crontab -l 2>/dev/null || true)
if echo "$EXISTING" | grep -q "/sbin/reboot"; then
    warn "Existing reboot cron job found — replacing it."
    EXISTING=$(echo "$EXISTING" | grep -v "/sbin/reboot")
fi

echo "${EXISTING}
${CRON_ENTRY}" | sudo crontab -

ok "Pi will reboot at $(printf '%02d:%02d' "$HOUR" "$MIN") every ${DAY_NAMES[$DOW]}."
echo "  View:   sudo crontab -l"
echo "  Remove: sudo crontab -l | grep -v '/sbin/reboot' | sudo crontab -"

# ── Step 3: Verify app service ────────────────────────────────────────────────

header "Step 2 of 4: App Service"

# Enabled at boot?
if systemctl is-enabled --quiet fam-bam-dash 2>/dev/null; then
    ok "fam-bam-dash is enabled (starts on boot)."
else
    warn "fam-bam-dash is not enabled — enabling now..."
    sudo systemctl enable fam-bam-dash
    ok "fam-bam-dash enabled."
fi

# Restart policy — must be 'always' so a crash doesn't leave the screen dead
RESTART_POLICY=$(systemctl show fam-bam-dash --property=Restart --value 2>/dev/null || echo "")
if [[ "$RESTART_POLICY" == "always" ]]; then
    ok "Restart=always (service auto-recovers from crashes)."
else
    warn "Restart policy is '${RESTART_POLICY:-unknown}' — patching to 'always'..."
    SERVICE_FILE=/etc/systemd/system/fam-bam-dash.service
    if [ -f "$SERVICE_FILE" ]; then
        if sudo grep -q "^Restart=" "$SERVICE_FILE"; then
            sudo sed -i 's/^Restart=.*/Restart=always/' "$SERVICE_FILE"
        else
            sudo sed -i '/^\[Service\]/a Restart=always' "$SERVICE_FILE"
        fi
        # Ensure a sane RestartSec
        if ! sudo grep -q "^RestartSec=" "$SERVICE_FILE"; then
            sudo sed -i '/^Restart=always/a RestartSec=5' "$SERVICE_FILE"
        fi
        sudo systemctl daemon-reload
        ok "Restart=always applied."
    else
        warn "$SERVICE_FILE not found — run pi-setup.sh first to create the service."
    fi
fi

# Currently running?
if systemctl is-active --quiet fam-bam-dash 2>/dev/null; then
    ok "fam-bam-dash is currently running."
else
    warn "fam-bam-dash is not running."
    ask "  Start it now? [Y/n]:"; read -r START_NOW
    if [[ -z "$START_NOW" || "$START_NOW" =~ ^[Yy]$ ]]; then
        sudo systemctl start fam-bam-dash
        sleep 3
        if systemctl is-active --quiet fam-bam-dash; then
            ok "fam-bam-dash started."
        else
            warn "Service may not have started correctly."
            echo "  Check: journalctl -u fam-bam-dash -n 30"
        fi
    fi
fi

# ── Step 4: Verify kiosk autostart wait loop ──────────────────────────────────

header "Step 3 of 4: Kiosk Startup Wait"

if [ ! -f "$AUTOSTART_FILE" ]; then
    warn "Kiosk autostart not found at $AUTOSTART_FILE."
    warn "Run kiosk-setup.sh first, then re-run this script to add the wait loop."
else
    if grep -q "curl.*${APP_URL}\|_w=0" "$AUTOSTART_FILE" 2>/dev/null; then
        ok "Autostart already has a server wait loop — no changes needed."
    else
        step "Adding server wait loop to $AUTOSTART_FILE..."

        # Ensure curl is installed
        if ! command -v curl &>/dev/null; then
            step "Installing curl..."
            sudo apt-get install -y curl >/dev/null
            ok "curl installed."
        fi

        # Find the line number of the chromium launch
        CHROMIUM_LINE=$(grep -n "^chromium" "$AUTOSTART_FILE" 2>/dev/null | head -1 | cut -d: -f1)
        if [ -z "$CHROMIUM_LINE" ]; then
            warn "Could not locate the Chromium line in $AUTOSTART_FILE."
            warn "Add this block manually, just before the chromium entry:"
            echo ""
            echo "  _w=0"
            echo "  until curl -sf ${APP_URL} >/dev/null 2>&1; do"
            echo "      sleep 2; _w=\$((_w + 2)); [ \$_w -ge 90 ] && break"
            echo "  done"
        else
            # Build replacement: everything before chromium, then the wait loop, then the rest
            INSERT_AT=$((CHROMIUM_LINE - 1))
            {
                head -n "$INSERT_AT" "$AUTOSTART_FILE"
                echo ""
                echo "# Wait for the fam-bam-dash server before launching Chromium (up to 90s)."
                echo "# The systemd service starts in parallel with the Wayland session so it"
                echo "# may not be ready by the time this autostart runs."
                echo "_w=0"
                echo "until curl -sf ${APP_URL} >/dev/null 2>&1; do"
                echo "    sleep 2; _w=\$((_w + 2)); [ \$_w -ge 90 ] && break"
                echo "done"
                echo ""
                tail -n +"$CHROMIUM_LINE" "$AUTOSTART_FILE"
            } > /tmp/fam-bam-autostart.tmp
            cp /tmp/fam-bam-autostart.tmp "$AUTOSTART_FILE"
            rm /tmp/fam-bam-autostart.tmp
            ok "Wait loop added — Chromium will wait up to 90s for the app to be ready."
        fi
    fi
fi

# ── Step 5: Optional motion sensor service ────────────────────────────────────

header "Step 4 of 4: Motion Sensor Service (if installed)"

if systemctl list-unit-files fam-bam-motion.service &>/dev/null 2>&1 \
   && systemctl list-unit-files fam-bam-motion.service | grep -q fam-bam-motion; then
    if systemctl is-enabled --quiet fam-bam-motion 2>/dev/null; then
        ok "fam-bam-motion is enabled (starts on boot)."
    else
        warn "fam-bam-motion exists but is not enabled."
        ask "  Enable it? [Y/n]:"; read -r ENABLE_MOTION
        if [[ -z "$ENABLE_MOTION" || "$ENABLE_MOTION" =~ ^[Yy]$ ]]; then
            sudo systemctl enable fam-bam-motion
            ok "fam-bam-motion enabled."
        fi
    fi
else
    ok "Motion sensor service not installed — skipping (this is fine if you have no PIR sensor)."
fi

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}━━━  All checks complete!  ━━━${RESET}"
echo ""
echo "  Reboot schedule: $(printf '%02d:%02d' "$HOUR" "$MIN") every ${DAY_NAMES[$DOW]}"
echo "  App service:     sudo systemctl status fam-bam-dash"
echo "  App logs:        journalctl -u fam-bam-dash -f"
echo "  Cron jobs:       sudo crontab -l"
echo ""
echo "  After the next reboot, check the kiosk comes up cleanly."
echo "  If Chromium shows a connection error, check: journalctl -u fam-bam-dash -b -n 50"
echo ""
