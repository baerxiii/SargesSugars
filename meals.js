const client = supabase.createClient(
  "https://cujvvxyadxvlfvhgzlki.supabase.co",
  "sb_publishable_wogqNQurYqmvOx9FvoFxMQ_XyRMTxZ_"
);

let mealsData = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getGlucoseClass(value) {
  const parsed = Number(value);

  if (value === null || value === undefined || value === "") {
    return "glucose-warning";
  }

  if (parsed < 7) return "glucose-good";
  if (parsed < 10) return "glucose-warning";
  return "glucose-high";
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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

  mealsData = data || [];
  renderMeals(mealsData);
}

function renderMeals(meals) {
  const container = document.getElementById("mealHistory");
  if (!container) return;

  container.innerHTML = "";

  if (!meals.length) {
    container.innerHTML = '<div class="empty-state">No meals logged yet.</div>';
    return;
  }

  meals.forEach((meal) => {
    const photoHtml = meal.photo_url
      ? `<img src="${meal.photo_url}" class="meal-photo" alt="${escapeHtml(meal.food_name || "Meal photo")}">`
      : "";

    const beforeClass = getGlucoseClass(meal.glucose_before);
    const afterClass = getGlucoseClass(meal.glucose_after);

    container.innerHTML += `
      <article class="meal-card">
        ${photoHtml}
        <h3>${escapeHtml(meal.food_name || "Meal")}</h3>

        <p><strong>${escapeHtml(meal.meal_type || "Meal")}</strong></p>
        <p class="meal-date">${formatDateTime(meal.created_at)}</p>

        <div class="glucose-row">
          <span class="glucose-badge ${beforeClass}">
            Before: ${meal.glucose_before ?? "—"}
          </span>
          <span class="glucose-badge ${afterClass}">
            After: ${meal.glucose_after ?? "Pending"}
          </span>
        </div>

        <p class="meal-notes">${escapeHtml(meal.notes || "No notes added.")}</p>
        <button class="delete-btn" type="button" onclick="deleteMeal(${meal.id})">Delete</button>
      </article>
    `;
  });
}

async function deleteMeal(id) {
  if (!confirm("Delete this meal?")) {
    return;
  }

  const { error } = await client.from("meals").delete().eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  loadMeals();
}

const searchBox = document.getElementById("searchBox");
if (searchBox) {
  searchBox.addEventListener("input", (event) => {
    const term = event.target.value.trim().toLowerCase();
    const filtered = mealsData.filter((meal) => {
      const name = (meal.food_name || "").toLowerCase();
      return name.includes(term);
    });

    renderMeals(filtered);
  });
}

loadMeals();
