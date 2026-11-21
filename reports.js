const SUPABASE_URL = "https://cujvvxyadxvlfvhgzlki.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_wogqNQurYqmvOx9FvoFxMQ_XyRMTxZ_";

const MEAL_KEY = "sargesSugarsMealsReport";
const ACTIVITY_KEY = "sargesSugarsActivities";
const MED_KEYS = ["sargesSugarsMedications", "healthDiaryMedications", "medications"];

const dbClient =
  window.supabase && typeof window.supabase.createClient === "function"
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

let currentMeals = [];

function readJson(key, fallback = []) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

function parseReading(val) {
  if (val === null || val === undefined || val === "") return null;
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function getActivities() {
  const data = readJson(ACTIVITY_KEY, []);
  return Array.isArray(data) ? data : [];
}

function resolveMedStorageKey() {
  for (const key of MED_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return key;
      } catch {
        // Ignore malformed JSON
      }
    }
  }
  return MED_KEYS[0];
}

function getStoredMedications() {
  for (const key of MED_KEYS) {
    const data = readJson(key, null);
    if (Array.isArray(data) && data.length > 0) return data;
  }
  const primary = readJson(MED_KEYS[0], []);
  return Array.isArray(primary) ? primary : [];
}

function saveStoredMedications(meds) {
  const targetKey = resolveMedStorageKey();
  writeJson(targetKey, meds);
  writeJson(MED_KEYS[0], meds);
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

function formatDateLabel(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return String(dateString);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function setActiveView(viewName) {
  document.querySelectorAll(".view-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });
  document.querySelectorAll(".report-view").forEach((section) => {
    section.classList.toggle("active", section.id === `view-${viewName}`);
  });
}

async function fetchMealsForReport() {
  if (dbClient) {
    try {
      const { data, error } = await dbClient
        .from("meals")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        writeJson(MEAL_KEY, data);
        return data;
      }
    } catch {
      // Fall back to local cache if network is unavailable
    }
  }
  const cached = readJson(MEAL_KEY, []);
  return Array.isArray(cached) ? cached : [];
}

function renderReportTable(rows) {
  const list = document.getElementById("reportList");
  if (!list) return;

  list.innerHTML = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
          <th>Scale Max</th>
          <th>Progress</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((item) => {
            const percent = Math.min(100, Math.max(0, (item.value / item.max) * 100));
            return `
              <tr class="report-item">
                <td><strong>${escapeHtml(item.label)}</strong></td>
                <td>${escapeHtml(item.value)}</td>
                <td>${escapeHtml(item.max)}</td>
                <td>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width:${percent}%"></div>
                  </div>
                </td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function renderPresentationSummary(meals, activities, storedMeds, medNotesFromMeals, stats) {
  const summary = document.getElementById("presentationSummary");
  if (!summary) return;

  const delta =
    stats.beforeCount > 0 && stats.afterCount > 0
      ? (Number(stats.averageAfter) - Number(stats.averageBefore)).toFixed(1)
      : null;

  const deltaText =
    delta === null
      ? "No paired before/after readings yet"
      : `${Number(delta) >= 0 ? "+" : ""}${delta} avg change (before → after)`;

  const totalMedEntries = storedMeds.length + medNotesFromMeals.length;

  summary.innerHTML = `
    <p><strong>Meals &amp; Glucose:</strong> ${meals.length} logged meals · Avg Before: <strong>${stats.averageBefore}</strong> · Avg After: <strong>${stats.averageAfter}</strong> (${deltaText}).</p>
    <p><strong>Activities:</strong> ${activities.length} logged session(s) · Total: <strong>${stats.totalActivityMinutes} minutes</strong>.</p>
    <p><strong>Medications:</strong> <strong>${totalMedEntries}</strong> medication item(s) (${storedMeds.length} in med list, ${medNotesFromMeals.length} noted on meal entries).</p>
  `;
}

function renderMealsView(meals) {
  const container = document.getElementById("mealsReportTable");
  if (!container) return;

  if (!meals.length) {
    container.innerHTML = `<p>No meals logged yet.</p>`;
    return;
  }

  const rows = meals
    .map((meal) => {
      const beforeNum = parseReading(meal.glucose_before);
      const afterNum = parseReading(meal.glucose_after);
      const diff =
        beforeNum !== null && afterNum !== null
          ? `${afterNum - beforeNum >= 0 ? "+" : ""}${(afterNum - beforeNum).toFixed(1)}`
          : "—";

      return `
        <tr>
          <td>${escapeHtml(formatDateLabel(meal.created_at))}</td>
          <td><strong>${escapeHtml(meal.food_name || "Meal")}</strong></td>
          <td>${escapeHtml(meal.meal_type || "—")}</td>
          <td>${beforeNum !== null ? beforeNum.toFixed(1) : "—"}</td>
          <td>${afterNum !== null ? afterNum.toFixed(1) : "Pending"}</td>
          <td>${escapeHtml(diff)}</td>
          <td>${escapeHtml(meal.notes || "—")}</td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Meal</th>
          <th>Type</th>
          <th>Before</th>
          <th>After</th>
          <th>Change</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderActivitiesView(activities) {
  const container = document.getElementById("activitiesReportTable");
  if (!container) return;

  if (!activities.length) {
    container.innerHTML = `<p>No activities logged yet.</p>`;
    return;
  }

  const rows = activities
    .map((act, idx) => {
      const title = act.activity_name || act.name || act.type || `Activity #${idx + 1}`;
      const date = act.date || act.logged_at || act.created_at || "—";
      const minutes = Number(act.minutes ?? act.duration ?? 0);
      return `
        <tr>
          <td>${escapeHtml(date)}</td>
          <td>${escapeHtml(title)}</td>
          <td>${escapeHtml(minutes)} min</td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Activity</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderMedicationsView(storedMeds, meals) {
  const container = document.getElementById("medicationsReportTable");
  if (!container) return;

  const mealMedEntries = meals
    .filter((m) => String(m.notes || "").trim() !== "")
    .map((m) => ({
      name: String(m.notes).trim(),
      dosage: "—",
      schedule: `Meal note (${m.meal_type || "Meal"}: ${m.food_name || ""})`,
      notes: formatDateLabel(m.created_at),
      isMealNote: true,
    }));

  const storedRowsHtml = storedMeds.map((med, idx) => {
    const name = med.name || med.medication_name || med.med_name || `Medication #${idx + 1}`;
    const dosage = med.dosage || med.dose || "—";
    const schedule = med.schedule || med.frequency || med.time_of_day || "—";
    const notes = med.notes || "—";

    return `
      <tr>
        <td><strong>${escapeHtml(name)}</strong></td>
        <td><span class="badge-pill">${escapeHtml(dosage)}</span></td>
        <td>${escapeHtml(schedule)}</td>
        <td>${escapeHtml(notes)}</td>
        <td class="no-present"><button type="button" class="action-btn delete-med-btn" data-med-index="${idx}">Remove</button></td>
      </tr>
    `;
  });

  const noteRowsHtml = mealMedEntries.map(
    (entry) => `
      <tr>
        <td><strong>${escapeHtml(entry.name)}</strong></td>
        <td><span class="badge-pill">${escapeHtml(entry.dosage)}</span></td>
        <td>${escapeHtml(entry.schedule)}</td>
        <td>${escapeHtml(entry.notes)}</td>
        <td class="no-present"><span class="sub">From meal log</span></td>
      </tr>
    `
  );

  const allRowsHtml = [...storedRowsHtml, ...noteRowsHtml].join("");

  if (!allRowsHtml) {
    container.innerHTML = `<p>No medications added yet. Add one above or include medication notes when logging a meal.</p>`;
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Medication</th>
          <th>Dosage</th>
          <th>Schedule / Context</th>
          <th>Notes / Date</th>
          <th class="no-present">Action</th>
        </tr>
      </thead>
      <tbody>${allRowsHtml}</tbody>
    </table>
  `;

  container.querySelectorAll(".delete-med-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.medIndex);
      const updated = getStoredMedications().filter((_, i) => i !== index);
      saveStoredMedications(updated);
      renderAll();
    });
  });
}

function renderAll() {
  const meals = currentMeals;
  const activities = getActivities();
  const storedMeds = getStoredMedications();
  const mealMedNotes = meals.filter((m) => String(m.notes || "").trim() !== "");

  const beforeValues = meals
    .map((meal) => parseReading(meal.glucose_before))
    .filter((v) => v !== null);

  const afterValues = meals
    .map((meal) => parseReading(meal.glucose_after))
    .filter((v) => v !== null);

  const totalActivityMinutes = activities.reduce(
    (total, item) => total + Number(item.minutes ?? item.duration ?? 0),
    0
  );

  const averageBefore = beforeValues.length
    ? (beforeValues.reduce((sum, value) => sum + value, 0) / beforeValues.length).toFixed(1)
    : "0.0";

  const averageAfter = afterValues.length
    ? (afterValues.reduce((sum, value) => sum + value, 0) / afterValues.length).toFixed(1)
    : "0.0";

  const totalMedCount = storedMeds.length + mealMedNotes.length;

  const stats = {
    beforeCount: beforeValues.length,
    afterCount: afterValues.length,
    averageBefore,
    averageAfter,
    totalActivityMinutes,
  };

  const genEl = document.getElementById("reportGeneratedAt");
  if (genEl) {
    genEl.textContent = `Generated ${new Date().toLocaleString()}`;
  }

  const reportMeals = document.getElementById("reportMeals");
  const reportAverage = document.getElementById("reportAverage");
  const reportAfter = document.getElementById("reportAfter");
  const reportActivity = document.getElementById("reportActivity");
  const reportMedsCount = document.getElementById("reportMedsCount");

  if (reportMeals) reportMeals.textContent = String(meals.length);
  if (reportAverage) reportAverage.textContent = averageBefore;
  if (reportAfter) reportAfter.textContent = averageAfter;
  if (reportActivity) reportActivity.textContent = String(totalActivityMinutes);
  if (reportMedsCount) reportMedsCount.textContent = String(totalMedCount);

  renderReportTable([
    { label: "Meals logged", value: meals.length, max: Math.max(10, meals.length) },
    { label: "Average before", value: Number(averageBefore), max: 15 },
    { label: "Average after", value: Number(averageAfter), max: 15 },
    {
      label: "Activity minutes",
      value: totalActivityMinutes,
      max: Math.max(180, totalActivityMinutes),
    },
    { label: "Medications tracked", value: totalMedCount, max: Math.max(5, totalMedCount) },
  ]);

  renderPresentationSummary(meals, activities, storedMeds, mealMedNotes, stats);
  renderMealsView(meals);
  renderActivitiesView(activities);
  renderMedicationsView(storedMeds, meals);
}

async function initReports() {
  currentMeals = await fetchMealsForReport();
  renderAll();
}

document.querySelectorAll(".view-tab").forEach((btn) => {
  btn.addEventListener("click", () => setActiveView(btn.dataset.view));
});

document.getElementById("togglePresentationBtn")?.addEventListener("click", (e) => {
  const enabled = document.body.classList.toggle("presentation-mode");
  e.currentTarget.textContent = enabled ? "Exit Presentation" : "Presentation View";
});

document.getElementById("printReportBtn")?.addEventListener("click", () => {
  window.print();
});

document.getElementById("addMedForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("medNameInput");
  const dosageInput = document.getElementById("medDosageInput");
  const scheduleInput = document.getElementById("medScheduleInput");
  const notesInput = document.getElementById("medNotesInput");

  const name = nameInput?.value.trim();
  if (!name) return;

  const currentMeds = getStoredMedications();
  currentMeds.push({
    name,
    dosage: dosageInput?.value.trim() || "—",
    schedule: scheduleInput?.value.trim() || "—",
    notes: notesInput?.value.trim() || "—",
    added_at: new Date().toISOString(),
  });

  saveStoredMedications(currentMeds);
  if (nameInput) nameInput.value = "";
  if (dosageInput) dosageInput.value = "";
  if (scheduleInput) scheduleInput.value = "";
  if (notesInput) notesInput.value = "";

  renderAll();
});

window.addEventListener("storage", () => {
  currentMeals = readJson(MEAL_KEY, currentMeals);
  renderAll();
});

initReports();
