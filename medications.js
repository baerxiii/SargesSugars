const STORAGE_KEY = "sargesSugarsMedications";

function readJson(key, fallback = []) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveMedications(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMedications() {
  const list = document.getElementById("medicationList");
  if (!list) return;

  const meds = readJson(STORAGE_KEY, []);

  if (!meds.length) {
    list.innerHTML = '<div class="empty-state">No medications added yet.</div>';
    return;
  }

  list.innerHTML = meds
    .map(
      (med, index) => `
        <article class="meal-card">
          <h3>${escapeHtml(med.name)}</h3>
          <p><strong>Dosage:</strong> ${escapeHtml(med.dosage)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(med.schedule)}</p>
          <p class="meal-notes">${escapeHtml(med.notes || "No notes.")}</p>
          <button class="delete-btn" type="button" onclick="deleteMedication(${index})">Delete</button>
        </article>
      `
    )
    .join("");
}

function deleteMedication(index) {
  const meds = readJson(STORAGE_KEY, []);
  meds.splice(index, 1);
  saveMedications(meds);
  renderMedications();
}

document.getElementById("medicationForm")?.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.getElementById("medicationName")?.value?.trim();
  const dosage = document.getElementById("medicationDosage")?.value?.trim();
  const schedule = document.getElementById("medicationSchedule")?.value?.trim();
  const notes = document.getElementById("medicationNotes")?.value?.trim() || "";

  if (!name || !dosage || !schedule) return;

  const meds = readJson(STORAGE_KEY, []);
  meds.push({ name, dosage, schedule, notes });
  saveMedications(meds);
  renderMedications();

  event.target.reset();
});

renderMedications();
