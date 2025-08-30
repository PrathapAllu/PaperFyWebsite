const supabaseUrl = 'https://bqemaogpiunlbdhzvlyd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1hb2dwaXVubGJkaHp2bHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTcwMTIsImV4cCI6MjA3MTM5MzAxMn0.TvzBF6pdrfAOLZUDISvebqYR71zKkZOX-jDlTvOMBQg';
window.supabaseLib = window.supabase;
window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
window.supabase = window.supabaseLib;
window.supabase.client = window.supabaseClient;

document.addEventListener('DOMContentLoaded', async function() {
    function getSupabaseClient() {
        if (typeof window !== 'undefined' && window.supabaseClient) {
            return window.supabaseClient;
        }
        return null;
    }
    let supabase = getSupabaseClient();
    if (!supabase && window.supabase && window.supabase.createClient) {
        const supabaseUrl = window.config?.getSupabaseUrl();
        const supabaseKey = window.config?.getSupabaseAnonKey();
        
        if (supabaseUrl && supabaseKey) {
            supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        }
    }
    if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        const rememberMeFlag = localStorage.getItem('stepdoc_remember_me') === 'true';
        if (session && session.user && (session.user.email_confirmed || rememberMeFlag)) {
            window.location.href = 'dashboard.html';
        }
    }
});
class LoginPage {
    constructor() {
        this.isLoginMode = true;
        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.checkExtensionConnection();
        this.handleEmailVerification();
        this.checkUrlMessage();
    }

    setupElements() {
        this.loginForm = document.getElementById('loginForm');
        this.loginEmail = document.getElementById('loginEmail');
        this.loginPassword = document.getElementById('loginPassword');
        this.rememberMe = document.getElementById('rememberMe');
        this.googleBtn = document.querySelector('.google-btn');
    }

