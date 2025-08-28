const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const { body, validationResult, param, query } = require('express-validator');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variable validation
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
}

// Security configuration
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const JWT_SECRET = process.env.JWT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.supabase.io", "wss://realtime.supabase.io"]
        }
    }
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize()); // Remove any keys that contain prohibited characters
app.use(hpp()); // Protect against HTTP Parameter Pollution attacks

// CORS configuration with more security
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com', 'https://www.yourdomain.com'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

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

// Input validation middleware
const validateInput = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Invalid input data',
            errors: errors.array()
        });
    }
    next();
};

// CSRF protection middleware (simple token-based approach)
const generateCSRFToken = () => {
    return require('crypto').randomBytes(32).toString('hex');
};

const csrfProtection = (req, res, next) => {
    // Skip CSRF for GET requests and auth verification
    if (req.method === 'GET' || req.path === '/api/auth/verify') {
        return next();
    }

    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session?.csrfToken || req.cookies?.csrfToken;

    if (!token || !sessionToken || token !== sessionToken) {
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token'
        });
    }
    next();
};

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
    const token = generateCSRFToken();
    res.cookie('csrfToken', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000 // 1 hour
    });
    res.json({ csrfToken: token });
});

// Password hashing utilities
const hashPassword = async (password) => {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
};

const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// Local Authentication System with Password Hashing
// Note: This provides a secure local alternative to Supabase
// You can switch between local and Supabase auth based on your needs

// In-memory user storage (replace with database in production)
const users = new Map();

// Token blacklist for invalidated tokens
const tokenBlacklist = new Set();

// Refresh tokens storage (replace with database in production)
const refreshTokens = new Map();

