# GTA Cloud Sync

Chrome extension to back up, restore, and upload [PlayGTA5](https://playgta5.pro/) saves to the cloud, and to change graphics/launch settings without restarting the game on PC.

## Features

- **Account** — Sign up / log in in the toolbar popup (Supabase Auth).
- **Sync now** — Read saves from the game tab’s IndexedDB and upload changed files to the cloud.
- **Inject cloud save** — Pull cloud saves into IndexedDB, then reload the game tab. Starts **auto backup every 30s** while that tab stays open (uploads only when a save file changes).
- **Upload save file** — Upload a save from disk to the cloud (any extension; filename kept as chosen).
- **Launch CDN with settings** — Open `cdn.playgta5.pro` in a new tab with your saved launch URL (pro graphics + `cfg` token).
- **Graphics settings** — In-tab panel on the game URL (pro URL keys on `*.playgta5.pro`, legacy `?args=` on playgta5.com).

Supported hosts: **cdn.playgta5.pro** (recommended), **playgta5.pro**, **playgta5.com**. The floating **GTA Cloud Sync** panel (top-right on game pages) mirrors popup actions.

## Requirements

- Chromium browser with Manifest V3 extensions (Chrome, Edge, Brave, etc.).
- Logged-in cloud account.
- Game tab open on a supported host for sync, inject, and graphics.

## Install

### Developer (this folder)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. **Load unpacked** → select this directory.

After changes: **Reload** the extension, then refresh game tabs.

### Package for sharing

Include everything the manifest needs (not `idb-sync.js` — unused):

```text
manifest.json
background.js
popup.html, popup.js
content.js, save-paths.js
playgta5-pro-launch.js, settings-panel-pro.js, settings-panel.js
icons/icon16.png, icons/icon48.png, icons/icon128.png
```

Zip those files; recipients use **Load unpacked** on the extracted folder. Icons are sourced from `webgtav.png` (16×16, 48×48, 128×128).

## Quick start

1. Extension icon → **Login** or **Create account**.
2. Open [cdn.playgta5.pro](https://cdn.playgta5.pro/) (Story: `?mode=story`).
3. Popup or in-game panel:
   - **Sync now** — push local saves to cloud.
   - **Inject cloud save** — pull cloud → IndexedDB, enable 30s auto-upload, reload game.
   - **Upload save file** — file → cloud only until inject.
   - **Launch CDN with settings** — new tab with saved graphics/launch params.
   - **Graphics settings** — edit launch URL on the current game tab.

## How saves work

PlayGTA5 uses IndexedDB `gta5-userdata`, store `files`.

On **playgta5.pro / CDN**, keys look like `{profileId}\0/userdata/...` where `profileId` comes from `localStorage` (`gta5.userdata.profile.v2` for Story, `gta5.userdata.sandbox.profile.v1` for Sandbox). The extension maps those to cloud paths without the profile prefix.

| Host | Typical cloud path for `SGTA50015.bak` |
|------|----------------------------------------|
| **cdn.playgta5.pro** | `/userdata/Documents/Rockstar Games/GTA V/SGTA50015.bak` |
| **playgta5.com** (legacy) | `/userdata/Documents/Rockstar Games/GTA V/Profiles/Default/SGTA50015.bak` |

`settings.xml` always goes to `/userdata/Documents/Rockstar Games/GTA V/settings.xml`.

| Action | Effect |
|--------|--------|
| Sync now | IndexedDB → Supabase storage + `game_saves` metadata |
| Upload save file | Disk → cloud only |
| Inject | Cloud → IndexedDB + 30s change watcher → cloud |

Auto-upload after inject: every 30s compares file hashes; changed saves upload quietly. Survives a tab reload if inject already ran (stored `autoUploadActive`). Requires staying logged in.

## Graphics settings

### playgta5.pro / cdn.playgta5.pro

Lowercase URL keys (`texturequality`, `fps`, `cfg`, …) match the official launcher. **`mode=sandbox` or `mode=story` is always kept in the URL** (required on CDN). Popup **Launch CDN with settings** applies the same rules.

Presets: Low-spec, Low normal, Max. **Apply & reload** stores prefs in `playgta5Launch`; optional **Remember and apply…** auto-applies on the next visit.

### playgta5.com (legacy)

Older `?args=-textureQuality=…` panel and Efficiency / Balanced / Quality presets ([shadany7824/playgta5](https://github.com/shadany7824/playgta5) style).

## Project layout

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest and host permissions |
| `background.js` | Supabase auth, upload, list, download |
| `popup.html` / `popup.js` | Toolbar UI |
| `content.js` | Panel, IndexedDB, sync/inject/auto-upload |
| `save-paths.js` | Paths, pro vs legacy layout, validation |
| `playgta5-pro-launch.js` | Pro `cfg` + graphics helpers |
| `settings-panel-pro.js` | Pro graphics UI |
| `settings-panel.js` | Legacy graphics UI (playgta5.com) |
| `icons/` | 16 / 48 / 128 toolbar and store icons |

## Backend

Supabase URL and anon key in `background.js`. Saves use `site_id: playgta5`. Replace with your project and RLS policies if self-hosting.

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| Extension context invalidated | Reload extension, refresh game tab, reopen popup |
| Sync says up to date but DB empty | Use **cdn** tab; pro uses profile-prefixed keys — update extension and re-sync |
| Inject / restore errors on CDN | Story mode URL; valid paths; reload after inject |
| “Receiving end does not exist” | Refresh game tab |
| Game save error after inject | Match Story vs Sandbox; re-inject with latest extension |
| Graphics redirect to playgta5.pro | URL must include `mode=` — use **Launch CDN with settings** or graphics panel again |

## Disclaimer

GTA V is property of Rockstar Games. This extension is unofficial and not affiliated with Rockstar or PlayGTA5 operators. Use only saves and accounts you are allowed to sync.