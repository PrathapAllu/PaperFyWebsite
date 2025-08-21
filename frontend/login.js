class LoginPage {
    constructor() {
        this.isLoginMode = true;
        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.checkExtensionConnection();
        this.checkUrlMessage();
    }

    setupElements() {
        // Forms
        this.loginForm = document.getElementById('loginForm');
        
        // Login form elements
        this.loginEmail = document.getElementById('loginEmail');
        this.loginPassword = document.getElementById('loginPassword');
        this.rememberMe = document.getElementById('rememberMe');
        
        // Social buttons
        this.googleBtn = document.querySelector('.google-btn');
        this.githubBtn = document.querySelector('.github-btn');
    }

    setupEventListeners() {
        // Form submissions
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Social login
        this.googleBtn.addEventListener('click', () => this.handleSocialLogin('google'));
        this.githubBtn.addEventListener('click', () => this.handleSocialLogin('github'));
        
        // Input validation
        this.loginEmail.addEventListener('input', () => this.clearErrors());
        this.loginPassword.addEventListener('input', () => this.clearErrors());
    }

    checkExtensionConnection() {
        // Check if user came from the extension
        const urlParams = new URLSearchParams(window.location.search);
        const fromExtension = urlParams.get('from_extension');
        
        if (fromExtension) {
            this.showExtensionMessage();
        }
    }

    checkUrlMessage() {
        // Check for messages passed via URL (e.g., from signup page)
        const urlParams = new URLSearchParams(window.location.search);
        const message = urlParams.get('message');
        
        if (message) {
            this.showSuccess(decodeURIComponent(message));
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
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

    async handleLogin(e) {
        e.preventDefault();
        
        const email = this.loginEmail.value.trim();
        const password = this.loginPassword.value;
        const rememberMe = this.rememberMe.checked;
        
        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }
        
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
                    window.location.href = 'dashboard.html';
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

    async handleSocialLogin(provider) {
        try {
            this.showSuccess(`Connecting to ${provider}...`);
            
            // Use auth service for social login
            const result = await authService.socialLogin(provider);
            
            if (result.success) {
                this.showSuccess(`Successfully logged in with ${provider}!`);
                
                // Send data back to extension if available
                this.sendToExtension(result.data);
                
                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else {
                this.showError(result.message || `Failed to login with ${provider}`);
            }
        } catch (error) {
            console.error(`${provider} login error:`, error);
            this.showError(`An error occurred with ${provider} login`);
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    setLoadingState(button, loading) {
        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');
        
        if (loading) {
            btnText.style.display = 'none';
            btnLoader.classList.remove('hidden');
            button.disabled = true;
        } else {
            btnText.style.display = 'inline';
            btnLoader.classList.add('hidden');
            button.disabled = false;
        }
    }

    sendToExtension(userData) {
        try {
            // Check if we're in an extension context
            if (window.chrome && window.chrome.runtime && window.chrome.runtime.onMessage) {
                // Send message to extension
                window.chrome.runtime.sendMessage({
                    type: 'LOGIN_SUCCESS',
                    userData: userData
                });
                console.log('Login data sent to extension');
            } else if (window.opener) {
                // If opened as popup, send message to parent window
                window.opener.postMessage({
                    type: 'LOGIN_SUCCESS',
                    userData: userData
                }, '*');
                console.log('Login data sent to parent window');
            }
        } catch (error) {
            console.log('Extension communication not available:', error);
            // This is expected when not running in extension context
        }
    }

    showError(message) {
        this.clearErrors();
        
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div style="
                background: #fef2f2; 
                border: 1px solid #fecaca; 
                border-radius: 8px; 
                padding: 0.75rem; 
                margin-bottom: 1rem; 
                font-size: 0.9rem; 
                color: #dc2626;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            ">
                <span style="font-size: 1.1rem;">⚠️</span>
                ${message}
            </div>
        `;
        
        this.loginForm.insertBefore(errorDiv, this.loginForm.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    showSuccess(message) {
        this.clearErrors();
        
        const existingSuccess = document.querySelector('.success-message');
        if (existingSuccess) {
            existingSuccess.remove();
        }
        
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <div style="
                background: #f0fdf4; 
                border: 1px solid #bbf7d0; 
                border-radius: 8px; 
                padding: 0.75rem; 
                margin-bottom: 1rem; 
                font-size: 0.9rem; 
                color: #15803d;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            ">
                <span style="font-size: 1.1rem;">✅</span>
                ${message}
            </div>
        `;
        
        this.loginForm.insertBefore(successDiv, this.loginForm.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 5000);
    }

    clearErrors() {
        const errorMessage = document.querySelector('.error-message');
        const successMessage = document.querySelector('.success-message');
        
        if (errorMessage) errorMessage.remove();
        if (successMessage) successMessage.remove();
    }
}

// Initialize login page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing login page...');
    
    // Initialize Supabase first
    if (typeof supabase === 'undefined') {
        console.error('Supabase not loaded');
        alert('Authentication service not available. Please refresh the page.');
        return;
    }
    
    console.log('✅ Supabase loaded successfully');
    
    // Test Supabase connection
    if (typeof authService !== 'undefined' && authService.testSupabaseConnection) {
        authService.testSupabaseConnection();
    }
    
    // Initialize login page
    new LoginPage();
});
