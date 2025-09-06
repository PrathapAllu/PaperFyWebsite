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
            redirectTo: `${window.location.origin}/reset-password.html`
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
    const privacyConsent = document.getElementById("privacyConsent").checked;
    
    // Clear any existing notifications
    const existingNotification = document.querySelector('.login-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // Validate privacy consent
    if (!privacyConsent) {
      showLoginPageNotification("Please agree to the Privacy Policy to continue.", "error");
      return;
    }

    // Basic validation
    if (!email || !password) {
      showLoginPageNotification("Please enter both email and password.", "error");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showLoginPageNotification("Please enter a valid email address.", "error");
      return;
    }

    const loginBtn = loginForm.querySelector('.login-btn');
    const btnText = loginBtn.querySelector('.btn-text');
    const btnLoader = loginBtn.querySelector('.btn-loader');
    
    // Show loading state
    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    loginBtn.disabled = true;

    try {
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password: password,
        options: {
          persistSession: rememberMe
        }
      });

      if (error) {
        throw error;
      }

      if (data.session && data.user) {
        // Store login preference
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberMe');
        }

        showLoginPageNotification("Login successful! Redirecting...", "success");
        
        // Redirect after short delay
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      }

    } catch (error) {
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = "Please check your email and confirm your account before logging in.";
      } else if (error.message.includes('Too many requests')) {
        errorMessage = "Too many login attempts. Please wait a moment and try again.";
      } else if (error.message.includes('network')) {
        errorMessage = "Network error. Please check your internet connection.";
      }
      
      showLoginPageNotification(errorMessage, "error");
    } finally {
      // Reset button state
      btnText.style.display = 'block';
      btnLoader.style.display = 'none';
      loginBtn.disabled = false;
    }
  });

  // Google OAuth Login
  const googleBtn = document.querySelector('.google-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async function() {
      const isProd = window.location.hostname.includes('vercel.app');
      const dashboardPath = isProd ? '/dashboard.html' : '/frontend/dashboard.html';
      try {
        const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}${dashboardPath}`
          }
        });
        
        if (error) {
          showLoginPageNotification('Google login failed. Please try again.', 'error');
        }
      } catch (error) {
        showLoginPageNotification('Google login failed. Please try again.', 'error');
      }
    });
  }
});
