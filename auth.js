// Connect to Supabase
const client = supabase.createClient(
  "https://cujvvxyadxvlfvhgzlki.supabase.co",
  "sb_publishable_wogqNQurYqmvOx9FvoFxMQ_XyRMTxZ_"
);

function setMessage(text, isError = false) {
  const messageEl = document.getElementById("message");
  if (!messageEl) return;

  messageEl.textContent = text;
  messageEl.style.color = isError ? "#dc2626" : "#16a34a";
}

async function signUp() {
  const email = document.getElementById("email")?.value?.trim();
  const password = document.getElementById("password")?.value;

  if (!email || !password) {
    setMessage("Please enter both email and password.", true);
    return;
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  console.log("Signup Data:", data);
  console.log("Signup Error:", error);

  if (error) {
    setMessage(error.message, true);
    return;
  }

  setMessage("Account created! Check your email to confirm.");
}

async function signIn() {
  const email = document.getElementById("email")?.value?.trim();
  const password = document.getElementById("password")?.value;

  if (!email || !password) {
    setMessage("Please enter both email and password.", true);
    return;
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  console.log("Login Data:", data);
  console.log("Login Error:", error);

  if (error) {
    setMessage(error.message, true);
    return;
  }

  setMessage("Signing in...");
  window.location.href = "dashboard.html";
}

async function resetPassword() {
  const email = document.getElementById("email")?.value?.trim();

  if (!email) {
    setMessage("Enter your email first.", true);
    return;
  }

  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/reset-password.html",
  });

  if (error) {
    setMessage(error.message, true);
    return;
  }

  setMessage("Password reset email sent.");
}

function logOut() {
  client.auth.signOut();
  window.location.href = "index.html";
}
