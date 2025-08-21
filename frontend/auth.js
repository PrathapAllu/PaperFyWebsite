// Supabase Configuration
const SUPABASE_URL = 'https://bqemaogpiunlbdhzvlyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1hb2dwaXVubGJkaHp2bHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTcwMTIsImV4cCI6MjA3MTM5MzAxMn0.TvzBF6pdrfAOLZUDISvebqYR71zKkZOX-jDlTvOMBQg';

// Initialize Supabase client
let supabase;

// Load Supabase from CDN for browser use
function initSupabase() {
    if (typeof window !== 'undefined' && !supabase) {
        // Use CDN version for frontend
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase client initialized');
        };
        document.head.appendChild(script);
    }
}

// Authentication functions
class AuthService {
    
    // Sign up new user
    async signUp(email, password, name) {
        try {
            if (!supabase) {
                throw new Error('Supabase not initialized');
            }
            
            console.log('Signing up user:', email);
            
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: name
                    }
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
                message: error.message
            };
        }
    }
    
    // Sign in existing user
    async signIn(email, password) {
        try {
            if (!supabase) {
                throw new Error('Supabase not initialized');
            }
            
            console.log('Signing in user:', email);
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                throw error;
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
                message: error.message
            };
        }
    }
    
    // Sign out user
    async signOut() {
        try {
            // TODO: Replace with actual Supabase call
            // const { error } = await supabase.auth.signOut();
            
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
            // TODO: Replace with actual Supabase call
            // const { data: { user } } = await supabase.auth.getUser();
            
            return {
                success: true,
                user: null // Will return actual user data
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
            if (!supabase) {
                throw new Error('Supabase not initialized');
            }
            
            const { data, error } = await supabase.auth.signInWithOAuth({
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
            if (!supabase) {
                throw new Error('Supabase not initialized');
            }
            
            const { data, error } = await supabase.auth.signInWithOAuth({
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

// Initialize Supabase when page loads
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        initSupabase();
    });
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { authService, initSupabase };
}
