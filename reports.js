const MEAL_KEY = "sargesSugarsMealsReport";
const ACTIVITY_KEY = "sargesSugarsActivities";
const MED_KEYS = ["sargesSugarsMedications", "healthDiaryMedications", "medications"];

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

function getMealsFromSupabase() {
  const data = readJson(MEAL_KEY, []);
  return Array.isArray(data) ? data : [];
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
        // Continue checking candidate keys
      }
    }
  }
  return MED_KEYS[0];
}

function getMedications() {
  for (const key of MED_KEYS) {
    const data = readJson(key, null);
    if (Array.isArray(data) && data.length > 0) return data;
  }
  const primary = readJson(MED_KEYS[0], []);
  return Array.isArray(primary) ? primary : [];
}

function saveMedications(meds) {
  const targetKey = resolveMedStorageKey();
  writeJson(targetKey, meds);
  writeJson(MED_KEYS[0], meds);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setActiveView(viewName) {
  document.querySelectorAll(".view-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });
  document.querySelectorAll(".report-view").forEach((section) => {
    section.classList.toggle("active", section.id === `view-${viewName}`);
  });
}

function renderOverview(meals, activities, meds, stats) {
  const list = document.getElementById("reportList");
  const summary = document.getElementById("presentationSummary");

  const items = [
    { label: "Meals logged", value: meals.length, max: Math.max(10, meals.length) },
    { label: "Average before", value: Number(stats.averageBefore), max: 15 },
    { label: "Average after", value: Number(stats.averageAfter), max: 15 },
    { label: "Activity minutes", value: stats.totalActivityMinutes, max: Math.max(180, stats.totalActivityMinutes) },
    { label: "Medications tracked", value: meds.length, max: Math.max(5, meds.length) },
  ];

  if (list) {
    list.innerHTML = items
      .map((item) => {
        const percent = Math.min(100, Math.max(0, (item.value / item.max) * 100));
        return `
          <div class="report-item">
            <div>
              <strong>${escapeHtml(item.label)}</strong>
              <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
            </div>
            <span>${escapeHtml(item.value)}</span>
          </div>
        `;
      })
      .join("");
  }

  if (summary) {
    const delta =
      stats.beforeCount > 0 && stats.afterCount > 0
        ? (Number(stats.averageAfter) - Number(stats.averageBefore)).toFixed(1)
        : null;
    const deltaText =
      delta === null
        ? "No paired before/after readings logged yet."
        : `${Number(delta) >= 0 ? "+" : ""}${delta} change from before to after.`;

    summary.innerHTML = `
      <p><strong>Meals &amp; Readings:</strong> ${meals.length} logged meal(s) · Avg Before: <strong>${stats.averageBefore}</strong> · Avg After: <strong>${stats.averageAfter}</strong> (${deltaText})</p>
      <p><strong>Physical Activity:</strong> ${activities.length} session(s) totaling <strong>${stats.totalActivityMinutes} minutes</strong>.</p>
      <p><strong>Medications:</strong> <strong>${meds.length}</strong> medication(s) on file.</p>
    `;
  }
}

function renderMealsView(meals) {
  const container = document.getElementById("mealsReportTable");
  if (!container) return;

  if (!meals.length) {
    container.innerHTML = `<p>No meals logged yet in <code>${MEAL_KEY}</code>.</p>`;
    return;
  }

  const rows = meals
    .map((meal, idx) => {
      const name = meal.meal_name || meal.name || meal.title || `Meal #${idx + 1}`;
      const date = meal.date || meal.logged_at || meal.created_at || "—";
      const beforeVal = meal.glucose_before ?? meal.before ?? "—";
      const afterVal = meal.glucose_after ?? meal.after ?? "—";
      const diff =
        Number(beforeVal) > 0 && Number(afterVal) > 0
          ? `${Number(afterVal) - Number(beforeVal) >= 0 ? "+" : ""}${(Number(afterVal) - Number(beforeVal)).toFixed(1)}`
          : "—";

      return `
        <tr>
          <td>${escapeHtml(date)}</td>
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(beforeVal)}</td>
          <td>${escapeHtml(afterVal)}</td>
          <td>${escapeHtml(diff)}</td>
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
          <th>Before</th>
          <th>After</th>
          <th>Change</th>
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
    container.innerHTML = `<p>No activities logged yet in <code>${ACTIVITY_KEY}</code>.</p>`;
    return;
  }

  const rows = activities
    .map((act, idx) => {
      const title = act.activity_name || act.name || act.type || `Activity #${idx + 1}`;
      const date = act.date || act.logged_at || "—";
      const minutes = Number(act.minutes || act.duration || 0);
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

function renderMedicationsView(meds) {
  const container = document.getElementById("medicationsReportTable");
  if (!container) return;

  if (!meds.length) {
    container.innerHTML = `<p>No medications added yet. Use the form above or add medications in the Medications section.</p>`;
    return;
  }

  const rows = meds
    .map((med, idx) => {
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
    })
    .join("");

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Medication</th>
          <th>Dosage</th>
          <th>Schedule</th>
          <th>Notes</th>
          <th class="no-present">Action</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  container.querySelectorAll(".delete-med-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.medIndex);
      const updated = getMedications().filter((_, i) => i !== index);
      saveMedications(updated);
      renderReports();
    });
  });
}

function renderReports() {
  const meals = getMealsFromSupabase();
  const activities = getActivities();
  const meds = getMedications();

  const beforeValues = meals
    .map((meal) => Number(meal.glucose_before ?? meal.before ?? 0))
    .filter((value) => value > 0);

  const afterValues = meals
    .map((meal) => Number(meal.glucose_after ?? meal.after ?? 0))
    .filter((value) => value > 0);

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
  if (reportMedsCount) reportMedsCount.textContent = String(meds.length);

  renderOverview(meals, activities, meds, stats);
  renderMealsView(meals);
  renderActivitiesView(activities);
  renderMedicationsView(meds);
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

  const currentMeds = getMedications();
  currentMeds.push({
    name,
    dosage: dosageInput?.value.trim() || "—",
    schedule: scheduleInput?.value.trim() || "—",
    notes: notesInput?.value.trim() || "—",
    added_at: new Date().toISOString(),
  });

  saveMedications(currentMeds);
  if (nameInput) nameInput.value = "";
  if (dosageInput) dosageInput.value = "";
  if (scheduleInput) scheduleInput.value = "";
  if (notesInput) notesInput.value = "";

  renderReports();
});

window.addEventListener("storage", renderReports);
renderReports();
