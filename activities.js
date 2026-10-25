const ACTIVITY_KEY = "sargesSugarsActivities";

function readJson(key, fallback = []) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveActivities(items) {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(items));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderActivities() {
  const list = document.getElementById("activityList");
  if (!list) return;

  const activities = readJson(ACTIVITY_KEY, []);

  if (!activities.length) {
    list.innerHTML = '<div class="empty-state">No activities logged yet.</div>';
    return;
  }

  list.innerHTML = activities
    .slice()
    .reverse()
    .map(
      (activity, index) => `
        <article class="meal-card">
          <h3>${escapeHtml(activity.type || "Activity")}</h3>
          <p><strong>Duration:</strong> ${Number(activity.minutes || 0)} minutes</p>
          <p><strong>Calories:</strong> ${Number(activity.calories || 0) || "—"}</p>
          <p class="meal-notes">${escapeHtml(activity.notes || "No notes.")}</p>
          <button class="delete-btn" type="button" onclick="deleteActivity(${index})">Delete</button>
        </article>
      `
    )
    .join("");
}

function deleteActivity(index) {
  const activities = readJson(ACTIVITY_KEY, []);
  activities.splice(index, 1);
  saveActivities(activities);
  renderActivities();
}

document.getElementById("activityForm")?.addEventListener("submit", (event) => {
  event.preventDefault();

  const type = document.getElementById("activityType")?.value?.trim();
  const minutes = Number(document.getElementById("activityMinutes")?.value || 0);
  const calories = Number(document.getElementById("activityCalories")?.value || 0);
  const notes = document.getElementById("activityNotes")?.value?.trim() || "";

  if (!type || !minutes) {
    return;
  }

  const activities = readJson(ACTIVITY_KEY, []);
  activities.push({
    type,
    minutes,
    calories,
    notes,
    createdAt: new Date().toISOString(),
  });

  saveActivities(activities);
  renderActivities();
  event.target.reset();
});

renderActivities();
