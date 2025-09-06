document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  // Check if user came from password reset
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('reset') === 'success') {
    showLoginPageNotification("Password updated successfully! You can now log in with your new password.", "success");
  }

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

  // Forgot Password Modal functionality
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  const forgotPasswordModal = document.getElementById("forgotPasswordModal");
  const closeForgotModal = document.getElementById("closeForgotModal");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");

  if (forgotPasswordLink && forgotPasswordModal) {
    // Open modal when forgot password link is clicked
    forgotPasswordLink.addEventListener("click", function (e) {
      e.preventDefault();
      forgotPasswordModal.style.display = "flex";
      document.getElementById("resetEmail").focus();
    });

    // Close modal when X is clicked
    if (closeForgotModal) {
      closeForgotModal.addEventListener("click", function () {
        closeForgotPasswordModal();
      });
    }

    // Close modal when clicking outside of it
    window.addEventListener("click", function (e) {
      if (e.target === forgotPasswordModal) {
        closeForgotPasswordModal();
      }
    });

    // Close modal with Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && forgotPasswordModal.style.display === "flex") {
        closeForgotPasswordModal();
      }
    });

    // Function to close forgot password modal
    function closeForgotPasswordModal() {
      forgotPasswordModal.style.display = "none";
      forgotPasswordForm.reset();
      document.getElementById("resetMessage").style.display = "none";
    }

    // Handle forgot password form submission
    if (forgotPasswordForm) {
      forgotPasswordForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        
        const email = document.getElementById("resetEmail").value;
        const resetButton = document.getElementById("resetPasswordBtn");
        const btnText = resetButton.querySelector(".btn-text");
        const btnLoader = resetButton.querySelector(".btn-loader");
        const resetMessage = document.getElementById("resetMessage");

        // Show loading state
        btnText.style.display = "none";
        btnLoader.style.display = "block";
        resetButton.disabled = true;

        try {
          const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: `https://stepdoc-zeta.vercel.app/reset-password.html`
          });

          if (error) {
            throw error;
          }

          // Show success message briefly, then close modal
          resetMessage.textContent = "Password reset link has been sent to your email!";
          resetMessage.className = "reset-message success";
          resetMessage.style.display = "block";
          
          // Clear form
          forgotPasswordForm.reset();
          
          // Close modal after showing success for 2 seconds
          setTimeout(() => {
            forgotPasswordModal.style.display = "none";
            resetMessage.style.display = "none";
            
            // Show success notification on main page
            showLoginPageNotification("Password reset link sent! Check your email.", "success");
          }, 2000);

        } catch (error) {
          // Show error message
          resetMessage.textContent = error.message || "An error occurred. Please try again.";
          resetMessage.className = "reset-message error";
          resetMessage.style.display = "block";
        } finally {
          // Reset button state
          btnText.style.display = "block";
          btnLoader.style.display = "none";
          resetButton.disabled = false;
        }
      });
    }
  }

  // Function to show notifications on the login page
  function showLoginPageNotification(message, type) {
    // Remove any existing notification
    const existingNotification = document.querySelector('.login-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `login-notification ${type}`;
    notification.textContent = message;
    
    // Insert at the top of the auth-card
    const authCard = document.querySelector('.auth-card');
    const authHeader = document.querySelector('.auth-header');
    authCard.insertBefore(notification, authHeader.nextSibling);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 5000);
  }

  // Login form submission
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