// Local user registration with proper password hashing
app.post('/api/auth/local/register',
    authLimiter,
    [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
            .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
        body('name').optional().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
    ],
    csrfProtection,
    validateInput,
    async (req, res) => {
        try {
            const { email, password, name } = req.body;

            // Check if user already exists
            if (users.has(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists with this email'
                });
            }

            // Hash password
            const hashedPassword = await hashPassword(password);

            // Create user
            const user = {
                id: require('crypto').randomUUID(),
                email,
                name: name || email.split('@')[0],
                password: hashedPassword,
                createdAt: new Date(),
                verified: false
            };

            users.set(email, user);

            // Generate JWT access token (short-lived)
            const accessToken = jwt.sign(
                { id: user.id, email: user.email, type: 'access' },
                JWT_SECRET,
                { expiresIn: '15m' }
            );

            // Generate refresh token (long-lived)
            const refreshToken = jwt.sign(
                { id: user.id, email: user.email, type: 'refresh' },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Store refresh token
            refreshTokens.set(refreshToken, { userId: user.id, email: user.email, createdAt: new Date() });

            // Remove password from response
            const { password: _, ...userResponse } = user;

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user: userResponse,
                    accessToken,
                    refreshToken
                }
            });

        } catch (error) {
            console.error('Local registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
);

// Local user login with password verification
app.post('/api/auth/local/login',
    authLimiter,
    strictAuthLimiter,
    [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        body('password')
            .notEmpty()
            .withMessage('Password is required')
    ],
    csrfProtection,
    validateInput,
    async (req, res) => {
        try {
            const { email, password } = req.body;

            // Find user
            const user = users.get(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Verify password
            const isValidPassword = await comparePassword(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Generate JWT access token (short-lived)
            const accessToken = jwt.sign(
                { id: user.id, email: user.email, type: 'access' },
                JWT_SECRET,
                { expiresIn: '15m' }
            );

            // Generate refresh token (long-lived)
            const refreshToken = jwt.sign(
                { id: user.id, email: user.email, type: 'refresh' },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Store refresh token
            refreshTokens.set(refreshToken, { userId: user.id, email: user.email, createdAt: new Date() });

            // Remove password from response
            const { password: _, ...userResponse } = user;

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: userResponse,
                    accessToken,
                    refreshToken
                }
            });

        } catch (error) {
            console.error('Local login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
);

// Modern Authentication API with Supabase integration
const jwt = require('jsonwebtoken');

// Email/Password Login
app.post('/api/auth/login', 
    authLimiter, 
    strictAuthLimiter,
    [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
    ],
    csrfProtection,
    validateInput,
    async (req, res) => {
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
app.post('/api/auth/signup', 
    authLimiter,
    [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
            .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
        body('metadata').optional().isObject().withMessage('Metadata must be an object')
    ],
    csrfProtection,
    validateInput,
    async (req, res) => {
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
app.post('/api/auth/oauth/:provider', 
    authLimiter,
    [
        param('provider').isIn(['google', 'github', 'discord', 'facebook', 'twitter'])
            .withMessage('Unsupported OAuth provider'),
        body('redirectTo').optional().isURL().withMessage('Redirect URL must be valid')
    ],
    csrfProtection,
    validateInput,
    async (req, res) => {
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
app.post('/api/auth/reset-password', 
    authLimiter,
    [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address')
    ],
    csrfProtection,
    validateInput,
    async (req, res) => {
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
app.post('/api/auth/update-password',
    [
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
            .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
        body('accessToken').notEmpty().withMessage('Access token is required')
    ],
    csrfProtection,
    validateInput,
    async (req, res) => {
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

// Token refresh endpoint
app.post('/api/auth/refresh',
    [
        body('refreshToken').notEmpty().withMessage('Refresh token is required')
    ],
    csrfProtection,
    validateInput,
    async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token required'
            });
        }

        // Check if refresh token is blacklisted
        if (tokenBlacklist.has(refreshToken)) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token has been invalidated'
            });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, JWT_SECRET);
            if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type');
            }
        } catch (jwtError) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }

        // Check if refresh token exists in storage
        const storedToken = refreshTokens.get(refreshToken);
        if (!storedToken || storedToken.userId !== decoded.id) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Find user
        const user = Array.from(users.values()).find(u => u.id === decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
            { id: user.id, email: user.email, type: 'access' },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        // Generate new refresh token (rotation)
        const newRefreshToken = jwt.sign(
            { id: user.id, email: user.email, type: 'refresh' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Invalidate old refresh token
        refreshTokens.delete(refreshToken);
        tokenBlacklist.add(refreshToken);

        // Store new refresh token
        refreshTokens.set(newRefreshToken, { userId: user.id, email: user.email, createdAt: new Date() });

        res.json({
            success: true,
            message: 'Tokens refreshed successfully',
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            }
        });

    } catch (error) {
        console.error('Token refresh endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Logout
app.post('/api/auth/logout',
    [
        body('accessToken').optional().isString().withMessage('Access token must be a string'),
        body('refreshToken').optional().isString().withMessage('Refresh token must be a string')
    ],
    csrfProtection,
    validateInput,
    async (req, res) => {
    try {
        const { accessToken, refreshToken } = req.body;

        // Blacklist tokens to invalidate them
        if (accessToken) {
            tokenBlacklist.add(accessToken);
        }

        if (refreshToken) {
            tokenBlacklist.add(refreshToken);
            refreshTokens.delete(refreshToken);
        }

        // Also sign out from Supabase if using Supabase tokens
        if (accessToken) {
            try {
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error('Supabase logout error:', error);
                }
            } catch (supabaseError) {
                console.error('Supabase logout failed:', supabaseError);
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
app.post('/api/auth/verify',
    [
        body('accessToken').notEmpty().withMessage('Access token is required')
    ],
    validateInput,
    async (req, res) => {
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

        // Check if token is blacklisted
        if (tokenBlacklist.has(accessToken)) {
            return res.status(401).json({
                success: false,
                message: 'Token has been invalidated'
            });
        }

        // Try local JWT verification first
        try {
            const decoded = jwt.verify(accessToken, JWT_SECRET);
            if (decoded.type === 'access') {
                // For local tokens, find user
                const user = Array.from(users.values()).find(u => u.id === decoded.id);
                if (user) {
                    req.user = user;
                    req.accessToken = accessToken;
                    return next();
                }
            }
        } catch (jwtError) {
            // If JWT verification fails, try Supabase
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
