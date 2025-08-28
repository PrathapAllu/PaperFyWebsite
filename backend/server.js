const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/signup.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/reset-password.html'));
});

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'StepDoc API is running' });
});

// Modern Authentication API with Supabase integration
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Email/Password Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide a valid email address' 
            });
        }

        // Authenticate with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('Login error:', error);
            return res.status(401).json({ 
                success: false, 
                message: error.message || 'Invalid credentials' 
            });
        }

        // Success response with user data and session
        res.json({ 
            success: true, 
            message: 'Login successful',
            data: {
                user: data.user,
                session: data.session
            }
        });

    } catch (error) {
        console.error('Login endpoint error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Email/Password Signup
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, metadata = {} } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide a valid email address' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters long' 
            });
        }

        // Sign up with Supabase
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        });

        if (error) {
            console.error('Signup error:', error);
            return res.status(400).json({ 
                success: false, 
                message: error.message || 'Signup failed' 
            });
        }

        // Success response
        res.json({ 
            success: true, 
            message: 'Please check your email for verification link',
            data: {
                user: data.user,
                session: data.session
            }
        });

    } catch (error) {
        console.error('Signup endpoint error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// OAuth Login
app.post('/api/auth/oauth/:provider', async (req, res) => {
    try {
        const { provider } = req.params;
        const { redirectTo } = req.body;

        // Validate provider
        const supportedProviders = ['google', 'github', 'discord', 'facebook', 'twitter'];
        if (!supportedProviders.includes(provider)) {
            return res.status(400).json({
                success: false,
                message: `Unsupported OAuth provider: ${provider}`
            });
        }

        // Generate OAuth URL
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: redirectTo || `${req.protocol}://${req.get('host')}/dashboard`
            }
        });

        if (error) {
            console.error(`${provider} OAuth error:`, error);
            return res.status(400).json({
                success: false,
                message: error.message || `${provider} login failed`
            });
        }

        res.json({
            success: true,
            message: `Redirecting to ${provider}...`,
            data: {
                url: data.url
            }
        });

    } catch (error) {
        console.error('OAuth endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Password Reset
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${req.protocol}://${req.get('host')}/reset-password`
        });

        if (error) {
            console.error('Password reset error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to send reset email'
            });
        }

        res.json({
            success: true,
            message: 'Password reset email sent'
        });

    } catch (error) {
        console.error('Password reset endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update Password
app.post('/api/auth/update-password', async (req, res) => {
    try {
        const { password, accessToken } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'New password is required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        // Set the session for this request
        const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
        
        if (userError || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Update password
        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            console.error('Password update error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update password'
            });
        }

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Password update endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
    try {
        const { accessToken } = req.body;

        if (accessToken) {
            // Set the session for this request
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('Logout error:', error);
            }
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Session verification endpoint
app.post('/api/auth/verify', async (req, res) => {
    try {
        const { accessToken } = req.body;
        
        if (!accessToken) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access token required' 
            });
        }

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        
        if (error || !user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }

        res.json({ 
            success: true, 
            user: user 
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get current user
app.get('/api/auth/user', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const accessToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        res.json({
            success: true,
            data: { user }
        });

    } catch (error) {
        console.error('Get user endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Authentication middleware
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const accessToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Add user to request object
        req.user = user;
        req.accessToken = accessToken;
        next();

    } catch (error) {
        console.error('Authentication middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const accessToken = authHeader && authHeader.split(' ')[1];

        if (accessToken) {
            const { data: { user }, error } = await supabase.auth.getUser(accessToken);
            if (!error && user) {
                req.user = user;
                req.accessToken = accessToken;
            }
        }
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

// Utility function for email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Payment API (placeholder for Stripe integration)
app.post('/api/payment/create-checkout', (req, res) => {
    // TODO: Implement Stripe checkout
    res.json({ message: 'Payment endpoint ready' });
});

// Subscription API
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Protected route - check subscription status
app.post('/api/subscription/status', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from authenticated user
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return res.json({ 
        active: false,
        message: 'No active subscription found' 
      });
    }
    
    return res.json({ 
      active: true, 
      subscription: data 
    });
    
  } catch (err) {
    console.error('Subscription status error:', err);
    return res.status(500).json({ 
      active: false, 
      message: 'Error checking subscription' 
    });
  }
});

app.listen(PORT, () => {
    console.log(`🚀 StepDoc server running on http://localhost:${PORT}`);
});
