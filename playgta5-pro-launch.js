/* playgta5.pro launcher helpers (graphics_settings + launch_url). */
(() => {
  if (window.GTAGraphicsSettings && window.GTALaunchUrl) return;

  const choices = {
    texturequality: ["auto", "0", "1", "2"],
    reflectionquality: ["auto", "0", "1", "2", "3"],
    waterquality: ["auto", "0", "1"],
    particlequality: ["auto", "0", "1", "2"],
    grassquality: ["auto", "0", "1", "2", "3"],
    anisotropic: ["auto", "0", "2", "4", "8", "16"],
    lodscale: ["auto", "0", "0.25", "0.5", "0.75", "1"],
    pedlod: ["auto", "0", "0.25", "0.5", "0.75", "1"],
    vehiclelod: ["auto", "0", "0.25", "0.5", "0.75", "1"],
    density: ["auto", "0", "0.25", "0.5", "0.75", "1"],
    pedvariety: ["auto", "0", "0.25", "0.5", "0.75", "1"],
    vehiclevariety: ["auto", "0", "0.25", "0.5", "0.75", "1"],
    postfx: ["auto", "0", "1", "2", "3"],
    motionblur: ["auto", "0", "0.25", "0.5", "1"],
    dof: ["auto", "0", "1"],
    shadowquality: ["auto", "0", "1", "2"],
    softshadows: ["auto", "0", "1", "2", "3", "4", "5"],
    ssao: ["auto", "0", "1", "2"],
    drawdistance: [
      "auto", "10", "25", "50", "100", "200", "500", "1000", "2000", "5000"
    ],
    fogvolumes: ["auto", "0", "1"],
    particleshadows: ["auto", "0", "1"],
    longshadows: ["auto", "0", "1"],
    flightstreaming: ["auto", "0", "1"],
    distantlights: ["auto", "0"]
  };

  const flags = {
    texturequality: "textureQuality",
    reflectionquality: "reflectionQuality",
    waterquality: "waterQuality",
    particlequality: "particleQuality",
    grassquality: "grassQuality",
    anisotropic: "anisotropicQualityLevel",
    lodscale: "lodScale",
    pedlod: "pedLodBias",
    vehiclelod: "vehicleLodBias",
    density: "cityDensity",
    pedvariety: "pedVariety",
    vehiclevariety: "vehicleVariety",
    postfx: "postFX",
    motionblur: "MotionBlurStrength",
    dof: "noInGameDOF",
    shadowquality: "shadowQuality",
    softshadows: "shadowSoftness",
    ssao: "SSAO"
  };

  const GFX_KEYS = Object.keys(choices);

  const launchDefaults = {
    fps: "60",
    scale: "1",
    low: "auto",
    res: "native",
    language: "system",
    fxaa: "1",
    shadows: "1",
    mode: "sandbox",
    map: "",
    newgame: "0",
    cores: "auto"
  };

  const FPS_OPTIONS = ["24", "30", "60", "75", "90", "100", "120"];
  const SCALE_OPTIONS = ["0.25", "0.5", "0.75", "1", "1.25", "1.5", "2"];
  const RES_OPTIONS = [
    "native",
    "640x360",
    "960x540",
    "1280x720",
    "1920x1080",
    "2560x1440",
    "3840x2160"
  ];
  const LANGUAGES = [
    "system",
    "american",
    "french",
    "german",
    "italian",
    "spanish",
    "portuguese",
    "polish",
    "russian",
    "korean",
    "chinese",
    "japanese",
    "mexican"
  ];

  function normaliseGfx(raw) {
    const out = {};
    for (const key of GFX_KEYS) {
      out[key] = choices[key].includes(String(raw?.[key]))
        ? String(raw[key])
        : "auto";
    }
    return out;
  }

  function engineArgs(search) {
    const q =
      typeof search === "string"
        ? new URLSearchParams(search.replace(/^\?/, ""))
        : search;
    const settings = normaliseGfx(Object.fromEntries(q));
    const args = Object.keys(flags)
      .filter(key => settings[key] !== "auto")
      .map(key => `-${flags[key]}=${settings[key]}`);
    const extras = {
      drawdistance: "farclip",
      fogvolumes: "fogVolumes",
      particleshadows: "particleShadows",
      longshadows: "shadowLongShadows",
      flightstreaming: "HDStreamingInFlight"
    };
    for (const [key, flag] of Object.entries(extras)) {
      if (settings[key] !== "auto") args.push(`-${flag}=${settings[key]}`);
    }
    if (settings.distantlights === "0") args.push("-nolodlights");
    return args;
  }

  function shadowArg(search) {
    const q =
      typeof search === "string"
        ? new URLSearchParams(search.replace(/^\?/, ""))
        : search;
    const quality = normaliseGfx(Object.fromEntries(q)).shadowquality;
    return `-shadowQuality=${
      q.get("shadows") === "0"
        ? -1
        : quality === "auto"
          ? "0"
          : quality
    }`;
  }

  function preset(name) {
    const reset = {
      ...launchDefaults,
      shadows: "1",
      ...normaliseGfx({})
    };
    if (name === "default") return reset;
    if (name === "low-normal") {
      const value = {
        ...reset,
        low: "0",
        fxaa: "0",
        texturequality: "0",
        reflectionquality: "0",
        waterquality: "0",
        particlequality: "0",
        grassquality: "0",
        anisotropic: "0",
        lodscale: "0",
        density: "0",
        pedvariety: "0",
        vehiclevariety: "0",
        postfx: "0",
        motionblur: "0",
        dof: "0",
        shadowquality: "0",
        softshadows: "0",
        ssao: "0"
      };
      delete value.fps;
      delete value.res;
      return value;
    }
    if (name === "low") {
      const value = {
        ...reset,
        scale: "0.75",
        low: "1",
        shadows: "0",
        fxaa: "0",
        texturequality: "0",
        reflectionquality: "0",
        waterquality: "0",
        particlequality: "0",
        grassquality: "0",
        anisotropic: "0",
        lodscale: "0.25",
        pedlod: "0",
        vehiclelod: "0",
        density: "0.25",
        pedvariety: "0",
        vehiclevariety: "0",
        postfx: "0",
        motionblur: "0",
        dof: "0",
        shadowquality: "0",
        softshadows: "0",
        ssao: "0",
        drawdistance: "200",
        fogvolumes: "0",
        particleshadows: "0",
        longshadows: "0",
        flightstreaming: "0",
        distantlights: "0"
      };
      delete value.fps;
      return value;
    }
    if (name === "max") {
      return {
        ...normaliseGfx({}),
        ...launchDefaults,
        shadows: "1",
        fxaa: "1",
        texturequality: "2",
        reflectionquality: "3",
        waterquality: "1",
        particlequality: "2",
        grassquality: "3",
        anisotropic: "16",
        lodscale: "1",
        pedlod: "1",
        vehiclelod: "1",
        density: "1",
        pedvariety: "1",
        vehiclevariety: "1",
        postfx: "3",
        motionblur: "1",
        dof: "1",
        shadowquality: "2",
        softshadows: "3",
        ssao: "2",
        fogvolumes: "1",
        particleshadows: "1",
        longshadows: "1",
        flightstreaming: "1"
      };
    }
    throw new Error("Unknown graphics preset");
  }

  const cfgDefaults = {
    fps: launchDefaults.fps,
    scale: launchDefaults.scale,
    low: launchDefaults.low,
    language: launchDefaults.language,
    fxaa: launchDefaults.fxaa,
    shadows: launchDefaults.shadows,
    cores: launchDefaults.cores,
    mousegain: "1",
    controller: "auto",
    granular: "0",
    safeuploads: "copy",
    bghistory: "0",
    pipelast: "0",
    cbtemplate: "0",
    cbsegments: "0",
    bcfallback: "auto",
    ...Object.fromEntries(GFX_KEYS.map(k => [k, "auto"]))
  };

  const cfgKeys = [...Object.keys(cfgDefaults), "res"];

  function expand(search) {
    const q = new URLSearchParams(
      typeof search === "string" ? search.replace(/^\?/, "") : search
    );
    const token = q.get("cfg");
    if (!token) return q;
    q.delete("cfg");
    const parts = token.split("_");
    if (parts.shift() !== "1" || parts.length > cfgKeys.length) return q;
    const values = { ...cfgDefaults };
    const seen = new Set();
    for (const part of parts) {
      const m = /^([0-9a-z]+)-([a-zA-Z0-9.]+)$/.exec(part);
      if (!m) return q;
      const i = parseInt(m[1], 36);
      if (i >= cfgKeys.length || seen.has(i) || m[2].length > 32) return q;
      seen.add(i);
      values[cfgKeys[i]] = m[2];
    }
    for (const [key, value] of Object.entries(values)) {
      if (!q.has(key)) q.set(key, value);
    }
    return q;
  }

  function compact(search) {
    const q = expand(
      typeof search === "string" ? search.replace(/^\?/, "") : search
    );
    const parts = ["1"];
    for (let i = 0; i < cfgKeys.length; i++) {
      const key = cfgKeys[i];
      const value = q.get(key);
      if (value === null) continue;
      if (!/^[a-zA-Z0-9.]{1,32}$/.test(value)) continue;
      q.delete(key);
      if (value !== cfgDefaults[key]) parts.push(`${i.toString(36)}-${value}`);
    }
    if (parts.length > 1) q.set("cfg", parts.join("_"));
    return q;
  }

  function engineToGfx(engine) {
    const gfx = normaliseGfx({});
    const inv = Object.fromEntries(
      Object.entries(flags).map(([k, v]) => [v, k])
    );
  const extras = {
      farclip: "drawdistance",
      fogVolumes: "fogvolumes",
      particleShadows: "particleshadows",
      shadowLongShadows: "longshadows",
      HDStreamingInFlight: "flightstreaming"
    };

    for (const [flag, val] of Object.entries(engine || {})) {
      if (inv[flag] && choices[inv[flag]]?.includes(val)) {
        gfx[inv[flag]] = val;
      } else if (flag === "cityDensity" && inv.density) {
        if (choices.density.includes(val)) gfx.density = val;
      } else if (extras[flag] && choices[extras[flag]]?.includes(val)) {
        gfx[extras[flag]] = val;
      }
    }

    return gfx;
  }

  function parseArgsString(str) {
    const engine = {};
    if (!str) return engine;
    for (const part of str.split(",")) {
      const m = /^-([^=]+)=(.*)$/.exec(part.trim());
      if (m) engine[m[1]] = m[2];
    }
    return engine;
  }

  function prefsFromStorage(raw) {
    const prefs = {
      ...launchDefaults,
      mode: "sandbox",
      map: "",
      newgame: "0",
      cores: "auto",
      ...Object.fromEntries(GFX_KEYS.map(k => [k, "auto"]))
    };
    if (!raw) return prefs;

    Object.assign(prefs, raw);
    if (raw.engine) Object.assign(prefs, engineToGfx(raw.engine));
    else if (raw.args) Object.assign(prefs, engineToGfx(parseArgsString(raw.args)));

    if (raw.extra) {
      if (raw.extra.mode) prefs.mode = raw.extra.mode;
      if (raw.extra.map) prefs.map = raw.extra.map;
      if (raw.extra.newgame === "1") prefs.newgame = "1";
    }

    if (raw.low === "1" || raw.low === "0" || raw.low === "auto") {
      prefs.low = raw.low;
    }
    if (FPS_OPTIONS.includes(String(raw.fps))) prefs.fps = String(raw.fps);
    if (SCALE_OPTIONS.includes(String(raw.scale))) prefs.scale = String(raw.scale);
    if (raw.res != null && raw.res !== "") prefs.res = String(raw.res);
    if (raw.shadows === "0" || raw.shadows === "1") {
      prefs.shadows = raw.shadows;
    }
    if (raw.cores) prefs.cores = String(raw.cores);

    return { ...prefs, ...normaliseGfx(prefs) };
  }

  function buildCdnUrl(prefs, pageUrl = "https://cdn.playgta5.pro/") {
    const q = new URLSearchParams();

    q.set("mode", prefs.mode === "story" ? "story" : "sandbox");
    if (prefs.map) q.set("map", prefs.map);
    if (prefs.newgame === "1" && prefs.mode === "story") q.set("newgame", "1");

    q.set(
      "fps",
      FPS_OPTIONS.includes(String(prefs.fps)) ? String(prefs.fps) : "60"
    );
    q.set(
      "scale",
      SCALE_OPTIONS.includes(String(prefs.scale)) ? String(prefs.scale) : "1"
    );
    if (prefs.low === "0" || prefs.low === "1") q.set("low", prefs.low);
    if (prefs.res && prefs.res !== "native") q.set("res", prefs.res);

    if (
      prefs.language &&
      prefs.language !== "system" &&
      LANGUAGES.includes(prefs.language)
    ) {
      q.set("language", prefs.language);
    }
    q.set("fxaa", prefs.fxaa === "0" ? "0" : "1");
    q.set("shadows", prefs.shadows === "0" ? "0" : "1");
    if (prefs.cores && prefs.cores !== "auto") q.set("cores", prefs.cores);

    for (const key of GFX_KEYS) {
      const v = prefs[key];
      if (v && v !== "auto") q.set(key, v);
    }

    const page = new URL(pageUrl);
    const out = compact(q);
    out.set("mode", prefs.mode === "story" ? "story" : "sandbox");
    page.search = out.toString();
    return page.toString();
  }

  window.GTAGraphicsSettings = {
    choices,
    flags,
    GFX_KEYS,
    normalise: normaliseGfx,
    engineArgs,
    shadowArg,
    preset,
    engineToGfx
  };

  window.GTALaunchUrl = {
    expand,
    compact,
    defaults: launchDefaults,
    FPS_OPTIONS,
    SCALE_OPTIONS,
    RES_OPTIONS,
    LANGUAGES,
    prefsFromStorage,
    buildCdnUrl
  };
})();