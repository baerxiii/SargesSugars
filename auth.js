// Connect to Supabase
const client = supabase.createClient(
  "https://cujvvxyadxvlfvhgzlki.supabase.co",
  "sb_publishable_wogqNQurYqmvOx9FvoFxMQ_XyRMTxZ_"
);

// Create Account
async function signUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await client.auth.signUp({
    email,
    password
  });

  console.log("Signup Data:", data);
  console.log("Signup Error:", error);

  document.getElementById("message").innerText =
    error ? error.message : "Account created! Check your email.";
}

// Sign In
async function signIn() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  console.log("Login Data:", data);
  console.log("Login Error:", error);

  if (error) {
    document.getElementById("message").innerText = error.message;
    return;
  }

  // Successful login
  window.location.href = "dashboard.html";
}