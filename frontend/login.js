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
    }

    setupEventListeners() {
        // Form submissions
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Social login
    this.googleBtn.addEventListener('click', () => this.handleSocialLogin('google'));
        
        // Input validation
        this.loginEmail.addEventListener('input', () => this.clearErrors());
        this.loginPassword.addEventListener('input', () => this.clearErrors());

        // Password visibility toggle
        const togglePassword = document.getElementById('togglePassword');
        const eyeOpen = document.getElementById('eyeOpen');
        const eyeClosed = document.getElementById('eyeClosed');
        if (togglePassword && this.loginPassword) {
            togglePassword.addEventListener('click', () => {
                const isPassword = this.loginPassword.type === 'password';
                this.loginPassword.type = isPassword ? 'text' : 'password';
                eyeOpen.style.display = isPassword ? 'none' : '';
                eyeClosed.style.display = isPassword ? '' : 'none';
                togglePassword.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
                togglePassword.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
            });
            // Also allow keyboard toggle
            togglePassword.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    togglePassword.click();
                }
            });
        }
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
        const email = urlParams.get('email');
        
        if (message) {
            // Show a cleaner message for redirected users
            this.showSuccess(decodeURIComponent(message));
            // Clean URL immediately to avoid persistence
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // Pre-fill email if provided
        if (email && this.loginEmail) {
            this.loginEmail.value = decodeURIComponent(email);
            // Focus on password field if email is pre-filled
            if (this.loginPassword) {
                this.loginPassword.focus();
            }
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
            const result = await authService.signIn(email, password, rememberMe);
            if (result.success) {
                // Store user data if remember me is checked
                // No need to manually store user/session, Supabase handles persistence
                // Send data back to extension if available
                this.sendToExtension(result.data);
                // Redirect immediately
                window.location.href = 'dashboard.html';
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
            // Use auth service for social login
            const result = await authService.socialLogin(provider);
            if (result.success) {
                // Send data back to extension if available
                this.sendToExtension(result.data);
                // Redirect immediately
                window.location.href = 'dashboard.html';
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
        const loadingOverlay = document.getElementById('loginLoadingOverlay');
        if (loading) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'flex';
            button.disabled = true;
            if (loadingOverlay) {
                loadingOverlay.style.display = 'flex';
            }
        } else {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            button.disabled = false;
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
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
            <div class="message-box error">
                <span class="message-icon" aria-hidden="true">⚠️</span>
                <span class="message-text">${message}</span>
                <button class="message-close" aria-label="Dismiss error" tabindex="0">×</button>
            </div>
        `;
        errorDiv.querySelector('.message-close').addEventListener('click', () => {
            if (errorDiv.parentNode) errorDiv.remove();
        });
        this.loginForm.insertBefore(errorDiv, this.loginForm.firstChild);
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
            <div class="message-box success">
                <span class="message-icon" aria-hidden="true">✅</span>
                <span class="message-text">${message}</span>
                <button class="message-close" aria-label="Dismiss success" tabindex="0">×</button>
            </div>
        `;
        successDiv.querySelector('.message-close').addEventListener('click', () => {
            if (successDiv.parentNode) successDiv.remove();
        });
        this.loginForm.insertBefore(successDiv, this.loginForm.firstChild);
    }

    clearErrors() {
        const errorMessage = document.querySelector('.error-message');
        const successMessage = document.querySelector('.success-message');
        
        if (errorMessage) errorMessage.remove();
        if (successMessage) successMessage.remove();
    }
}

// Initialize login page when DOM is loaded

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing login page...');
    try {
        // Wait for services to be available with more detailed logging
        let attempts = 0;
        const maxAttempts = 50;
        console.log('⏳ Waiting for services to load...');
        while (attempts < maxAttempts) {
            const supabaseAvailable = typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function';
            const authServiceAvailable = typeof authService !== 'undefined' && typeof authService.waitForSupabase === 'function';
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

        // Check if user is already logged in and Remember Me is enabled
        const rememberMeFlag = localStorage.getItem('stepdoc_remember_me') === 'true';
        const userCheck = await authService.getCurrentUser();
        if (rememberMeFlag && userCheck.success && userCheck.data) {
            console.log('🔒 User already logged in with Remember Me, redirecting to dashboard...');
            window.location.href = 'dashboard.html';
            return;
        }

        // Initialize login page
        new LoginPage();
        console.log('✅ Login page initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize login page:', error);
        console.error('Error details:', error);
        alert('Authentication service not available. Please refresh the page.');
    }
});
