const client = supabase.createClient(
  "https://cujvvxyadxvlfvhgzlki.supabase.co",
  "sb_publishable_wogqNQurYqmvOx9FvoFxMQ_XyRMTxZ_"
);

const editId = new URLSearchParams(window.location.search).get("edit");
let existingPhotoUrl = null;

function parseNullableNumber(val) {
  if (val === "" || val === null || val === undefined) return null;
  const num = Number(val);
  return Number.isNaN(num) ? null : num;
}

function showStatus(message, isError = false) {
  const statusEl = document.getElementById("formStatus");
  if (!statusEl) {
    alert(message);
    return;
  }
  statusEl.textContent = message;
  statusEl.style.display = "block";
  statusEl.style.background = isError ? "#fee2e2" : "#dcfce7";
  statusEl.style.color = isError ? "#991b1b" : "#166534";
}

async function initEditMode() {
  if (!editId) return;

  const { data: meal, error } = await client
    .from("meals")
    .select("*")
    .eq("id", editId)
    .single();

  if (error || !meal) {
    console.error("Failed to load meal:", error);
    showStatus("Could not load meal for editing.", true);
    return;
  }

  document.title = "Edit Meal";
  const pageTitle = document.getElementById("mealPageTitle");
  if (pageTitle) pageTitle.textContent = "✏️ Edit Meal";

  const submitBtn = document.getElementById("submitMealBtn");
  if (submitBtn) submitBtn.textContent = "Update Meal";

  document.getElementById("foodName").value = meal.food_name ?? "";
  document.getElementById("mealType").value = meal.meal_type ?? "Breakfast";
  document.getElementById("glucoseBefore").value = meal.glucose_before ?? "";
  document.getElementById("glucoseAfter").value = meal.glucose_after ?? "";
  document.getElementById("mealNotes").value = meal.notes ?? "";

  if (meal.photo_url) {
    existingPhotoUrl = meal.photo_url;
    const preview = document.getElementById("photoPreview");
    if (preview) {
      preview.src = meal.photo_url;
      preview.style.display = "block";
    }
  }
}

const photoInput = document.getElementById("mealPhoto");
if (photoInput) {
  photoInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    const preview = document.getElementById("photoPreview");
    if (!file || !preview) return;
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
  });
}

const mealForm = document.getElementById("mealForm");
if (mealForm) {
  mealForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById("submitMealBtn");
    if (submitBtn) submitBtn.disabled = true;

    const payload = {
      food_name: document.getElementById("foodName").value.trim(),
      meal_type: document.getElementById("mealType").value,
      glucose_before: parseNullableNumber(document.getElementById("glucoseBefore").value),
      glucose_after: parseNullableNumber(document.getElementById("glucoseAfter").value),
      notes: document.getElementById("mealNotes").value.trim() || null,
    };

    if (existingPhotoUrl) {
      payload.photo_url = existingPhotoUrl;
    }

    let result;
    if (editId) {
      result = await client
        .from("meals")
        .update(payload)
        .eq("id", editId)
        .select();
    } else {
      result = await client
        .from("meals")
        .insert(payload)
        .select();
    }

    if (result.error) {
      console.error(result.error);
      showStatus(result.error.message || "Failed to save meal.", true);
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    showStatus(editId ? "Meal updated! Redirecting..." : "Meal saved! Redirecting...");
    setTimeout(() => {
      window.location.href = "meals.html";
    }, 500);
  });
}

initEditMode();
