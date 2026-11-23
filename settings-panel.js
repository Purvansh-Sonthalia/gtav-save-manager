
(() => {
  if (window.__gtaSettingsPanelInstalled) return;
  window.__gtaSettingsPanelInstalled = true;

  const DB_NAME = "gta5-userdata";
  const STORE = "files";

  // homepage.html + README (shadany7824/playgta5)
  const PRESETS = {
    efficiency: {
      label: "Efficiency — 720p / 30 FPS / low profile",
      low: "1",
      fps: "30",
      res: "1280x720",
      shadows: "0",
      scale: "1",
      cores: "",
      fixed: "0",
      args: ""
    },
    balanced: {
      label: "Balanced — 720p / 60 FPS / low profile",
      low: "1",
      fps: "60",
      res: "1280x720",
      shadows: "0",
      scale: "1",
      cores: "",
      fixed: "0",
      args: ""
    },
    quality: {
      label: "Quality — 1080p / 60 FPS / full profile",
      low: "0",
      fps: "60",
      res: "1920x1080",
      shadows: "0",
      scale: "1",
      cores: "",
      fixed: "0",
      args: ""
    }
  };

  const URL_KEYS = [
    "low", "shadows", "fps", "res", "scale", "cores", "fixed", "args"
  ];

  const GRAPHICS_FIELDS = [
    { tag: "ShadowQuality", label: "Shadow quality", type: "select",
      options: [["0", "Off"], ["1", "Normal"], ["2", "High"], ["3", "Very high"]] },
    { tag: "TextureQuality", label: "Texture quality", type: "select",
      options: [["0", "Normal"], ["1", "High"], ["2", "Very high"]] },
    { tag: "ReflectionQuality", label: "Reflection quality", type: "select",
      options: [["0", "Off"], ["1", "Normal"], ["2", "High"], ["3", "Very high"]] },
    { tag: "WaterQuality", label: "Water quality", type: "select",
      options: [["0", "Low"], ["1", "High"]] },
    { tag: "GrassQuality", label: "Grass quality", type: "select",
      options: [["0", "Low"], ["1", "Medium"], ["2", "High"], ["3", "Very high"], ["4", "Ultra"]] },
    { tag: "ShaderQuality", label: "Shader quality", type: "select",
      options: [["0", "Low"], ["1", "High"], ["2", "Very high"]] },
    { tag: "MSAA", label: "MSAA", type: "select",
      options: [["0", "Off"], ["2", "2x"], ["4", "4x"], ["8", "8x"]] },
    { tag: "FXAA_Enabled", label: "FXAA", type: "select",
      options: [["false", "Off"], ["true", "On"]] },
    { tag: "VSync", label: "V-Sync", type: "select",
      options: [["0", "Off"], ["1", "On"]] },
    { tag: "ResolutionWidth", label: "Resolution width", type: "number" },
    { tag: "ResolutionHeight", label: "Resolution height", type: "number" }
  ];

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async function listKeys() {
    const db = await openDB();

    try {
      return await new Promise((resolve, reject) => {
        const keys = [];
        const req = db.transaction(STORE, "readonly")
          .objectStore(STORE).openCursor();

        req.onsuccess = () => {
          const c = req.result;
          if (!c) {
            resolve(keys);
            return;
          }
          keys.push(String(c.key));
          c.continue();
        };

        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  }

  async function getEntry(path) {
    const db = await openDB();

    try {
      return await new Promise((resolve, reject) => {
        const req = db.transaction(STORE, "readonly")
          .objectStore(STORE).get(path);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  }

  async function putEntry(path, data, mtime) {
    const db = await openDB();

    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put({
          data,
          mtime: mtime || Date.now()
        }, path);

        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  function bytesOf(data) {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (ArrayBuffer.isView(data)) {
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    return new TextEncoder().encode(String(data));
  }

  function readXmlValue(xml, tag) {
    const re = new RegExp(`<${tag}\\s+value="([^"]*)"`, "i");
    const m = xml.match(re);
    return m ? m[1] : "";
  }

  function patchXml(xml, fields) {
    let out = xml;

    for (const [tag, value] of Object.entries(fields)) {
      const val = String(value);
      const re = new RegExp(`(<${tag}\\s+value=")([^"]*)(")`, "i");

      if (re.test(out)) {
        out = out.replace(re, `$1${val}$3`);
      } else if (out.includes("</graphics>")) {
        out = out.replace(
          "</graphics>",
          `    <${tag} value="${val}" />\n  </graphics>`
        );
      }
    }

    return out;
  }

  const DEFAULT_SETTINGS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Settings>
  <version value="27" />
  <configSource>SMC_USER</configSource>
  <graphics>
    <ShadowQuality value="1" />
    <TextureQuality value="0" />
    <ReflectionQuality value="0" />
    <WaterQuality value="0" />
    <GrassQuality value="0" />
    <ShaderQuality value="0" />
    <MSAA value="0" />
    <FXAA_Enabled value="false" />
    <VSync value="0" />
    <ResolutionWidth value="1280" />
    <ResolutionHeight value="720" />
  </graphics>
</Settings>`;

  function readLaunchFromUrl() {
    const q = new URLSearchParams(location.search);

    let low = "auto";
    if (q.get("low") === "1") low = "1";
    else if (q.get("low") === "0") low = "0";

    const fps = q.get("fps") || "60";

    return {
      low,
      shadows: q.get("shadows") === "1" ? "1" : "0",
      fps: fps === "30" || fps === "0" ? fps : "60",
      res: q.get("res") || "",
      scale: q.get("scale") || "1",
      cores: q.get("cores") || "",
      fixed: q.get("fixed") === "1" ? "1" : "0",
      args: q.get("args") || ""
    };
  }

  function matchPreset(prefs) {
    for (const [id, preset] of Object.entries(PRESETS)) {
      const keys = ["low", "fps", "res", "shadows", "scale", "cores", "fixed", "args"];
      if (keys.every(k => (prefs[k] || "") === (preset[k] || ""))) {
        return id;
      }
    }
    return "custom";
  }

  async function loadStoredLaunch() {
    const stored = await chrome.storage.local.get("playgta5Launch");
    const fromUrl = readLaunchFromUrl();
    const merged = { ...fromUrl, ...stored.playgta5Launch };
    merged.preset = matchPreset(merged);
    return merged;
  }

  function collectPrefsFromForm($, shadow) {
    const resSelect = $("resPreset").value;
    const resCustom = $("resCustom").value.trim();
    const res = resSelect || resCustom;

    const prefs = {
      preset: $("preset").value,
      low: $("low").value,
      shadows: $("urlShadows").value,
      fps: $("fps").value,
      res,
      scale: $("scale").value || "1",
      cores: $("cores").value.trim(),
      fixed: $("fixed").value,
      args: $("args").value.trim()
    };

    if (prefs.preset !== "custom" && PRESETS[prefs.preset]) {
      Object.assign(prefs, PRESETS[prefs.preset]);
      prefs.preset = $("preset").value;
    }

    return prefs;
  }

  function applyPrefsToUrl(prefs) {
    const url = new URL(location.href);

    for (const key of URL_KEYS) {
      url.searchParams.delete(key);
    }

    if (prefs.low === "1" || prefs.low === "0") {
      url.searchParams.set("low", prefs.low);
    }

    if (prefs.low === "1" && prefs.shadows === "1") {
      url.searchParams.set("shadows", "1");
    }

    if (prefs.fps === "30" || prefs.fps === "0") {
      url.searchParams.set("fps", prefs.fps);
    }

    if (prefs.res && /^\d+x\d+$/.test(prefs.res)) {
      url.searchParams.set("res", prefs.res);
    }

    const scale = parseFloat(prefs.scale);
    if (scale && scale !== 1) {
      url.searchParams.set("scale", String(scale));
    }

    if (prefs.cores && +prefs.cores > 0) {
      url.searchParams.set("cores", prefs.cores);
    }

    if (prefs.fixed === "1") {
      url.searchParams.set("fixed", "1");
    }

    if (prefs.args) {
      url.searchParams.set("args", prefs.args);
    }

    return url.toString();
  }

  async function saveLaunchAndReload(prefs) {
    await chrome.storage.local.set({ playgta5Launch: prefs });
    location.href = applyPrefsToUrl(prefs);
  }

  function fillFormFromPrefs($, prefs) {
    $("preset").value = prefs.preset || matchPreset(prefs);
    $("low").value = prefs.low;
    $("urlShadows").value = prefs.shadows;
    $("fps").value = prefs.fps;

    const presetVals = ["", "960x540", "1280x720", "1920x1080", "2560x1440"];
    if (presetVals.includes(prefs.res)) {
      $("resPreset").value = prefs.res;
      $("resCustom").value = "";
    } else if (prefs.res) {
      $("resPreset").value = "";
      $("resCustom").value = prefs.res;
    } else {
      $("resPreset").value = "";
      $("resCustom").value = "";
    }

    $("scale").value = prefs.scale || "1";
    $("cores").value = prefs.cores || "";
    $("fixed").value = prefs.fixed || "0";
    $("args").value = prefs.args || "";
  }

  function applyPresetToForm($, presetId) {
    if (presetId === "custom" || !PRESETS[presetId]) return;
    fillFormFromPrefs($, { ...PRESETS[presetId], preset: presetId });
  }

  function closePanel(host) {
    host.remove();
  }

  window.__gtaOpenGraphicsSettings = async function openGraphicsSettings() {
    document.getElementById("gta-graphics-settings-host")?.remove();

    let settingsPath = "/userdata/Rockstar Games/GTA V/settings.xml";
    let settingsPaths = [];

    try {
      const keys = await listKeys();
      settingsPaths = keys.filter(k => k.endsWith("settings.xml"));
      if (settingsPaths.length) settingsPath = settingsPaths[0];
    } catch (e) {
      console.warn(e);
    }

    const launch = await loadStoredLaunch();

    const host = document.createElement("div");
    host.id = "gta-graphics-settings-host";
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647";

    const shadow = host.attachShadow({ mode: "open" });

    const presetOptions = [
      `<option value="custom">Custom</option>`,
      ...Object.entries(PRESETS).map(([id, p]) =>
        `<option value="${id}">${p.label}</option>`
      )
    ].join("");

    const xmlFields = GRAPHICS_FIELDS.map(f => {
      if (f.type === "select") {
        const opts = f.options.map(([v, l]) =>
          `<option value="${v}">${l}</option>`
        ).join("");
        return `<label>${f.label}<select data-tag="${f.tag}">${opts}</select></label>`;
      }
      return `<label>${f.label}<input data-tag="${f.tag}" type="number"></label>`;
    }).join("");

    const pathOptions = (settingsPaths.length ? settingsPaths : [settingsPath])
      .map(p => `<option value="${p}">${p}</option>`).join("");

    shadow.innerHTML = `
      <style>
        *{box-sizing:border-box}
        .wrap{
          position:fixed;inset:0;display:flex;
          align-items:center;justify-content:center;padding:16px;
        }
        .backdrop{position:absolute;inset:0;background:#000a}
        .sheet{
          position:relative;z-index:1;width:min(440px,100%);max-height:90vh;
          overflow:auto;background:#111827;color:#fff;border:1px solid #374151;
          border-radius:12px;padding:18px;font:13px system-ui,sans-serif;
        }
        h2{margin:0 0 6px;font-size:17px}
        .sub{color:#9ca3af;font-size:11px;margin:0 0 14px;line-height:1.45}
        h3{font-size:13px;margin:16px 0 8px;color:#d1d5db}
        details{margin-top:12px;color:#d1d5db;font-size:12px}
        summary{cursor:pointer;font-weight:600;margin-bottom:8px}
        label{display:block;margin:8px 0;color:#e5e7eb;font-size:12px}
        select,input,button,textarea{
          width:100%;margin-top:4px;padding:9px;border-radius:7px;
          border:1px solid #4b5563;background:#0f172a;color:#fff;
        }
        textarea{font-family:Consolas,monospace;font-size:11px;min-height:52px}
        button{border:0;font-weight:600;cursor:pointer;margin-top:10px}
        .primary{background:#2563eb}
        .save{background:#16834a}
        .muted{background:#374151}
        .row{display:flex;gap:8px}
        .row button{flex:1}
        .status{color:#94a3b8;font-size:11px;margin-top:10px;min-height:2.5em}
        .top{display:flex;justify-content:space-between;align-items:center}
        .close{background:transparent;width:auto;padding:4px 8px;font-size:20px}
        code{font-size:10px;color:#a5b4fc}
      </style>
      <div class="wrap">
        <div class="backdrop" id="backdrop"></div>
        <div class="sheet">
          <div class="top">
            <h2>Graphics settings</h2>
            <button type="button" class="close" id="close">×</button>
          </div>
          <p class="sub">
            Same controls as
            <code>homepage.html</code>
            in
            <a href="https://github.com/shadany7824/playgta5" style="color:#93c5fd">
              playgta5
            </a>:
            URL params set the engine at load (<code>?low</code>, <code>?fps</code>,
            <code>?res</code>, <code>?scale</code>, <code>?shadows</code>,
            <code>?cores</code>, <code>?args</code>). Reload the tab to apply—there
            is no in-game restart for these.
          </p>

          <h3>Profile preset</h3>
          <label>Preset
            <select id="preset">${presetOptions}</select>
          </label>

          <h3>Launch URL</h3>
          <label>Low-memory profile (<code>?low</code>)
            <select id="low">
              <option value="auto">Auto (≤4 GB RAM)</option>
              <option value="1">Force on — LOW_ARGS: low textures, no grass, etc.</option>
              <option value="0">Force off — full quality path</option>
            </select>
          </label>
          <label>Shadows in low profile (<code>?shadows=1</code>)
            <select id="urlShadows">
              <option value="0">Off (default in low mode)</option>
              <option value="1">Lowest shadow level</option>
            </select>
          </label>
          <label>FPS cap (<code>?fps</code>, engine frameLimit)
            <select id="fps">
              <option value="30">30</option>
              <option value="60">60 (default)</option>
              <option value="0">Uncapped</option>
            </select>
          </label>
          <label>Resolution preset (<code>?res=WxH</code>)
            <select id="resPreset">
              <option value="">Window / scale</option>
              <option value="960x540">960×540</option>
              <option value="1280x720">1280×720</option>
              <option value="1920x1080">1920×1080</option>
              <option value="2560x1440">2560×1440</option>
            </select>
          </label>
          <label>Custom resolution
            <input id="resCustom" placeholder="1920x1080" pattern="\\d+x\\d+">
          </label>
          <label>Render scale (<code>?scale</code>, 0.25–2)
            <input id="scale" type="number" min="0.25" max="2" step="0.05" value="1">
          </label>
          <label>Reported CPU cores (<code>?cores</code>, 0 = auto)
            <input id="cores" type="number" min="0" max="32" placeholder="auto">
          </label>
          <label>Fixed startup resolution (<code>?fixed=1</code>)
            <select id="fixed">
              <option value="0">Follow window resize</option>
              <option value="1">Keep launch size</option>
            </select>
          </label>
          <label>Extra engine flags (<code>?args=</code>, comma-separated)
            <textarea id="args" placeholder="-shadowQuality=2,-textureQuality=1"></textarea>
          </label>
          <p class="sub" style="margin-top:4px">
            Low profile adds:
            <code>-textureQuality=0</code>,
            <code>-shadowQuality=-1</code> (unless shadows=1),
            <code>-reflectionQuality=0</code>, etc. Custom
            <code>?args</code> are merged when the worker starts.
          </p>

          <button type="button" class="primary" id="saveLaunch">
            Apply launch settings &amp; reload
          </button>

          <details>
            <summary>settings.xml in IndexedDB (PC menu file, optional)</summary>
            <label>Path
              <select id="settingsPath">${pathOptions}</select>
            </label>
            ${xmlFields}
            <div class="row">
              <button type="button" class="save" id="saveXml">Save XML only</button>
              <button type="button" class="muted" id="saveXmlReload">
                Save XML &amp; reload
              </button>
            </div>
          </details>

          <div class="status" id="status"></div>
        </div>
      </div>
    `;

    document.documentElement.appendChild(host);

    const $ = id => shadow.getElementById(id);
    const status = msg => { $("status").textContent = msg; };

    fillFormFromPrefs($, launch);

    $("preset").onchange = () => {
      const id = $("preset").value;
      if (id !== "custom") applyPresetToForm($, id);
    };

    async function loadXmlIntoForm(path) {
      let xml = DEFAULT_SETTINGS_XML;
      const entry = await getEntry(path);
      if (entry) {
        xml = new TextDecoder().decode(bytesOf(entry.data));
      }

      for (const f of GRAPHICS_FIELDS) {
        const el = shadow.querySelector(`[data-tag="${f.tag}"]`);
        if (!el) continue;
        const v = readXmlValue(xml, f.tag);
        if (v) el.value = v;
      }
    }

    $("settingsPath")?.addEventListener("change", async () => {
      try {
        await loadXmlIntoForm($("settingsPath").value);
      } catch (e) {
        status(e.message);
      }
    });

    $("close").onclick = () => closePanel(host);
    $("backdrop").onclick = () => closePanel(host);

    try {
      await loadXmlIntoForm($("settingsPath").value);
    } catch (e) {
      status(e.message);
    }

    async function saveXml(reload) {
      const path = $("settingsPath").value;
      const entry = await getEntry(path);
      let xml = entry
        ? new TextDecoder().decode(bytesOf(entry.data))
        : DEFAULT_SETTINGS_XML;

      const fields = {};
      for (const f of GRAPHICS_FIELDS) {
        const el = shadow.querySelector(`[data-tag="${f.tag}"]`);
        if (el) fields[f.tag] = el.value;
      }

      xml = patchXml(xml, fields);
      await putEntry(path, new TextEncoder().encode(xml), Date.now());

      if (reload) {
        const prefs = collectPrefsFromForm($, shadow);
        await chrome.storage.local.set({ playgta5Launch: prefs });
        location.href = applyPrefsToUrl(prefs);
        return;
      }

      status("Saved " + path + ". Reload to apply.");
    }

    $("saveLaunch").onclick = async () => {
      try {
        const prefs = collectPrefsFromForm($, shadow);
        prefs.preset = matchPreset(prefs);
        await saveLaunchAndReload(prefs);
      } catch (e) {
        status(e.message);
      }
    };

    $("saveXml").onclick = () => saveXml(false).catch(e => status(e.message));
    $("saveXmlReload").onclick = () => saveXml(true).catch(e => status(e.message));
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "OPEN_SETTINGS") return;

    (async () => {
      await window.__gtaOpenGraphicsSettings();
      sendResponse({ success: true });
    })().catch(error =>
      sendResponse({ success: false, error: error.message })
    );

    return true;
  });
})();