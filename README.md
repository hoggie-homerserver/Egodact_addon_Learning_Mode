# Egodact Addon: Learning Mode

A single-menu addon for Egodact Smart that bundles study/productivity tools without cluttering the top bar.

## Features
- **Eisenhower matrix** – 4-quadrant task view (do/schedule/delegate/drop).
- **Compact mode** – toggle visibility of host/addon UI elements.
- **Floating notepad** – draggable, persisted in localStorage.
- **Keyboard shortcuts** – Ctrl+Shift+N/M/L.
- **Mail sync** – reads your own Magister/Somtoday "Berichten" (content script on those domains) and shows messages in Egodact. No school involvement.


## How grade sync works (no school rules)
A separate content script runs only on `*.magister.net` / `*.somtoday.nl` while you are logged in. It scrapes grades from the page DOM and stores them in the extension's shared `chrome.storage.local`. The Egodact-side UI reads that storage. Only your own session data is used.

## Files
- `manifest.json`, `sdk.js`, `lib.js`, `content.js`, `js/grade-scrape.js`

## Install
Load the folder as an unpacked extension in Chrome/Edge/Firefox (developer mode). Host extension (Egodact Smart) must also be loaded.