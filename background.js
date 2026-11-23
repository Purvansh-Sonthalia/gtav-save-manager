
const SUPABASE_URL = "https://skoazyiuivhfaryemjqa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrb2F6eWl1aXZoZmFyeWVtanFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODgwMTAsImV4cCI6MjA5MDA2NDAxMH0.-p67smdJiiSWQ84KIZ5_aLCcu16_YQP3wycoQ8mHnH4";

const BUCKET = "game-saves";
const SITE = "playgta5";

async function getSession() {
  const result = await chrome.storage.local.get("session");
  let session = result.session;

  if (!session) throw new Error("Please log in.");

  if (session.expires_at * 1000 < Date.now() + 60000) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          refresh_token: session.refresh_token
        })
      }
    );

    if (!res.ok) {
      await chrome.storage.local.remove("session");
      throw new Error("Session expired. Please log in again.");
    }

    session = await res.json();

    session.expires_at =
      session.expires_at ||
      Math.floor(Date.now() / 1000) + session.expires_in;

    await chrome.storage.local.set({ session });
  }

  return session;
}

async function api(path, options = {}) {
  const session = await getSession();

  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res;
}

async function hashPath(path) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(path)
  );

  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getObjectKey(path) {
  const session = await getSession();
  const hash = await hashPath(path);

  return `${session.user.id}/${SITE}/${hash}`;
}

async function login(email, password) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    }
  );

  const data = await res.json();

  if (!res.ok) throw new Error(data.msg || data.message || "Login failed");

  data.expires_at =
    data.expires_at ||
    Math.floor(Date.now() / 1000) + data.expires_in;

  await chrome.storage.local.set({ session: data });

  return data.user;
}

async function signup(email, password) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/signup`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    }
  );

  const data = await res.json();

  if (!res.ok) throw new Error(data.msg || data.message || "Signup failed");

  if (data.session) {
    data.session.expires_at =
      data.session.expires_at ||
      Math.floor(Date.now() / 1000) + data.session.expires_in;

    await chrome.storage.local.set({ session: data.session });
  }

  return data;
}

async function uploadSave({ path, data, mtime }) {
  if (!path.startsWith("/") || path.includes("..")) {
    throw new Error("Invalid save path");
  }

  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  const key = await getObjectKey(path);

  const digest = await crypto.subtle.digest("SHA-256", bytes);

  const checksum = [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  // Upload binary file
  await api(
    `/storage/v1/object/${BUCKET}/${key}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-upsert": "true"
      },
      body: bytes
    }
  );

  // Update metadata
  const session = await getSession();

  const metadata = await api(
    "/rest/v1/game_saves?on_conflict=user_id,site_id,file_path",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({
        user_id: session.user.id,
        site_id: SITE,
        file_path: path,
        object_key: key,
        file_size: bytes.length,
        checksum,
        updated_at: new Date().toISOString(),
        game_mtime: mtime
      })
    }
  );

  return { success: true, path, size: bytes.length };
}

async function listSaves() {
  const session = await getSession();

  const query = new URLSearchParams({
    select: "file_path,file_size,checksum,updated_at,game_mtime",
    user_id: `eq.${session.user.id}`,
    site_id: `eq.${SITE}`,
    order: "updated_at.desc"
  });

  const res = await api(`/rest/v1/game_saves?${query}`);

  return res.json();
}

async function downloadSave(path) {
  const key = await getObjectKey(path);

  const res = await api(
    `/storage/v1/object/authenticated/${BUCKET}/${key}`
  );

  const bytes = new Uint8Array(await res.arrayBuffer());

  let binary = "";

  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + 8192)
    );
  }

  return {
    path,
    data: btoa(binary)
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const run = async () => {
    switch (message.type) {
      case "LOGIN":
        return login(message.email, message.password);

      case "SIGNUP":
        return signup(message.email, message.password);

      case "LOGOUT":
        await chrome.storage.local.remove("session");
        return { success: true };

      case "SESSION":
        try {
          const session = await getSession();
          return { loggedIn: true, email: session.user.email };
        } catch {
          return { loggedIn: false };
        }

      case "UPLOAD":
        return uploadSave(message.record);

      case "LIST":
        return listSaves();

      case "DOWNLOAD":
        return downloadSave(message.path);

      default:
        throw new Error("Unknown request");
    }
  };

  run()
    .then(result => sendResponse({ success: true, result }))
    .catch(error => sendResponse({
      success: false,
      error: error.message
    }));

  return true;
});
