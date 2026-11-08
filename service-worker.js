self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    console.error("Invalid reminder payload", error);
  }
  event.waitUntil(self.registration.showNotification("Sarge's Sugars", {
    body: "It's time to enter your 2-hour glucose reading.",
    tag: `meal-reminder-${payload.mealId || "pending"}`,
    data: { mealId: payload.mealId }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL("dashboard.html", self.registration.scope);
  if (event.notification.data.mealId != null) {
    url.searchParams.set("reading", event.notification.data.mealId);
  }
  event.waitUntil(clients.openWindow(url.href));
});
