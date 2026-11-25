const client = supabase.createClient(
  "https://cujvvxyadxvlfvhgzlki.supabase.co",
  "sb_publishable_wogqNQurYqmvOx9FvoFxMQ_XyRMTxZ_"
);

const ACTIVITY_KEY = "sargesSugarsActivities";
const MED_KEYS = ["sargesSugarsMedications", "healthDiaryMedications", "medications"];

let glucoseChart = null;
let currentMealId = null;
let allMealsCache = [];
let selectedMonthKey = "all";

function parseReading(val) {
  if (val === null || val === undefined || val === "") return null;
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? num : null;
}

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
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString || "");

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today • ${time}`;
  if (isYesterday) return `Yesterday • ${time}`;

  return (
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + ` • ${time}`
  );
}

function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getGlucoseClass(value) {
  const num = parseReading(value);
  if (num === null) return "glucose-warning";
  if (num < 7) return "glucose-good";
  if (num < 10) return "glucose-warning";
  return "glucose-high";
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
  const canvas = document.getElementById("glucoseChart");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = meals.map((meal) => meal.food_name || "Meal");
  const beforeData = meals.map((meal) => parseReading(meal.glucose_before));
  const afterData = meals.map((meal) => parseReading(meal.glucose_after));

  if (glucoseChart) glucoseChart.destroy();

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
          spanGaps: true,
          tension: 0.3,
        },
        {
          label: "After Meal",
          data: afterData,
          borderColor: "#dc2626",
          backgroundColor: "#dc2626",
          spanGaps: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
      },
    },
  });
}

function updateLatestReading(id) {
  currentMealId = id;
  const modal = document.getElementById("readingModal");
  const input = document.getElementById("newReading");
  if (input) input.value = "";
  if (modal) modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("readingModal");
  if (modal) modal.style.display = "none";
}

async function saveReading() {
  const input = document.getElementById("newReading");
  const value = Number(input?.value);

  if (!input?.value || !input.checkValidity() || !Number.isFinite(value)) {
    alert("Please enter a glucose reading between 2 and 30.");
    return;
  }

  const { data, error } = await client
    .from("meals")
    .update({
      glucose_after: String(value),
    })
    .eq("id", currentMealId)
    .select();

  if (error) {
    alert(error.message);
    return;
  }

  if (!data || !data.length) {
    alert("The reading could not be saved. Please sign in and try again.");
    return;
  }

  closeModal();
  await loadMeals();
}

function renderLatestMealCard(filteredMeals) {
  const cardEl = document.getElementById("latestMealCard");
  if (!cardEl) return;

  const data = filteredMeals[0];
  if (!data) {
    cardEl.innerHTML = `<div class="empty-state">No meals logged for ${escapeHtml(formatMonthLabel(selectedMonthKey))} yet. Tap <strong>+ Log Meal</strong> above to add one.</div>`;
    return;
  }

  const beforeVal = parseReading(data.glucose_before);
  const afterVal = parseReading(data.glucose_after);
  const beforeClass = getGlucoseClass(beforeVal);
  const afterClass = getGlucoseClass(afterVal);

  const photoHtml = data.photo_url
    ? `<img src="${escapeHtml(data.photo_url)}" class="featured-photo" alt="Meal Photo">`
    : "";

  cardEl.innerHTML = `
    ${photoHtml}
    <div class="featured-content">
      <h3>🍽 ${escapeHtml(data.food_name)}</h3>
      <p class="meal-type">🍽 ${escapeHtml(data.meal_type)}</p>
      <div class="meal-date">🕒 ${formatDateTime(data.created_at)}</div>

      <div class="glucose-row">
        <span class="glucose-badge ${beforeClass}">
          Before: ${beforeVal !== null ? beforeVal : "—"}
        </span>
        <span class="glucose-badge ${afterClass}">
          After: ${afterVal !== null ? afterVal : "Pending"}
        </span>
      </div>

      <div class="meal-notes">${escapeHtml(data.notes || "No notes")}</div>

      <button class="edit-btn featured-button" onclick="updateLatestReading(${data.id})">
        ${afterVal === null ? "Enter 2-Hour Reading" : "Update 2-Hour Reading"}
      </button>
    </div>
  `;
}

function renderDashboardForSelection() {
  try {
    const filtered =
      selectedMonthKey === "all"
        ? allMealsCache
        : allMealsCache.filter((m) => getMonthKey(m.created_at) === selectedMonthKey);

    const mealList = document.getElementById("mealList");
    const mealCountEl = document.getElementById("mealCount");
    const avgGlucoseEl = document.getElementById("avgGlucose");
    const highestGlucoseEl = document.getElementById("highestGlucose");
    const latestMealEl = document.getElementById("latestMeal");

    if (mealCountEl) mealCountEl.innerText = String(filtered.length);

    if (filtered.length > 0) {
      const readings = filtered
        .flatMap((m) => [parseReading(m.glucose_before), parseReading(m.glucose_after)])
        .filter((v) => v !== null);

      if (readings.length > 0) {
        const average = readings.reduce((a, b) => a + b, 0) / readings.length;
        const highest = Math.max(...readings);
        if (avgGlucoseEl) avgGlucoseEl.innerText = average.toFixed(1);
        if (highestGlucoseEl) highestGlucoseEl.innerText = highest.toFixed(1);
      } else {
        if (avgGlucoseEl) avgGlucoseEl.innerText = "0.0";
        if (highestGlucoseEl) highestGlucoseEl.innerText = "0.0";
      }

      if (latestMealEl) latestMealEl.innerText = filtered[0].food_name || "Meal";
    } else {
      if (avgGlucoseEl) avgGlucoseEl.innerText = "0.0";
      if (highestGlucoseEl) highestGlucoseEl.innerText = "0.0";
      if (latestMealEl) latestMealEl.innerText = "None";
    }

    renderCompanionCards();

    try {
      createChart([...filtered].reverse());
    } catch (chartErr) {
      console.error("Chart render error:", chartErr);
    }

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
          : "";

        const beforeVal = parseReading(meal.glucose_before);
        const afterVal = parseReading(meal.glucose_after);
        const beforeClass = getGlucoseClass(beforeVal);
        const afterClass = getGlucoseClass(afterVal);

        return `
          <div class="meal-card">
            ${photoHtml}
            <h3>${escapeHtml(meal.food_name)}</h3>

            <div class="meal-info">
              <strong>🍽 ${escapeHtml(meal.meal_type)}</strong>
              <div class="meal-date">🕒 ${formatDateTime(meal.created_at)}</div>
            </div>

            <div class="glucose-row">
              <span class="glucose-badge ${beforeClass}">Before: ${beforeVal !== null ? beforeVal : "—"}</span>
              <span class="glucose-badge ${afterClass}">After: ${afterVal !== null ? afterVal : "⏳ Pending"}</span>
            </div>

            <div class="meal-notes">${escapeHtml(meal.notes || "No notes")}</div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Dashboard render error:", err);
  }
}

async function loadMeals() {
  try {
    const { data, error } = await client
      .from("meals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      allMealsCache = [];
    } else {
      allMealsCache = Array.isArray(data) ? data : [];
      try {
        localStorage.setItem("sargesSugarsMealsReport", JSON.stringify(allMealsCache));
      } catch {}
    }
  } catch (err) {
    console.error("Network/load error:", err);
    allMealsCache = [];
  }

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
loadMeals();

async function openReminderReading() {
  const id = new URLSearchParams(window.location.search).get("reading");
  if (!id || !/^\d+$/.test(id)) return;
  const { data, error } = await client
    .from("meals")
    .select("id, glucose_after")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("Could not open reminder:", error);
    alert("Could not open this reminder. Please sign in and try again.");
    return;
  }
  if (!data) {
    alert("This meal could not be found. Please sign in to the account that saved it.");
    return;
  }
  if (data.glucose_after == null) updateLatestReading(data.id);
  else alert("This meal already has an after-meal reading.");
  history.replaceState(null, "", window.location.pathname);
}

openReminderReading();
