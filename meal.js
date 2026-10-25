const client = supabase.createClient(
  "https://cujvvxyadxvlfvhgzlki.supabase.co",
  "sb_publishable_wogqNQurYqmvOx9FvoFxMQ_XyRMTxZ_"
);

const mealForm = document.getElementById("mealForm");
const photoInput = document.getElementById("photo");
const photoPreview = document.getElementById("photoPreview");
const successMessage = document.getElementById("successMessage");
const glucoseBeforeInput = document.getElementById("glucoseBefore");
const glucoseAfterInput = document.getElementById("glucoseAfter");

function updateGlucoseStatus(inputId, statusId) {
  const input = document.getElementById(inputId);
  const status = document.getElementById(statusId);

  if (!input || !status) return;

  const rawValue = input.value.trim();
  const value = Number(rawValue);

  if (!rawValue || Number.isNaN(value)) {
    status.innerHTML = "";
    status.className = "glucose-status";
    return;
  }

  if (value < 7) {
    status.innerHTML = "🟢 In Range";
    status.className = "glucose-status status-good";
    return;
  }

  if (value < 10) {
    status.innerHTML = "🟡 Elevated";
    status.className = "glucose-status status-warning";
    return;
  }

  status.innerHTML = "🔴 High";
  status.className = "glucose-status status-high";
}

function handlePhotoPreview() {
  if (!photoInput || !photoPreview) return;

  const file = photoInput.files && photoInput.files[0];
  if (!file) {
    photoPreview.style.display = "none";
    photoPreview.src = "";
    return;
  }

  photoPreview.src = URL.createObjectURL(file);
  photoPreview.style.display = "block";
}

async function saveMeal(event) {
  event.preventDefault();

  if (!mealForm) return;

  const foodName = document.getElementById("food")?.value?.trim();
  const mealType = document.getElementById("mealType")?.value;
  const glucoseBefore = document.getElementById("glucoseBefore")?.value;
  const glucoseAfter = document.getElementById("glucoseAfter")?.value || null;
  const notes = document.getElementById("notes")?.value?.trim() || "";
  const photoFile = photoInput?.files?.[0] || null;

  if (!foodName || !mealType || !glucoseBefore) {
    alert("Please enter a meal name, meal type, and before-meal glucose reading.");
    return;
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      alert("No authenticated user found. Please sign in again.");
      return;
    }

    let photoUrl = null;

    if (photoFile) {
      const fileName = `${Date.now()}_${photoFile.name}`;
      const { error: uploadError } = await client.storage
        .from("meal-photos")
        .upload(fileName, photoFile);

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = client.storage.from("meal-photos").getPublicUrl(fileName);
      photoUrl = urlData?.publicUrl || null;
    }

    const { error } = await client.from("meals").insert([
      {
        user_id: user.id,
        food_name: foodName,
        meal_type: mealType,
        glucose_before: Number(glucoseBefore),
        glucose_after: glucoseAfter ? Number(glucoseAfter) : null,
        notes,
        photo_url: photoUrl,
      },
    ]);

    if (error) {
      throw error;
    }

    if (successMessage) {
      successMessage.style.display = "block";
    }

    window.setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1200);
  } catch (error) {
    console.error("Meal save error:", error);
    alert(error?.message || "Something went wrong while saving your meal.");
  }
}

if (photoInput) {
  photoInput.addEventListener("change", handlePhotoPreview);
}

if (glucoseBeforeInput) {
  glucoseBeforeInput.addEventListener("input", () => updateGlucoseStatus("glucoseBefore", "beforeStatus"));
}

if (glucoseAfterInput) {
  glucoseAfterInput.addEventListener("input", () => updateGlucoseStatus("glucoseAfter", "afterStatus"));
}

if (mealForm) {
  mealForm.addEventListener("submit", saveMeal);
}
