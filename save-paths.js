
const GTA_SAVE_ROOT = "/userdata/Documents/Rockstar Games/GTA V";
const DEFAULT_PROFILE_DIR = `${GTA_SAVE_ROOT}/Profiles/Default`;

function normalizeSaveBase(name) {
  let base = name.replace(/^.*[/\\]/, "");

  if (/^SGTA|^MISREP/i.test(base) && /\.bak$/i.test(base)) {
    base = base.replace(/\.bak$/i, "");
  }

  if (/^SGTA|^MISREP/i.test(base) && base.endsWith(".")) {
    base = base.slice(0, -1);
  }

  return base;
}

function normalizeUserdataFilePath(path) {
  const p = String(path).replace(/\\/g, "/");
  const slash = p.lastIndexOf("/");
  if (slash < 0) return normalizeSaveBase(p);
  return p.slice(0, slash + 1) + normalizeSaveBase(p.slice(slash + 1));
}

function profileDirFromRecords(records) {
  for (const record of records || []) {
    const match = String(record.path).match(/\/Profiles\/([^/]+)\//);
    if (match) return `${GTA_SAVE_ROOT}/Profiles/${match[1]}`;
  }

  return DEFAULT_PROFILE_DIR;
}

function savePathForFile(name, profileDir) {
  const base = normalizeSaveBase(name);
  const dir = profileDir || DEFAULT_PROFILE_DIR;

  if (/^settings\.xml$/i.test(base)) {
    return `${GTA_SAVE_ROOT}/${base}`;
  }

  return `${dir}/${base}`;
}

function localPathForInject(cloudPath, profileDir) {
  const dir = profileDir || DEFAULT_PROFILE_DIR;
  const base = cloudPath.slice(cloudPath.lastIndexOf("/") + 1);
  const normalized = normalizeSaveBase(base);

  if (/^settings\.xml$/i.test(normalized)) {
    return `${GTA_SAVE_ROOT}/${normalized}`;
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

function pathForInject(cloudPath, profileDir) {
  const direct = normalizeUserdataFilePath(cloudPath);
  if (validUserdataPath(direct)) return direct;

  const mapped = localPathForInject(cloudPath, profileDir);
  return validUserdataPath(mapped) ? mapped : null;
}