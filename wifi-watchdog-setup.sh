#!/bin/bash

# Raspberry Pi WiFi Watchdog Setup
# Installs a systemd timer that checks connectivity every few minutes and
# escalates: reconnect wifi -> restart NetworkManager -> reboot.
# Targets Raspberry Pi OS Bookworm (NetworkManager).

set -e

WATCHDOG_BIN="/usr/local/bin/wifi-watchdog.sh"
SERVICE_FILE="/etc/systemd/system/wifi-watchdog.service"
TIMER_FILE="/etc/systemd/system/wifi-watchdog.timer"

echo "Fam Bam Dash - WiFi Watchdog Setup"
echo "==================================="
echo ""

if ! command -v nmcli &>/dev/null; then
    echo "WARNING: nmcli not found. This script expects NetworkManager (Bookworm default)."
    read -p "Continue anyway? [y/N]: " CONTINUE
    [[ "$CONTINUE" =~ ^[Yy]$ ]] || exit 1
fi

echo "Installing $WATCHDOG_BIN..."
sudo tee "$WATCHDOG_BIN" > /dev/null << 'EOF'
#!/bin/bash
# Checks connectivity to the default gateway (falls back to 1.1.1.1).
# Failure counter escalates: 1 -> reconnect, 2 -> restart NetworkManager, 3+ -> reboot.

STATE_FILE="/run/wifi-watchdog.failures"
IFACE="${WIFI_IFACE:-wlan0}"

log() { logger -t wifi-watchdog "$*"; }

is_online() {
    local gw
    gw=$(ip route show default dev "$IFACE" 2>/dev/null | awk '/default/ {print $3; exit}')
    [ -n "$gw" ] && ping -c 2 -W 3 -I "$IFACE" "$gw" &>/dev/null && return 0
    ping -c 2 -W 3 -I "$IFACE" 1.1.1.1 &>/dev/null
}

if is_online; then
    [ -f "$STATE_FILE" ] && log "Connectivity restored"
    rm -f "$STATE_FILE"
    exit 0
fi

failures=$(( $(cat "$STATE_FILE" 2>/dev/null || echo 0) + 1 ))
echo "$failures" > "$STATE_FILE"
log "No connectivity on $IFACE (consecutive failures: $failures)"

case "$failures" in
    1)
        log "Reconnecting $IFACE"
        rfkill unblock wifi 2>/dev/null
        nmcli radio wifi on 2>/dev/null
        nmcli device connect "$IFACE" 2>/dev/null || nmcli connection up "$(nmcli -t -f NAME,TYPE connection show | awk -F: '/wireless/ {print $1; exit}')" 2>/dev/null
        ;;
    2)
        log "Restarting NetworkManager"
        systemctl restart NetworkManager
        ;;
    *)
        log "Still offline, rebooting"
        rm -f "$STATE_FILE"
        systemctl reboot
        ;;
esac
EOF
sudo chmod +x "$WATCHDOG_BIN"

echo "Installing systemd units..."
sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=WiFi connectivity watchdog

[Service]
Type=oneshot
ExecStart=$WATCHDOG_BIN
EOF

sudo tee "$TIMER_FILE" > /dev/null << 'EOF'
[Unit]
Description=Run WiFi watchdog every 3 minutes

[Timer]
# Wait 5 minutes after boot so we don't reboot-loop before wifi has come up
OnBootSec=5min
OnUnitActiveSec=3min

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now wifi-watchdog.timer

echo ""
echo "WiFi watchdog installed."
echo "  Checks every 3 minutes: reconnect -> restart NetworkManager -> reboot"
echo "  (a full outage triggers a reboot after roughly 9 minutes)"
echo ""
echo "View logs:   journalctl -t wifi-watchdog"
echo "Check timer: systemctl list-timers wifi-watchdog.timer"
echo "Uninstall:   sudo systemctl disable --now wifi-watchdog.timer && sudo rm $WATCHDOG_BIN $SERVICE_FILE $TIMER_FILE"
