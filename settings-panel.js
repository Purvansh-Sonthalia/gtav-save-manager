
(() => {
  if (window.__gtaSettingsPanelInstalled) return;
  window.__gtaSettingsPanelInstalled = true;

  const isPro = /(?:^|\.)playgta5\.pro$/i.test(location.hostname);
  if (isPro) {
    window.__gtaInstallProSettingsPanel?.();
    return;
  }

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
      engine: {},
      extra: {}
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
      engine: {},
      extra: {}
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
      engine: {},
      extra: {}
    }
  };

  // ?args= flags (homepage LOW_ARGS + common engine quality switches)
  const ENGINE_ARGS = [
    { key: "textureQuality", label: "textureQuality",
      options: [["", "Omit"], ["0", "0 (low)"], ["1", "1"], ["2", "2"], ["3", "3"]] },
    { key: "shadowQuality", label: "shadowQuality",
      options: [["", "Omit"], ["-1", "-1 (off)"], ["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"]] },
    { key: "reflectionQuality", label: "reflectionQuality",
      options: [["", "Omit"], ["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"]] },
    { key: "particleQuality", label: "particleQuality",
      options: [["", "Omit"], ["0", "0"], ["1", "1"], ["2", "2"]] },
    { key: "grassQuality", label: "grassQuality",
      options: [["", "Omit"], ["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]] },
    { key: "pedVariety", label: "pedVariety",
      options: [["", "Omit"], ["0", "0 (min)"], ["1", "1 (full)"]] },
    { key: "vehicleVariety", label: "vehicleVariety",
      options: [["", "Omit"], ["0", "0 (min)"], ["1", "1 (full)"]] },
    { key: "cityDensity", label: "cityDensity",
      options: [["", "Omit"], ["0", "0 (min)"], ["1", "1 (full)"]] },
    { key: "lodScale", label: "lodScale",
      options: [["", "Omit"], ["0", "0"], ["0.5", "0.5"], ["1", "1"]] },
    { key: "pedLodBias", label: "pedLodBias",
      options: [["", "Omit"], ["0", "0"], ["0.2", "0.2"], ["0.4", "0.4"]] },
    { key: "vehicleLodBias", label: "vehicleLodBias",
      options: [["", "Omit"], ["0", "0"], ["0.2", "0.2"]] }
  ];

  // Other homepage.html query params (not ?args)
  const EXTRA_URL = [
    { id: "mode", label: "mode", type: "select", options: [
      ["", "Title screen choice"], ["story", "story"], ["sandbox", "sandbox"]
    ]},
    { id: "map", label: "map (sandbox)", type: "select", options: [
      ["", "GTA V map"], ["env_test", "env_test (GTA VI test)"]
    ]},
    { id: "newgame", label: "newgame", type: "select", options: [
      ["0", "Load saves"], ["1", "Prologue (-noautoload)"]
    ]},
    { id: "verbose", label: "verbose", type: "select", options: [
      ["0", "Quiet script logs"], ["1", "verbose=1"]
    ]},
    { id: "nogpu", label: "nogpu", type: "select", options: [
      ["0", "WebGPU on"], ["1", "nogpu (no -wgpu)"]
    ]},
    { id: "log", label: "log", type: "select", options: [
      ["0", "Off"], ["1", "Remote log (diag)"]
    ]},
    { id: "mem", label: "mem", type: "select", options: [
      ["0", "Off"], ["1", "mem=1 (diag)"]
    ]},
    { id: "nocache", label: "nocache / nosw", type: "select", options: [
      ["0", "Use OPFS cache"], ["1", "nocache"]
    ]},
    { id: "nopack", label: "nopack", type: "select", options: [
      ["0", "Shader packs"], ["1", "nopack (diag)"]
    ]},
    { id: "nohints", label: "nohints", type: "select", options: [
      ["0", "Prefetch hints"], ["1", "nohints (diag)"]
    ]},
    { id: "syncpipelines", label: "syncpipelines", type: "select", options: [
      ["0", "Async pipelines"], ["1", "syncpipelines=1"]
    ]},
    { id: "console", label: "console", type: "select", options: [
      ["0", "Normal console"], ["1", "console=1 (full)"]
    ]},
    { id: "trace", label: "trace", type: "select", options: [
      ["0", "Off"], ["1", "trace=1 (IO log)"]
    ]},
    { id: "record", label: "record", type: "select", options: [
      ["0", "Off"], ["1", "record=1 (boot set)"]
    ]},
    { id: "shotrt", label: "shotrt", type: "select", options: [
      ["0", "Off"], ["1", "shotrt=1 (diag)"]
    ]},
    { id: "slots", label: "slots (GPU frames in flight)", type: "number",
      min: 0, max: 8, placeholder: "default" },
    { id: "shot", label: "shot (screenshot every N frames)", type: "number",
      min: 0, placeholder: "0" },
    { id: "limits", label: "limits (WebGPU caps)", type: "text",
      placeholder: "maxSampledTexturesPerShaderStage:16,..." },
    { id: "keep", label: "keep (thread groups)", type: "text",
      placeholder: "replay,net,bink,idle" }
  ];

  const URL_SCALAR = [
    "low", "shadows", "fps", "res", "scale", "cores", "fixed", "args",
    "mode", "map", "newgame", "verbose", "nogpu", "log", "mem",
    "nocache", "nosw", "nopack", "nohints", "syncpipelines", "console",
    "trace", "record", "shotrt", "slots", "limits", "keep", "shot"
  ];

  function parseArgsString(str) {
    const engine = {};

    if (!str) return engine;

    for (const part of str.split(",")) {
      const m = /^-([^=]+)=(.*)$/.exec(part.trim());
      if (m) engine[m[1]] = m[2];
    }

    return engine;
  }

  function buildArgsString(engine) {
    return Object.entries(engine)
      .filter(([, v]) => v !== "" && v != null)
      .map(([k, v]) => `-${k}=${v}`)
      .join(",");
  }

  function readLaunchFromUrl() {
    const q = new URLSearchParams(location.search);

    let low = "auto";
    if (q.get("low") === "1") low = "1";
    else if (q.get("low") === "0") low = "0";

    const fps = q.get("fps") || "60";

    const engine = parseArgsString(q.get("args") || "");

    const extra = {
      mode: q.get("mode") || "",
      map: q.get("map") || "",
      newgame: q.get("newgame") === "1" ? "1" : "0",
      verbose: q.get("verbose") === "1" ? "1" : "0",
      nogpu: q.get("nogpu") === "1" ? "1" : "0",
      log: q.get("log") === "1" ? "1" : "0",
      mem: q.get("mem") === "1" ? "1" : "0",
      nocache: q.get("nocache") === "1" || q.get("nosw") === "1" ? "1" : "0",
      nopack: q.get("nopack") === "1" ? "1" : "0",
      nohints: q.get("nohints") === "1" ? "1" : "0",
      syncpipelines: q.get("syncpipelines") === "1" ? "1" : "0",
      console: q.get("console") === "1" ? "1" : "0",
      trace: q.get("trace") === "1" ? "1" : "0",
      record: q.get("record") === "1" ? "1" : "0",
      shotrt: q.get("shotrt") === "1" ? "1" : "0",
      slots: q.get("slots") || "",
      shot: q.get("shot") || "",
      limits: q.get("limits") || "",
      keep: q.get("keep") || ""
    };

    return {
      low,
      shadows: q.get("shadows") === "1" ? "1" : "0",
      fps: fps === "30" || fps === "0" ? fps : "60",
      res: q.get("res") || "",
      scale: q.get("scale") || "1",
      cores: q.get("cores") || "",
      fixed: q.get("fixed") === "1" ? "1" : "0",
      engine,
      extra
    };
  }

  function prefsSignature(p) {
    return JSON.stringify({
      low: p.low,
      fps: p.fps,
      res: p.res,
      shadows: p.shadows,
      scale: p.scale,
      cores: p.cores || "",
      fixed: p.fixed,
      engine: p.engine || {},
      extra: p.extra || {}
    });
  }

  function matchPreset(prefs) {
    const sig = prefsSignature(prefs);

    for (const [id, preset] of Object.entries(PRESETS)) {
      if (prefsSignature(preset) === sig) return id;
    }

    return "custom";
  }

  async function loadStoredLaunch() {
    const stored = await chrome.storage.local.get("playgta5Launch");
    const fromUrl = readLaunchFromUrl();
    let merged = { ...fromUrl, ...stored.playgta5Launch };

    if (stored.playgta5Launch?.args && !stored.playgta5Launch.engine) {
      merged.engine = parseArgsString(stored.playgta5Launch.args);
    }

    merged.engine = { ...fromUrl.engine, ...merged.engine };
    merged.extra = { ...fromUrl.extra, ...merged.extra };
    merged.preset = matchPreset(merged);
    return merged;
  }

  function readEngineFromForm(shadow, $) {
    const engine = {};

    for (const def of ENGINE_ARGS) {
      const el = shadow.querySelector(`[data-engine="${def.key}"]`);
      if (el && el.value !== "") engine[def.key] = el.value;
    }

    return engine;
  }

  function readExtraFromForm(shadow, $) {
    const extra = {};

    for (const def of EXTRA_URL) {
      const el = $(`extra-${def.id}`);
      if (!el) continue;
      const v = def.type === "number" || def.type === "text"
        ? el.value.trim()
        : el.value;
      extra[def.id] = v;
    }

    return extra;
  }

  function collectPrefsFromForm($, shadow) {
    const resSelect = $("resPreset").value;
    const resCustom = $("resCustom").value.trim();
    const res = resSelect || resCustom;

    let prefs = {
      preset: $("preset").value,
      low: $("low").value,
      shadows: $("urlShadows").value,
      fps: $("fps").value,
      res,
      scale: $("scale").value || "1",
      cores: $("cores").value.trim(),
      fixed: $("fixed").value,
      engine: readEngineFromForm(shadow, $),
      extra: readExtraFromForm(shadow, $)
    };

    if (prefs.preset !== "custom" && PRESETS[prefs.preset]) {
      prefs = {
        ...PRESETS[prefs.preset],
        preset: prefs.preset,
        engine: readEngineFromForm(shadow, $),
        extra: readExtraFromForm(shadow, $)
      };
    }

    prefs.args = buildArgsString(prefs.engine);
    return prefs;
  }

  function applyPrefsToUrl(prefs) {
    const url = new URL(location.href);

    for (const key of URL_SCALAR) {
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

  const args = buildArgsString(prefs.engine || {});
    if (args) url.searchParams.set("args", args);

    const ex = prefs.extra || {};

    if (ex.mode) url.searchParams.set("mode", ex.mode);
    if (ex.map) url.searchParams.set("map", ex.map);
    if (ex.newgame === "1") url.searchParams.set("newgame", "1");
    if (ex.verbose === "1") url.searchParams.set("verbose", "1");
    if (ex.nogpu === "1") url.searchParams.set("nogpu", "1");
    if (ex.log === "1") url.searchParams.set("log", "1");
    if (ex.mem === "1") url.searchParams.set("mem", "1");
    if (ex.nocache === "1") url.searchParams.set("nocache", "1");
    if (ex.nopack === "1") url.searchParams.set("nopack", "1");
    if (ex.nohints === "1") url.searchParams.set("nohints", "1");
    if (ex.syncpipelines === "1") url.searchParams.set("syncpipelines", "1");
    if (ex.console === "1") url.searchParams.set("console", "1");
    if (ex.trace === "1") url.searchParams.set("trace", "1");
    if (ex.record === "1") url.searchParams.set("record", "1");
    if (ex.shotrt === "1") url.searchParams.set("shotrt", "1");
    if (ex.slots && +ex.slots > 0) url.searchParams.set("slots", ex.slots);
    if (ex.shot && +ex.shot > 0) url.searchParams.set("shot", ex.shot);
    if (ex.limits) url.searchParams.set("limits", ex.limits);
    if (ex.keep) url.searchParams.set("keep", ex.keep);

    return url.toString();
  }

  function normalizeStoredPrefs(raw) {
    if (!raw) return null;

    const prefs = { ...raw };

    if (prefs.args && !prefs.engine) {
      prefs.engine = parseArgsString(prefs.args);
    }

    prefs.engine = prefs.engine || {};
    prefs.extra = prefs.extra || {};
    return prefs;
  }

  function urlLaunchSignature(href) {
    const u = new URL(href);
    const keys = [...u.searchParams.keys()].sort();

    return (
      u.origin +
      u.pathname +
      "?" +
      keys.map(k => `${k}=${u.searchParams.get(k)}`).join("&")
    );
  }

  async function autoApplyStoredLaunch() {
    const data = await chrome.storage.local.get([
      "playgta5Launch",
      "playgta5LaunchAutoApply"
    ]);

    if (data.playgta5LaunchAutoApply === false) return;

    const prefs = normalizeStoredPrefs(data.playgta5Launch);
    if (!prefs) return;

    const target = applyPrefsToUrl(prefs);

    if (urlLaunchSignature(target) === urlLaunchSignature(location.href)) {
      return;
    }

    location.replace(target);
  }

  async function saveLaunchAndReload(prefs, autoApply) {
    await chrome.storage.local.set({
      playgta5Launch: prefs,
      playgta5LaunchAutoApply: autoApply !== false
    });
    location.href = applyPrefsToUrl(prefs);
  }

  function fillEngineForm(shadow, engine) {
    for (const def of ENGINE_ARGS) {
      const el = shadow.querySelector(`[data-engine="${def.key}"]`);
      if (el) el.value = engine[def.key] ?? "";
    }
  }

  function fillExtraForm($, extra) {
    for (const def of EXTRA_URL) {
      const el = $(`extra-${def.id}`);
      if (!el) continue;
      const fallback = def.type === "select" && def.options[0][0] === ""
        ? ""
        : (def.type === "select" ? "0" : "");
      el.value = extra[def.id] ?? fallback;
    }
  }

  function fillFormFromPrefs($, shadow, prefs) {
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

    const engine = prefs.engine || parseArgsString(prefs.args || "");
    fillEngineForm(shadow, engine);
    fillExtraForm($, prefs.extra || {});
  }

  function applyPresetToForm($, shadow, presetId) {
    if (presetId === "custom" || !PRESETS[presetId]) return;
    fillFormFromPrefs($, shadow, { ...PRESETS[presetId], preset: presetId });
  }

  function closePanel(host) {
    host.remove();
  }

  function renderEngineArgFields() {
    return ENGINE_ARGS.map(def => {
      const opts = def.options.map(([v, l]) =>
        `<option value="${v}">${l}</option>`
      ).join("");
      return `<label><code>-${def.label}</code><select data-engine="${def.key}">${opts}</select></label>`;
    }).join("");
  }

  function renderExtraFields() {
    return EXTRA_URL.map(def => {
      if (def.type === "select") {
        const opts = def.options.map(([v, l]) =>
          `<option value="${v}">${l}</option>`
        ).join("");
        return `<label>${def.label}<select id="extra-${def.id}">${opts}</select></label>`;
      }
      const attrs = [
        `id="extra-${def.id}"`,
        def.type === "number" ? `type="number"` : `type="text"`,
        def.min != null ? `min="${def.min}"` : "",
        def.max != null ? `max="${def.max}"` : "",
        def.placeholder ? `placeholder="${def.placeholder}"` : ""
      ].filter(Boolean).join(" ");
      return `<label>${def.label}<input ${attrs}></label>`;
    }).join("");
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
      ...Object.entries(PRESETS).map(([id, p]) =>
        `<option value="${id}">${p.label}</option>`
      )
    ].join("");

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
        label{display:block;margin:8px 0;color:#e5e7eb;font-size:12px}
        select,input,button{
          width:100%;margin-top:4px;padding:9px;border-radius:7px;
          border:1px solid #4b5563;background:#0f172a;color:#fff;
        }
        button{border:0;font-weight:600;cursor:pointer;margin-top:10px}
        .primary{background:#2563eb}
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
            Matches
            <a href="https://github.com/shadany7824/playgta5/blob/main/homepage.html" style="color:#93c5fd">playgta5 homepage.html</a>.
            Reload the tab to apply. With <code>?low=1</code>, the port still
            injects its built-in LOW_ARGS; use <code>?args</code> to override when
            <code>low=0</code> or for extra flags.
          </p>

          <h3>Profile preset</h3>
          <label>Preset
            <select id="preset">${presetOptions}</select>
          </label>

          <h3>Launch URL</h3>
          <label>Low-memory profile (<code>?low</code>)
            <select id="low">
              <option value="auto">Auto (≤4 GB RAM)</option>
              <option value="1">Force on (LOW_ARGS)</option>
              <option value="0">Force off</option>
            </select>
          </label>
          <label>Shadows in low profile (<code>?shadows=1</code>)
            <select id="urlShadows">
              <option value="0">Off in low mode</option>
              <option value="1">Lowest shadows</option>
            </select>
          </label>
          <label>FPS cap (<code>?fps</code>)
            <select id="fps">
              <option value="30">30</option>
              <option value="60">60</option>
              <option value="0">Uncapped</option>
            </select>
          </label>
          <label>Resolution (<code>?res</code>)
            <select id="resPreset">
              <option value="">Window / scale</option>
              <option value="960x540">960×540</option>
              <option value="1280x720">1280×720</option>
              <option value="1920x1080">1920×1080</option>
              <option value="2560x1440">2560×1440</option>
            </select>
          </label>
          <label>Custom resolution
            <input id="resCustom" placeholder="1920x1080">
          </label>
          <label>Render scale (<code>?scale</code>)
            <input id="scale" type="number" min="0.25" max="2" step="0.05" value="1">
          </label>
          <label>CPU cores (<code>?cores</code>)
            <input id="cores" type="number" min="0" max="32" placeholder="auto">
          </label>
          <label>Fixed size (<code>?fixed=1</code>)
            <select id="fixed">
              <option value="0">Follow window</option>
              <option value="1">Fixed at launch</option>
            </select>
          </label>

          <h3>Engine args (<code>?args=</code>)</h3>
          ${renderEngineArgFields()}

          <h3>Other URL flags</h3>
          ${renderExtraFields()}

          <label style="display:flex;align-items:flex-start;gap:8px;margin-top:12px">
            <input type="checkbox" id="autoApply" style="width:auto;margin-top:3px">
            <span>Remember and apply these launch options whenever I open playgta5.com (saved in extension storage).</span>
          </label>
          <button type="button" class="primary" id="saveLaunch">
            Apply &amp; reload
          </button>
          <div class="status" id="status"></div>
        </div>
      </div>
    `;

    document.documentElement.appendChild(host);

    const $ = id => shadow.getElementById(id);

    fillFormFromPrefs($, shadow, launch);

    $("autoApply").checked = autoStored.playgta5LaunchAutoApply !== false;

    $("preset").onchange = () => {
      const id = $("preset").value;
      if (id !== "custom") applyPresetToForm($, shadow, id);
    };

    $("close").onclick = () => closePanel(host);
    $("backdrop").onclick = () => closePanel(host);

    $("saveLaunch").onclick = async () => {
      try {
        const prefs = collectPrefsFromForm($, shadow);
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
    })().catch(error =>
      sendResponse({ success: false, error: error.message })
    );

    return true;
  });
})();