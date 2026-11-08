const darkModeToggle = document.getElementById("darkModeToggle");
const client = supabase.createClient(
  "https://cujvvxyadxvlfvhgzlki.supabase.co",
  "sb_publishable_wogqNQurYqmvOx9FvoFxMQ_XyRMTxZ_"
);
const reminderStatus = document.getElementById("reminderStatus");
const enableReminders = document.getElementById("enableReminders");
const disableReminders = document.getElementById("disableReminders");

function applyTheme() {
  const darkMode = localStorage.getItem("sargesSugarsDarkMode") === "true";
  document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  document.body.style.background = darkMode ? "#0f172a" : "#f4f7fb";
  document.body.style.color = darkMode ? "#f3f4f6" : "#111827";

  if (darkModeToggle) {
    darkModeToggle.checked = darkMode;
  }
}

if (darkModeToggle) {
  darkModeToggle.addEventListener("change", () => {
    localStorage.setItem("sargesSugarsDarkMode", darkModeToggle.checked ? "true" : "false");
    applyTheme();
  });
}

applyTheme();

function decodeKey(key) {
  const padded = (key + "=".repeat((4 - key.length % 4) % 4))
    .replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function showReminderStatus(message, error = false) {
  reminderStatus.textContent = message;
  reminderStatus.style.color = error ? "#dc2626" : "";
}

async function currentUser() {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Please sign in before changing reminders.");
  return data.user;
}

enableReminders.addEventListener("click", async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    showReminderStatus("Push notifications are unavailable. On iPhone, use iOS 16.4 or later and open the site from your Home Screen.", true);
    return;
  }
  try {
    // Permission must be requested directly from the button gesture on iOS.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notification permission was not granted. Check your device settings.");
    const user = await currentUser();
    const { data: config, error: configError } = await client.from("push_config").select("public_key").eq("id", true).single();
    if (configError) throw configError;
    const registration = await navigator.serviceWorker.register("service-worker.js");
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeKey(config.public_key)
    });
    const keys = subscription.toJSON().keys;
    const { error } = await client.from("push_subscriptions").upsert({
      endpoint: subscription.endpoint,
      user_id: user.id,
      p256dh: keys.p256dh,
      auth: keys.auth
    }, { onConflict: "endpoint" });
    if (error) throw error;
    showReminderStatus("Reminders are enabled on this device for meals saved from now on.");
  } catch (error) {
    console.error("Could not enable reminders:", error);
    showReminderStatus(`Could not enable reminders: ${error.message}`, true);
  }
});

disableReminders.addEventListener("click", async () => {
  try {
    await currentUser();
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      const { data, error } = await client.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint).select("endpoint");
      if (error) throw error;
      if (!data.length) throw new Error("This device is not registered to the signed-in account. Sign in to the account that enabled reminders.");
      if (!await subscription.unsubscribe()) throw new Error("The browser could not unsubscribe this device.");
    }
    showReminderStatus("Reminders are disabled on this device.");
  } catch (error) {
    console.error("Could not disable reminders:", error);
    showReminderStatus(`Could not disable reminders: ${error.message}`, true);
  }
});
