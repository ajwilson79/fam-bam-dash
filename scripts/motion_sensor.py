#!/usr/bin/env python3
"""
Motion sensor script for fam-bam-dash.

Requires a PIR sensor wired to GPIO pin 17. The script is optional — the
dashboard runs normally without it. If the sensor is not detected the script
exits cleanly so the systemd service does not spam restart loops.

Behaviour:
  Day hours  + motion  → wake screen, tell app to show dashboard
  Night hours + motion → wake screen, tell app to show screensaver (picture frame)
  No motion for configured timeout → screen off (handled here via xset, not the app)

All timeouts and night-hour boundaries are read from the app's /api/settings
endpoint so they can be adjusted from the browser without SSH.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime

APP_BASE_URL = "http://localhost:12000"
SETTINGS_POLL_INTERVAL = 60   # seconds between settings refreshes
LOOP_SLEEP = 0.1              # seconds between motion checks
GPIO_PIN = 17

# ── Hardware init ─────────────────────────────────────────────────────────────

try:
    from gpiozero import MotionSensor
    pir = MotionSensor(GPIO_PIN)
    print(f"Motion sensor initialised on GPIO pin {GPIO_PIN}")
except Exception as e:
    print(f"Motion sensor not available: {e}")
    print("Exiting — install gpiozero and wire a PIR sensor to GPIO pin 17 to use this feature.")
    sys.exit(0)

# ── Helpers ───────────────────────────────────────────────────────────────────

def screen_on():
    os.system("xset dpms force on")

def screen_off():
    os.system("xset dpms force standby")

def fetch_settings() -> dict:
    try:
        with urllib.request.urlopen(f"{APP_BASE_URL}/api/settings", timeout=5) as resp:
            data = json.loads(resp.read())
            if data and "motionSensor" in data:
                return data
    except Exception as e:
        print(f"Could not read settings: {e}")
    return {}

def set_display_mode(mode: str):
    """Tell all browser tabs to switch to 'dashboard' or 'screensaver'."""
    body = json.dumps({"mode": mode}).encode()
    req = urllib.request.Request(
        f"{APP_BASE_URL}/api/display-mode",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=5):
            pass
    except Exception as e:
        print(f"Could not set display mode: {e}")

def is_night(settings: dict) -> bool:
    ms = settings.get("motionSensor", {})
    start = int(ms.get("nightStartHour", 22))
    end = int(ms.get("nightEndHour", 7))
    hour = datetime.now().hour
    if start > end:   # spans midnight (e.g. 22 → 7)
        return hour >= start or hour < end
    return start <= hour < end   # same-day range

def screen_off_seconds(settings: dict, night: bool) -> float:
    ms = settings.get("motionSensor", {})
    if night:
        return float(ms.get("nightScreenOffMinutes", 1)) * 60
    return float(ms.get("dayScreenOffMinutes", 10)) * 60

# ── Main loop ─────────────────────────────────────────────────────────────────

def main():
    settings: dict = {}
    last_settings_fetch = 0.0

    screen_state = "unknown"   # "on" | "off" | "unknown"
    last_mode_sent = ""        # last display-mode value sent to the app
    last_motion_time = time.time()  # initialise so screen doesn't shut off instantly

    print("Motion sensor loop started")

    while True:
        now = time.time()

        # Refresh settings periodically
        if now - last_settings_fetch >= SETTINGS_POLL_INTERVAL:
            fetched = fetch_settings()
            if fetched:
                settings = fetched
            last_settings_fetch = now

        night = is_night(settings)

        if pir.motion_detected:
            last_motion_time = now

            # Wake screen if it was off
            if screen_state != "on":
                screen_on()
                screen_state = "on"

            # Tell the app which mode to show
            target_mode = "screensaver" if night else "dashboard"
            if last_mode_sent != target_mode:
                set_display_mode(target_mode)
                last_mode_sent = target_mode

        else:
            # No motion — shut screen off after timeout
            timeout = screen_off_seconds(settings, night)
            if screen_state == "on" and now - last_motion_time > timeout:
                screen_off()
                screen_state = "off"

        time.sleep(LOOP_SLEEP)

try:
    main()
except KeyboardInterrupt:
    print("Motion sensor script stopped")
