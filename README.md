# Egodact Addon: Learning Mode

Adds study/productivity tools to the **host's hamburger menu**. The hamburger only appears when at least one addon registers an item through `EgodactAddonLib.hamburger.add(...)`. Plain `registerMenu()` entries stay in the Addons library.

## Features
- **Eisenhower matrix** – clean 4-quadrant task view (Do / Plan / Delegeer / Laat vallen) with counts, add and delete.
- **Compact mode** – custom switches to hide the Tijd/Beta/Addons/addon buttons and compact the challenge cards.
- **Floating notepad** – draggable, persisted in localStorage.

## Enable / disable
The addon is listed in the host's Addons menu. Turning it off (reload) prevents it from registering its menu items, so the hamburger disappears when no other addon uses it.

## Files
- `manifest.json`, `sdk.js`, `lib.js`, `content.js`

## Install
Load the folder as an unpacked extension in Chrome/Edge/Firefox (developer mode). Host extension (Egodact Smart) must also be loaded.