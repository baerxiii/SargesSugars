const ACTIVITY_KEY = "sargesSugarsActivities";

function getActivities() {
  const data = localStorage.getItem(ACTIVITY_KEY);
  return data ? JSON.parse(data) : [];
}

function saveActivities(items) {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(items));
}

function renderActivities() {
  const list = document.getElementById("activityList");
  if (!list) return;

  const activities = getActivities();

  if (!activities.length) {
    list.innerHTML = '<div class="empty-state">No activities logged yet.</div>';
    return;
  }

  list.innerHTML = activities
    .slice()
    .reverse()
    .map(
      (activity, index) => `
        <div class="meal-card">
          <h3>${activity.type}</h3>
          <p><strong>Duration:</strong> ${activity.minutes} minutes</p>
          <p><strong>Calories:</strong> ${activity.calories || "—"}</p>
          <p class="meal-notes">${activity.notes || "No notes."}</p>
          <button class="delete-btn" onclick="deleteActivity(${index})">Delete</button>
        </div>
      `
    )
    .join("");
}

function deleteActivity(index) {
  const activities = getActivities();
  activities.splice(index, 1);
  saveActivities(activities);
  renderActivities();
}

document.getElementById("activityForm")?.addEventListener("submit", (event) => {
  event.preventDefault();

  const type = document.getElementById("activityType").value.trim();
  const minutes = Number(document.getElementById("activityMinutes").value);
  const calories = Number(document.getElementById("activityCalories").value || 0);
  const notes = document.getElementById("activityNotes").value.trim();

  if (!type || !minutes) return;

  const activities = getActivities();
  activities.push({ type, minutes, calories, notes, createdAt: new Date().toISOString() });
  saveActivities(activities);
  renderActivities();

  event.target.reset();
});

renderActivities();
