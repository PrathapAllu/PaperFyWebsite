// Authentication Service for StepDoc
// This service uses the globally initialized Supabase client

class AuthService {
    constructor() {
        this.initialized = false;
    }

    // Wait for Supabase to be available
    async waitForSupabase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const checkSupabase = () => {
                if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
                    console.log('✅ Supabase available');
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

    // Get the current Supabase client
    getSupabaseClient() {
        if (typeof window !== 'undefined' && window.supabase) {
            return window.supabase;
        }
        throw new Error('Supabase client not available');
    }

    // Sign up new user
    async signUp(email, password, metadata = {}) {
        try {
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            
            console.log('🔐 Signing up user:', email);
            
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: metadata
                }
            });
            
            if (error) {
                console.error('❌ Signup error:', error);
                throw error;
            }
            
            console.log('✅ Signup successful:', data);
            
            return {
                success: true,
                message: 'Please check your email for verification link',
                data: data.user
            };
            
        } catch (error) {
            console.error('❌ Signup failed:', error);
            return {
                success: false,
                message: error.message || 'Signup failed'
            };
        }
    }
    
    // Sign in existing user
    async signIn(email, password) {
        try {
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            
            console.log('🔐 Signing in user:', email);
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                console.error('❌ Login error:', error);
                throw error;
            }
            
            console.log('✅ Login successful:', data);
            
            return {
                success: true,
                message: 'Login successful',
                data: { 
                    user: data.user,
                    session: data.session
                }
            };
            
        } catch (error) {
            console.error('❌ Login failed:', error);
            return {
                success: false,
                message: error.message || 'Login failed'
            };
        }
    }
    
    // Sign out user
    async signOut() {
        try {
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            
            console.log('🚪 Signing out user');
            
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('❌ Logout error:', error);
                throw error;
            }
            
            console.log('✅ Logout successful');
            
            return {
                success: true,
                message: 'Logged out successfully'
            };
            
        } catch (error) {
            console.error('❌ Logout failed:', error);
            return {
                success: false,
                message: error.message || 'Logout failed'
            };
        }
    }

    // Get current user
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

    // Social login wrapper
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

    // Social login (Google)
    async signInWithGoogle() {
        try {
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            
            console.log('🔐 Signing in with Google');
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard.html`
                }
            });
            
            if (error) {
                console.error('❌ Google login error:', error);
                throw error;
            }
            
            return {
                success: true,
                message: 'Redirecting to Google...',
                data: data
            };
            
        } catch (error) {
            console.error('❌ Google login failed:', error);
            return {
                success: false,
                message: error.message || 'Google login failed'
            };
        }
    }
    
    // Social login (GitHub)
    async signInWithGitHub() {
        try {
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            
            console.log('🔐 Signing in with GitHub');
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: `${window.location.origin}/dashboard.html`
                }
            });
            
            if (error) {
                console.error('❌ GitHub login error:', error);
                throw error;
            }
            
            return {
                success: true,
                message: 'Redirecting to GitHub...',
                data: data
            };
            
        } catch (error) {
            console.error('❌ GitHub login failed:', error);
            return {
                success: false,
                message: error.message || 'GitHub login failed'
            };
        }
    }

    // Test Supabase connection
    async testSupabaseConnection() {
        try {
            console.log('🧪 Testing Supabase connection...');
            await this.waitForSupabase();
            const supabase = this.getSupabaseClient();
            
            // Test the connection by getting session
            const { data, error } = await supabase.auth.getSession();
            
            if (error && error.message !== 'No session' && !error.message.includes('session')) {
                console.error('❌ Connection test failed:', error);
                return false;
            }
            
            console.log('✅ Supabase connection working!');
            return true;
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            return false;
        }
    }
}

// Create global auth service instance
const authService = new AuthService();

// Make it available globally
if (typeof window !== 'undefined') {
    window.authService = authService;
}

// Log when auth service is loaded
console.log('🔧 AuthService loaded and ready');
