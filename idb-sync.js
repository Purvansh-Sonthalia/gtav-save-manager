
const GAME_DATABASES = ["gta5-userdata", "gta-pipelines", "gta5-dev"];
const IDB_PATH_PREFIX = "/idb/";

function idbCloudPath(db, store, key) {
  if (typeof key === "number") {
    return `${IDB_PATH_PREFIX}${db}/${store}/n:${key}`;
  }

  const keyStr = String(key);

  if (keyStr.startsWith("/")) {
    return `${IDB_PATH_PREFIX}${db}/${store}${keyStr}`;
  }

  return `${IDB_PATH_PREFIX}${db}/${store}/${keyStr}`;
}

function parseIdbCloudPath(path) {
  if (!path.startsWith(IDB_PATH_PREFIX)) return null;

  const rest = path.slice(IDB_PATH_PREFIX.length);
  const slash1 = rest.indexOf("/");

  if (slash1 < 0) return null;

  const db = rest.slice(0, slash1);
  const afterDb = rest.slice(slash1 + 1);
  const slash2 = afterDb.indexOf("/");

  if (slash2 < 0) return null;

  const store = afterDb.slice(0, slash2);
  let keyPart = afterDb.slice(slash2 + 1);

  if (keyPart.startsWith("n:")) {
    return { db, store, key: Number(keyPart.slice(2)) };
  }

  if (!keyPart.startsWith("/")) keyPart = "/" + keyPart;

  return { db, store, key: keyPart };
}

function bytesToBase64(bytes) {
  let binary = "";

  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }

  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function serializeIdbValue(value) {
  if (value === null || value === undefined) return value;

  if (value instanceof ArrayBuffer) {
    return { t: "ab", d: bytesToBase64(new Uint8Array(value)) };
  }

  if (ArrayBuffer.isView(value)) {
    return {
      t: "u8",
      d: bytesToBase64(
        new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
      )
    };
  }

  if (Array.isArray(value)) {
    return { t: "arr", d: value.map(serializeIdbValue) };
  }

  if (typeof value === "object") {
    const out = {};

    for (const [k, v] of Object.entries(value)) {
      out[k] = serializeIdbValue(v);
    }

    return { t: "obj", d: out };
  }

  return value;
}

function deserializeIdbValue(node) {
  if (!node || typeof node !== "object") return node;

  if (!node.t) return node;

  if (node.t === "ab") return base64ToBytes(node.d).buffer;
  if (node.t === "u8") return base64ToBytes(node.d);

  if (node.t === "arr") {
    return node.d.map(deserializeIdbValue);
  }

  if (node.t === "obj") {
    const out = {};

    for (const [k, v] of Object.entries(node.d)) {
      out[k] = deserializeIdbValue(v);
    }

    return out;
  }

  return node;
}

function packIdbRecord(db, store, key, value, mtime) {
  const packed = {
    v: 1,
    db,
    store,
    key,
    value: serializeIdbValue(value),
    mtime: mtime || Date.now()
  };

  return new TextEncoder().encode(JSON.stringify(packed));
}

function unpackIdbRecord(bytes) {
  const packed = JSON.parse(new TextDecoder().decode(bytes));

  return {
    db: packed.db,
    store: packed.store,
    key: packed.key,
    value: deserializeIdbValue(packed.value),
    mtime: packed.mtime || Date.now()
  };
}

function openGameDatabase(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readStoreCursor(db, storeName) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).openCursor();

    req.onsuccess = () => {
      const cursor = req.result;

      if (!cursor) {
        resolve(rows);
        return;
      }

      rows.push({ key: cursor.key, value: cursor.value });
      cursor.continue();
    };

    req.onerror = () => reject(req.error);
  });
}

async function readAllFromGameDatabases() {
  const entries = [];

  for (const dbName of GAME_DATABASES) {
    if (indexedDB.databases) {
      const list = await indexedDB.databases();

      if (!list.some(d => d.name === dbName)) continue;
    }

    let db;

    try {
      db = await openGameDatabase(dbName);
    } catch {
      continue;
    }

    try {
      for (const storeName of [...db.objectStoreNames]) {
        const rows = await readStoreCursor(db, storeName);

        for (const row of rows) {
          const mtime =
            row.value && typeof row.value.mtime === "number"
              ? row.value.mtime
              : Date.now();

          entries.push({
            db: dbName,
            store: storeName,
            key: row.key,
            value: row.value,
            cloudPath: idbCloudPath(dbName, storeName, row.key),
            mtime
          });
        }
      }
    } finally {
      db.close();
    }
  }

  return entries;
}

function putIdbEntry(dbName, storeName, key, value) {
  return new Promise((resolve, reject) => {
    const runPut = db => {
      if (!db.objectStoreNames.contains(storeName)) {
        const version = db.version;
        db.close();

        const upgrade = indexedDB.open(dbName, version + 1);

        upgrade.onupgradeneeded = () => {
          const next = upgrade.result;

          if (!next.objectStoreNames.contains(storeName)) {
            next.createObjectStore(storeName);
          }
        };

        upgrade.onsuccess = () => {
          const db2 = upgrade.result;

          try {
            const tx = db2.transaction(storeName, "readwrite");
            tx.objectStore(storeName).put(value, key);
            tx.oncomplete = () => { db2.close(); resolve(); };
            tx.onerror = () => reject(tx.error);
          } catch (e) {
            db2.close();
            reject(e);
          }
        };

        upgrade.onerror = () => reject(upgrade.error);
        return;
      }

      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };

    const open = indexedDB.open(dbName);

    open.onsuccess = () => runPut(open.result);
    open.onerror = () => reject(open.error);
  });
}

function userPathsFromEntries(entries) {
  return entries
    .filter(e => e.db === "gta5-userdata" && e.store === "files")
    .map(e => ({
      path: String(e.key),
      data: e.value?.data,
      mtime: e.mtime
    }));
}