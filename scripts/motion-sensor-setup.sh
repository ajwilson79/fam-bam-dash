#!/bin/bash
# Optional: sets up the motion sensor script as a systemd service.
# Only run this if you have a PIR sensor wired to GPIO pin 17 on your Raspberry Pi.
# The fam-bam-dash dashboard runs fine without this.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_PATH="$SCRIPT_DIR/motion_sensor.py"
SERVICE_FILE=/etc/systemd/system/fam-bam-motion.service

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Error: $SCRIPT_PATH not found"
    exit 1
fi

# Ensure gpiozero is available
if ! python3 -c "import gpiozero" 2>/dev/null; then
    echo "Installing gpiozero..."
    sudo apt-get install -y python3-gpiozero
fi

# wlopm drives screen power on Wayland (labwc). Without it the script can't
# turn the display off — xset dpms only works on X11.
if ! command -v wlopm &>/dev/null; then
    echo "Installing wlopm..."
    sudo apt-get install -y wlopm
fi

# Many HDMI panels signal "disconnected" the moment HDMI output stops during
# DPMS sleep (notably the Acer UT241Y touchscreen). wlroots reacts by removing
# the output entirely and the screen can't be woken without a reboot. Forcing
# the connector to "always enabled" via the kernel cmdline tells the kernel to
# ignore HPD changes, so labwc keeps the output around and wlopm --on works.
CMDLINE=/boot/firmware/cmdline.txt
[ -f "$CMDLINE" ] || CMDLINE=/boot/cmdline.txt
if [ -f "$CMDLINE" ] && ! grep -q "video=HDMI-A-1:" "$CMDLINE"; then
    echo "Adding video=HDMI-A-1:1920x1080@60e to $CMDLINE for reliable DPMS wake..."
    sudo cp "$CMDLINE" "$CMDLINE.bak"
    sudo sed -i 's|$| video=HDMI-A-1:1920x1080@60e|' "$CMDLINE"
    NEEDS_REBOOT=true
fi

RUN_USER="${SUDO_USER:-$USER}"
USER_UID=$(id -u "$RUN_USER")
RUN_USER_HOME=$(getent passwd "$RUN_USER" | cut -d: -f6)

# lgpio (Pi 5 GPIO backend) requires the user to be in the 'gpio' group to
# access /dev/gpiochip*. Default 'pi' user is in it; freshly-created users
# (e.g. 'tony') are not.
if ! id -nG "$RUN_USER" | tr ' ' '\n' | grep -qx gpio; then
    echo "Adding $RUN_USER to gpio group..."
    sudo usermod -aG gpio "$RUN_USER"
fi

echo "Creating systemd service at $SERVICE_FILE..."
sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Fam Bam Dash Motion Sensor
After=fam-bam-dash.service
Wants=fam-bam-dash.service

[Service]
ExecStart=/usr/bin/python3 -u $SCRIPT_PATH
Restart=on-failure
RestartSec=10
User=$RUN_USER
WorkingDirectory=$RUN_USER_HOME
Environment=HOME=$RUN_USER_HOME
Environment=XDG_RUNTIME_DIR=/run/user/$USER_UID
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable fam-bam-motion
sudo systemctl start fam-bam-motion

echo ""
echo "Motion sensor service installed and started."
echo "  Status:  sudo systemctl status fam-bam-motion"
echo "  Logs:    journalctl -u fam-bam-motion -f"
echo "  Stop:    sudo systemctl stop fam-bam-motion"
echo "  Remove:  sudo systemctl disable fam-bam-motion && sudo rm $SERVICE_FILE"

if [ "${NEEDS_REBOOT:-}" = "true" ]; then
    echo ""
    echo "*** Reboot required: kernel cmdline was updated for reliable HDMI DPMS. ***"
    echo "    Run: sudo reboot"
fi
