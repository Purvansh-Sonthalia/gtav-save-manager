
const GTA_SAVE_ROOT = "/userdata/Documents/Rockstar Games/GTA V";
const DEFAULT_PROFILE_DIR = `${GTA_SAVE_ROOT}/Profiles/Default`;

function normalizeSaveBase(name) {
  const base = name.replace(/^.*[/\\]/, "");

  if (/^SGTA/i.test(base) && !base.endsWith(".")) return base + ".";
  if (/^MISREP/i.test(base) && !base.endsWith(".")) return base + ".";

  return base;
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