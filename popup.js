
const $ = id => document.getElementById(id);

const RELOAD_EXTENSION_MSG =
  "Extension was updated — reload the popup and game tab, then try again.";

function isExtensionInvalidated(err) {
  return /context invalidated/i.test(String(err?.message || err));
}

function message(text) {
  $("message").textContent = text;
}

function showAccount(email) {
  $("loginView").classList.add("hidden");
  $("accountView").classList.remove("hidden");
  $("accountEmail").textContent = email;
  message("Your cloud account is connected.");
}

function toBase64(bytes) {
  let binary = "";

  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }

  return btoa(binary);
}

async function call(type, extra = {}) {
  if (!chrome.runtime?.id) {
    throw new Error(RELOAD_EXTENSION_MSG);
  }

  let result;
  try {
    result = await chrome.runtime.sendMessage({ type, ...extra });
  } catch (err) {
    if (isExtensionInvalidated(err)) throw new Error(RELOAD_EXTENSION_MSG);
    throw err;
  }

  if (!result?.success) {
    throw new Error(result?.error || "Request failed.");
  }

  return result.result;
}

const GAME_TAB_URLS = [
  "https://cdn.playgta5.pro/*",
  "https://playgta5.pro/*",
  "https://www.playgta5.pro/*",
  "https://playgta5.com/*",
  "https://www.playgta5.com/*"
];

async function gameTabIsPro() {
  const [tab] = await chrome.tabs.query({ url: GAME_TAB_URLS });
  if (!tab?.url) return true;
  try {
    return /(?:^|\.)playgta5\.pro$/i.test(new URL(tab.url).hostname);
  } catch {
    return true;
  }
}

async function pageAction(type) {
  const [tab] = await chrome.tabs.query({ url: GAME_TAB_URLS });

  if (!tab?.id) {
    throw new Error(
      "Open cdn.playgta5.pro (or playgta5.com) in a tab first."
    );
  }

  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type });

    if (!result?.success) {
      throw new Error(result?.error || "Sync failed on the game tab.");
    }

    return result.result;
  } catch (e) {
    if (isExtensionInvalidated(e)) throw new Error(RELOAD_EXTENSION_MSG);
    if (e.message?.includes("Receiving end does not exist")) {
      throw new Error("Reload the game tab, then try again.");
    }
    throw e;
  }
}

$("login").onclick = async () => {
  try {
    message("Logging in...");

    const user = await call("LOGIN", {
      email: $("email").value.trim(),
      password: $("password").value
    });

    showAccount(user.email);
  } catch (e) {
    message(e.message);
  }
};

$("signup").onclick = async () => {
  try {
    message("Creating account...");

    const result = await call("SIGNUP", {
      email: $("email").value.trim(),
      password: $("password").value
    });

    if (result.session) {
      showAccount(result.user.email);
    } else {
      message("Check your email to confirm registration.");
    }
  } catch (e) {
    message(e.message);
  }
};

$("sync").onclick = async () => {
  try {
    message("Syncing saves from the game tab...");
    await pageAction("SYNC_NOW");
    message("Sync finished. See the game tab panel for details.");
  } catch (e) {
    message(e.message);
  }
};

$("restore").onclick = async () => {
  try {
    message("Opening inject on the game tab...");
    await pageAction("RESTORE");
    message("Inject finished. See the game tab panel for details.");
  } catch (e) {
    message(e.message);
  }
};

$("graphics").onclick = async () => {
  try {
    message("Opening graphics settings on the game tab...");
    await pageAction("OPEN_SETTINGS");
    message("Edit settings in the game tab.");
  } catch (e) {
    message(e.message);
  }
};

$("launchCdn").onclick = async () => {
  try {
    const { playgta5Launch } = await chrome.storage.local.get("playgta5Launch");
    const url = window.GTALaunchUrl.buildCdnUrl(
      window.GTALaunchUrl.prefsFromStorage(playgta5Launch)
    );
    await chrome.tabs.create({ url });
    message(
      playgta5Launch
        ? "Opened cdn.playgta5.pro with saved launch settings."
        : "Opened cdn.playgta5.pro (default settings)."
    );
  } catch (e) {
    message(e.message);
  }
};

$("manual").onclick = () => $("manualFile").click();

$("manualFile").onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const isPro = await gameTabIsPro();
    let profileDir = defaultSaveDir(isPro);

    try {
      profileDir = (await pageAction("GET_PROFILE_DIR")) || profileDir;
    } catch (_) {}

    const path = savePathForFile(file.name, profileDir, isPro);

    message("Uploading " + path + "...");

    const bytes = new Uint8Array(await file.arrayBuffer());

    await call("UPLOAD", {
      record: {
        path,
        data: toBase64(bytes),
        mtime: Date.now()
      }
    });

    message("Upload successful: " + path);
    event.target.value = "";
  } catch (e) {
    message(e.message);
  }
};

$("logout").onclick = async () => {
  try {
    await call("LOGOUT");

    $("accountView").classList.add("hidden");
    $("loginView").classList.remove("hidden");

    message("Logged out.");
  } catch (e) {
    message(e.message);
  }
};

(async () => {
  try {
    const session = await call("SESSION");

    if (session.loggedIn) {
      showAccount(session.email);
    } else {
      message("Log in to connect your cloud saves.");
    }
  } catch (e) {
    message(e.message);
  }
})();
