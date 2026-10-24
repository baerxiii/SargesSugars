const client = supabase.createClient(
  "https://cujvvxyadxvlfvhgzlki.supabase.co",
  "sb_publishable_wogqNQurYqmvOx9FvoFxMQ_XyRMTxZ_"
);

let mealsData = [];

function getGlucoseClass(value) {

  value = Number(value);

  if (value < 7) return "glucose-good";
  if (value < 10) return "glucose-warning";

  return "glucose-high";
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

  mealsData = data;

  renderMeals(mealsData);
}

function renderMeals(meals) {

  const container =
    document.getElementById("mealHistory");

  container.innerHTML = "";

  meals.forEach(meal => {

    const photoHtml = meal.photo_url
      ? `<img src="${meal.photo_url}" class="meal-photo">`
      : "";

    const beforeClass =
      getGlucoseClass(meal.glucose_before);

    const afterClass =
      getGlucoseClass(meal.glucose_after);

    container.innerHTML += `
      <div class="meal-card">

        ${photoHtml}

        <h3>${meal.food_name}</h3>

        <p>
          <strong>${meal.meal_type}</strong>
        </p>

        <div class="glucose-row">

          <span class="glucose-badge ${beforeClass}">
            Before: ${meal.glucose_before}
          </span>

          <span class="glucose-badge ${afterClass}">
            After: ${meal.glucose_after}
          </span>

        </div>

        <p>${meal.notes || ""}</p>

        <button
          class="delete-btn"
          onclick="deleteMeal(${meal.id})">
          Delete
        </button>

      </div>
    `;
  });
}

async function deleteMeal(id) {

  if (!confirm("Delete this meal?")) {
    return;
  }

  const { error } = await client
    .from("meals")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  loadMeals();
}

document
  .getElementById("searchBox")
  .addEventListener("input", e => {

    const term =
      e.target.value.toLowerCase();

    const filtered =
      mealsData.filter(meal =>
        meal.food_name
          .toLowerCase()
          .includes((filtered)));
  });

loadMeals()