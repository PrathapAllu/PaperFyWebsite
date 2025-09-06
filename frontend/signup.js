document.addEventListener("DOMContentLoaded", function () {
  const signupForm = document.getElementById("signupForm");
  const submitBtn = document.getElementById("submitBtn");
  const btnText = submitBtn?.querySelector(".btn-text");
  const btnSpinner = submitBtn?.querySelector(".btn-spinner");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const messageContainer = document.getElementById("messageContainer");

  // Form validation rules
  const validationRules = {
    firstName: {
      required: true,
      minLength: 2,
      pattern: /^[a-zA-Z\s]+$/,
      message: "First name must be at least 2 characters and contain only letters"
    },
    lastName: {
      required: true,
      minLength: 2,
      pattern: /^[a-zA-Z\s]+$/,
      message: "Last name must be at least 2 characters and contain only letters"
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Please enter a valid email address"
    },
    phone: {
      required: true,
      pattern: /^[\+]?[1-9][\d]{0,15}$/,
      message: "Please enter a valid phone number"
    },
    password: {
      required: true,
      minLength: 8,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      message: "Password must be at least 8 characters with uppercase, lowercase, number, and special character"
    }
  };

  // Real-time validation
  function validateField(fieldName, value) {
    const rule = validationRules[fieldName];
    if (!rule) return { isValid: true };

    if (rule.required && !value.trim()) {
      return { isValid: false, message: `${fieldName} is required` };
    }

    if (rule.minLength && value.length < rule.minLength) {
      return { isValid: false, message: rule.message };
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      return { isValid: false, message: rule.message };
    }

    return { isValid: true };
  }

  // Show validation message
  function showValidationMessage(fieldName, message, isValid = false) {
    const validationElement = document.getElementById(`${fieldName}Validation`);
    const inputElement = document.getElementById(fieldName);
    
    if (validationElement) {
      validationElement.textContent = message;
      validationElement.className = `validation-message ${isValid ? 'success' : 'error'}`;
      validationElement.style.display = message ? 'block' : 'none';
    }

    if (inputElement) {
      inputElement.classList.toggle('error', !isValid && message);
      inputElement.classList.toggle('success', isValid && message);
    }
  }

  // Password strength calculator
  function calculatePasswordStrength(password) {
    let score = 0;
    let feedback = [];

    if (password.length >= 8) score += 1;
    else feedback.push("at least 8 characters");

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push("lowercase letter");

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push("uppercase letter");

    if (/\d/.test(password)) score += 1;
    else feedback.push("number");

    if (/[@$!%*?&]/.test(password)) score += 1;
    else feedback.push("special character");

    const strength = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
    return { score, strength, feedback };
  }

  // Update password strength indicator
  function updatePasswordStrength(password) {
    const strengthBar = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    
    if (!strengthBar || !strengthText) return;

    const { score, strength } = calculatePasswordStrength(password);
    const percentage = (score / 5) * 100;
    
    strengthBar.style.width = `${percentage}%`;
    strengthText.textContent = `Password strength: ${strength}`;
    
    // Color coding
    strengthBar.className = 'strength-fill';
    if (score <= 1) strengthBar.classList.add('very-weak');
    else if (score <= 2) strengthBar.classList.add('weak');
    else if (score <= 3) strengthBar.classList.add('fair');
    else if (score <= 4) strengthBar.classList.add('good');
    else strengthBar.classList.add('strong');
  }

  // Setup form field listeners
  ['firstName', 'lastName', 'email', 'phone', 'password'].forEach(fieldName => {
    const field = document.getElementById(fieldName);
    if (field) {
      field.addEventListener('blur', function() {
        const validation = validateField(fieldName, this.value);
        if (!validation.isValid) {
          showValidationMessage(fieldName, validation.message, false);
        } else {
          showValidationMessage(fieldName, '', true);
        }
      });

      field.addEventListener('input', function() {
        // Clear error state on input
        showValidationMessage(fieldName, '', true);
        
        // Update password strength in real-time
        if (fieldName === 'password') {
          updatePasswordStrength(this.value);
        }
      });
    }
  });

  // Confirm password validation
  const confirmPasswordField = document.getElementById('confirmPassword');
  if (confirmPasswordField) {
    confirmPasswordField.addEventListener('blur', function() {
      const password = document.getElementById('password').value;
      if (this.value && this.value !== password) {
        showValidationMessage('confirmPassword', 'Passwords do not match', false);
      } else if (this.value === password) {
        showValidationMessage('confirmPassword', '', true);
      }
    });
  }

  // Password toggle functionality
  function setupPasswordToggle(toggleId, passwordId) {
    const toggle = document.getElementById(toggleId);
    const password = document.getElementById(passwordId);
    
    if (toggle && password) {
      toggle.addEventListener('click', function(e) {
        e.preventDefault();
        const type = password.type === 'password' ? 'text' : 'password';
        password.type = type;
        
        const eyeIcon = toggle.querySelector('.eye-icon');
        if (eyeIcon) {
          eyeIcon.style.opacity = type === 'text' ? '0.7' : '1';
        }
      });
    }
  }

  setupPasswordToggle('togglePassword', 'password');
  setupPasswordToggle('toggleConfirmPassword', 'confirmPassword');

  // Show message to user
  function showMessage(message, type = 'error') {
    if (!messageContainer) return;
    
    const messageText = document.getElementById('messageText');
    const messageIcon = document.getElementById('messageIcon');
    
    if (messageText) messageText.textContent = message;
    if (messageIcon) {
      messageIcon.textContent = type === 'success' ? '✓' : '✗';
    }
    
    messageContainer.className = `message-container ${type}`;
    messageContainer.style.display = 'flex';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (messageContainer) {
        messageContainer.style.display = 'none';
      }
    }, 5000);
  }

  // Close message
  const messageClose = document.getElementById('messageClose');
  if (messageClose) {
    messageClose.addEventListener('click', () => {
      messageContainer.style.display = 'none';
    });
  }

  // Main signup form submission
  if (signupForm) {
    signupForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Get form data
      const formData = new FormData(this);
      const data = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
        agreeTerms: formData.get('agreeTerms'),
        newsletter: formData.get('newsletter')
      };

      // Validate all fields
      let isFormValid = true;
      for (const [fieldName, value] of Object.entries(data)) {
        if (fieldName === 'confirmPassword') continue;
        if (fieldName === 'agreeTerms' || fieldName === 'newsletter') continue;
        
        const validation = validateField(fieldName, value);
        if (!validation.isValid) {
          showValidationMessage(fieldName, validation.message, false);
          isFormValid = false;
        }
      }

      // Check password confirmation
      if (data.password !== data.confirmPassword) {
        showValidationMessage('confirmPassword', 'Passwords do not match', false);
        isFormValid = false;
      }

      // Check terms agreement
      if (!data.agreeTerms) {
        showMessage('Please agree to the Terms of Service and Privacy Policy');
        return;
      }

      if (!isFormValid) {
        showMessage('Please fix the errors above');
        return;
      }

      // Show loading state
      btnText.style.display = 'none';
      btnSpinner.style.display = 'block';
      submitBtn.disabled = true;
      loadingOverlay.style.display = 'flex';

      try {
        // Create user account
        const { data: authData, error: authError } = await window.supabaseClient.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: `${data.firstName} ${data.lastName}`,
              first_name: data.firstName,
              last_name: data.lastName,
              phone: data.phone,
              newsletter_consent: !!data.newsletter
            }
          }
        });

        if (authError) {
          throw authError;
        }

        if (authData.user && !authData.session) {
          // Email confirmation required
          showMessage('Please check your email and click the confirmation link to complete your registration.', 'success');
          signupForm.reset();
        } else if (authData.session) {
          // User logged in immediately
          showMessage('Account created successfully! Redirecting to dashboard...', 'success');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 2000);
        }

      } catch (error) {
        let errorMessage = 'An error occurred during signup. Please try again.';
        
        if (error.message.includes('already registered')) {
          errorMessage = 'This email is already registered. Please use a different email or try logging in.';
        } else if (error.message.includes('Password')) {
          errorMessage = 'Password does not meet security requirements.';
        } else if (error.message.includes('Email')) {
          errorMessage = 'Please enter a valid email address.';
        }
        
        showMessage(errorMessage);
      } finally {
        // Reset loading state
        btnText.style.display = 'block';
        btnSpinner.style.display = 'none';
        submitBtn.disabled = false;
        loadingOverlay.style.display = 'none';
      }
    });
  }

  // Google OAuth signup
  const googleBtn = document.querySelector('.google-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async function() {
      try {
        const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/frontend/dashboard.html`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            }
          }
        });
        
        if (error) {
          showMessage('Google signup failed. Please try again.');
        }
      } catch (error) {
        showMessage('Google signup failed. Please try again.');
      }
    });
  }
});
