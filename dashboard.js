const client = supabase.createClient(
  "https://cujvvxyadxvlfvhgzlki.supabase.co",
  "sb_publishable_wogqNQurYqmvOx9FvoFxMQ_XyRMTxZ_"
);[cite: 4]

const ACTIVITY_KEY = "sargesSugarsActivities";[cite: 2]
const MED_KEYS = ["sargesSugarsMedications", "healthDiaryMedications", "medications"];

let glucoseChart = null;
let currentMealId = null;
let allMealsCache = [];
let selectedMonthKey = "all";

function readLocalArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getMedicationsFromStorage() {
  for (const key of MED_KEYS) {
    const list = readLocalArray(key);
    if (list.length > 0) return list;
  }
  return [];
}

function getActivitiesFromStorage() {
  return readLocalArray(ACTIVITY_KEY);
}

function updatePhoneClock() {
  const now = new Date();
  const hour = now.getHours();

  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";

  const greetingEl = document.getElementById("welcomeGreeting");
  const clockEl = document.getElementById("livePhoneClock");

  if (greetingEl) {
    greetingEl.textContent = `${greeting} — here’s your Health Diary`;
  }

  if (clockEl) {
    const formattedDate = now.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = now.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    clockEl.textContent = `${formattedDate} • ${formattedTime} (device time)`;
  }
}

function getMonthKey(dateString) {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "unknown";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey) {
  if (monthKey === "all") return "All Months";
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function populateMonthFilter(meals) {
  const select = document.getElementById("monthFilter");
  if (!select) return;

  const keys = [
    ...new Set(meals.map((m) => getMonthKey(m.created_at)).filter((k) => k !== "unknown")),
  ];
  const currentLocalMonth = getMonthKey(new Date().toISOString());
  if (!keys.includes(currentLocalMonth)) {
    keys.unshift(currentLocalMonth);
  }
  keys.sort((a, b) => b.localeCompare(a));

  select.innerHTML =
    `<option value="all">All Months</option>` +
    keys.map((k) => `<option value="${k}">${escapeHtml(formatMonthLabel(k))}</option>`).join("");

  if (selectedMonthKey !== "all" && !keys.includes(selectedMonthKey)) {
    selectedMonthKey = "all";
  }
  select.value = selectedMonthKey;
}

function formatDateTime(dateString) {
  const date = new Date(dateString);[cite: 4]
  const today = new Date();[cite: 4]
  const yesterday = new Date();[cite: 4]
  yesterday.setDate(today.getDate() - 1);[cite: 4]

  const isToday = date.toDateString() === today.toDateString();[cite: 4]
  const isYesterday = date.toDateString() === yesterday.toDateString();[cite: 4]

  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today • ${time}`;[cite: 4]
  if (isYesterday) return `Yesterday • ${time}`;[cite: 4]

  return (
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + ` • ${time}`[cite: 4]
  );
}

function escapeHtml(text) {
  if (text === null || text === undefined) return "";[cite: 4]
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");[cite: 4]
}

function getGlucoseClass(value) {
  if (value === null || value === undefined || value === "") {
    return "glucose-warning";[cite: 4]
  }

  value = Number(value);[cite: 4]
  if (value < 7) return "glucose-good";[cite: 4]
  if (value < 10) return "glucose-warning";[cite: 4]

  return "glucose-high";[cite: 4]
}

function renderCompanionCards() {
  const medContainer = document.getElementById("dashboardMedList");
  const actContainer = document.getElementById("dashboardActivityList");

  if (medContainer) {
    const meds = getMedicationsFromStorage();
    if (!meds.length) {
      medContainer.innerHTML = `<div class="empty-state">No medications saved yet. Add them in <a class="companion-link" href="medications.html">Medications</a> or <a class="companion-link" href="reports.html">Reports</a>.</div>`;
    } else {
      const preview = meds.slice(0, 4);
      const extraCount = meds.length - preview.length;
      medContainer.innerHTML =
        `<ul class="companion-list">` +
        preview
          .map((m, i) => {
            const name = m.name || m.medication_name || m.med_name || `Medication #${i + 1}`;
            const detail = [m.dosage || m.dose, m.schedule || m.frequency].filter(Boolean).join(" • ");
            return `
              <li class="companion-item">
                <strong>${escapeHtml(name)}</strong>
                <span class="companion-meta">${escapeHtml(detail || "Tracked")}</span>
              </li>
            `;
          })
          .join("") +
        `</ul>` +
        (extraCount > 0
          ? `<p class="companion-meta" style="margin:8px 0 0;">+${extraCount} more in Medications</p>`
          : "");
    }
  }

  if (actContainer) {
    const allActivities = getActivitiesFromStorage();
    const filteredActivities =
      selectedMonthKey === "all"
        ? allActivities
        : allActivities.filter((a) => {
            const rawDate = a.date || a.logged_at || a.created_at;
            return rawDate ? getMonthKey(rawDate) === selectedMonthKey : true;
          });

    const totalMinutes = filteredActivities.reduce(
      (sum, a) => sum + Number(a.minutes ?? a.duration ?? 0),
      0
    );

    if (!filteredActivities.length) {
      actContainer.innerHTML = `<div class="empty-state">No activities logged for ${escapeHtml(formatMonthLabel(selectedMonthKey))}.</div>`;
    } else {
      const recent = filteredActivities.slice(-3).reverse();
      actContainer.innerHTML =
        `<p class="companion-meta" style="margin:0 0 8px;">Total for ${escapeHtml(formatMonthLabel(selectedMonthKey))}: <strong>${totalMinutes} min</strong> (${filteredActivities.length} logged)</p>` +
        `<ul class="companion-list">` +
        recent
          .map((a, i) => {
            const title = a.activity_name || a.name || a.type || `Activity #${i + 1}`;
            const mins = Number(a.minutes ?? a.duration ?? 0);
            return `
              <li class="companion-item">
                <span>${escapeHtml(title)}</span>
                <span class="companion-meta">${escapeHtml(mins)} min</span>
              </li>
            `;
          })
          .join("") +
        `</ul>`;
    }
  }
}

