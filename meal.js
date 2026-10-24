const client = supabase.createClient(
  "https://cujvvxyadxvlfvhgzlki.supabase.co",
  "sb_publishable_wogqNQurYqmvOx9FvoFxMQ_XyRMTxZ_"
);

async function saveMeal() {

  try {

    console.log("===== SAVE MEAL STARTED =====");

    const food_name =
      document.getElementById("food").value;

    const meal_type =
      document.getElementById("mealType").value;

    const glucose_before =
      document.getElementById("glucoseBefore").value;

    const glucose_after =
      document.getElementById("glucoseAfter").value;

    const notes =
      document.getElementById("notes").value;

    const photoFile =
      document.getElementById("photo").files[0];

    console.log("Food:", food_name);
    console.log("Meal Type:", meal_type);
    console.log("Photo:", photoFile);

    // -------------------
    // AUTH DEBUG
    // -------------------

    const {
      data: { user }
    } = await client.auth.getUser();

    const session =
      await client.auth.getSession();

    console.log("Current User:", user);
    console.log("Current Session:", session);

    if (!user) {
      alert("No authenticated user found.");
      return;
    }

    let photo_url = null;

    // -------------------
    // PHOTO UPLOAD
    // -------------------

    if (photoFile) {

      console.log("Uploading photo...");
      console.log("User Before Upload:", user);

      const fileName =
        Date.now() + "_" + photoFile.name;

      const {
        data: uploadData,
        error: uploadError
      } = await client.storage
        .from("meal-photos")
        .upload(fileName, photoFile);

      console.log("Upload Data:", uploadData);
      console.log("Upload Error:", uploadError);

      if (uploadError) {

        alert(
          "UPLOAD ERROR:\n\n" +
          JSON.stringify(uploadError, null, 2)
        );

        return;
      }

      const { data: urlData } =
        client.storage
          .from("meal-photos")
          .getPublicUrl(fileName);

      console.log("Generated URL:", urlData.publicUrl);

      photo_url =
        urlData.publicUrl;
    }

    // -------------------
    // SAVE MEAL
    // -------------------

    const {
      data,
      error
    } = await client
      .from("meals")
      .insert([
        {
          user_id: user.id,
          food_name,
          meal_type,
          glucose_before,
          glucose_after,
          notes,
          photo_url
        }
      ]);

    console.log("Insert Data:", data);
    console.log("Insert Error:", error);

    if (error) {

      alert(
        "DATABASE ERROR:\n\n" +
        JSON.stringify(error, null, 2)
      );

      return;
    }

document
  .getElementById("successMessage")
  .style.display = "block";

setTimeout(() => {
  window.location.href =
    "dashboard.html";
}, 1500);

  }
  catch (err) {

    console.error(err);

    alert(
      "UNEXPECTED ERROR:\n\n" +
      err.message
    );

  }

document
  .getElementById("photo")
  .addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;

    const preview =
      document.getElementById("photoPreview");

    preview.src =
      URL.createObjectURL(file);

    preview.style.display =
      "block";
  });

function updateGlucoseStatus(
  inputId,
  statusId
) {

  const value =
    Number(
      document.getElementById(inputId).value
    );

  const status =
    document.getElementById(statusId);

  if (!value) {
    status.innerHTML = "";
    return;
  }

  if (value < 7) {

    status.innerHTML =
      "🟢 In Range";

    status.className =
      "glucose-status status-good";
  }
  else if (value < 10) {

    status.innerHTML =
      "🟡 Elevated";

    status.className =
      "glucose-status status-warning";
  }
  else {

    status.innerHTML =
      "🔴 High";

    status.className =
      "glucose-status status-high";
  }
}

document
  .getElementById("glucoseBefore")
  .addEventListener("input", () =>
    updateGlucoseStatus(
      "glucoseBefore",
      "beforeStatus"
    )
  );

document
  .getElementById("glucoseAfter")
  .addEventListener("input", () =>
    updateGlucoseStatus(
      "glucoseAfter",
      "afterStatus"
    )
  );

}