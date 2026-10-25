const STORAGE_KEY = "sargesSugarsMedications";

function getMedications() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveMedications(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function renderMedications() {
  const list = document.getElementById("medicationList");
  if (!list) return;

  const meds = getMedications();

  if (!meds.length) {
    list.innerHTML = '<div class="empty-state">No medications added yet.</div>';
    return;
  }

  list.innerHTML = meds
    .map(
      (med, index) => `
        <div class="meal-card">
          <h3>${med.name}</h3>
          <p><strong>Dosage:</strong> ${med.dosage}</p>
          <p><strong>Schedule:</strong> ${med.schedule}</p>
          <p class="meal-notes">${med.notes || "No notes."}</p>
          <button class="delete-btn" onclick="deleteMedication(${index})">Delete</button>
        </div>
      `
    )
    .join("");
}

function deleteMedication(index) {
  const meds = getMedications();
  meds.splice(index, 1);
  saveMedications(meds);
  renderMedications();
}

document.getElementById("medicationForm")?.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.getElementById("medicationName").value.trim();
  const dosage = document.getElementById("medicationDosage").value.trim();
  const schedule = document.getElementById("medicationSchedule").value.trim();
  const notes = document.getElementById("medicationNotes").value.trim();

  if (!name || !dosage || !schedule) return;

  const meds = getMedications();
  meds.push({ name, dosage, schedule, notes });
  saveMedications(meds);
  renderMedications();

  event.target.reset();
});

renderMedications();