function createChart(meals) {
  const canvas = document.getElementById("glucoseChart");[cite: 4]
  if (!canvas) return;[cite: 4]

  const labels = meals.map((meal) => meal.food_name);[cite: 4]
  const beforeData = meals.map((meal) => Number(meal.glucose_before || 0));[cite: 4]
  const afterData = meals.map((meal) => Number(meal.glucose_after || 0));[cite: 4]

  if (glucoseChart) glucoseChart.destroy();[cite: 4]

  glucoseChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Before Meal",
          data: beforeData,
          borderColor: "#2563eb",
          backgroundColor: "#2563eb",
          tension: 0.3,
        },
        {
          label: "After Meal",
          data: afterData,
          borderColor: "#dc2626",
          backgroundColor: "#dc2626",
          tension: 0.3,
        },
      ],
    },[cite: 4]
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
      },
    },[cite: 4]
  });
}

function updateLatestReading(id) {
  currentMealId = id;[cite: 4]
  document.getElementById("readingModal").style.display = "flex";[cite: 4]
  document.getElementById("newReading").value = "";[cite: 4]
}

function closeModal() {
  document.getElementById("readingModal").style.display = "none";[cite: 4]
}

async function saveReading() {
  const input = document.getElementById("newReading");[cite: 4]
  const value = Number(input.value);[cite: 4]

  if (!input.value || !input.checkValidity() || !Number.isFinite(value)) {
    alert("Please enter a glucose reading between 2 and 30.");[cite: 4]
    return;
  }

  const { data, error } = await client
    .from("meals")
    .update({
      glucose_after: value,
    })
    .eq("id", currentMealId)
    .select();[cite: 4]

  if (error) {
    alert(error.message);[cite: 4]
    return;
  }

  if (!data || !data.length) {
    alert("The reading could not be saved. Please sign in and try again.");[cite: 4]
    return;
  }

  closeModal();[cite: 4]
  await loadMeals();[cite: 4]
}

function renderLatestMealCard(filteredMeals) {
  const cardEl = document.getElementById("latestMealCard");
  if (!cardEl) return;

  const data = filteredMeals[0];
  if (!data) {
    cardEl.innerHTML = `<div class="empty-state">No meals logged for ${escapeHtml(formatMonthLabel(selectedMonthKey))} yet. Tap <strong>+ Log Meal</strong> above to add one.</div>`;
    return;
  }

  const beforeClass = getGlucoseClass(data.glucose_before);[cite: 4]
  const afterClass = getGlucoseClass(data.glucose_after);[cite: 4]

  const photoHtml = data.photo_url
    ? `<img src="${escapeHtml(data.photo_url)}" class="featured-photo" alt="Meal Photo">`
    : "";[cite: 4]

  cardEl.innerHTML = `
    ${photoHtml}
    <div class="featured-content">
      <h3>🍽 ${escapeHtml(data.food_name)}</h3>
      <p class="meal-type">🍽 ${escapeHtml(data.meal_type)}</p>
      <div class="meal-date">🕒 ${formatDateTime(data.created_at)}</div>
      
      <div class="glucose-row">
        <span class="glucose-badge ${beforeClass}">
          Before: ${escapeHtml(data.glucose_before)}
        </span>
        <span class="glucose-badge ${afterClass}">
          After: ${escapeHtml(data.glucose_after ?? "Pending")}
        </span>
      </div>

      <div class="meal-notes">${escapeHtml(data.notes || "No notes")}</div>

      <button class="edit-btn featured-button" onclick="updateLatestReading(${data.id})">
        ${data.glucose_after == null ? "Enter 2-Hour Reading" : "Update 2-Hour Reading"}
      </button>
    </div>
  `;[cite: 4]
}

