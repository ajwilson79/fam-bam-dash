# Roadmap / Ideas

Future improvements to consider. No particular order or commitment.

## Quick Wins

- **Drag-to-reorder todo items** — Lists can be reordered but individual items within a list can't. Same drag-handle pattern already used for lists.
- **Auto dark/light mode schedule** — Switch theme based on time of day (e.g. light 7am–9pm, dark otherwise), using the existing motionSensor night hours or a new setting.
- **Todo item priority / pinning** — Pin an item to the top of a list so it never gets buried under new additions.
- **Slideshow pause button** — Tap/click to freeze the current photo so the family can look at it longer before it advances.

## New Widgets

- **Sticky notes / family message board** — A freeform short-text area where anyone can leave a note for the family. Simple server-persisted string, no auth required.
- **Birthday/anniversary countdown** — Pull events tagged as birthdays or anniversaries from the connected calendar and surface them prominently ("🎂 Mom's birthday in 3 days").
- **Grocery list** — Separate from to-do: persistent, optionally categorized (produce, dairy, etc.), no auto-remove on check. Could reuse the todo UI patterns with different persistence.
- **Now playing** — Show what's currently playing on Spotify or a local media server (Jellyfin, Plex). Spotify requires OAuth; local servers use simpler REST APIs.
- **Daily quote or fun fact** — A rotating text widget driven by hardcoded quotes, a free API, or user-configured entries.

## Integrations

- **Home Assistant** — Display sensor readings (room temperature, door/window state, energy usage) or trigger automations directly from the dashboard tile. HA exposes a REST API that works well on local networks.
- **RSS news ticker** — Fetch headlines from any RSS feed server-side (avoids CORS) and display a scrolling strip or list.
- **Bus / transit arrivals** — Real-time arrival data from a local transit authority API. Very practical for families who commute by public transit.

## Infrastructure / Quality

- **Landscape layout** — The grid is currently portrait-only. A second CSS layout for widescreen TVs and monitors would open the project up to more deployments.
- **Per-list todo colors** — Let each todo list column have a distinct accent color to make them visually distinct at a glance.
- **PWA support** — Add `manifest.json` and a service worker so the dashboard can be installed as a home screen app on phones and tablets, with a basic offline fallback.
- **More themes / custom accent color** — A color picker for the accent color so families can personalize without editing CSS.
