document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  // Password toggle functionality
  const togglePasswordBtn = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("loginPassword");
  const eyeOpen = document.getElementById("eyeOpen");
  const eyeClosed = document.getElementById("eyeClosed");

  if (togglePasswordBtn && passwordInput && eyeOpen && eyeClosed) {
    togglePasswordBtn.addEventListener("click", function (e) {
      e.preventDefault();
      
      if (passwordInput.type === "password") {
        // Show password
        passwordInput.type = "text";
        eyeOpen.style.display = "none";
        eyeClosed.style.display = "block";
        togglePasswordBtn.setAttribute("aria-label", "Hide password");
        togglePasswordBtn.setAttribute("aria-pressed", "true");
      } else {
        // Hide password
        passwordInput.type = "password";
        eyeOpen.style.display = "block";
        eyeClosed.style.display = "none";
        togglePasswordBtn.setAttribute("aria-label", "Show password");
        togglePasswordBtn.setAttribute("aria-pressed", "false");
      }
    });
  }

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
