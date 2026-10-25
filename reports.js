const MEAL_KEY = "sargesSugarsMealsReport";
const ACTIVITY_KEY = "sargesSugarsActivities";

function readJson(key, fallback = []) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getMealsFromSupabase() {
  return readJson(MEAL_KEY, []);
}

function getActivities() {
  return readJson(ACTIVITY_KEY, []);
}

function renderReports() {
  const meals = getMealsFromSupabase();
  const activities = getActivities();

  const beforeValues = meals
    .map((meal) => Number(meal.glucose_before || 0))
    .filter((value) => value > 0);

  const afterValues = meals
    .map((meal) => Number(meal.glucose_after || 0))
    .filter((value) => value > 0);

  const totalActivityMinutes = activities.reduce((total, item) => total + Number(item.minutes || 0), 0);

  const averageBefore = beforeValues.length
    ? (beforeValues.reduce((sum, value) => sum + value, 0) / beforeValues.length).toFixed(1)
    : "0.0";

  const averageAfter = afterValues.length
    ? (afterValues.reduce((sum, value) => sum + value, 0) / afterValues.length).toFixed(1)
    : "0.0";

  const items = [
    { label: "Meals logged", value: meals.length, max: 10 },
    { label: "Average before", value: Number(averageBefore), max: 12 },
    { label: "Average after", value: Number(averageAfter), max: 12 },
    { label: "Activity minutes", value: totalActivityMinutes, max: 180 },
  ];

  const list = document.getElementById("reportList");
  if (!list) return;

  list.innerHTML = items
    .map((item) => {
      const percent = Math.min(100, (item.value / item.max) * 100);
      return `
        <div class="report-item">
          <div>
            <strong>${item.label}</strong>
            <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
          </div>
          <span>${item.value}</span>
        </div>
      `;
    })
    .join("");

  const reportMeals = document.getElementById("reportMeals");
  const reportAverage = document.getElementById("reportAverage");
  const reportAfter = document.getElementById("reportAfter");
  const reportActivity = document.getElementById("reportActivity");

  if (reportMeals) reportMeals.textContent = String(meals.length);
  if (reportAverage) reportAverage.textContent = averageBefore;
  if (reportAfter) reportAfter.textContent = averageAfter;
  if (reportActivity) reportActivity.textContent = String(totalActivityMinutes);
}

renderReports();
