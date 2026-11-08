const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function settings({ permission = "granted", upsertError = null } = {}) {
  const handlers = {};
  const status = { textContent: "", style: {} };
  const elements = {
    darkModeToggle: null,
    reminderStatus: status,
    enableReminders: { addEventListener: (event, fn) => { handlers.enable = fn; } },
    disableReminders: { addEventListener: (event, fn) => { handlers.disable = fn; } }
  };
  const calls = [];
  const subscription = {
    endpoint: "https://web.push.apple.com/example",
    toJSON: () => ({ keys: { p256dh: "key", auth: "auth" } })
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
    from: (table) => table === "push_config"
      ? { select: () => ({ eq: () => ({ single: async () => ({ data: { public_key: "AQ" }, error: null }) }) }) }
      : { upsert: async (value) => { calls.push(value); return { error: upsertError }; } }
  };
  const registration = { pushManager: {
    getSubscription: async () => null,
    subscribe: async () => subscription
  } };
  const context = {
    document: {
      getElementById: (id) => elements[id],
      documentElement: { setAttribute: () => {} },
      body: { style: {} }
    },
    localStorage: { getItem: () => null },
    supabase: { createClient: () => client },
    navigator: { serviceWorker: { register: async () => registration } },
    window: { PushManager: {}, Notification: {} },
    Notification: { requestPermission: async () => permission },
    atob: (value) => Buffer.from(value, "base64").toString("binary"),
    Uint8Array, console
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../settings.js"), "utf8"), context);
  return { handlers, status, calls };
}

test("enabling registers the device with the signed-in account", async () => {
  const { handlers, status, calls } = settings();
  await handlers.enable();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].user_id, "user-1");
  assert.equal(calls[0].endpoint, "https://web.push.apple.com/example");
  assert.match(status.textContent, /enabled/);
});

test("denied permission does not register a device", async () => {
  const { handlers, status, calls } = settings({ permission: "denied" });
  await handlers.enable();
  assert.equal(calls.length, 0);
  assert.match(status.textContent, /not granted/);
});
