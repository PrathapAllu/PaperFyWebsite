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
      required: false, // Made optional
      validator: function(value, countryCode = '+1') {
        if (!value.trim()) return { isValid: true }; // Optional field
        
        // Remove all non-digits
        const cleaned = value.replace(/\D/g, '');
        
        // Country-specific validation
        switch(countryCode) {
          case '+1': // US/Canada
            return {
              isValid: cleaned.length === 10,
              message: "Please enter a valid 10-digit US phone number"
            };
          case '+44': // UK
            return {
              isValid: cleaned.length >= 10 && cleaned.length <= 11,
              message: "Please enter a valid UK phone number"
            };
          case '+91': // India
            return {
              isValid: cleaned.length === 10,
              message: "Please enter a valid 10-digit Indian phone number"
            };
          case '+33': // France
            return {
              isValid: cleaned.length === 10,
              message: "Please enter a valid French phone number"
            };
          case '+49': // Germany
            return {
              isValid: cleaned.length >= 10 && cleaned.length <= 12,
              message: "Please enter a valid German phone number"
            };
          case '+61': // Australia
            return {
              isValid: cleaned.length === 9,
              message: "Please enter a valid 9-digit Australian phone number"
            };
          default:
            return {
              isValid: cleaned.length >= 7 && cleaned.length <= 15,
              message: "Please enter a valid phone number"
            };
        }
      },
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

    // Handle custom validator (for phone)
    if (rule.validator) {
      const countryCode = fieldName === 'phone' ? getCurrentCountryCode() : undefined;
      return rule.validator(value, countryCode);
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
      
      // Always show the element to maintain layout, but control visibility
      validationElement.style.display = 'flex';
      
      if (!message) {
        validationElement.style.visibility = 'hidden';
      } else {
        validationElement.style.visibility = 'visible';
      }
    }

    if (inputElement) {
      inputElement.classList.toggle('error', !isValid && message);
      inputElement.classList.toggle('success', isValid && message);
    }
  }

  // Clear all validation messages
  function clearAllValidationMessages() {
    const validationFields = ['firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword'];
    validationFields.forEach(fieldName => {
      showValidationMessage(fieldName, '', true);
    });
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

  // Setup form field listeners (excluding phone - handled separately)
  ['firstName', 'lastName', 'email', 'password'].forEach(fieldName => {
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

  // Terms checkbox event listener
  const agreeTermsCheckbox = document.getElementById('agreeTerms');
  if (agreeTermsCheckbox) {
    agreeTermsCheckbox.addEventListener('change', function() {
      const checkboxContainer = document.querySelector('.checkbox-container');
      if (checkboxContainer && this.checked) {
        // Remove any error highlighting when user checks the box
        checkboxContainer.style.border = '';
        checkboxContainer.style.padding = '';
      }
    });
  }

  // Phone number formatting and country selector functionality
  let currentCountryCode = '+1';
  let currentFormat = '(###) ###-####';

  function getCurrentCountryCode() {
    return currentCountryCode;
  }

  function formatPhoneNumber(value, format) {
    const cleaned = value.replace(/\D/g, '');
    let formatted = '';
    let cleanedIndex = 0;

    for (let i = 0; i < format.length && cleanedIndex < cleaned.length; i++) {
      if (format[i] === '#') {
        formatted += cleaned[cleanedIndex];
        cleanedIndex++;
      } else {
        formatted += format[i];
      }
    }

    return formatted;
  }

  // Country selector functionality
  const countrySelector = document.getElementById('countrySelector');
  const countryDropdown = document.getElementById('countryDropdown');
  const countryFlag = document.getElementById('countryFlag');
  const countryCodeSpan = document.getElementById('countryCode');
  const phoneInput = document.getElementById('phone');

  if (countrySelector && countryDropdown) {
    countrySelector.addEventListener('click', function(e) {
      e.preventDefault();
      const isOpen = countryDropdown.style.display === 'block';
      countryDropdown.style.display = isOpen ? 'none' : 'block';
      countrySelector.classList.toggle('active', !isOpen);
    });

    // Handle country selection
    countryDropdown.addEventListener('click', function(e) {
      const option = e.target.closest('.country-option');
      if (option) {
        const newCode = option.dataset.code;
        const newFlag = option.dataset.flag;
        const newFormat = option.dataset.format;

        currentCountryCode = newCode;
        currentFormat = newFormat;

        countryFlag.src = `https://flagcdn.com/w20/${newFlag}.png`;
        countryCodeSpan.textContent = newCode;
        
        // Update placeholder based on format
        const placeholderMap = {
          '(###) ###-####': '(555) 123-4567',
          '#### ### ####': '7911 123456',
          '##### #####': '98765 43210',
          '## ## ## ## ##': '01 23 45 67 89',
          '### ### ####': '030 1234567',
          '### ### ###': '412 345 678'
        };
        phoneInput.placeholder = placeholderMap[newFormat] || 'Enter phone number';

        // Clear and reformat current value
        if (phoneInput.value) {
          const cleaned = phoneInput.value.replace(/\D/g, '');
          phoneInput.value = formatPhoneNumber(cleaned, currentFormat);
        }

        countryDropdown.style.display = 'none';
        countrySelector.classList.remove('active');
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!countrySelector.contains(e.target) && !countryDropdown.contains(e.target)) {
        countryDropdown.style.display = 'none';
        countrySelector.classList.remove('active');
      }
    });
  }

  // Phone input formatting
  if (phoneInput) {
    phoneInput.addEventListener('input', function(e) {
      const cleaned = this.value.replace(/\D/g, '');
      const formatted = formatPhoneNumber(cleaned, currentFormat);
      this.value = formatted;

      // Clear validation message on input
      showValidationMessage('phone', '', true);
    });

    phoneInput.addEventListener('blur', function() {
      const validation = validateField('phone', this.value);
      if (!validation.isValid) {
        showValidationMessage('phone', validation.message, false);
      } else {
        showValidationMessage('phone', '', true);
      }
    });
  }



  // Show message to user
  function showMessage(message, type = 'error') {
    if (!messageContainer) return;
    
    const messageText = document.getElementById('messageText');
    const messageIcon = document.getElementById('messageIcon');
    
    if (messageText) {
      messageText.innerHTML = message;
    }
    if (messageIcon) {
      messageIcon.textContent = type === 'success' ? '✓' : '✗';
    }
    
    messageContainer.className = `message-container ${type}`;
    messageContainer.style.display = 'flex';
    

    setTimeout(() => {
      if (messageContainer) {
        messageContainer.style.display = 'none';
      }
    }, 7000);
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
        agreeTerms: formData.get('agreeTerms') === 'on', // Convert checkbox to boolean
        newsletter: formData.get('newsletter') === 'on'  // Convert checkbox to boolean
      };

      // Clear any existing error messages
      clearAllValidationMessages();

      // Check terms agreement first (similar to login page)
      if (!data.agreeTerms) {
        showMessage('Please agree to the Terms of Service and Privacy Policy to continue.');
        
        // Highlight the checkbox area
        const checkboxContainer = document.querySelector('.checkbox-container');
        if (checkboxContainer) {
          checkboxContainer.style.border = '1px solid #ef4444';
          checkboxContainer.style.borderRadius = '4px';
          checkboxContainer.style.padding = '8px';
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            checkboxContainer.style.border = '';
            checkboxContainer.style.padding = '';
          }, 3000);
        }
        
        // Focus the checkbox for accessibility
        const agreeTermsCheckbox = document.getElementById('agreeTerms');
        if (agreeTermsCheckbox) {
          agreeTermsCheckbox.focus();
        }
        return;
      }

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

        if (authData.session) {
          // User logged in immediately
          showMessage('Account created successfully! Redirecting to dashboard...', 'success');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 2000);
        } else {
          showMessage('If this email is not already registered, please check your email for a confirmation link. If you already have an account, <a href="login.html" style="color: inherit; text-decoration: underline;">please sign in instead</a>.');
        }

      } catch (error) {
        let errorMessage = 'An error occurred during signup. Please try again.';
        
        if (error.message.includes('already') || error.message.includes('duplicate')) {
          errorMessage = 'This email is already registered. <a href="login.html" style="color: inherit; text-decoration: underline;">Please sign in instead</a>';
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
      const isProd = window.location.hostname.includes('vercel.app');
      const dashboardPath = isProd ? '/dashboard.html' : '/frontend/dashboard.html';
      try {
        const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}${dashboardPath}`,
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
