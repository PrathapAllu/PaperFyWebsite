class LoginPage {
    constructor() {
        this.isLoginMode = true;
        this.supabaseReady = false;
        this.init();
    }

    async init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupValidation();
        
        // Wait for Supabase to initialize
        await this.waitForAuth();
        this.supabaseReady = true;
        console.log('✅ StepDoc Login Page Ready');
    }

    async waitForAuth() {
        return new Promise((resolve) => {
            const checkAuth = () => {
                if (window.authService && window.testSupabaseConnection) {
                    resolve();
                } else {
                    setTimeout(checkAuth, 100);
                }
            };
            checkAuth();
        });
    }

    setupElements() {
        // Forms
        this.loginForm = document.getElementById('loginForm');
        this.signupForm = document.getElementById('signupForm');
        
        // Toggle elements
        this.toggleBtn = document.getElementById('toggleBtn');
        this.toggleText = document.getElementById('toggleText');
        
        // Login form elements
        this.loginEmail = document.getElementById('loginEmail');
        this.loginPassword = document.getElementById('loginPassword');
        this.rememberMe = document.getElementById('rememberMe');
        
        // Signup form elements
        this.signupName = document.getElementById('signupName');
        this.signupEmail = document.getElementById('signupEmail');
        this.signupPassword = document.getElementById('signupPassword');
        this.confirmPassword = document.getElementById('confirmPassword');
        this.agreeTerms = document.getElementById('agreeTerms');
        
        // Social buttons
        this.googleBtn = document.querySelector('.google-btn');
        this.githubBtn = document.querySelector('.github-btn');

        // Store original button text
        const loginBtn = this.loginForm?.querySelector('.auth-btn');
        const signupBtn = this.signupForm?.querySelector('.auth-btn');
        if (loginBtn) loginBtn.dataset.originalText = 'Sign In';
        if (signupBtn) signupBtn.dataset.originalText = 'Sign Up';
    }

    setupEventListeners() {
        // Form submissions
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        if (this.signupForm) {
            this.signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
        
        // Toggle between login and signup
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggleForms());
        }
        
        // Social login
        if (this.googleBtn) {
            this.googleBtn.addEventListener('click', () => this.handleSocialLogin('google'));
        }
        if (this.githubBtn) {
            this.githubBtn.addEventListener('click', () => this.handleSocialLogin('github'));
        }
    }

    setupValidation() {
        // Real-time email validation
        if (this.loginEmail) {
            this.loginEmail.addEventListener('input', () => this.validateEmailField(this.loginEmail));
        }
        if (this.signupEmail) {
            this.signupEmail.addEventListener('input', () => this.validateEmailField(this.signupEmail));
        }
        
        // Real-time password validation
        if (this.signupPassword) {
            this.signupPassword.addEventListener('input', () => this.validatePasswordField());
        }
        if (this.confirmPassword) {
            this.confirmPassword.addEventListener('input', () => this.validatePasswordMatch());
        }
        
        // Real-time name validation
        if (this.signupName) {
            this.signupName.addEventListener('input', () => this.validateNameField());
        }
    }

    validateEmailField(emailInput) {
        const email = emailInput.value.trim();
        const isValid = this.isValidEmail(email);
        
        this.updateFieldValidation(emailInput, isValid, email ? 'Please enter a valid email address' : '');
        return isValid;
    }

    validatePasswordField() {
        const password = this.signupPassword.value;
        const isValid = password.length >= 6;
        
        this.updateFieldValidation(
            this.signupPassword, 
            isValid, 
            password && !isValid ? 'Password must be at least 6 characters' : ''
        );
        
        // Also validate password match if confirm password has value
        if (this.confirmPassword && this.confirmPassword.value) {
            this.validatePasswordMatch();
        }
        
        return isValid;
    }

    validatePasswordMatch() {
        const password = this.signupPassword.value;
        const confirmPassword = this.confirmPassword.value;
        const isMatch = password === confirmPassword;
        
        this.updateFieldValidation(
            this.confirmPassword,
            isMatch,
            confirmPassword && !isMatch ? 'Passwords do not match' : ''
        );
        
        return isMatch;
    }

    validateNameField() {
        const name = this.signupName.value.trim();
        const isValid = name.length >= 2;
        
        this.updateFieldValidation(
            this.signupName,
            isValid,
            name && !isValid ? 'Name must be at least 2 characters' : ''
        );
        
        return isValid;
    }

    updateFieldValidation(field, isValid, errorMessage) {
        // Remove existing validation classes
        field.classList.remove('error', 'success');
        
        // Remove existing error message
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        if (field.value) {
            if (isValid) {
                field.classList.add('success');
            } else {
                field.classList.add('error');
                
                if (errorMessage) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'field-error';
                    errorDiv.textContent = errorMessage;
                    field.parentNode.appendChild(errorDiv);
                }
            }
        }
    }

    toggleForms() {
        this.isLoginMode = !this.isLoginMode;
        
        if (this.isLoginMode) {
            // Switch to login
            this.loginForm.classList.remove('hidden');
            this.signupForm.classList.add('hidden');
            this.toggleBtn.textContent = 'Sign up';
            this.toggleText.textContent = "Don't have an account?";
        } else {
            // Switch to signup
            this.loginForm.classList.add('hidden');
            this.signupForm.classList.remove('hidden');
            this.toggleBtn.textContent = 'Sign in';
            this.toggleText.textContent = 'Already have an account?';
        }
        
        // Clear form errors
        this.clearErrors();
    }

    async handleLogin(e) {
        e.preventDefault();
        
        if (!this.supabaseReady) {
            this.showError('Please wait, authentication is loading...');
            return;
        }
        
        const email = this.loginEmail.value.trim();
        const password = this.loginPassword.value;
        const rememberMe = this.rememberMe.checked;
        
        // Clear previous errors
        this.clearErrors();
        
        // Validation
        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }
        
        // Show loading state
        const submitBtn = this.loginForm.querySelector('.auth-btn');
        this.setLoadingState(submitBtn, true);
        
        try {
            console.log('🔄 Attempting login for:', email);
            
            const result = await authService.signIn(email, password);
            
            if (result.success) {
                this.showSuccess('Login successful! Redirecting...');
                
                // Store user data if remember me is checked
                if (rememberMe && result.data) {
                    localStorage.setItem('stepdoc_user', JSON.stringify(result.data));
                }
                
                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                this.showError(result.message || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            this.showError('An error occurred during login. Please try again.');
        } finally {
            this.setLoadingState(submitBtn, false);
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        
        if (!this.supabaseReady) {
            this.showError('Please wait, authentication is loading...');
            return;
        }
        
        const name = this.signupName.value.trim();
        const email = this.signupEmail.value.trim();
        const password = this.signupPassword.value;
        const confirmPassword = this.confirmPassword.value;
        const agreeTerms = this.agreeTerms?.checked;
        
        // Clear previous errors
        this.clearErrors();
        
        // Validation
        if (!name || !email || !password || !confirmPassword) {
            this.showError('Please fill in all fields');
            return;
        }
        
        if (!this.validateNameField()) {
            this.showError('Please enter a valid name (at least 2 characters)');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }
        
        if (password.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }
        
        if (agreeTerms === false) {
            this.showError('Please agree to the terms and conditions');
            return;
        }
        
        // Show loading state
        const submitBtn = this.signupForm.querySelector('.auth-btn');
        this.setLoadingState(submitBtn, true);
        
        try {
            console.log('🔄 Attempting signup for:', email);
            
            const result = await authService.signUp(email, password, name);
            
            if (result.success) {
                this.showSuccess('Account created successfully! Please check your email for verification.');
                
                // Clear form
                this.signupForm.reset();
                
                // Switch to login form after a delay
                setTimeout(() => {
                    this.toggleForms();
                    this.showInfo('Please verify your email address before signing in.');
                }, 3000);
            } else {
                this.showError(result.message || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('❌ Signup error:', error);
            this.showError('An error occurred during registration. Please try again.');
        } finally {
            this.setLoadingState(submitBtn, false);
        }
    }

    async handleSocialLogin(provider) {
        if (!this.supabaseReady) {
            this.showError('Please wait, authentication is loading...');
            return;
        }
        
        try {
            let result;
            if (provider === 'google') {
                result = await authService.signInWithGoogle();
            } else if (provider === 'github') {
                result = await authService.signInWithGitHub();
            }
            
            if (result && result.success) {
                this.showSuccess(result.message);
            } else {
                this.showError(`${provider} login failed. Please try again.`);
            }
        } catch (error) {
            console.error(`❌ ${provider} login error:`, error);
            this.showError(`${provider} login failed. Please try again.`);
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    setLoadingState(button, loading) {
        if (!button) return;
        
        if (loading) {
            button.disabled = true;
            button.innerHTML = '<div class="btn-loader"></div> Loading...';
            button.classList.add('loading');
        } else {
            button.disabled = false;
            const originalText = button.dataset.originalText || 'Submit';
            button.innerHTML = `<span class="btn-text">${originalText}</span>`;
            button.classList.remove('loading');
        }
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showInfo(message) {
        this.showMessage(message, 'info');
    }

    showMessage(message, type = 'error') {
        // Remove any existing messages
        this.clearMessages();
        
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message ${type}-message`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <span class="message-icon">${this.getMessageIcon(type)}</span>
                <span class="message-text">${message}</span>
            </div>
        `;
        
        // Insert at the top of the current form
        const activeForm = this.isLoginMode ? this.loginForm : this.signupForm;
        if (activeForm) {
            activeForm.insertBefore(messageDiv, activeForm.firstChild);
        }
        
        // Auto-remove success messages after 5 seconds
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 5000);
        }
    }

    getMessageIcon(type) {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'info': return 'ℹ️';
            default: return '⚠️';
        }
    }

    clearErrors() {
        this.clearMessages();
        this.clearFieldValidation();
    }

    clearMessages() {
        // Remove all message elements
        const messages = document.querySelectorAll('.auth-message');
        messages.forEach(msg => msg.remove());
    }

    clearFieldValidation() {
        // Remove field validation classes and error messages
        const fields = document.querySelectorAll('.form-input');
        fields.forEach(field => {
            field.classList.remove('error', 'success');
        });
        
        const fieldErrors = document.querySelectorAll('.field-error');
        fieldErrors.forEach(error => error.remove());
    }
}

// Initialize the login page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginPage();
});