function renderDashboardForSelection() {
  const filtered =
    selectedMonthKey === "all"
      ? allMealsCache
      : allMealsCache.filter((m) => getMonthKey(m.created_at) === selectedMonthKey);

  const mealList = document.getElementById("mealList");[cite: 4]
  document.getElementById("mealCount").innerText = String(filtered.length);[cite: 4]

  if (filtered.length > 0) {
    const glucoseValues = filtered.map((m) => Number(m.glucose_before || 0));[cite: 4]
    const average = glucoseValues.reduce((a, b) => a + b, 0) / glucoseValues.length;[cite: 4]
    const highest = Math.max(...glucoseValues);[cite: 4]

    document.getElementById("avgGlucose").innerText = average.toFixed(1);[cite: 4]
    document.getElementById("highestGlucose").innerText = highest.toFixed(1);[cite: 4]
    document.getElementById("latestMeal").innerText = filtered[0].food_name;[cite: 4]
  } else {
    document.getElementById("avgGlucose").innerText = "0.0";
    document.getElementById("highestGlucose").innerText = "0.0";
    document.getElementById("latestMeal").innerText = "None";
  }

  renderCompanionCards();
  createChart([...filtered].reverse());[cite: 4]
  renderLatestMealCard(filtered);

  if (!mealList) return;
  if (!filtered.length) {
    mealList.innerHTML = `<div class="empty-state">No recent meals in ${escapeHtml(formatMonthLabel(selectedMonthKey))}.</div>`;
    return;
  }

  mealList.innerHTML = filtered
    .map((meal) => {
      const photoHtml = meal.photo_url
        ? `<img src="${escapeHtml(meal.photo_url)}" class="meal-photo" alt="Meal Photo">`
        : "";[cite: 4]

      const beforeClass = getGlucoseClass(meal.glucose_before);[cite: 4]
      const afterClass = getGlucoseClass(meal.glucose_after);[cite: 4]

      return `
        <div class="meal-card">
          ${photoHtml}
          <h3>${escapeHtml(meal.food_name)}</h3>

          <div class="meal-info">
            <strong>🍽 ${escapeHtml(meal.meal_type)}</strong>
            <div class="meal-date">🕒 ${formatDateTime(meal.created_at)}</div>
          </div>

          <div class="glucose-row">
            <span class="glucose-badge ${beforeClass}">Before: ${escapeHtml(meal.glucose_before)}</span>
            <span class="glucose-badge ${afterClass}">After: ${escapeHtml(meal.glucose_after ?? "⏳ Pending")}</span>
          </div>

          <div class="meal-notes">${escapeHtml(meal.notes || "No notes")}</div>
        </div>
      `;[cite: 4]
    })
    .join("");
}

async function loadMeals() {
  const { data, error } = await client
    .from("meals")
    .select("*")
    .order("created_at", { ascending: false });[cite: 4]

  if (error) {
    console.error(error);[cite: 4]
    return;
  }

  allMealsCache = data || [];
  populateMonthFilter(allMealsCache);
  renderDashboardForSelection();
}

document.getElementById("monthFilter")?.addEventListener("change", (e) => {
  selectedMonthKey = e.target.value;
  renderDashboardForSelection();
});

window.addEventListener("storage", renderCompanionCards);
updatePhoneClock();
setInterval(updatePhoneClock, 60000);
loadMeals();[cite: 4]

async function openReminderReading() {
  const id = new URLSearchParams(window.location.search).get("reading");[cite: 4]
  if (!id || !/^\d+$/.test(id)) return;[cite: 4]
  const { data, error } = await client
    .from("meals")
    .select("id, glucose_after")
    .eq("id", id)
    .maybeSingle();[cite: 4]
  if (error) {
    console.error("Could not open reminder:", error);[cite: 4]
    alert("Could not open this reminder. Please sign in and try again.");[cite: 4]
    return;
  }
  if (!data) {
    alert("This meal could not be found. Please sign in to the account that saved it.");[cite: 4]
    return;
  }
  if (data.glucose_after == null) updateLatestReading(data.id);[cite: 4]
  else alert("This meal already has an after-meal reading.");[cite: 4]
  history.replaceState(null, "", window.location.pathname);[cite: 4]
}

openReminderReading();[cite: 4]
