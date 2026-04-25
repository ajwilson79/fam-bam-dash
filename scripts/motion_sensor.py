#!/usr/bin/env python3
"""
Motion sensor script for fam-bam-dash.

Requires a PIR sensor wired to GPIO pin 17. The script is optional — the
dashboard runs normally without it. If the sensor is not detected the script
exits cleanly so the systemd service does not spam restart loops.

Behaviour:
  Day hours  + motion  → wake screen, tell app to show dashboard
  Night hours + motion → wake screen, tell app to show screensaver (picture frame)
  No motion for configured timeout → screen off (handled here via wlopm, not the app)

All timeouts and night-hour boundaries are read from the app's /api/settings
endpoint so they can be adjusted from the browser without SSH.
"""

import glob
import json
import os
import shutil
import subprocess
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

_warned_no_tool = False

def _wayland_env() -> dict:
    """Build env for talking to the labwc compositor.

    The systemd service runs outside the Wayland session, so XDG_RUNTIME_DIR /
    WAYLAND_DISPLAY may be missing. Resolve them on every call so a compositor
    that comes up after this script does is picked up automatically.
    """
    env = os.environ.copy()
    runtime_dir = env.get("XDG_RUNTIME_DIR") or f"/run/user/{os.getuid()}"
    env["XDG_RUNTIME_DIR"] = runtime_dir
    if not env.get("WAYLAND_DISPLAY"):
        sockets = sorted(
            s for s in glob.glob(f"{runtime_dir}/wayland-*")
            if not s.endswith(".lock")
        )
        if sockets:
            env["WAYLAND_DISPLAY"] = os.path.basename(sockets[0])
    return env

def _set_screen_power(on: bool):
    """Toggle screen DPMS via wlopm.

    Requires `video=HDMI-A-1:1920x1080@60e` (or similar) on the kernel cmdline
    so the connector ignores the monitor's HPD-disconnect signal during DPMS
    sleep — without that, wlroots removes the output entirely on --off and the
    panel can't be woken without rebooting.
    """
    global _warned_no_tool
    if not shutil.which("wlopm"):
        if not _warned_no_tool:
            print("wlopm not found — install with: sudo apt install wlopm")
            _warned_no_tool = True
        return
    state = "--on" if on else "--off"
    try:
        result = subprocess.run(
            ["wlopm", state, "*"], env=_wayland_env(), check=False, timeout=5,
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
        )
        if result.returncode != 0:
            err = result.stderr.decode(errors="replace").strip()
            print(f"wlopm {state} failed (rc={result.returncode}): {err}")
    except Exception as e:
        print(f"Failed to run wlopm: {e}")

def screen_on():
    _set_screen_power(True)

def screen_off():
    _set_screen_power(False)

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
    motion_active = False      # tracks edges so we only log on transitions

    print("Motion sensor loop started")

    while True:
        now = time.time()

        # Refresh settings periodically
        if now - last_settings_fetch >= SETTINGS_POLL_INTERVAL:
            fetched = fetch_settings()
            if fetched:
                settings = fetched
                ms = settings.get("motionSensor", {})
                print(
                    f"Settings: day_off={ms.get('dayScreenOffMinutes')}min "
                    f"night_off={ms.get('nightScreenOffMinutes')}min "
                    f"night={ms.get('nightStartHour')}-{ms.get('nightEndHour')}"
                )
            last_settings_fetch = now

        night = is_night(settings)
        detected = pir.motion_detected

        if detected != motion_active:
            print(f"Motion {'detected' if detected else 'cleared'}")
            motion_active = detected

        if detected:
            last_motion_time = now

            # Wake screen if it was off
            if screen_state != "on":
                print("Screen → on")
                screen_on()
                screen_state = "on"

            # Tell the app which mode to show
            target_mode = "screensaver" if night else "dashboard"
            if last_mode_sent != target_mode:
                print(f"Display mode → {target_mode}")
                set_display_mode(target_mode)
                last_mode_sent = target_mode

        else:
            # No motion — shut screen off after timeout
            timeout = screen_off_seconds(settings, night)
            if screen_state == "on" and now - last_motion_time > timeout:
                print(f"Screen → off (no motion for {timeout:.0f}s, night={night})")
                screen_off()
                screen_state = "off"

        time.sleep(LOOP_SLEEP)

try:
    main()
except KeyboardInterrupt:
    print("Motion sensor script stopped")
