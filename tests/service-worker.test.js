const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function worker() {
  const handlers = {};
  const shown = [];
  const opened = [];
  const self = {
    registration: {
      scope: "https://example.com/SargesSugars/",
      showNotification: async (...args) => shown.push(args)
    },
    addEventListener: (name, handler) => { handlers[name] = handler; }
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "../service-worker.js"), "utf8"),
    { self, clients: { openWindow: async (url) => opened.push(url) }, URL, console }
  );
  return { handlers, shown, opened };
}

test("push displays a private reminder for the correct meal", async () => {
  const { handlers, shown } = worker();
  let task;
  handlers.push({
    data: { json: () => ({ mealId: 42 }) },
    waitUntil: (promise) => { task = promise; }
  });
  await task;
  assert.equal(shown[0][0], "Sarge's Sugars");
  assert.equal(shown[0][1].body, "It's time to enter your 2-hour glucose reading.");
  assert.equal(shown[0][1].tag, "meal-reminder-42");
  assert.equal(shown[0][1].data.mealId, 42);
});

test("click opens the meal within the app scope", async () => {
  const { handlers, opened } = worker();
  let closed = false;
  let task;
  handlers.notificationclick({
    notification: { data: { mealId: 42 }, close: () => { closed = true; } },
    waitUntil: (promise) => { task = promise; }
  });
  await task;
  assert.equal(closed, true);
  assert.equal(opened[0], "https://example.com/SargesSugars/dashboard.html?reading=42");
});
