class LoginPage {
    constructor() {
        this.isLoginMode = true;
        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.checkExtensionConnection();
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
    }

    setupEventListeners() {
        // Form submissions
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        
        // Toggle between login and signup
        this.toggleBtn.addEventListener('click', () => this.toggleForms());
        
        // Social login
        this.googleBtn.addEventListener('click', () => this.handleSocialLogin('google'));
        this.githubBtn.addEventListener('click', () => this.handleSocialLogin('github'));
        
        // Real-time validation
        this.loginEmail.addEventListener('input', () => this.validateEmail(this.loginEmail));
        this.signupEmail.addEventListener('input', () => this.validateEmail(this.signupEmail));
        this.signupPassword.addEventListener('input', () => this.validatePassword());
        this.confirmPassword.addEventListener('input', () => this.validatePasswordMatch());
    }

    checkExtensionConnection() {
        // Check if this page was opened by a browser extension
        const urlParams = new URLSearchParams(window.location.search);
        const fromExtension = urlParams.get('from') === 'extension';
        
        if (fromExtension) {
            console.log('Opened from browser extension');
            // Add visual indicator or modify behavior for extension users
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
        
        const email = this.loginEmail.value.trim();
        const password = this.loginPassword.value;
        const rememberMe = this.rememberMe.checked;
        
        // Basic validation
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
            // Use auth service for login
            const result = await authService.signIn(email, password);
            
            if (result.success) {
                this.showSuccess(result.message || 'Login successful!');
                
                // Store user data if remember me is checked
                if (rememberMe && result.data) {
                    localStorage.setItem('stepdoc_user', JSON.stringify(result.data));
                }
                
                // Send data back to extension if available
                this.sendToExtension(result.data);
                
                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                this.showError(result.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('An error occurred during login');
        } finally {
            this.setLoadingState(submitBtn, false);
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        
        const name = this.signupName.value.trim();
        const email = this.signupEmail.value.trim();
        const password = this.signupPassword.value;
        const confirmPassword = this.confirmPassword.value;
        const agreeTerms = this.agreeTerms.checked;
        
        // Validation
        if (!name || !email || !password || !confirmPassword) {
            this.showError('Please fill in all fields');
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
        
        if (!agreeTerms) {
            this.showError('Please agree to the terms and conditions');
            return;
        }
        
        // Show loading state
        const submitBtn = this.signupForm.querySelector('.auth-btn');
        this.setLoadingState(submitBtn, true);
        
        try {
            // Use auth service for signup
            const result = await authService.signUp(email, password, name);
            
            if (result.success) {
                this.showSuccess(result.message || 'Account created successfully!');
                
                // Send data back to extension if available
                this.sendToExtension(result.data);
                
                // Switch to login form after successful signup
                setTimeout(() => {
                    this.toggleForms();
                    this.showSuccess('Please check your email to verify your account');
                }, 2000);
            } else {
                this.showError(result.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showError('An error occurred during registration');
        } finally {
            this.setLoadingState(submitBtn, false);
        }
    }

    async handleSocialLogin(provider) {
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
                this.showError('Social login failed');
            }
        } catch (error) {
            console.error('Social login error:', error);
            this.showError('Social login failed');
        }
    }

    validateEmail(emailInput) {
        const email = emailInput.value.trim();
        const isValid = this.isValidEmail(email);
        
        if (email && !isValid) {
            emailInput.classList.add('invalid');
        } else {
            emailInput.classList.remove('invalid');
        }
        
        return isValid;
    }

    validatePassword() {
        const password = this.signupPassword.value;
        const isValid = password.length >= 6;
        
        if (password && !isValid) {
            this.signupPassword.classList.add('invalid');
        } else {
            this.signupPassword.classList.remove('invalid');
        }
        
        // Also validate password match if confirm password has value
        if (this.confirmPassword.value) {
            this.validatePasswordMatch();
        }
        
        return isValid;
    }

    validatePasswordMatch() {
        const password = this.signupPassword.value;
        const confirmPassword = this.confirmPassword.value;
        const isMatch = password === confirmPassword;
        
        if (confirmPassword && !isMatch) {
            this.confirmPassword.classList.add('invalid');
        } else {
            this.confirmPassword.classList.remove('invalid');
        }
        
        return isMatch;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    setLoadingState(button, loading) {
        if (loading) {
            button.disabled = true;
            button.textContent = 'Loading...';
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || (this.isLoginMode ? 'Sign In' : 'Sign Up');
            button.classList.remove('loading');
        }
    }

    sendToExtension(userData) {
        // Send authentication data back to browser extension
        try {
            if (window.chrome && window.chrome.runtime) {
                window.chrome.runtime.sendMessage({
                    type: 'AUTH_SUCCESS',
                    userData: userData
                });
            }
            
            // Also try posting to parent window (for popup scenarios)
            if (window.opener) {
                window.opener.postMessage({
                    type: 'AUTH_SUCCESS',
                    userData: userData
                }, '*');
            }
            
            console.log('Authentication data sent to extension:', userData);
        } catch (error) {
            console.warn('Could not send data to extension:', error);
        }
    }

    showError(message) {
        // Remove any existing error messages
        this.clearErrors();
        
        // Create error element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        // Insert at the top of the current form
        const activeForm = this.isLoginMode ? this.loginForm : this.signupForm;
        activeForm.insertBefore(errorDiv, activeForm.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    showSuccess(message) {
        // Remove any existing messages
        this.clearErrors();
        
        // Create success element
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        
        // Insert at the top of the current form
        const activeForm = this.isLoginMode ? this.loginForm : this.signupForm;
        activeForm.insertBefore(successDiv, activeForm.firstChild);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    clearErrors() {
        // Remove all error and success messages
        const messages = document.querySelectorAll('.error-message, .success-message');
        messages.forEach(msg => {
            if (msg.parentNode) {
                msg.parentNode.removeChild(msg);
            }
        });
        
        // Remove invalid styling from inputs
        const invalidInputs = document.querySelectorAll('.invalid');
        invalidInputs.forEach(input => input.classList.remove('invalid'));
    }
}

// Initialize the login page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginPage();
});
