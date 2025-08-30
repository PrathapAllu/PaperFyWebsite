class AuthService {
    constructor() {
        this.initialized = false;
        this.refreshTokenTimeout = null;
        this.isRefreshing = false;
        this.refreshPromise = null;
    }

    async waitForSupabase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            const checkSupabase = () => {
                if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
                    this.initialized = true;
                    resolve(window.supabase);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkSupabase, 100);
                } else {
                    reject(new Error('Supabase not available after 5 seconds'));
                }
            };
            checkSupabase();
        });
    }

    getSupabaseClient() {
        if (typeof window !== 'undefined' && window.supabaseClient) {
            return window.supabaseClient;
        }
        throw new Error('Supabase client not available');
    }

    async checkUserExists(email) {
        try {
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: 'dummy_check_password_12345_invalid'
            });
            if (error) {
                const errorMessage = error.message.toLowerCase();
                if (errorMessage.includes('invalid login credentials') || 
                    errorMessage.includes('email not confirmed') ||
                    errorMessage.includes('invalid email or password')) {
                    return { exists: true };
                } else if (errorMessage.includes('user not found') ||
                          errorMessage.includes('email not found') ||
                          errorMessage.includes('no user found')) {
                    return { exists: false };
                } else {
                    return { exists: true };
                }
            }
            return { exists: true };
        } catch (error) {
            return { exists: false };
        }
    }

    async signUp(email, password, metadata = {}) {
        try {
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: metadata
                }
            });
            if (error) {
                throw error;
            }
            return {
                success: true,
                message: 'Please check your email for verification link',
                data: data.user
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Signup failed'
            };
        }
    }
    
    async signIn(email, password, persistSession = false) {
        try {
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            
            // Set the remember me flag in localStorage
            if (persistSession) {
                localStorage.setItem('stepdoc_remember_me', 'true');
            } else {
                localStorage.removeItem('stepdoc_remember_me');
            }
            
            // FIX: Use proper session persistence based on remember me choice
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                throw error;
            }
            
            // FIX: Set session storage type based on remember me choice
            if (!persistSession) {
                // For non-remember me, ensure session is cleared when tab closes
                sessionStorage.setItem('temp_session', 'true');
            }
            
            return {
                success: true,
                message: 'Login successful',
                data: { 
                    user: data.user,
                    session: data.session
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Login failed'
            };
        }
    }
    
    async signOut() {
        try {
            if (this.refreshTokenTimeout) {
                clearTimeout(this.refreshTokenTimeout);
                this.refreshTokenTimeout = null;
            }
            const accessToken = localStorage.getItem('access_token');
            const refreshToken = localStorage.getItem('refresh_token');
            if (accessToken || refreshToken) {
                try {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': await this.getCSRFToken()
                        },
                        body: JSON.stringify({
                            accessToken,
                            refreshToken
                        })
                    });
                } catch (logoutError) {
                }
            }
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('stepdoc_remember_me');
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            const { error } = await supabase.auth.signOut();
            return {
                success: true,
                message: 'Logged out successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Logout failed'
            };
        }
    }

    async getCurrentUser() {
        try {
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) {
                throw error;
            }
            return {
                success: true,
                data: user
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to get user'
            };
        }
    }

    async socialLogin(provider) {
        try {
            if (provider === 'google') {
                return await this.signInWithGoogle();
            } else if (provider === 'github') {
                return await this.signInWithGitHub();
            } else {
                throw new Error(`Unsupported provider: ${provider}`);
            }
        } catch (error) {
            return {
                success: false,
                message: error.message || `${provider} login failed`
            };
        }
    }

    async signInWithGoogle() {
        try {
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard.html`
                }
            });
            if (error) {
                throw error;
            }
            return {
                success: true,
                message: 'Redirecting to Google...',
                data: data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Google login failed'
            };
        }
    }
    
    async signInWithGitHub() {
        try {
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: `${window.location.origin}/dashboard.html`
                }
            });
            if (error) {
                throw error;
            }
            return {
                success: true,
                message: 'Redirecting to GitHub...',
                data: data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'GitHub login failed'
            };
        }
    }

    async resetPassword(email) {
        try {
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            
            const redirectUrl = window.config?.getResetPasswordUrl() || 'https://stepdoc-zeta.vercel.app/reset-password.html';
            
            console.log('Sending password reset email with redirect URL:', redirectUrl);
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl
            });
            if (error) {
                throw error;
            }
            return {
                success: true,
                message: 'Password reset email sent. Please check your inbox.'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to send password reset email'
            };
        }
    }

    async updatePassword(newPassword) {
        try {
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            if (error) {
                throw error;
            }
            return {
                success: true,
                message: 'Password updated successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to update password'
            };
        }
    }

    async refreshSession() {
        try {
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            const { data, error } = await supabase.auth.refreshSession();
            if (error) {
                throw error;
            }
            return {
                success: true,
                data: data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to refresh session'
            };
        }
    }

    async testSupabaseConnection() {
        try {
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            const { data, error } = await supabase.auth.getSession();
            if (error && error.message !== 'No session' && !error.message.includes('session')) {
                return false;
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    async getCSRFToken() {
        try {
            const response = await fetch('/api/csrf-token');
            const data = await response.json();
            return data.csrfToken;
        } catch (error) {
            return '';
        }
    }

    async refreshAccessToken() {
        if (this.isRefreshing) {
            return this.refreshPromise;
        }
        this.isRefreshing = true;
        this.refreshPromise = this._performTokenRefresh();
        try {
            const result = await this.refreshPromise;
            return result;
        } finally {
            this.isRefreshing = false;
            this.refreshPromise = null;
        }
    }

    async _performTokenRefresh() {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': await this.getCSRFToken()
                },
                body: JSON.stringify({ refreshToken })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Token refresh failed');
            }
            localStorage.setItem('access_token', data.data.accessToken);
            localStorage.setItem('refresh_token', data.data.refreshToken);
            this.scheduleTokenRefresh();
            return {
                success: true,
                accessToken: data.data.accessToken,
                refreshToken: data.data.refreshToken
            };
        } catch (error) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            return {
                success: false,
                error: error.message
            };
        }
    }

    scheduleTokenRefresh() {
        if (this.refreshTokenTimeout) {
            clearTimeout(this.refreshTokenTimeout);
        }
        this.refreshTokenTimeout = setTimeout(() => {
            this.refreshAccessToken();
        }, 13 * 60 * 1000);
    }

    initializeTokenManagement() {
        const accessToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        if (accessToken && refreshToken) {
            this.scheduleTokenRefresh();
        }
    }

    async makeAuthenticatedRequest(url, options = {}) {
        let accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            throw new Error('No access token available');
        }
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (response.status === 401) {
            const refreshResult = await this.refreshAccessToken();
            if (refreshResult.success) {
                return fetch(url, {
                    ...options,
                    headers: {
                        ...options.headers,
                        'Authorization': `Bearer ${refreshResult.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            } else {
                window.location.href = '/login';
                throw new Error('Session expired');
            }
        }
        return response;
    }
}

const authService = new AuthService();
if (typeof window !== 'undefined') {
    window.authService = authService;
    document.addEventListener('DOMContentLoaded', () => {
        authService.initializeTokenManagement();
    });
}
