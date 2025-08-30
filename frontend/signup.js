class SignupPage {
    constructor() {
        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupValidation();

    }

    setupElements() {
        this.signupForm = document.getElementById('signupForm');
        
        this.firstName = document.getElementById('firstName');
        this.lastName = document.getElementById('lastName');
        this.email = document.getElementById('email');
        this.phone = document.getElementById('phone');
        this.password = document.getElementById('password');
        this.confirmPassword = document.getElementById('confirmPassword');
        this.agreeTerms = document.getElementById('agreeTerms');
        this.newsletter = document.getElementById('newsletter');
        
        this.submitBtn = document.getElementById('submitBtn');
        
        this.togglePassword = document.getElementById('togglePassword');
        this.toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
        
        this.firstNameValidation = document.getElementById('firstNameValidation');
        this.lastNameValidation = document.getElementById('lastNameValidation');
        this.emailValidation = document.getElementById('emailValidation');
        this.phoneValidation = document.getElementById('phoneValidation');
        this.passwordValidation = document.getElementById('passwordValidation');
        this.confirmPasswordValidation = document.getElementById('confirmPasswordValidation');
        this.passwordStrength = document.getElementById('passwordStrength');
        
        this.googleBtn = document.querySelector('.google-btn');
        
        this.messageContainer = document.getElementById('messageContainer');
        this.messageIcon = document.getElementById('messageIcon');
        this.messageText = document.getElementById('messageText');
        this.messageClose = document.getElementById('messageClose');
        
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    setupEventListeners() {

        this.signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        
        this.togglePassword.addEventListener('click', () => this.togglePasswordVisibility('password'));
        this.toggleConfirmPassword.addEventListener('click', () => this.togglePasswordVisibility('confirmPassword'));
        
        this.googleBtn.addEventListener('click', () => this.handleSocialSignup('google'));
        
        this.messageClose.addEventListener('click', () => this.hideMessage());
        
        let messageTimeout;
        const showMessage = this.showMessage.bind(this);
        this.showMessage = (message, type) => {
            clearTimeout(messageTimeout);
            showMessage(message, type);
            messageTimeout = setTimeout(() => this.hideMessage(), 5000);
        };
    }

    setupValidation() {

        this.firstName.addEventListener('input', () => this.validateFirstName());
        this.lastName.addEventListener('input', () => this.validateLastName());
        this.email.addEventListener('input', () => this.validateEmail());
        this.phone.addEventListener('input', () => this.validatePhone());
        this.password.addEventListener('input', () => {
            this.validatePassword();
            this.updatePasswordStrength();
            this.validateConfirmPassword();
        });
        this.confirmPassword.addEventListener('input', () => this.validateConfirmPassword());
        
        this.firstName.addEventListener('focus', () => this.clearValidation('firstName'));
        this.lastName.addEventListener('focus', () => this.clearValidation('lastName'));
        this.email.addEventListener('focus', () => this.clearValidation('email'));
        this.phone.addEventListener('focus', () => this.clearValidation('phone'));
        this.password.addEventListener('focus', () => this.clearValidation('password'));
        this.confirmPassword.addEventListener('focus', () => this.clearValidation('confirmPassword'));
    }


    validateFirstName() {
        const firstName = this.firstName.value.trim();
        const nameRegex = /^[a-zA-Z]{2,25}$/;
        
        if (!firstName) {
            this.setValidation('firstName', '', 'none');
            return false;
        } else if (!nameRegex.test(firstName)) {
            this.setValidation('firstName', 'Please enter a valid first name (2-25 characters, letters only)', 'error');
            return false;
        } else {
            this.setValidation('firstName', '', 'none');
            return true;
        }
    }

    validateLastName() {
        const lastName = this.lastName.value.trim();
        const nameRegex = /^[a-zA-Z]{2,25}$/;
        
        if (!lastName) {
            this.setValidation('lastName', '', 'none');
            return false;
        } else if (!nameRegex.test(lastName)) {
            this.setValidation('lastName', 'Please enter a valid last name (2-25 characters, letters only)', 'error');
            return false;
        } else {
            this.setValidation('lastName', '', 'none');
            return true;
        }
    }

    validateEmail() {
        const email = this.email.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            this.setValidation('email', '', 'none');
            return false;
        }
        
        if (!emailRegex.test(email)) {
            this.setValidation('email', 'Please enter a valid email address', 'error');
            return false;
        }
        
        if (email.length > 254) {
            this.setValidation('email', 'Email address is too long', 'error');
            return false;
        }
        
        this.setValidation('email', 'Email format is valid', 'success');
        return true;
    }

    validatePhone() {
        const phone = this.phone.value.trim();
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        
        if (!phone) {
            this.setValidation('phone', '', 'none');
            return false;
        } else if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
            this.setValidation('phone', 'Please enter a valid phone number', 'error');
            return false;
        } else {
            this.setValidation('phone', 'Phone number is valid', 'success');
            return true;
        }
    }

    validatePassword() {
        const password = this.password.value;
        const minLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        if (!password) {
            this.setValidation('password', '', 'none');
            return false;
        }
        
        if (password.length < 8) {
            this.setValidation('password', 'Password must be at least 8 characters long', 'error');
            return false;
        }
        
        const issues = [];
        if (!hasUpper) issues.push('one uppercase letter');
        if (!hasLower) issues.push('one lowercase letter');
        if (!hasNumber) issues.push('one number');
        if (!hasSpecial) issues.push('one special character');
        
        if (issues.length > 0) {
            this.setValidation('password', `Password needs: ${issues.join(', ')}`, 'error');
            return false;
        } else {
            this.setValidation('password', 'Strong password!', 'success');
            return true;
        }
    }

    validateConfirmPassword() {
        const password = this.password.value;
        const confirmPassword = this.confirmPassword.value;
        
        if (!confirmPassword) {
            this.setValidation('confirmPassword', '', 'none');
            return false;
        } else if (password !== confirmPassword) {
            this.setValidation('confirmPassword', 'Passwords do not match', 'error');
            return false;
        } else {
            this.setValidation('confirmPassword', 'Passwords match!', 'success');
            return true;
        }
    }

    updatePasswordStrength() {
        const password = this.password.value;
        const strengthBar = this.passwordStrength.querySelector('.strength-fill');
        const strengthText = this.passwordStrength.querySelector('.strength-text');
        
        if (!password) {
            this.passwordStrength.classList.remove('show');
            return;
        }
        
        this.passwordStrength.classList.add('show');
        
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
        
        strengthBar.classList.remove('weak', 'medium', 'good', 'strong');
        
        if (score <= 2) {
            strengthBar.classList.add('weak');
            strengthText.textContent = 'Weak password';
        } else if (score === 3) {
            strengthBar.classList.add('medium');
            strengthText.textContent = 'Medium password';
        } else if (score === 4) {
            strengthBar.classList.add('good');
            strengthText.textContent = 'Good password';
        } else {
            strengthBar.classList.add('strong');
            strengthText.textContent = 'Strong password';
        }
    }

    setValidation(field, message, type) {
        const validationElement = document.getElementById(`${field}Validation`);
        const inputElement = document.getElementById(field);
        
        validationElement.textContent = message;
        validationElement.className = `validation-message ${type}`;
        
        if (type === 'success') {
            inputElement.classList.remove('invalid');
            inputElement.classList.add('valid');
        } else if (type === 'error') {
            inputElement.classList.remove('valid');
            inputElement.classList.add('invalid');
        } else {
            inputElement.classList.remove('valid', 'invalid');
        }
    }

    clearValidation(field) {
        this.setValidation(field, '', 'none');
    }

    togglePasswordVisibility(fieldId) {
        const input = document.getElementById(fieldId);
        const toggleBtn = document.getElementById(`toggle${fieldId.charAt(0).toUpperCase() + fieldId.slice(1)}`);
        const eyeIcon = toggleBtn.querySelector('.eye-icon');
        
        if (input.type === 'password') {
            // Show password - use crossed out eye
            input.type = 'text';
            eyeIcon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke="white" stroke-width="2"/>
            `;
        } else {
            // Hide password - use normal eye
            input.type = 'password';
            eyeIcon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
            `;
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        
        const isFirstNameValid = this.validateFirstName();
        const isLastNameValid = this.validateLastName();
        const isEmailValid = this.validateEmail();
        const isPhoneValid = this.validatePhone();
        const isPasswordValid = this.validatePassword();
        const isConfirmPasswordValid = this.validateConfirmPassword();
        const isTermsAccepted = this.agreeTerms.checked;
        
        if (!isTermsAccepted) {
            this.showMessage('Please accept the Terms of Service and Privacy Policy', 'error');
            return;
        }
        
        if (!isFirstNameValid || !isLastNameValid || !isEmailValid || !isPhoneValid || !isPasswordValid || !isConfirmPasswordValid) {
            this.showMessage('Please fix all validation errors before submitting', 'error');
            return;
        }
        
        const userData = {
            email: this.email.value.trim(),
            password: this.password.value,
            options: {
                data: {
                    full_name: `${this.firstName.value.trim()} ${this.lastName.value.trim()}`,
                    first_name: this.firstName.value.trim(),
                    last_name: this.lastName.value.trim(),
                    phone: this.phone.value.trim(),
                    newsletter_subscription: this.newsletter.checked
                }
            }
        };
        
        try {
            this.setLoadingState(true);
            
            const result = await authService.signUp(userData.email, userData.password, userData.options.data);
            
            if (result.success) {
                this.showMessage('Account created successfully! Please check your email to verify your account.', 'success');
                this.signupForm.reset();
                this.passwordStrength.classList.remove('show');
                this.clearAllValidations();
                setTimeout(() => {
                    window.location.href = 'login.html?message=Please check your email to verify your account before signing in.';
                }, 3000);
            } else {
                const errorMsg = result.message || 'Failed to create account. Please try again.';
                if (errorMsg.toLowerCase().includes('user already registered') || 
                    errorMsg.toLowerCase().includes('already been registered') ||
                    errorMsg.toLowerCase().includes('email already registered')) {
                    this.showMessage('Account already exists. Redirecting to login...', 'info');
                    setTimeout(() => {
                        window.location.href = `login.html?message=Account already exists. Please sign in.&email=${encodeURIComponent(userData.email)}`;
                    }, 1500);
                } else {
                    this.showMessage(errorMsg, 'error', result.error);
                }
            }
            
        } catch (error) {

            this.showMessage('An error occurred during registration. Please try again.', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    async handleSocialSignup(provider) {
        try {
            this.setLoadingState(true);
            
            const result = await authService.socialLogin(provider);
            
            if (result.success) {
                this.showMessage(`Signing up with ${provider}...`, 'success');
                

                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                
            } else {
                this.showMessage(result.message || `Failed to sign up with ${provider}`, 'error', result.error);
            }
            
        } catch (error) {

            this.showMessage(`An error occurred with ${provider} signup`, 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    clearAllValidations() {
        const fields = ['firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword'];
        fields.forEach(field => this.clearValidation(field));
    }

    setLoadingState(isLoading) {
        if (isLoading) {
            this.submitBtn.disabled = true;
            this.submitBtn.querySelector('.btn-text').style.display = 'none';
            this.submitBtn.querySelector('.btn-spinner').style.display = 'flex';
            this.loadingOverlay.style.display = 'flex';
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.querySelector('.btn-text').style.display = 'inline';
            this.submitBtn.querySelector('.btn-spinner').style.display = 'none';
            this.loadingOverlay.style.display = 'none';
        }
    }

    showMessage(message, type = 'info', errorData = null) {

        let displayMessage = message;
        let suggestions = [];
        let fieldErrors = [];
        
        if (type === 'error' && errorData && typeof errorData === 'object') {
            displayMessage = errorData.message || message;
            suggestions = errorData.suggestions || [];
            fieldErrors = errorData.fields || [];
            

            if (fieldErrors.length > 0) {
                fieldErrors.forEach(fieldError => {
                    this.showFieldError(fieldError.field, fieldError.message);
                });
            }
        }
        

        let suggestionsHTML = '';
        if (suggestions.length > 0) {
            suggestionsHTML = `
                <div class="error-suggestions">
                    <p><strong>Try this:</strong></p>
                    <ul>
                        ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        this.messageText.innerHTML = displayMessage + suggestionsHTML;
        this.messageContainer.style.display = 'block';
        
        const messageContent = this.messageContainer.querySelector('.message-content');
        messageContent.className = `message-content ${type}`;
        

        switch (type) {
            case 'success':
                this.messageIcon.textContent = '✅';
                break;
            case 'error':
                this.messageIcon.textContent = '❌';
                break;
            case 'warning':
                this.messageIcon.textContent = '⚠️';
                break;
            default:
                this.messageIcon.textContent = 'ℹ️';
        }
    }
    
    showFieldError(fieldName, message) {
        const field = document.querySelector(`input[name="${fieldName}"], #${fieldName}, .${fieldName}-input`);
        if (field) {
            field.classList.add('error');
            

            const existingFieldError = field.parentNode.querySelector('.field-error');
            if (existingFieldError) {
                existingFieldError.remove();
            }
            

            const fieldErrorDiv = document.createElement('div');
            fieldErrorDiv.className = 'field-error';
            fieldErrorDiv.textContent = message;
            field.parentNode.appendChild(fieldErrorDiv);
            

            const removeError = () => {
                field.classList.remove('error');
                if (fieldErrorDiv.parentNode) {
                    fieldErrorDiv.remove();
                }
                field.removeEventListener('input', removeError);
                field.removeEventListener('focus', removeError);
            };
            
            field.addEventListener('input', removeError);
            field.addEventListener('focus', removeError);
        }
    }

    hideMessage() {
        this.messageContainer.style.display = 'none';
    }
}


document.addEventListener('DOMContentLoaded', async () => {

    
    try {

        let attempts = 0;
        const maxAttempts = 50;
        

        
        while (attempts < maxAttempts) {

            const supabaseAvailable = typeof window.supabase !== 'undefined' && 
                                    typeof window.supabase.createClient === 'function';
            

            const authServiceAvailable = typeof authService !== 'undefined' && 
                                       typeof authService.waitForSupabase === 'function';
            

            
            if (supabaseAvailable && authServiceAvailable) {

                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (attempts >= maxAttempts) {

            throw new Error('Services not available after waiting');
        }
        

        await authService.waitForSupabase();
        

        const connectionTest = await authService.testSupabaseConnection();
        if (!connectionTest) {
            throw new Error('Supabase connection test failed');
        }
        

        new SignupPage();

        
    } catch (error) {

        alert('Authentication service not available. Please refresh the page.');
    }
});


window.addEventListener('popstate', (event) => {

});


document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('phone');
    
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length > 0) {
                if (value.length <= 3) {
                    value = value;
                } else if (value.length <= 6) {
                    value = `${value.slice(0, 3)}-${value.slice(3)}`;
                } else if (value.length <= 10) {
                    value = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6)}`;
                } else {
                    value = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6, 10)}`;
                }
            }
            
            e.target.value = value;
        });
    }
});
