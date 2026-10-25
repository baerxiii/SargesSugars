const darkModeToggle = document.getElementById("darkModeToggle");
const reminderToggle = document.getElementById("reminderToggle");

function applyTheme() {
  const darkMode = localStorage.getItem("sargesSugarsDarkMode") === "true";
  document.body.style.background = darkMode ? "#111827" : "#f4f7fb";
  document.body.style.color = darkMode ? "#f3f4f6" : "#111827";
  if (darkModeToggle) darkModeToggle.checked = darkMode;
}

if (darkModeToggle) {
  darkModeToggle.addEventListener("change", () => {
    localStorage.setItem("sargesSugarsDarkMode", darkModeToggle.checked ? "true" : "false");
    applyTheme();
  });
}

if (reminderToggle) {
  reminderToggle.addEventListener("change", () => {
    localStorage.setItem("sargesSugarsReminderToggle", reminderToggle.checked ? "true" : "false");
  });
}

applyTheme();
