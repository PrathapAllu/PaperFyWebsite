class SignupPage {
    constructor() {
        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupValidation();
        console.log('Signup page initialized');
    }

    setupElements() {
        // Form
        this.signupForm = document.getElementById('signupForm');
        
        // Form inputs
        this.fullName = document.getElementById('fullName');
        this.email = document.getElementById('email');
        this.phone = document.getElementById('phone');
        this.password = document.getElementById('password');
        this.confirmPassword = document.getElementById('confirmPassword');
        this.agreeTerms = document.getElementById('agreeTerms');
        this.newsletter = document.getElementById('newsletter');
        
        // Submit button
        this.submitBtn = document.getElementById('submitBtn');
        
        // Password toggles
        this.togglePassword = document.getElementById('togglePassword');
        this.toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
        
        // Validation elements
        this.nameValidation = document.getElementById('nameValidation');
        this.emailValidation = document.getElementById('emailValidation');
        this.phoneValidation = document.getElementById('phoneValidation');
        this.passwordValidation = document.getElementById('passwordValidation');
        this.confirmPasswordValidation = document.getElementById('confirmPasswordValidation');
        this.passwordStrength = document.getElementById('passwordStrength');
        
        // Social buttons
        this.googleBtn = document.querySelector('.google-btn');
        this.githubBtn = document.querySelector('.github-btn');
        
        // Message elements
        this.messageContainer = document.getElementById('messageContainer');
        this.messageIcon = document.getElementById('messageIcon');
        this.messageText = document.getElementById('messageText');
        this.messageClose = document.getElementById('messageClose');
        
        // Loading overlay
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    setupEventListeners() {
        // Form submission
        this.signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        
        // Password toggles
        this.togglePassword.addEventListener('click', () => this.togglePasswordVisibility('password'));
        this.toggleConfirmPassword.addEventListener('click', () => this.togglePasswordVisibility('confirmPassword'));
        
        // Social login buttons
        this.googleBtn.addEventListener('click', () => this.handleSocialSignup('google'));
        this.githubBtn.addEventListener('click', () => this.handleSocialSignup('github'));
        
        // Message close
        this.messageClose.addEventListener('click', () => this.hideMessage());
        
        // Auto-hide message after 5 seconds
        let messageTimeout;
        const showMessage = this.showMessage.bind(this);
        this.showMessage = (message, type) => {
            clearTimeout(messageTimeout);
            showMessage(message, type);
            messageTimeout = setTimeout(() => this.hideMessage(), 5000);
        };
    }

    setupValidation() {
        // Real-time validation
        this.fullName.addEventListener('input', () => this.validateName());
        this.email.addEventListener('input', () => this.validateEmail());
        this.phone.addEventListener('input', () => this.validatePhone());
        this.password.addEventListener('input', () => {
            this.validatePassword();
            this.updatePasswordStrength();
            this.validateConfirmPassword();
        });
        this.confirmPassword.addEventListener('input', () => this.validateConfirmPassword());
        
        // Focus events
        this.fullName.addEventListener('focus', () => this.clearValidation('name'));
        this.email.addEventListener('focus', () => this.clearValidation('email'));
        this.phone.addEventListener('focus', () => this.clearValidation('phone'));
        this.password.addEventListener('focus', () => this.clearValidation('password'));
        this.confirmPassword.addEventListener('focus', () => this.clearValidation('confirmPassword'));
    }

    // Validation Methods
    validateName() {
        const name = this.fullName.value.trim();
        const nameRegex = /^[a-zA-Z\s]{2,50}$/;
        
        if (!name) {
            this.setValidation('name', '', 'none');
            return false;
        } else if (!nameRegex.test(name)) {
            this.setValidation('name', 'Please enter a valid name (2-50 characters, letters only)', 'error');
            return false;
        } else {
            this.setValidation('name', 'Looks good!', 'success');
            return true;
        }
    }

    validateEmail() {
        const email = this.email.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            this.setValidation('email', '', 'none');
            return false;
        } else if (!emailRegex.test(email)) {
            this.setValidation('email', 'Please enter a valid email address', 'error');
            return false;
        } else {
            this.setValidation('email', 'Email format is valid', 'success');
            return true;
        }
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
        
        const issues = [];
        if (!minLength) issues.push('at least 8 characters');
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
        
        // Remove all strength classes
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
        const inputElement = document.getElementById(field === 'name' ? 'fullName' : field);
        
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
            input.type = 'text';
            eyeIcon.textContent = '🙈';
        } else {
            input.type = 'password';
            eyeIcon.textContent = '👁️';
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        
        // Validate all fields
        const isNameValid = this.validateName();
        const isEmailValid = this.validateEmail();
        const isPhoneValid = this.validatePhone();
        const isPasswordValid = this.validatePassword();
        const isConfirmPasswordValid = this.validateConfirmPassword();
        const isTermsAccepted = this.agreeTerms.checked;
        
        if (!isTermsAccepted) {
            this.showMessage('Please accept the Terms of Service and Privacy Policy', 'error');
            return;
        }
        
        if (!isNameValid || !isEmailValid || !isPhoneValid || !isPasswordValid || !isConfirmPasswordValid) {
            this.showMessage('Please fix all validation errors before submitting', 'error');
            return;
        }
        
        // Prepare user data
        const userData = {
            email: this.email.value.trim(),
            password: this.password.value,
            options: {
                data: {
                    full_name: this.fullName.value.trim(),
                    phone: this.phone.value.trim(),
                    newsletter_subscription: this.newsletter.checked
                }
            }
        };
        
        try {
            this.setLoadingState(true);
            
            // First check if user already exists (silent check - no emails sent)
            console.log('🔍 Checking if user exists before signup...');
            const userExistsCheck = await authService.checkUserExists(userData.email);
            
            if (userExistsCheck.exists) {
                console.log('✅ User already exists, redirecting to login');
                this.setLoadingState(false);
                this.showMessage('Account already exists. Redirecting to login...', 'info');
                
                // Redirect to login page after 1.5 seconds (shorter delay)
                setTimeout(() => {
                    window.location.href = `login.html?message=Account already exists. Please sign in.&email=${encodeURIComponent(userData.email)}`;
                }, 1500);
                return;
            }
            
            console.log('✅ User does not exist, proceeding with signup');
            
            // Try to sign up - user doesn't exist
            const result = await authService.signUp(userData.email, userData.password, userData.options.data);
            
            console.log('🔍 Signup result:', result);
            console.log('🔍 Success:', result.success);
            console.log('🔍 Message:', result.message);
            
            // Handle signup result
            if (result.success) {
                this.showMessage('Account created successfully! Please check your email to verify your account.', 'success');
                
                // Clear form
                this.signupForm.reset();
                this.passwordStrength.classList.remove('show');
                this.clearAllValidations();
                
                // Redirect to login page after delay
                setTimeout(() => {
                    window.location.href = 'login.html?message=Please check your email to verify your account before signing in.';
                }, 3000);
                
            } else {
                // Signup failed for other reasons
                this.showMessage(result.message || 'Failed to create account. Please try again.', 'error');
            }
            
        } catch (error) {
            console.error('Signup error:', error);
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
                
                // Redirect to dashboard after successful social signup
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                
            } else {
                this.showMessage(result.message || `Failed to sign up with ${provider}`, 'error');
            }
            
        } catch (error) {
            console.error(`${provider} signup error:`, error);
            this.showMessage(`An error occurred with ${provider} signup`, 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    clearAllValidations() {
        const fields = ['name', 'email', 'phone', 'password', 'confirmPassword'];
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

    showMessage(message, type = 'info') {
        this.messageText.textContent = message;
        this.messageContainer.style.display = 'block';
        
        const messageContent = this.messageContainer.querySelector('.message-content');
        messageContent.className = `message-content ${type}`;
        
        // Set appropriate icon
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

    hideMessage() {
        this.messageContainer.style.display = 'none';
    }
}

// Initialize signup page when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing signup page...');
    
    try {
        // Wait for services to be available with more detailed logging
        let attempts = 0;
        const maxAttempts = 50;
        
        console.log('⏳ Waiting for services to load...');
        
        while (attempts < maxAttempts) {
            // Check Supabase
            const supabaseAvailable = typeof window.supabase !== 'undefined' && 
                                    typeof window.supabase.createClient === 'function';
            
            // Check AuthService
            const authServiceAvailable = typeof authService !== 'undefined' && 
                                       typeof authService.waitForSupabase === 'function';
            
            console.log(`Attempt ${attempts + 1}: Supabase=${supabaseAvailable}, AuthService=${authServiceAvailable}`);
            
            if (supabaseAvailable && authServiceAvailable) {
                console.log('✅ All services loaded successfully');
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            console.error('❌ Services not available after 5 seconds');
            throw new Error('Services not available after waiting');
        }
        
        // Wait for Supabase to be properly initialized
        console.log('⏳ Waiting for Supabase initialization...');
        await authService.waitForSupabase();
        
        // Test the connection
        console.log('🔍 Testing Supabase connection...');
        const connectionTest = await authService.testSupabaseConnection();
        if (!connectionTest) {
            throw new Error('Supabase connection test failed');
        }
        
        // Initialize signup page
        new SignupPage();
        console.log('✅ Signup page initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize signup page:', error);
        console.error('Error details:', error);
        alert('Authentication service not available. Please refresh the page.');
    }
});

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    console.log('Navigation state changed');
});

// Phone number formatting
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
