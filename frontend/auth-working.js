// Supabase Configuration
const SUPABASE_URL = 'https://bqemaogpiunlbdhzvlyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1hb2dwaXVubGJkaHp2bHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTcwMTIsImV4cCI6MjA3MTM5MzAxMn0.TvzBF6pdrfAOLZUDISvebqYR71zKkZOX-jDlTvOMBQg';

// Global Supabase client
let supabase = null;
let supabaseReady = false;

// Wait for Supabase to be loaded
function waitForSupabase() {
    return new Promise((resolve) => {
        if (supabaseReady && supabase) {
            resolve(supabase);
        } else {
            const checkSupabase = () => {
                if (window.supabase && window.supabase.createClient) {
                    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                    supabaseReady = true;
                    console.log('✅ Supabase client initialized');
                    resolve(supabase);
                } else {
                    setTimeout(checkSupabase, 100);
                }
            };
            checkSupabase();
        }
    });
}

// Authentication functions
class AuthService {
    
    // Sign up new user
    async signUp(email, password, name) {
        try {
            console.log('🔄 Starting signup for:', email);
            
            const client = await waitForSupabase();
            
            const { data, error } = await client.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: name
                    }
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
                message: error.message
            };
        }
    }
    
    // Sign in existing user
    async signIn(email, password) {
        try {
            console.log('🔄 Starting login for:', email);
            
            const client = await waitForSupabase();
            
            const { data, error } = await client.auth.signInWithPassword({
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
                message: error.message
            };
        }
    }
    
    // Sign out user
    async signOut() {
        try {
            const client = await waitForSupabase();
            
            const { error } = await client.auth.signOut();
            
            if (error) {
                throw error;
            }
            
            return {
                success: true,
                message: 'Logged out successfully'
            };
            
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Get current user
    async getCurrentUser() {
        try {
            const client = await waitForSupabase();
            
            const { data: { user } } = await client.auth.getUser();
            
            return {
                success: true,
                user: user
            };
            
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Social login (Google)
    async signInWithGoogle() {
        try {
            const client = await waitForSupabase();
            
            const { data, error } = await client.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            
            if (error) {
                throw error;
            }
            
            return {
                success: true,
                message: 'Redirecting to Google...'
            };
            
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Social login (GitHub)
    async signInWithGitHub() {
        try {
            const client = await waitForSupabase();
            
            const { data, error } = await client.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: window.location.origin
                }
            });
            
            if (error) {
                throw error;
            }
            
            return {
                success: true,
                message: 'Redirecting to GitHub...'
            };
            
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
}

// Create global auth service instance
const authService = new AuthService();

// Test function to verify connection
async function testSupabaseConnection() {
    try {
        console.log('🧪 Testing Supabase connection...');
        const client = await waitForSupabase();
        
        // Test the connection
        const { data, error } = await client.auth.getSession();
        
        if (error && error.message !== 'No session') {
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

// Export for global use
window.authService = authService;
window.testSupabaseConnection = testSupabaseConnection;
