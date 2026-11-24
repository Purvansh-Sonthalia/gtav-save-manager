# GTA Cloud Sync

Chrome extension to back up, restore, and upload [PlayGTA5](https://playgta5.pro/) saves to the cloud, and to change graphics settings that normally need a full game restart on PC.

Sync is **manual only** (no automatic background upload).

## Features

- **Account** — Sign up / log in via the toolbar popup (Supabase Auth).
- **Sync now** — Read saves from the game tab’s IndexedDB (`gta5-userdata`) and upload to cloud storage.
- **Inject cloud save** — Download your cloud saves and write them back into IndexedDB; reload the game tab to apply.
- **Upload save file** — Pick a file from disk and upload to the cloud (`SGTA*` / `MISREP*` go under `/userdata/Documents/`).
- **Graphics settings** — Launch URL options for [playgta5.pro](https://playgta5.pro/) / [cdn.playgta5.pro](https://cdn.playgta5.pro/) (reload required). Legacy `?args=` UI remains on **playgta5.com**.

On supported game hosts you also get a small floating **GTA Cloud Sync** panel (top-right) with the same actions.

## Requirements

- Google Chrome (or another Chromium browser with Manifest V3 extensions).
- A logged-in cloud account (extension popup).
- An open game tab for **Sync**, **Inject**, and **Graphics settings** — prefer **[cdn.playgta5.pro](https://cdn.playgta5.pro/)** (IndexedDB `gta5-userdata`). **playgta5.pro** launcher and **playgta5.com** are also matched.

## Install

1. Clone or download this folder.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select this project directory.

After code changes: **Reload** the extension, then **refresh** any open game tabs.

## Quick start

1. Click the extension icon → **Login** or **Create account**.
2. Open [cdn.playgta5.pro](https://cdn.playgta5.pro/) and play until you have a save (or upload a file manually).
3. With the game tab open, open the popup:
   - **Sync now** — push local saves to the cloud.
   - **Inject cloud save** — pull cloud saves into the browser (confirm on the game tab).
   - **Upload save file** — cloud-only upload from disk.
   - **Graphics settings** — opens the settings panel on the game tab.

## How saves work

PlayGTA5 stores userdata in **IndexedDB** database `gta5-userdata`, object store `files`, keyed by virtual paths (e.g. `/userdata/Documents/SGTA50015.`).

| Action | Effect |
|--------|--------|
| Sync now | Local IndexedDB → Supabase (`game-saves` bucket + `game_saves` metadata). |
| Upload save file | File → cloud only until you **Inject** and reload. |
| Inject cloud save | Cloud → IndexedDB on the game tab, then reload the game. |

**Manual uploads:** Paths mirror PC layout under IndexedDB:

- `Documents/Rockstar Games/GTA V/Profiles/Default/<filename>` → key  
  `/userdata/Documents/Rockstar Games/GTA V/Profiles/Default/<filename>`
- `settings.xml` → `/userdata/Documents/Rockstar Games/GTA V/settings.xml`

**PC saves:** Same file *names* as retail GTA V, but the browser WASM build may not load every PC save. Prefer syncing from a browser session that already works.

## Graphics settings

### playgta5.pro / cdn.playgta5.pro

The CDN player build reads **lowercase URL keys** (`texturequality`, `lodscale`, `density`, …) and applies them on the next load — same as the official launcher. Optional settings are packed in a `cfg` token (`GTALaunchUrl.compact`).

In the panel:

- **Presets** — Low-spec, Low normal, Max graphics (from playgta5.pro).
- **Display** — `low`, `fps` (24–120), `res` (including `native`), `scale`, `fxaa`, `shadows`, `cores`.
- **Scene quality** — All launcher graphics URL keys (`auto` = follow profile).
- **Mode** — `mode`, `map`, `newgame`, `language`.

Use **Apply & reload** after changes. Settings are saved in **extension local storage** (`playgta5Launch`). With **Remember and apply…** enabled (default), the next visit reloads once with those URL params automatically.

### playgta5.com (legacy)

The archived site still uses the older `?args=-textureQuality=…` model and the Efficiency / Balanced / Quality presets from [shadany7824/playgta5](https://github.com/shadany7824/playgta5) `homepage.html`.

## Project layout

| File | Role |
|------|------|
| `manifest.json` | Extension manifest (MV3). |
| `background.js` | Supabase auth, storage API, upload/list/download. |
| `popup.html` / `popup.js` | Toolbar UI; messages the game tab for sync/inject/settings. |
| `content.js` | In-page panel, IndexedDB read/write, sync/inject logic. |
| `playgta5-pro-launch.js` | playgta5.pro graphics + `cfg` URL helpers. |
| `settings-panel-pro.js` | Graphics UI on `*.playgta5.pro` hosts. |
| `settings-panel.js` | Legacy graphics UI on playgta5.com. |

## Backend

The extension talks to **Supabase** (URL and anon key in `background.js`). Saves are scoped per user and site id `playgta5`. To use your own backend, replace the Supabase project configuration in `background.js` and set up matching storage and `game_saves` table policies.

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| Sync/Inject/Graphics do nothing | Open cdn.playgta5.pro, reload the tab after updating the extension. |
| “Receiving end does not exist” | Reload the game tab so content scripts load. |
| Upload worked but game unchanged | Run **Inject cloud save**, then reload the game. |
| Save not in Load Game | Check path is `/userdata/Documents/...`; re-upload if an older upload used `/userdata/filename` only. |
| Graphics panel closes when clicking controls | Update to latest `settings-panel.js` (backdrop click fix). |

## Disclaimer

PlayGTA5 and Grand Theft Auto V are property of Rockstar Games. This extension is not affiliated with Rockstar or the playgta5 site operators. Use only with saves and accounts you are allowed to sync.