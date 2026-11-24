
window.__gtaInstallProSettingsPanel = function __gtaInstallProSettingsPanel() {
  const gfxApi = window.GTAGraphicsSettings;
  const urlApi = window.GTALaunchUrl;
  const { GFX_KEYS, choices, preset: gfxPreset, engineToGfx, normalise: normGfx } =
    gfxApi;
  const { expand, compact, FPS_OPTIONS, SCALE_OPTIONS, RES_OPTIONS, LANGUAGES } =
    urlApi;

  const PRO_PRESET_META = {
    low: "Low-spec — reduced detail & memory",
    "low-normal": "Low normal — minimum scene quality",
    max: "Max graphics"
  };

  const PRO_LAUNCH = [
    "fps", "scale", "low", "res", "fxaa", "language", "mode", "map", "newgame",
    "cores", "shadows"
  ];

  const PRO_CLEAR = new Set(["cfg", "mode", "map", "newgame", ...PRO_LAUNCH, ...GFX_KEYS]);

  function parseArgsString(str) {
    const engine = {};
    if (!str) return engine;
    for (const part of str.split(",")) {
      const m = /^-([^=]+)=(.*)$/.exec(part.trim());
      if (m) engine[m[1]] = m[2];
    }
    return engine;
  }

  function basePrefs() {
    return {
      preset: "custom",
      fps: "60",
      scale: "1",
      low: "auto",
      res: "native",
      fxaa: "1",
      language: "system",
      mode: "sandbox",
      map: "",
      newgame: "0",
      cores: "auto",
      shadows: "1",
      ...normGfx({})
    };
  }

  function readLaunchFromUrl() {
    const q = expand(location.search);
    const prefs = basePrefs();

    if (FPS_OPTIONS.includes(q.get("fps"))) prefs.fps = q.get("fps");
    if (SCALE_OPTIONS.includes(q.get("scale"))) prefs.scale = q.get("scale");
    if (["auto", "0", "1"].includes(q.get("low"))) prefs.low = q.get("low");
    if (RES_OPTIONS.includes(q.get("res")) || /^\d+x\d+$/.test(q.get("res") || "")) {
      prefs.res = q.get("res");
    }
    if (["0", "1"].includes(q.get("fxaa"))) prefs.fxaa = q.get("fxaa");
    if (LANGUAGES.includes(q.get("language"))) prefs.language = q.get("language");
    if (q.get("mode") === "story" || q.get("mode") === "sandbox") {
      prefs.mode = q.get("mode");
    }
    if (q.get("map")) prefs.map = q.get("map");
    prefs.newgame = q.get("newgame") === "1" ? "1" : "0";
    prefs.cores = q.get("cores") || "auto";
    prefs.shadows = q.get("shadows") === "0" ? "0" : "1";

    for (const key of GFX_KEYS) {
      if (q.has(key) && choices[key].includes(q.get(key))) {
        prefs[key] = q.get(key);
      }
    }

    prefs.preset = matchPreset(prefs);
    return prefs;
  }

  function prefsSignature(p) {
    const o = {};
    for (const k of [...PRO_LAUNCH, ...GFX_KEYS]) o[k] = p[k] ?? "";
    return JSON.stringify(o);
  }

  function matchPreset(prefs) {
    for (const id of Object.keys(PRO_PRESET_META)) {
      const fromPreset = { ...basePrefs(), ...gfxPreset(id) };
      if (!fromPreset.fps) fromPreset.fps = prefs.fps;
      if (!fromPreset.res) fromPreset.res = prefs.res;
      if (prefsSignature(fromPreset) === prefsSignature(prefs)) return id;
    }
    return "custom";
  }

  async function loadStoredLaunch() {
    const stored = await chrome.storage.local.get("playgta5Launch");
    const fromUrl = readLaunchFromUrl();
    let merged = { ...fromUrl, ...stored.playgta5Launch };

    if (stored.playgta5Launch?.engine) {
      merged = { ...merged, ...engineToGfx(stored.playgta5Launch.engine) };
    } else if (stored.playgta5Launch?.args) {
      merged = {
        ...merged,
        ...engineToGfx(parseArgsString(stored.playgta5Launch.args))
      };
    }

    for (const key of GFX_KEYS) {
      merged[key] = normGfx(merged)[key];
    }

    merged.preset = matchPreset(merged);
    return merged;
  }

  function collectPrefsFromForm($) {
    const resSel = $("resPreset").value;
    const resCustom = $("resCustom").value.trim();
    let res = resSel || resCustom || "native";
    if (!RES_OPTIONS.includes(res) && !/^\d+x\d+$/.test(res)) res = "native";

    const prefs = {
      preset: $("preset").value,
      low: $("low").value,
      shadows: $("shadows").checked ? "1" : "0",
      fps: $("fps").value,
      res,
      scale: $("scale").value,
      fxaa: $("fxaa").value,
      language: $("language").value,
      mode: $("mode").value,
      map: $("map").value,
      newgame: $("newgame").value,
      cores: $("cores").value.trim() || "auto"
    };

    if (prefs.preset !== "custom" && PRO_PRESET_META[prefs.preset]) {
      Object.assign(prefs, gfxPreset(prefs.preset));
      prefs.preset = $("preset").value;
      prefs.fps = $("fps").value;
      prefs.res = res;
      prefs.low = $("low").value;
      prefs.shadows = $("shadows").checked ? "1" : "0";
      prefs.mode = $("mode").value;
      prefs.map = $("map").value;
      prefs.newgame = $("newgame").value;
      prefs.cores = $("cores").value.trim() || "auto";
    }

    for (const key of GFX_KEYS) {
      const el = $(`gfx-${key}`);
      if (el) prefs[key] = el.value;
    }

    return prefs;
  }

  function applyPrefsToUrl(prefs) {
    const url = new URL(location.href);
    const q = expand(url.search);

    for (const k of [...q.keys()]) {
      if (PRO_CLEAR.has(k)) q.delete(k);
    }

    q.set("mode", prefs.mode === "story" ? "story" : "sandbox");
    if (prefs.map) q.set("map", prefs.map);
    if (prefs.newgame === "1" && prefs.mode === "story") q.set("newgame", "1");

    q.set("fps", prefs.fps);
    q.set("scale", prefs.scale);
    if (prefs.low !== "auto") q.set("low", prefs.low);
    if (prefs.res && prefs.res !== "native") q.set("res", prefs.res);

    if (prefs.language && prefs.language !== "system") {
      q.set("language", prefs.language);
    }
    q.set("fxaa", prefs.fxaa);
    q.set("shadows", prefs.shadows === "0" ? "0" : "1");
    if (prefs.cores && prefs.cores !== "auto") q.set("cores", prefs.cores);

    for (const key of GFX_KEYS) {
      const v = prefs[key];
      if (v && v !== "auto") q.set(key, v);
    }

    const out = compact(q);
    out.set("mode", prefs.mode === "story" ? "story" : "sandbox");
    url.search = out.toString();
    return url.toString();
  }

  function urlLaunchSignature(href) {
    const u = new URL(href);
    return u.origin + u.pathname + "?" + compact(expand(u.search)).toString();
  }

  async function autoApplyStoredLaunch() {
    const data = await chrome.storage.local.get([
      "playgta5Launch",
      "playgta5LaunchAutoApply"
    ]);
    if (data.playgta5LaunchAutoApply === false) return;

    const raw = data.playgta5Launch;
    if (!raw) return;

    const prefs = { ...basePrefs(), ...raw };
    for (const key of GFX_KEYS) prefs[key] = normGfx(prefs)[key];

    const target = applyPrefsToUrl(prefs);
    if (urlLaunchSignature(target) === urlLaunchSignature(location.href)) return;
    location.replace(target);
  }

  async function saveLaunchAndReload(prefs, autoApply) {
    await chrome.storage.local.set({
      playgta5Launch: prefs,
      playgta5LaunchAutoApply: autoApply !== false
    });
    location.href = applyPrefsToUrl(prefs);
  }

  function renderGfxFields() {
    return GFX_KEYS.map(key => {
      const opts = choices[key]
        .map(v => `<option value="${v}">${v === "auto" ? "Saved / auto" : v}</option>`)
        .join("");
      return `<label><code>${key}</code><select id="gfx-${key}">${opts}</select></label>`;
    }).join("");
  }

  function fillFormFromPrefs($, prefs) {
    $("preset").value = prefs.preset || matchPreset(prefs);
    $("low").value = ["auto", "0", "1"].includes(prefs.low) ? prefs.low : "auto";
    $("shadows").checked = prefs.shadows !== "0";
    $("fps").value = FPS_OPTIONS.includes(prefs.fps) ? prefs.fps : "60";
    $("scale").value = SCALE_OPTIONS.includes(prefs.scale) ? prefs.scale : "1";
    $("fxaa").value = prefs.fxaa === "0" ? "0" : "1";
    $("language").value = LANGUAGES.includes(prefs.language)
      ? prefs.language
      : "system";
    $("mode").value = prefs.mode === "story" ? "story" : "sandbox";
    $("map").value = prefs.map || "";
    $("newgame").value = prefs.newgame === "1" ? "1" : "0";
    $("cores").value = prefs.cores === "auto" ? "" : prefs.cores;

    const res = prefs.res || "native";
    if (RES_OPTIONS.includes(res)) {
      $("resPreset").value = res;
      $("resCustom").value = "";
    } else if (res && res !== "native") {
      $("resPreset").value = "";
      $("resCustom").value = res;
    } else {
      $("resPreset").value = "native";
      $("resCustom").value = "";
    }

    for (const key of GFX_KEYS) {
      const el = $(`gfx-${key}`);
      if (el) el.value = normGfx(prefs)[key];
    }
  }

  function applyPresetToForm($, presetId) {
    if (presetId === "custom" || !PRO_PRESET_META[presetId]) return;
    const p = { ...basePrefs(), ...gfxPreset(presetId) };
    p.preset = presetId;
    fillFormFromPrefs($, p);
  }

  window.__gtaOpenGraphicsSettings = async function openGraphicsSettings() {
    document.getElementById("gta-graphics-settings-host")?.remove();

    const launch = await loadStoredLaunch();
    const autoStored = await chrome.storage.local.get("playgta5LaunchAutoApply");

    const host = document.createElement("div");
    host.id = "gta-graphics-settings-host";
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
    const shadow = host.attachShadow({ mode: "open" });

    const presetOptions = [
      `<option value="custom">Custom</option>`,
      ...Object.entries(PRO_PRESET_META).map(
        ([id, label]) => `<option value="${id}">${label}</option>`
      )
    ].join("");

    const fpsOpts = FPS_OPTIONS.map(f => `<option value="${f}">${f}</option>`).join("");
    const scaleOpts = SCALE_OPTIONS.map(s => `<option value="${s}">${s}</option>`).join("");
    const resOpts = RES_OPTIONS.map(r =>
      `<option value="${r}">${r === "native" ? "Native window" : r.replace("x", "×")}</option>`
    ).join("");
    const langOpts = LANGUAGES.map(l =>
      `<option value="${l}">${l}</option>`
    ).join("");

    shadow.innerHTML = `
      <style>
        *{box-sizing:border-box}
        .wrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:16px}
        .backdrop{position:absolute;inset:0;background:#000a}
        .sheet{position:relative;z-index:1;width:min(440px,100%);max-height:90vh;overflow:auto;
          background:#111827;color:#fff;border:1px solid #374151;border-radius:12px;padding:18px;
          font:13px system-ui,sans-serif}
        h2{margin:0 0 6px;font-size:17px}
        .sub{color:#9ca3af;font-size:11px;margin:0 0 14px;line-height:1.45}
        h3{font-size:13px;margin:16px 0 8px;color:#d1d5db}
        label{display:block;margin:8px 0;color:#e5e7eb;font-size:12px}
        select,input,button{width:100%;margin-top:4px;padding:9px;border-radius:7px;
          border:1px solid #4b5563;background:#0f172a;color:#fff}
        button{border:0;font-weight:600;cursor:pointer;margin-top:10px}
        .primary{background:#2563eb}
        .status{color:#94a3b8;font-size:11px;margin-top:10px;min-height:2.5em}
        .top{display:flex;justify-content:space-between;align-items:center}
        .close{background:transparent;width:auto;padding:4px 8px;font-size:20px}
        code{font-size:10px;color:#a5b4fc}
        .row-check{display:flex;align-items:center;gap:8px;margin:8px 0}
        .row-check input{width:auto;margin:0}
      </style>
      <div class="wrap">
        <div class="backdrop" id="backdrop"></div>
        <div class="sheet">
          <div class="top">
            <h2>Graphics settings</h2>
            <button type="button" class="close" id="close">×</button>
          </div>
          <p class="sub">
            Matches the
            <a href="https://playgta5.pro/" style="color:#93c5fd">playgta5.pro</a>
            launcher URL options. Reload the tab to apply. Use
            <code>auto</code> on scene keys to follow the memory profile.
          </p>

          <h3>Profile preset</h3>
          <label>Preset<select id="preset">${presetOptions}</select></label>

          <h3>Display &amp; performance</h3>
          <label>Low-memory profile (<code>low</code>)
            <select id="low">
              <option value="auto">Auto (≤4 GB RAM)</option>
              <option value="1">Force on</option>
              <option value="0">Force off</option>
            </select>
          </label>
          <div class="row-check">
            <input type="checkbox" id="shadows">
            <span>Enable shadows (<code>shadows=1</code>)</span>
          </div>
          <label>FPS cap<select id="fps">${fpsOpts}</select></label>
          <label>Resolution<select id="resPreset">${resOpts}</select></label>
          <label>Custom resolution<input id="resCustom" placeholder="1920x1080"></label>
          <label>Render scale<select id="scale">${scaleOpts}</select></label>
          <label>FXAA<select id="fxaa"><option value="1">On</option><option value="0">Off</option></select></label>
          <label>CPU cores<input id="cores" placeholder="auto"></label>

          <h3>Mode</h3>
          <label>mode<select id="mode">
            <option value="sandbox">sandbox</option>
            <option value="story">story</option>
          </select></label>
          <label>map (sandbox)<input id="map" placeholder="env_test"></label>
          <label>newgame (story)<select id="newgame">
            <option value="0">Load saves</option>
            <option value="1">Prologue</option>
          </select></label>
          <label>Language<select id="language">${langOpts}</select></label>

          <h3>Scene quality (URL keys)</h3>
          ${renderGfxFields()}

          <label class="row-check" style="align-items:flex-start">
            <input type="checkbox" id="autoApply" style="margin-top:3px">
            <span>Remember and apply whenever I open cdn.playgta5.pro or playgta5.pro.</span>
          </label>
          <button type="button" class="primary" id="saveLaunch">Apply &amp; reload</button>
          <div class="status" id="status"></div>
        </div>
      </div>
    `;

    document.documentElement.appendChild(host);
    const $ = id => shadow.getElementById(id);

    fillFormFromPrefs($, launch);
    $("autoApply").checked = autoStored.playgta5LaunchAutoApply !== false;

    $("preset").onchange = () => {
      if ($("preset").value !== "custom") applyPresetToForm($, $("preset").value);
    };

    const close = () => host.remove();
    $("close").onclick = close;
    $("backdrop").onclick = close;

    $("saveLaunch").onclick = async () => {
      try {
        const prefs = collectPrefsFromForm($);
        prefs.preset = matchPreset(prefs);
        await saveLaunchAndReload(prefs, $("autoApply").checked);
      } catch (e) {
        $("status").textContent = e.message;
      }
    };
  };

  autoApplyStoredLaunch().catch(console.error);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "OPEN_SETTINGS") return;
    (async () => {
      await window.__gtaOpenGraphicsSettings();
      sendResponse({ success: true });
    })().catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  });
};