    setupEventListeners() {
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        
        const forgotLink = document.querySelector('.forgot-link');
        if (forgotLink) {
            forgotLink.addEventListener('click', (e) => this.handleForgotPassword(e));
        }
        
        this.googleBtn.addEventListener('click', () => this.handleSocialLogin('google'));
        
        this.loginEmail.addEventListener('input', () => this.clearErrors());
        this.loginPassword.addEventListener('input', () => this.clearErrors());

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
            togglePassword.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    togglePassword.click();
                }
            });
        }
    }

    checkExtensionConnection() {
        const urlParams = new URLSearchParams(window.location.search);
        const fromExtension = urlParams.get('from_extension');
        
        if (fromExtension) {
            this.showExtensionMessage();
        }
    }

    async handleEmailVerification() {
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
            this.showError(decodeURIComponent(errorDescription || 'Email verification failed'));
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        if (accessToken && refreshToken) {
            try {
                const { data, error: sessionError } = await window.supabaseClient.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });

                if (sessionError) {
                    throw sessionError;
                }

                this.showSuccess('Email verified successfully! You can now sign in.');
                window.history.replaceState({}, document.title, window.location.pathname);
                
                if (this.loginEmail) {
                    this.loginEmail.value = data.user.email;
                    if (this.loginPassword) {
                        this.loginPassword.focus();
                    }
                }
                
                sessionStorage.setItem('email_just_verified', 'true');
            } catch (error) {
                this.showError('Email verification failed. Please try again.');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }

    checkUrlMessage() {
        const urlParams = new URLSearchParams(window.location.search);
        const message = urlParams.get('message');
        const email = urlParams.get('email');
        
        if (message) {
            this.showSuccess(decodeURIComponent(message));
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        if (email && this.loginEmail) {
            this.loginEmail.value = decodeURIComponent(email);
            if (this.loginPassword) {
                this.loginPassword.focus();
            }
        }
    }

    showExtensionMessage() {
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
            const result = await authService.signIn(email, password, rememberMe);
            if (result.success) {
                this.sendToExtension(result.data);
                const emailJustVerified = sessionStorage.getItem('email_just_verified') === 'true';
                if (emailJustVerified) {
                    sessionStorage.setItem('email_verified_and_logged_in', 'true');
                }
                window.location.href = 'dashboard.html?new_session=true';
            } else {
                this.showError(result.message || 'Login failed', result.error);
            }
        } catch (error) {
            this.showError('An error occurred during login');
        } finally {
            this.setLoadingState(submitBtn, false);
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        
        const email = this.loginEmail.value.trim();
        
        if (!email) {
            this.showError('Please enter your email address first');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }
        
        try {
            const forgotLink = document.querySelector('.forgot-link');
            const originalText = forgotLink.textContent;
            forgotLink.textContent = 'Sending...';
            forgotLink.style.pointerEvents = 'none';
            
            const result = await authService.resetPassword(email);
            
            if (result.success) {
                this.showSuccess(result.message);
                forgotLink.textContent = 'Email sent!';
                setTimeout(() => {
                    forgotLink.textContent = originalText;
                    forgotLink.style.pointerEvents = 'auto';
                }, 3000);
            } else {
                this.showError(result.message || 'Failed to send reset email', result.error);
                forgotLink.textContent = originalText;
                forgotLink.style.pointerEvents = 'auto';
            }
        } catch (error) {
            this.showError('An error occurred while sending reset email');
            const forgotLink = document.querySelector('.forgot-link');
            forgotLink.textContent = 'Forgot password?';
            forgotLink.style.pointerEvents = 'auto';
        }
    }

    async handleSocialLogin(provider) {
        try {
            const result = await authService.socialLogin(provider);
            
            if (result.success) {
                this.sendToExtension(result.data);
            } else {
                this.showError(result.message || `Failed to login with ${provider}`, result.error);
            }
        } catch (error) {
            this.showError(`An error occurred with ${provider} login: ${error.message || 'Unknown error'}`);
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
            if (window.chrome && window.chrome.runtime && window.chrome.runtime.onMessage) {
                window.chrome.runtime.sendMessage({
                    type: 'LOGIN_SUCCESS',
                    userData: userData
                });
            } else if (window.opener) {
                window.opener.postMessage({
                    type: 'LOGIN_SUCCESS',
                    userData: userData
                }, '*');
            }
        } catch (error) {
        }
    }

    showError(message, errorData = null) {
        this.clearErrors();
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        let displayMessage = message;
        let suggestions = [];
        let fieldErrors = [];
        
        if (errorData && typeof errorData === 'object') {
            displayMessage = errorData.message || message;
            suggestions = errorData.suggestions || [];
            fieldErrors = errorData.fields || [];
            
            if (fieldErrors.length > 0) {
                fieldErrors.forEach(fieldError => {
                    this.showFieldError(fieldError.field, fieldError.message);
                });
            }
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        
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
        
        errorDiv.innerHTML = `
            <div class="message-box error">
                <span class="message-icon" aria-hidden="true">⚠️</span>
                <div class="message-content">
                    <span class="message-text">${displayMessage}</span>
                    ${suggestionsHTML}
                </div>
                <button class="message-close" aria-label="Dismiss error" tabindex="0">×</button>
            </div>
        `;
        
        errorDiv.querySelector('.message-close').addEventListener('click', () => {
            if (errorDiv.parentNode) errorDiv.remove();
        });
        
        this.loginForm.insertBefore(errorDiv, this.loginForm.firstChild);
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

    static updatePrivacyLastUpdated() {
        const lastUpdatedElem = document.getElementById('lastUpdated');
        if (!lastUpdatedElem) return;
        const now = new Date();
        const baseDate = new Date('2025-08-27');
        const msInDay = 24 * 60 * 60 * 1000;
        const daysSinceBase = Math.floor((now - baseDate) / msInDay);
        const lastUpdateDays = daysSinceBase - (daysSinceBase % 5);
        const lastUpdateDate = new Date(baseDate.getTime() + lastUpdateDays * msInDay);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        lastUpdatedElem.textContent = 'Last updated: ' + lastUpdateDate.toLocaleDateString(undefined, options);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        let attempts = 0;
        const maxAttempts = 50;
        while (attempts < maxAttempts) {
            const supabaseAvailable = typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function';
            const authServiceAvailable = typeof authService !== 'undefined' && typeof authService.waitForSupabase === 'function';
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

        const rememberMeFlag = localStorage.getItem('stepdoc_remember_me') === 'true';
        if (rememberMeFlag) {
            const userCheck = await authService.getCurrentUser();
            if (userCheck.success && userCheck.data) {
                // Allow access if remember me is enabled, regardless of email confirmation
                window.location.href = 'dashboard.html';
                return;
            } else {
                localStorage.removeItem('stepdoc_remember_me');
            }
        }
        new LoginPage();
    } catch (error) {
    }
});