
(() => {
    if (window.__gtaCloudSyncInstalled) return;
    window.__gtaCloudSyncInstalled = true;
  
    const DB_NAME = "gta5-userdata";
    const STORE = "files";

    function isProHost() {
      return /(?:^|\.)playgta5\.pro$/i.test(location.hostname);
    }

    function ensureSaveProfileId() {
      const sandbox =
        new URLSearchParams(location.search).get("mode") === "sandbox";
      const storyName = "gta5.userdata.profile.v2";
      const sandboxName = "gta5.userdata.sandbox.profile.v1";
      const name = sandbox ? sandboxName : storyName;
      let p = localStorage.getItem(name);

      if (!/^[0-9a-f]{32}$/i.test(p || "")) {
        p = Array.from(crypto.getRandomValues(new Uint8Array(16)), x =>
          x.toString(16).padStart(2, "0")
        ).join("");
        if (sandbox) {
          const story = localStorage.getItem(storyName);
          if (story && p === story) {
            p = (parseInt(p[0], 16) ^ 1).toString(16) + p.slice(1);
          }
        }
        localStorage.setItem(name, p);
      }

      return p;
    }

    function idbKeyForUserdataPath(userdataPath) {
      if (!isProHost()) return userdataPath;
      return `${ensureSaveProfileId()}\0${userdataPath}`;
    }

    function isStoryMode() {
      const mode = new URLSearchParams(location.search).get("mode");
      return mode !== "sandbox" && mode !== "env_test";
    }

    function idbSaveRecord(data, mtime) {
      const bytes =
        data instanceof Uint8Array ? data : new Uint8Array(data);
      const t = Number(mtime);
      return {
        data: bytes,
        mtime: Number.isFinite(t) ? Math.trunc(t) : Date.now()
      };
    }

    function parseIdbEntry(key, value) {
      const k = String(key);
      if (k.startsWith("backup\0")) return null;
      if (!value || value.deleted === true || value.data == null) return null;

      let path;
      if (k.startsWith("/userdata/")) {
        path = k;
      } else {
        const sep = k.indexOf("\0");
        if (sep <= 0) return null;
        path = k.slice(sep + 1);
        if (!path.startsWith("/userdata/")) return null;
      }

      path = normalizeUserdataFilePath(path);
      if (!validUserdataPath(path)) return null;

      return {
        path,
        idbKey: k,
        data: value.data,
        mtime: value.mtime
      };
    }

    async function purgeInvalidIdbEntries(db) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        const req = store.openCursor();

        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) return;

          if (!parseIdbEntry(cursor.key, cursor.value)) {
            store.delete(cursor.key);
          }

          cursor.continue();
        };

        req.onerror = () => reject(req.error);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }

    const knownHashes = new Map();
    let busy = false;
    let loggedIn = false;
    let panelStatusEl = null;
    let panelShowReload = null;
  
    function send(type, extra = {}) {
      return chrome.runtime.sendMessage({ type, ...extra });
    }
  
    function notify(message) {
      if (panelStatusEl) panelStatusEl.textContent = message;
    }

    function bytesOf(data) {
      if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
      }
  
      if (ArrayBuffer.isView(data)) {
        return new Uint8Array(
          data.buffer,
          data.byteOffset,
          data.byteLength
        );
      }
  
      if (typeof data === "string") {
        return new TextEncoder().encode(data);
      }
  
      throw new Error("Unsupported save data format");
    }
  
    function toBase64(bytes) {
      let binary = "";
  
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(
          ...bytes.subarray(i, i + 8192)
        );
      }
  
      return btoa(binary);
    }
  
    async function hash(bytes) {
      const result = await crypto.subtle.digest("SHA-256", bytes);
  
      return [...new Uint8Array(result)]
        .map(x => x.toString(16).padStart(2, "0"))
        .join("");
    }
  
    async function openDB({ create = false } = {}) {
      let openVersion;
      if (indexedDB.databases) {
        const databases = await indexedDB.databases();
        const existing = databases.find(db => db.name === DB_NAME);

        if (!existing) {
          if (!create) {
            throw new Error("PlayGTA5 save database not found");
          }
          openVersion = 1;
        }
      } else if (!create) {
        throw new Error("PlayGTA5 save database not found");
      } else {
        openVersion = 1;
      }

      return new Promise((resolve, reject) => {
        const request =
          openVersion != null
            ? indexedDB.open(DB_NAME, openVersion)
            : indexedDB.open(DB_NAME);

        request.onupgradeneeded = () => {
          const db = request.result;

          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE);
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  
    async function resolveProfileDir() {
      try {
        const records = await readAll();
        return profileDirFromRecords(records);
      } catch {
        return DEFAULT_PROFILE_DIR;
      }
    }

    async function readAll() {
      const db = await openDB();

      try {
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readonly");
          const request = tx.objectStore(STORE).openCursor();
          const byPath = new Map();

          request.onsuccess = () => {
            const cursor = request.result;

            if (!cursor) {
              resolve([...byPath.values()]);
              return;
            }

            const row = parseIdbEntry(cursor.key, cursor.value);
            if (row) byPath.set(row.path, row);

            cursor.continue();
          };

          request.onerror = () => reject(request.error);
        });
      } finally {
        db.close();
      }
    }
  
    async function capture(onlyChanged = true) {
      if (!loggedIn || busy) return;
  
      busy = true;
  
      try {
        const records = await readAll();
  
        let uploaded = 0;
  
        for (const record of records) {
          if (!validUserdataPath(record.path)) continue;
  
          const bytes = bytesOf(record.data);
          const digest = await hash(bytes);
  
          if (
            onlyChanged &&
            knownHashes.get(record.path) === digest
          ) continue;
  
          notify("Uploading " + record.path + "...");
  
          const result = await send("UPLOAD", {
            record: {
              path: record.path,
              data: toBase64(bytes),
              mtime: record.mtime
            }
          });
  
          if (!result.success) {
            throw new Error(result.error);
          }
  
          knownHashes.set(record.path, digest);
          uploaded++;
        }
  
        notify(
          uploaded
            ? "Cloud synced: " + uploaded + " file(s)"
            : records.length
              ? "Cloud saves are up to date"
              : "No save files found in this tab (play or save in-game first)."
        );
  
        return uploaded;
      } catch (error) {
        notify("Sync error: " + error.message);
        throw error;
      } finally {
        busy = false;
      }
    }
  
    async function syncNow() {
      knownHashes.clear();
      return capture(false);
    }
  
    async function restore() {
      if (busy) return;
  
      if (!confirm(
        "Restore cloud saves into this browser?\n\n" +
        "This replaces matching local save files. " +
        "Download a local backup first if you need one."
      )) return;
  
      busy = true;
  
      try {
        notify("Getting cloud save list...");
  
        const listing = await send("LIST");
  
        if (!listing.success) {
          throw new Error(listing.error);
        }
  
        const saves = listing.result;
  
        if (!saves.length) {
          notify("No cloud saves found.");
          return;
        }
  
        const downloaded = [];
        const skipped = [];
  
        for (const save of saves) {
          notify("Downloading " + save.file_path + "...");
  
          const result = await send("DOWNLOAD", {
            path: save.file_path,
            objectKey: save.object_key
          });
  
          if (!result.success) {
            const err = result.error || "";

            if (/not_found|NoSuchKey|404/i.test(err)) {
              skipped.push(save.file_path);
              continue;
            }

            throw new Error(err);
          }
  
          const binary = atob(result.result.data);
          const bytes = new Uint8Array(binary.length);
  
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
  
          const actualHash = await hash(bytes);
  
          if (actualHash !== save.checksum) {
            throw new Error(
              "Checksum mismatch: " + save.file_path
            );
          }
  
          downloaded.push({
            path: save.file_path,
            data: bytes,
            mtime: Number(save.game_mtime) || Date.now()
          });
        }

        if (!downloaded.length) {
          notify(
            "No cloud files could be downloaded. " +
            (skipped.length
              ? skipped.length + " missing in storage (re-upload or Sync now). "
              : "") +
            "Stale rows stay in the cloud list until replaced."
          );
          return;
        }

        const profileDir = await resolveProfileDir();
  
        const db = await openDB({ create: true });

        try {
          await purgeInvalidIdbEntries(db);

          await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, "readwrite");
            const store = tx.objectStore(STORE);
            const injected = [];

            for (const file of downloaded) {
              const localPath = pathForInject(file.path, profileDir);
              if (!localPath) {
                skipped.push(file.path + " (invalid userdata path)");
                continue;
              }

              const record = idbSaveRecord(file.data, file.mtime);
              store.put(record, idbKeyForUserdataPath(localPath));
              if (isProHost() && isStoryMode()) {
                store.put(record, localPath);
              }
              injected.push(localPath);
            }

            if (!injected.length) {
              reject(new Error("No valid save paths to inject."));
            }

            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
          });
        } finally {
          db.close();
        }

        knownHashes.clear();

        const pathList = downloaded
          .map(f => pathForInject(f.path, profileDir) || f.path)
          .join("\n");

        let msg =
          downloaded.length +
          " file(s) in IndexedDB under " +
          profileDir +
          ". Reload the full game tab (not just canvas). " +
          "Use Story Mode; drop newgame=1 from the URL.\n" +
          pathList;

        if (skipped.length) {
          msg += "\n\nSkipped (missing in storage):\n" + skipped.join("\n");
        }

        notify(msg);

        panelShowReload?.();
  
      } catch (error) {
        notify("Restore failed: " + error.message);
      } finally {
        busy = false;
      }
    }
  
    function createPanel() {
      const host = document.createElement("div");
  
      host.style.cssText =
        "position:fixed;right:15px;top:15px;z-index:2147483647";
  
      const shadow = host.attachShadow({ mode: "open" });
  
      shadow.innerHTML = `
        <style>
          *{box-sizing:border-box}
          .panel{
            width:245px;
            background:#111827;
            color:white;
            padding:15px;
            border:1px solid #374151;
            border-radius:13px;
            box-shadow:0 8px 35px #0008;
            font:13px system-ui,sans-serif
          }
          h3{margin:0 0 10px;font-size:15px}
          button{
            width:100%;
            padding:10px;
            margin-top:8px;
            border:0;
            border-radius:7px;
            color:white;
            cursor:pointer;
            font-weight:600
          }
          .sync{background:#16834a}
          .restore{background:#2563eb}
          .reload{background:#7c3aed}
          .settings{background:#b45309}
          .status{color:#9ca3af;font-size:11px;margin-top:10px;overflow-wrap:anywhere}
          .top{display:flex;justify-content:space-between;align-items:center}
          .close{background:transparent;width:auto;padding:0;font-size:18px}
        </style>
  
        <div class="panel">
          <div class="top">
            <h3>☁ GTA Cloud Sync</h3>
            <button class="close" id="close">×</button>
          </div>
  
          <button class="sync" id="sync">Sync now</button>
          <button class="restore" id="restore">Inject cloud save</button>
          <button class="sync" id="manual">Upload save file</button>
          <button class="settings" id="graphics">Graphics settings</button>
          <input id="manualFile" type="file" accept=".bak,.Bak,.BAK,.xml,.XMl,application/octet-stream" hidden>
          <button class="reload" id="reload" hidden>Reload game</button>
  
          <div class="status" id="gta-cloud-status">
            Checking account...
          </div>
        </div>
      `;
  
      document.documentElement.appendChild(host);
  
      const get = id => shadow.getElementById(id);

      panelStatusEl = get("gta-cloud-status");
      panelShowReload = () => { get("reload").hidden = false; };
  
      get("close").onclick = () => host.remove();
  
      get("sync").onclick = async () => {
        await syncNow();
      };
  
      get("restore").onclick = restore;

      get("reload").onclick = () => location.reload();

      get("manual").onclick = () => {
        get("manualFile").click();
      };

      get("graphics").onclick = () => {
        window.__gtaOpenGraphicsSettings?.();
      };

      get("manualFile").onchange = async event => {
        const file = event.target.files[0];
        if (!file) return;

        try {
          const path = savePathForFile(
            file.name,
            await resolveProfileDir()
          );

          notify("Uploading " + path + "...");

          const bytes = new Uint8Array(await file.arrayBuffer());

          const result = await send("UPLOAD", {
            record: {
              path,
              data: toBase64(bytes),
              mtime: Date.now()
            }
          });

          if (!result.success) throw new Error(result.error);

          notify("Upload successful: " + path);
        } catch (error) {
          notify("Upload failed: " + error.message);
        }
      };
  
      return panelStatusEl;
    }
  
    const initialStatus = createPanel();
  
    // Check whether the extension account is logged in.
    send("SESSION").then(result => {
      loggedIn = result.success && result.result.loggedIn;
  
      if (!loggedIn) {
        initialStatus.textContent =
          "Please log in using the extension icon.";
  
        return;
      }
  
      initialStatus.textContent =
        "Connected as " + result.result.email;
  
    }).catch(error => {
      initialStatus.textContent = error.message;
    });

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (
        message.type !== "SYNC_NOW" &&
        message.type !== "RESTORE" &&
        message.type !== "GET_PROFILE_DIR"
      ) {
        return;
      }

      const run = async () => {
        if (message.type === "SYNC_NOW") {
          return syncNow();
        }

        if (message.type === "GET_PROFILE_DIR") {
          return resolveProfileDir();
        }

        return restore();
      };

      run()
        .then(result => sendResponse({ success: true, result }))
        .catch(error =>
          sendResponse({ success: false, error: error.message })
        );

      return true;
    });
  
  })();
  