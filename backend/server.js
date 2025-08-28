const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting middleware
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth attempts per windowMs
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
});

const strictAuthLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 login attempts per hour
    message: {
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts. Please try again in 1 hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api/', generalLimiter); // Apply general rate limiting to all API routes

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
app.post('/api/auth/login', authLimiter, strictAuthLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter both email and password.' 
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter a valid email address.' 
            });
        }

        // Authenticate with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('Login error:', error.message); // Log for debugging but don't expose
            return res.status(401).json({ 
                success: false, 
                message: sanitizeErrorMessage(error, 'Invalid email or password. Please check your credentials and try again.') 
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
            message: 'Unable to process login request. Please try again later.' 
        });
    }
});

// Email/Password Signup
app.post('/api/auth/signup', authLimiter, async (req, res) => {
    try {
        const { email, password, metadata = {} } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter both email and password.' 
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter a valid email address.' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters long.' 
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
            console.error('Signup error:', error.message); // Log for debugging but don't expose
            return res.status(400).json({ 
                success: false, 
                message: sanitizeErrorMessage(error, 'Unable to create account. Please try again.') 
            });
        }

        // Success response
        res.json({ 
            success: true, 
            message: 'Account created successfully! Please check your email for the verification link.',
            data: {
                user: data.user,
                session: data.session
            }
        });

    } catch (error) {
        console.error('Signup endpoint error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Unable to process registration. Please try again later.' 
        });
    }
});

// OAuth Login
app.post('/api/auth/oauth/:provider', authLimiter, async (req, res) => {
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
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please enter your email address.'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address.'
            });
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'https://stepdoc-zeta.vercel.app/reset-password.html'
        });

        if (error) {
            console.error('Password reset error:', error.message); // Log for debugging but don't expose
            return res.status(400).json({
                success: false,
                message: sanitizeErrorMessage(error, 'Unable to send password reset email. Please try again.')
            });
        }

        res.json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.'
        });

    } catch (error) {
        console.error('Password reset endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to process password reset request. Please try again later.'
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

// Error message sanitization function
function sanitizeErrorMessage(error, fallbackMessage = 'An error occurred') {
    if (!error) return fallbackMessage;
    
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    // Map of Supabase error messages to user-friendly messages
    const errorMappings = {
        'Invalid login credentials': 'Invalid email or password. Please check your credentials and try again.',
        'Email not confirmed': 'Please check your email and click the confirmation link before signing in.',
        'Too many requests': 'Too many attempts. Please wait a few minutes before trying again.',
        'User already registered': 'An account with this email already exists. Please sign in instead.',
        'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
        'Unable to validate email address': 'Please enter a valid email address.',
        'signup is disabled': 'Account registration is currently disabled. Please contact support.',
        'Email rate limit exceeded': 'Too many email requests. Please wait before requesting another.',
    };
    
    // Check for exact matches first
    if (errorMappings[errorMessage]) {
        return errorMappings[errorMessage];
    }
    
    // Check for partial matches
    for (const [key, value] of Object.entries(errorMappings)) {
        if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }
    
    // For authentication errors, provide generic message
    if (errorMessage.toLowerCase().includes('auth') || 
        errorMessage.toLowerCase().includes('login') || 
        errorMessage.toLowerCase().includes('password') ||
        errorMessage.toLowerCase().includes('credential')) {
        return 'Authentication failed. Please check your credentials and try again.';
    }
    
    // For validation errors, be more specific
    if (errorMessage.toLowerCase().includes('email')) {
        return 'Please enter a valid email address.';
    }
    
    if (errorMessage.toLowerCase().includes('password')) {
        return 'Password requirements not met. Please ensure it meets the minimum requirements.';
    }
    
    // Default fallback for any other errors
    return fallbackMessage;
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
