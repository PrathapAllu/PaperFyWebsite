class PasswordReset {
    constructor() {
        this.form = document.getElementById('resetForm');
        this.newPasswordInput = document.getElementById('newPassword');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
        this.resetBtn = document.getElementById('resetBtn');
        this.errorMessage = document.getElementById('errorMessage');
        this.successMessage = document.getElementById('successMessage');
        
        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handlePasswordReset(e));
        this.confirmPasswordInput.addEventListener('input', () => this.validatePasswordMatch());
        this.checkForTokens();
    }

    checkForTokens() {
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const type = urlParams.get('type');

        if (type === 'recovery' && accessToken) {
            // Set the session with the tokens from the URL
            this.setRecoverySession(accessToken, refreshToken);
        } else {
            // No recovery tokens, redirect to login
            this.showError('Invalid or expired reset link. Please request a new password reset.');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        }
    }

    async setRecoverySession(accessToken, refreshToken) {
        try {
            const supabase = window.supabaseClient;
            
            // Set the session using the recovery tokens
            const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });

            if (error) {
                console.error('Session setup error:', error);
                this.showError('Invalid or expired reset link. Please request a new password reset.');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
                return;
            }

            console.log('Recovery session established:', data);
            this.accessToken = accessToken;
            
        } catch (error) {
            console.error('Recovery session error:', error);
            this.showError('An error occurred. Please try again.');
        }
    }

    validatePasswordMatch() {
        const password = this.newPasswordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;
        
        if (confirmPassword && password !== confirmPassword) {
            this.confirmPasswordInput.setCustomValidity('Passwords do not match');
        } else {
            this.confirmPasswordInput.setCustomValidity('');
        }
    }

    async handlePasswordReset(e) {
        e.preventDefault();
        
        const password = this.newPasswordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;
        
        // Clear previous messages
        this.hideMessages();
        
        // Validation
        if (!password || !confirmPassword) {
            this.showError('Please fill in all fields');
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
        
        this.setLoadingState(true);
        
        try {
            const supabase = window.supabaseClient;
            
            // Update the password using Supabase
            const { data, error } = await supabase.auth.updateUser({
                password: password
            });
            
            if (error) {
                console.error('Password update error:', error);
                this.showError(error.message || 'Failed to update password');
                return;
            }
            
            console.log('Password updated successfully:', data);
            
            this.showSuccess('Password updated successfully! Redirecting to login...');
            
            // Redirect to login after success
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            
        } catch (error) {
            console.error('Password reset error:', error);
            this.showError('An error occurred while updating your password');
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(loading) {
        const btnText = this.resetBtn.querySelector('.btn-text');
        const btnLoader = this.resetBtn.querySelector('.btn-loader');
        
        if (loading) {
            this.resetBtn.disabled = true;
            if (btnText) btnText.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'block';
        } else {
            this.resetBtn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
        }
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
        this.successMessage.style.display = 'none';
    }

    showSuccess(message) {
        this.successMessage.textContent = message;
        this.successMessage.style.display = 'block';
        this.errorMessage.style.display = 'none';
    }

    hideMessages() {
        this.errorMessage.style.display = 'none';
        this.successMessage.style.display = 'none';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing password reset page...');
    
    // Wait for services to be available
    const waitForServices = async () => {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            const supabaseAvailable = typeof window.supabase !== 'undefined' && 
                                    typeof window.supabase.createClient === 'function';
            const authServiceAvailable = typeof authService !== 'undefined';
            
            if (supabaseAvailable && authServiceAvailable) {
                console.log('✅ All services loaded successfully');
                new PasswordReset();
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.error('❌ Services not available after 5 seconds');
        document.getElementById('errorMessage').textContent = 'Failed to load required services';
        document.getElementById('errorMessage').style.display = 'block';
    };
    
    waitForServices();
});
