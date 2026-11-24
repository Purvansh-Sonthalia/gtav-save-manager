
const GTA_SAVE_ROOT = "/userdata/Documents/Rockstar Games/GTA V";
const PRO_SAVE_DIR = GTA_SAVE_ROOT;
const DEFAULT_PROFILE_DIR = `${GTA_SAVE_ROOT}/Profiles/Default`;

function defaultSaveDir(isPro) {
  return isPro ? PRO_SAVE_DIR : DEFAULT_PROFILE_DIR;
}

function normalizeSaveBase(name) {
  return String(name).replace(/^.*[/\\]/, "");
}

function normalizeUserdataFilePath(path) {
  const p = String(path).replace(/\\/g, "/");
  const slash = p.lastIndexOf("/");
  if (slash < 0) return normalizeSaveBase(p);
  return p.slice(0, slash + 1) + normalizeSaveBase(p.slice(slash + 1));
}

function profileDirFromRecords(records, isPro) {
  if (isPro) {
    for (const record of records || []) {
      const p = String(record.path);
      if (!p.startsWith("/userdata/") || p.includes("/Profiles/")) continue;
      const slash = p.lastIndexOf("/");
      if (slash > 0) return p.slice(0, slash);
    }
    return PRO_SAVE_DIR;
  }

  for (const record of records || []) {
    const match = String(record.path).match(/\/Profiles\/([^/]+)\//);
    if (match) return `${GTA_SAVE_ROOT}/Profiles/${match[1]}`;
  }

  return DEFAULT_PROFILE_DIR;
}

function savePathForFile(name, profileDir, isPro) {
  const base = normalizeSaveBase(name);
  const dir = profileDir || defaultSaveDir(isPro);

  if (/^settings\.xml$/i.test(base)) {
    return `${GTA_SAVE_ROOT}/settings.xml`;
  }

  return `${dir}/${base}`;
}

function localPathForInject(cloudPath, profileDir, isPro) {
  const dir = profileDir || defaultSaveDir(isPro);
  const base = cloudPath.slice(cloudPath.lastIndexOf("/") + 1);
  const normalized = normalizeSaveBase(base);

  if (/^settings\.xml$/i.test(normalized)) {
    return `${GTA_SAVE_ROOT}/settings.xml`;
  }

  return `${dir}/${normalized}`;
}

function validUserdataPath(value) {
  if (typeof value !== "string") return false;

  const p = value.replace(/\\/g, "/");
  if (!p.startsWith("/userdata/") || p.length > 1024 || !p.slice(10)) {
    return false;
  }

  return !p.split("/").slice(2).some(s =>
    !s ||
    s === "." ||
    s === ".." ||
    /[<>:"|?*\x00-\x1f]/.test(s) ||
    /[. ]$/.test(s) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s)
  );
}

function pathForInject(cloudPath, profileDir, isPro) {
  let direct = normalizeUserdataFilePath(cloudPath);
  if (isPro && direct.includes("/Profiles/")) {
    const mapped = localPathForInject(cloudPath, profileDir, true);
    if (validUserdataPath(mapped)) direct = mapped;
  }
  if (validUserdataPath(direct)) return direct;

  const mapped = localPathForInject(cloudPath, profileDir, isPro);
  return validUserdataPath(mapped) ? mapped : null;
}