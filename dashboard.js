const client = supabase.createClient(
  "https://cujvvxyadxvlfvhgzlki.supabase.co",
  "sb_publishable_wogqNQurYqmvOx9FvoFxMQ_XyRMTxZ_"
);

let glucoseChart = null;

function getGlucoseClass(value) {
  value = Number(value);

  if (value < 7) return "glucose-good";
  if (value < 10) return "glucose-warning";

  return "glucose-high";
}

function createChart(meals) {

  const canvas = document.getElementById("glucoseChart");

  if (!canvas) {
    console.log("Chart canvas not found");
    return;
  }

  const labels = meals.map(meal => meal.food_name);

  const beforeData = meals.map(meal =>
    Number(meal.glucose_before || 0)
  );

  const afterData = meals.map(meal =>
    Number(meal.glucose_after || 0)
  );

  if (glucoseChart) {
    glucoseChart.destroy();
  }

  glucoseChart = new Chart(canvas, {
    type: "line",

    data: {
      labels: labels,

      datasets: [
        {
          label: "Before Meal",
          data: beforeData,
          borderColor: "#2563eb",
          backgroundColor: "#2563eb",
          tension: 0.3
        },
        {
          label: "After Meal",
          data: afterData,
          borderColor: "#dc2626",
          backgroundColor: "#dc2626",
          tension: 0.3
        }
      ]
    },

    options: {
      responsive: true,

      plugins: {
        legend: {
          position: "top"
        }
      },

      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
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

  const mealList =
    document.getElementById("mealList");

  mealList.innerHTML = "";

  document.getElementById("mealCount").innerText =
    data.length;

  if (data.length > 0) {

    const glucoseValues =
      data.map(m =>
        Number(m.glucose_before || 0)
      );

    const average =
      glucoseValues.reduce(
        (a, b) => a + b,
        0
      ) / glucoseValues.length;

    const highest =
      Math.max(...glucoseValues);

    document.getElementById("avgGlucose").innerText =
      average.toFixed(1);

    document.getElementById("highestGlucose").innerText =
      highest.toFixed(1);

    document.getElementById("latestMeal").innerText =
      data[0].food_name;
  }

  createChart([...data].reverse());

  data.forEach(meal => {

    const photoHtml = meal.photo_url
      ? `<img src="${meal.photo_url}"
             class="meal-photo"
             alt="Meal Photo">`
      : "";

    const beforeClass =
      getGlucoseClass(meal.glucose_before);

    const afterClass =
      getGlucoseClass(meal.glucose_after);

    mealList.innerHTML += `
      <div class="meal-card">

        ${photoHtml}

        <h3>${meal.food_name}</h3>

        <div class="meal-info">
          <strong>${meal.meal_type}</strong>
        </div>

        <div class="glucose-row">

          <span class="glucose-badge ${beforeClass}">
            Before: ${meal.glucose_before}
          </span>

          <span class="glucose-badge ${afterClass}">
            After: ${meal.glucose_after}
          </span>

        </div>

        <div class="meal-notes">
          ${meal.notes || "No notes"}
        </div>

      </div>
    `;
  });
}

loadMeals();