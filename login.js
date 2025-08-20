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
        
        // Input validation
        this.signupPassword.addEventListener('input', () => this.validatePassword());
        this.confirmPassword.addEventListener('input', () => this.validatePassword());
    }

    checkExtensionConnection() {
        // Check if user came from the extension
        const urlParams = new URLSearchParams(window.location.search);
        const fromExtension = urlParams.get('from_extension');
        
        if (fromExtension) {
            this.showExtensionMessage();
        }
    }

    showExtensionMessage() {
        // Add a message indicating the user came from the extension
        const authHeader = document.querySelector('.auth-header');
        const extensionMsg = document.createElement('div');
        extensionMsg.className = 'extension-message';
        extensionMsg.innerHTML = `
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 0.75rem; margin-bottom: 1rem; font-size: 0.9rem; color: #0369a1;">
                🔗 Connected from StepDoc Extension
            </div>
        `;
        authHeader.appendChild(extensionMsg);
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
            // Simulate API call (replace with actual authentication)
            const userData = await this.authenticateUser(email, password, rememberMe);
            
            if (userData.success) {
                this.showSuccess('Login successful!');
                
                // Send data back to extension if available
                this.sendToExtension(userData.user);
                
                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                this.showError(userData.error || 'Login failed');
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
            // Simulate API call (replace with actual registration)
            const userData = await this.registerUser(name, email, password);
            
            if (userData.success) {
                this.showSuccess('Account created successfully!');
                
                // Send data back to extension if available
                this.sendToExtension(userData.user);
                
                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                this.showError(userData.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showError('An error occurred during registration');
        } finally {
            this.setLoadingState(submitBtn, false);
        }
    }

    async authenticateUser(email, password, rememberMe) {
        // Simulate API call - replace with actual authentication
        return new Promise((resolve) => {
            setTimeout(() => {
                // For demo purposes, accept any email/password combination
                if (email && password) {
                    resolve({
                        success: true,
                        user: {
                            id: Date.now(),
                            name: email.split('@')[0],
                            username: email.split('@')[0],
                            email: email,
                            avatar: null
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'Invalid credentials'
                    });
                }
            }, 1000);
        });
    }

    async registerUser(name, email, password) {
        // Simulate API call - replace with actual registration
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    user: {
                        id: Date.now(),
                        name: name,
                        username: email.split('@')[0],
                        email: email,
                        avatar: null
                    }
                });
            }, 1000);
        });
    }

    handleSocialLogin(provider) {
        // Implement social login functionality
        console.log(`Social login with ${provider}`);
        this.showError(`${provider} login not implemented yet`);
    }

    validatePassword() {
        const password = this.signupPassword.value;
        const confirmPassword = this.confirmPassword.value;
        
        if (confirmPassword && password !== confirmPassword) {
            this.confirmPassword.classList.add('error');
            this.confirmPassword.classList.remove('success');
        } else if (confirmPassword) {
            this.confirmPassword.classList.remove('error');
            this.confirmPassword.classList.add('success');
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    setLoadingState(button, loading) {
        if (loading) {
            button.disabled = true;
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.classList.remove('loading');
        }
    }

    sendToExtension(userData) {
        // Try to send data back to the Chrome extension
        try {
            // Check if we're in a Chrome extension context
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({
                    messageType: 'authCallback',
                    userData: userData
                });
            }
            
            // Also try postMessage for cross-tab communication
            window.parent.postMessage({
                type: 'STEPDOC_AUTH_SUCCESS',
                userData: userData
            }, '*');
            
            // Store in localStorage for the extension to pick up
            localStorage.setItem('stepdoc_user_data', JSON.stringify(userData));
            localStorage.setItem('stepdoc_auth_timestamp', Date.now().toString());
            
        } catch (error) {
            console.log('Extension communication not available:', error);
        }
    }

    showError(message) {
        this.clearErrors();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            font-size: 0.9rem;
        `;
        
        const activeForm = this.isLoginMode ? this.loginForm : this.signupForm;
        activeForm.insertBefore(errorDiv, activeForm.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    showSuccess(message) {
        this.clearErrors();
        
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #16a34a;
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            font-size: 0.9rem;
        `;
        
        const activeForm = this.isLoginMode ? this.loginForm : this.signupForm;
        activeForm.insertBefore(successDiv, activeForm.firstChild);
    }

    clearErrors() {
        // Remove existing error/success messages
        const messages = document.querySelectorAll('.error-message, .success-message');
        messages.forEach(msg => msg.remove());
        
        // Clear input error states
        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.classList.remove('error', 'success');
        });
    }
}

// Initialize the login page
document.addEventListener('DOMContentLoaded', () => {
    new LoginPage();
});

// Listen for messages from the extension
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'STEPDOC_AUTH_REQUEST') {
        // Handle authentication request from extension
        console.log('Auth request received from extension');
    }
});
