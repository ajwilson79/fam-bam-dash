# fam-bam-dash
Fam Bam Dash is a customizable, touch-friendly smart home dashboard designed to be a centralized hub of information for your household. Inspired by platforms like Dakboard, it brings together the essentials your family needs—all in one sleek, web-based interface.

📋 Key Features
📅 Google Calendar Integration – Stay on top of events and appointments.

⏰ Real-Time Clock and Date – Always know what time it is.

🌦 Current Weather and Forecast – Know what to wear before you head out.

🖼 Photo Slideshow – Display your favorite family photos.

✅ Interactive To-Do Lists – Check off tasks directly from a touch screen.

📌 Modular Layout – Built with React and Tailwind CSS for easy customization.

💻 Runs in a Browser – Ideal for use with Raspberry Pi, wall-mounted tablets, or smart displays.

🎯 Goal
To create a self-hosted family dashboard that can be deployed in a Docker container and displayed full-screen in a browser—perfect for a hallway, kitchen, or living room screen.

## Settings and Persistence
- Runtime settings are editable via the Settings button in the app header.
- Settings are persisted in localStorage under key: fam-bam-settings
  - Weather: latitude, longitude
  - Calendar: calendarId, maxEvents
  - Slideshow: intervalMs, shuffle, useGooglePhotos
- To-do lists persist under localStorage key: fam-bam-todo

Defaults
- Defaults are derived from build-time env where applicable (VITE_LAT, VITE_LON, VITE_GCAL_CALENDAR_ID, VITE_GOOGLE_PHOTOS_ALBUM_ID)
- If env values are not provided, reasonable fallbacks are used

Notes
- Google Calendar requires VITE_GCAL_API_KEY and a calendarId (can be set at runtime in Settings)
- Google Photos is optional. If enabled in Settings, it requires VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_PHOTOS_ALBUM_ID env vars and a one-time user consent prompt in the browser

