const client = supabase.createClient(
  "https://cujvvxyadxvlfvhgzlki.supabase.co",
  "sb_publishable_wogqNQurYqmvOx9FvoFxMQ_XyRMTxZ_"
);

let mealsData = [];

function getGlucoseClass(value) {
  const parsed = Number(value);

  if (!value && value !== 0) {
    return "glucose-warning";
  }

  if (parsed < 7) return "glucose-good";
  if (parsed < 10) return "glucose-warning";

  return "glucose-high";
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
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

  if (meals.length === 0) {
    container.innerHTML = '<div class="empty-state">No meals logged yet.</div>';
    return;
  }

  meals.forEach((meal) => {
    const photoHtml = meal.photo_url
      ? `<img src="${meal.photo_url}" class="meal-photo" alt="${meal.food_name}">`
      : "";

    const beforeClass = getGlucoseClass(meal.glucose_before);
    const afterClass = getGlucoseClass(meal.glucose_after);

    container.innerHTML += `
      <div class="meal-card">
        ${photoHtml}
        <h3>${meal.food_name}</h3>

        <p><strong>${meal.meal_type}</strong></p>
        <p class="meal-date">${formatDateTime(meal.created_at)}</p>

        <div class="glucose-row">
          <span class="glucose-badge ${beforeClass}">
            Before: ${meal.glucose_before ?? "—"}
          </span>
          <span class="glucose-badge ${afterClass}">
            After: ${meal.glucose_after ?? "Pending"}
          </span>
        </div>

        <p class="meal-notes">${meal.notes || "No notes added."}</p>

        <button class="delete-btn" onclick="deleteMeal(${meal.id})">Delete</button>
      </div>
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
  searchBox.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = mealsData.filter((meal) =>
      meal.food_name.toLowerCase().includes(term)
    );

    renderMeals(filtered);
  });
}

loadMeals();
