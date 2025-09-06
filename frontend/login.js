document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const rememberMe = document.getElementById("rememberMe").checked;
    const expiresIn = rememberMe ? 432000 : 86400;

    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password,
      options: { expiresIn }
    });

    if (!error && data.session) {
      window.location.href = "dashboard.html";
    } else {
      // Handle error UI (e.g., show error message)
    }
  });
});
