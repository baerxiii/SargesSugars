const client = supabase.createClient(
  "https://cujvvxyadxvlfvhgzlki.supabase.co",
  "sb_publishable_wogqNQurYqmvOx9FvoFxMQ_XyRMTxZ_"
);

let glucoseChart = null;
let currentMealId = null;

function formatDateTime(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today • ${time}`;
  if (isYesterday) return `Yesterday • ${time}`;

  return (
    date.toLocaleDateString("en-CA", {
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
  if (value === null || value === undefined || value === "") {
    return "glucose-warning";
  }

  value = Number(value);
  if (value < 7) return "glucose-good";
  if (value < 10) return "glucose-warning";

  return "glucose-high";
}

function createChart(meals) {
  const canvas = document.getElementById("glucoseChart");
  if (!canvas) return;

  const labels = meals.map((meal) => meal.food_name);
  const beforeData = meals.map((meal) => Number(meal.glucose_before || 0));
  const afterData = meals.map((meal) => Number(meal.glucose_after || 0));

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
  document.getElementById("readingModal").style.display = "flex";
  document.getElementById("newReading").value = "";
}

function closeModal() {
  document.getElementById("readingModal").style.display = "none";
}

async function saveReading() {
  const value = Number(document.getElementById("newReading").value);
  if (!value) return;

  const { error } = await client
    .from("meals")
    .update({ glucose_after: value })
    .eq("id", currentMealId);

  if (error) {
    alert(error.message);
    return;
  }

  closeModal();
  loadMeals();
  loadLatestMeal();
}

async function loadLatestMeal() {
  const { data, error } = await client
    .from("meals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  const beforeClass = getGlucoseClass(data.glucose_before);
  const afterClass = getGlucoseClass(data.glucose_after);

  const photoHtml = data.photo_url
    ? `<img src="${data.photo_url}" class="featured-photo" alt="Meal Photo">`
    : "";

  document.getElementById("latestMealCard").innerHTML = `
    ${photoHtml}
    <div class="featured-content">
      <h3>🍽 ${escapeHtml(data.food_name)}</h3>
      <p class="meal-type">🍽 ${escapeHtml(data.meal_type)}</p>
      <div class="meal-date">🕒 ${formatDateTime(data.created_at)}</div>
      <p class="meal-date">${formatDateTime(data.created_at)}</p>

      <div class="glucose-row">
        <span class="glucose-badge ${beforeClass}">
          Before: ${data.glucose_before}
        </span>
        <span class="glucose-badge ${afterClass}">
          After: ${data.glucose_after ?? "Pending"}
        </span>
      </div>

      <div class="meal-notes">${escapeHtml(data.notes || "No notes")}</div>

      <button class="edit-btn featured-button" onclick="updateLatestReading(${data.id})">
        ${data.glucose_after == null ? "Enter 2-Hour Reading" : "Update 2-Hour Reading"}
      </button>
    </div>
  `;
}

async function loadMeals() {
  const { data, error } = await client
    .from("meals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const mealList = document.getElementById("mealList");
  if (!mealList) return;

  mealList.innerHTML = "";
  document.getElementById("mealCount").innerText = data.length;

  if (data.length > 0) {
    const glucoseValues = data.map((m) => Number(m.glucose_before || 0));
    const average = glucoseValues.reduce((a, b) => a + b, 0) / glucoseValues.length;
    const highest = Math.max(...glucoseValues);

    document.getElementById("avgGlucose").innerText = average.toFixed(1);
    document.getElementById("highestGlucose").innerText = highest.toFixed(1);
    document.getElementById("latestMeal").innerText = data[0].food_name;
  }

  createChart([...data].reverse());

  data.forEach((meal) => {
    const photoHtml = meal.photo_url
      ? `<img src="${meal.photo_url}" class="meal-photo" alt="Meal Photo">`
      : "";

    const beforeClass = getGlucoseClass(meal.glucose_before);
    const afterClass = getGlucoseClass(meal.glucose_after);

    mealList.innerHTML += `
      <div class="meal-card">
        ${photoHtml}
        <h3>${escapeHtml(meal.food_name)}</h3>

        <div class="meal-info">
          <strong>🍽 ${escapeHtml(meal.meal_type)}</strong>
          <div class="meal-date">🕒 ${formatDateTime(meal.created_at)}</div>
        </div>

        <div class="glucose-row">
          <span class="glucose-badge ${beforeClass}">Before: ${meal.glucose_before}</span>
          <span class="glucose-badge ${afterClass}">After: ${meal.glucose_after ?? "⏳ Pending"}</span>
        </div>

        <div class="meal-notes">${escapeHtml(meal.notes || "No notes")}</div>
      </div>
    `;
  });
}

loadMeals();
loadLatestMeal();
