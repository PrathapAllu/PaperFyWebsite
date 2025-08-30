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


const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    process.exit(1);
}


const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const JWT_SECRET = process.env.JWT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;


const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

const strictAuthLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts. Please try again in 1 hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});


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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(hpp());


app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com', 'https://www.yourdomain.com'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api/', generalLimiter);


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


app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'StepDoc API is running' });
});


const validateInput = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.path || error.param,
            message: error.msg,
            value: error.value,
            location: error.location
        }));
        
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            error: {
                type: 'VALIDATION_ERROR',
                code: 'INVALID_INPUT',
                details: 'Please check the highlighted fields and try again.',
                fields: formattedErrors
            }
        });
    }
    next();
};


const generateCSRFToken = () => {
    return require('crypto').randomBytes(32).toString('hex');
};

const csrfProtection = (req, res, next) => {

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


app.get('/api/csrf-token', (req, res) => {
    const token = generateCSRFToken();
    res.cookie('csrfToken', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000
    });
    res.json({ csrfToken: token });
});


const hashPassword = async (password) => {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
};

const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};




const users = new Map();


const tokenBlacklist = new Set();


const refreshTokens = new Map();


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


            if (users.has(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists with this email'
                });
            }


            const hashedPassword = await hashPassword(password);


            const user = {
                id: require('crypto').randomUUID(),
                email,
                name: name || email.split('@')[0],
                password: hashedPassword,
                createdAt: new Date(),
                verified: false
            };

            users.set(email, user);


            const accessToken = jwt.sign(
                { id: user.id, email: user.email, type: 'access' },
                JWT_SECRET,
                { expiresIn: '15m' }
            );


            const refreshToken = jwt.sign(
                { id: user.id, email: user.email, type: 'refresh' },
                JWT_SECRET,
                { expiresIn: '7d' }
            );


            refreshTokens.set(refreshToken, { userId: user.id, email: user.email, createdAt: new Date() });


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
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
);


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


            const user = users.get(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }


            const isValidPassword = await comparePassword(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }


            const accessToken = jwt.sign(
                { id: user.id, email: user.email, type: 'access' },
                JWT_SECRET,
                { expiresIn: '15m' }
            );


            const refreshToken = jwt.sign(
                { id: user.id, email: user.email, type: 'refresh' },
                JWT_SECRET,
                { expiresIn: '7d' }
            );


            refreshTokens.set(refreshToken, { userId: user.id, email: user.email, createdAt: new Date() });


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
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
);


const jwt = require('jsonwebtoken');


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
        

        if (!email || !password) {
            const errorResponse = createErrorResponse('Missing required fields', { endpoint: 'login', fields: ['email', 'password'] });
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter both email and password.',
                error: {
                    ...errorResponse,
                    type: 'VALIDATION_ERROR',
                    code: 'MISSING_FIELDS',
                    fields: [
                        ...((!email) ? [{ field: 'email', message: 'Email is required' }] : []),
                        ...((!password) ? [{ field: 'password', message: 'Password is required' }] : [])
                    ]
                }
            });
        }

        if (!isValidEmail(email)) {
            const errorResponse = createErrorResponse('Invalid email format', { endpoint: 'login', email });
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter a valid email address.',
                error: {
                    ...errorResponse,
                    type: 'VALIDATION_ERROR',
                    code: 'INVALID_EMAIL',
                    fields: [{ field: 'email', message: 'Please enter a valid email address' }]
                }
            });
        }


        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            const errorResponse = createErrorResponse(error, { endpoint: 'login', email });
            return res.status(401).json({ 
                success: false, 
                message: errorResponse.message,
                error: errorResponse
            });
        }


        res.json({ 
            success: true, 
            message: 'Login successful',
            data: {
                user: data.user,
                session: data.session
            }
        });

    } catch (error) {
        const errorResponse = createErrorResponse(error, { endpoint: 'login' });
        res.status(500).json({ 
            success: false, 
            message: errorResponse.message,
            error: errorResponse
        });
    }
});


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
        

        if (!email || !password) {
            const errorResponse = createErrorResponse('Missing required fields', { endpoint: 'signup', fields: ['email', 'password'] });
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter both email and password.',
                error: {
                    ...errorResponse,
                    type: 'VALIDATION_ERROR',
                    code: 'MISSING_FIELDS',
                    fields: [
                        ...((!email) ? [{ field: 'email', message: 'Email is required' }] : []),
                        ...((!password) ? [{ field: 'password', message: 'Password is required' }] : [])
                    ]
                }
            });
        }

        if (!isValidEmail(email)) {
            const errorResponse = createErrorResponse('Invalid email format', { endpoint: 'signup', email });
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter a valid email address.',
                error: {
                    ...errorResponse,
                    type: 'VALIDATION_ERROR',
                    code: 'INVALID_EMAIL',
                    fields: [{ field: 'email', message: 'Please enter a valid email address' }]
                }
            });
        }

        if (password.length < 8) {
            const errorResponse = createErrorResponse('Password too short', { endpoint: 'signup' });
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 8 characters long.',
                error: {
                    ...errorResponse,
                    type: 'VALIDATION_ERROR',
                    code: 'PASSWORD_TOO_SHORT',
                    fields: [{ field: 'password', message: 'Password must be at least 8 characters long' }]
                }
            });
        }


        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        });

        if (error) {
            const errorResponse = createErrorResponse(error, { endpoint: 'signup', email });
            return res.status(400).json({ 
                success: false, 
                message: errorResponse.message,
                error: errorResponse
            });
        }


        res.json({ 
            success: true, 
            message: 'Account created successfully! Please check your email for the verification link.',
            data: {
                user: data.user,
                session: data.session
            }
        });

    } catch (error) {
        const errorResponse = createErrorResponse(error, { endpoint: 'signup' });
        res.status(500).json({ 
            success: false, 
            message: errorResponse.message,
            error: errorResponse
        });
    }
});


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


        const supportedProviders = ['google', 'github', 'discord', 'facebook', 'twitter'];
        if (!supportedProviders.includes(provider)) {
            return res.status(400).json({
                success: false,
                message: `Unsupported OAuth provider: ${provider}`
            });
        }


        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: redirectTo || `${req.protocol}://${req.get('host')}/dashboard`
            }
        });

        if (error) {
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
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});


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

        const host = req.get('host') || '';
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
        const redirectUrl = isLocalhost 
            ? 'http://localhost:3000/reset-password.html'
            : 'https://stepdoc-zeta.vercel.app/reset-password.html';
            
        console.log('Password reset request for email:', email, 'with redirect URL:', redirectUrl);
            
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        });

        if (error) {
            const errorResponse = createErrorResponse(error, { endpoint: 'reset-password', email });
            return res.status(400).json({
                success: false,
                message: errorResponse.message,
                error: errorResponse
            });
        }

        res.json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.'
        });

    } catch (error) {
        const errorResponse = createErrorResponse(error, { endpoint: 'reset-password' });
        res.status(500).json({
            success: false,
            message: errorResponse.message,
            error: errorResponse
        });
    }
});


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


        const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
        
        if (userError || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }


        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
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
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});


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


        if (tokenBlacklist.has(refreshToken)) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token has been invalidated'
            });
        }


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


        const storedToken = refreshTokens.get(refreshToken);
        if (!storedToken || storedToken.userId !== decoded.id) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }


        const user = Array.from(users.values()).find(u => u.id === decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }


        const newAccessToken = jwt.sign(
            { id: user.id, email: user.email, type: 'access' },
            JWT_SECRET,
            { expiresIn: '15m' }
        );


        const newRefreshToken = jwt.sign(
            { id: user.id, email: user.email, type: 'refresh' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );


        refreshTokens.delete(refreshToken);
        tokenBlacklist.add(refreshToken);


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
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});


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


        if (accessToken) {
            tokenBlacklist.add(accessToken);
        }

        if (refreshToken) {
            tokenBlacklist.add(refreshToken);
            refreshTokens.delete(refreshToken);
        }


        if (accessToken) {
            try {
                const { error } = await supabase.auth.signOut();
            } catch (supabaseError) {

            }
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});


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
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});


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
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});


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


        if (tokenBlacklist.has(accessToken)) {
            return res.status(401).json({
                success: false,
                message: 'Token has been invalidated'
            });
        }


        try {
            const decoded = jwt.verify(accessToken, JWT_SECRET);
            if (decoded.type === 'access') {

                const user = Array.from(users.values()).find(u => u.id === decoded.id);
                if (user) {
                    req.user = user;
                    req.accessToken = accessToken;
                    return next();
                }
            }
        } catch (jwtError) {

        }


        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }


        req.user = user;
        req.accessToken = accessToken;
        next();

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


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

        next();
    }
};


function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}


function createErrorResponse(error, context = {}) {
    if (!error) {
        return {
            type: 'UNKNOWN_ERROR',
            code: 'GENERIC_ERROR',
            message: 'An unexpected error occurred',
            details: 'Please try again later or contact support if the problem persists.',
            suggestions: ['Refresh the page and try again', 'Check your internet connection']
        };
    }
    
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorCode = error.code || 'UNKNOWN';
    

    const errorMappings = {
        'Invalid login credentials': {
            type: 'AUTH_ERROR',
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            details: 'The email or password you entered is incorrect.',
            suggestions: [
                'Double-check your email address for typos',
                'Verify your password is correct',
                'Try resetting your password if you\'ve forgotten it',
                'Make sure Caps Lock is not enabled'
            ]
        },
        'Email not confirmed': {
            type: 'AUTH_ERROR',
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Email address not verified',
            details: 'Please verify your email address before signing in.',
            suggestions: [
                'Check your email inbox for a verification message',
                'Look in your spam/junk folder',
                'Request a new verification email',
                'Make sure you clicked the verification link'
            ]
        },
        'Too many requests': {
            type: 'RATE_LIMIT_ERROR',
            code: 'TOO_MANY_ATTEMPTS',
            message: 'Too many login attempts',
            details: 'Your account has been temporarily locked due to multiple failed login attempts.',
            suggestions: [
                'Wait 15 minutes before trying again',
                'Reset your password if you\'ve forgotten it',
                'Contact support if you believe this is an error'
            ],
            retryAfter: 900 // 15 minutes in seconds
        },
        'User already registered': {
            type: 'AUTH_ERROR',
            code: 'USER_EXISTS',
            message: 'Account already exists',
            details: 'An account with this email address already exists.',
            suggestions: [
                'Try signing in instead of creating a new account',
                'Use the "Forgot Password" option if you can\'t remember your password',
                'Contact support if you believe this is an error'
            ]
        },
        'Password should be at least 6 characters': {
            type: 'VALIDATION_ERROR',
            code: 'PASSWORD_TOO_SHORT',
            message: 'Password too short',
            details: 'Password must be at least 8 characters long.',
            suggestions: [
                'Use at least 8 characters',
                'Include uppercase and lowercase letters',
                'Add numbers and special characters for better security'
            ]
        },
        'Unable to validate email address': {
            type: 'VALIDATION_ERROR',
            code: 'INVALID_EMAIL',
            message: 'Invalid email address',
            details: 'Please enter a valid email address.',
            suggestions: [
                'Check for typos in your email address',
                'Make sure the email format is correct (user@domain.com)',
                'Verify the domain name is spelled correctly'
            ]
        },
        'signup is disabled': {
            type: 'SERVICE_ERROR',
            code: 'SIGNUP_DISABLED',
            message: 'Registration temporarily unavailable',
            details: 'New account registration is currently disabled.',
            suggestions: [
                'Try again later',
                'Contact support for assistance',
                'Sign in if you already have an account'
            ]
        }
    };
    

    for (const [key, errorResponse] of Object.entries(errorMappings)) {
        if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
            return { ...errorResponse, originalError: errorCode };
        }
    }
    

    if (errorMessage.toLowerCase().includes('auth') || 
        errorMessage.toLowerCase().includes('login') || 
        errorMessage.toLowerCase().includes('credential')) {
        return {
            type: 'AUTH_ERROR',
            code: 'AUTHENTICATION_FAILED',
            message: 'Authentication failed',
            details: 'Unable to verify your credentials.',
            suggestions: [
                'Check your email and password',
                'Try resetting your password',
                'Contact support if the problem persists'
            ],
            originalError: errorCode
        };
    }
    
    if (errorMessage.toLowerCase().includes('email')) {
        return {
            type: 'VALIDATION_ERROR',
            code: 'EMAIL_INVALID',
            message: 'Invalid email address',
            details: 'The email address format is not valid.',
            suggestions: [
                'Check for typos in your email',
                'Ensure the format is correct (user@domain.com)'
            ],
            originalError: errorCode
        };
    }
    
    if (errorMessage.toLowerCase().includes('password')) {
        return {
            type: 'VALIDATION_ERROR',
            code: 'PASSWORD_INVALID',
            message: 'Password requirements not met',
            details: 'Your password does not meet the security requirements.',
            suggestions: [
                'Use at least 8 characters',
                'Include uppercase and lowercase letters',
                'Add numbers and special characters'
            ],
            originalError: errorCode
        };
    }
    
    if (errorMessage.toLowerCase().includes('network') || 
        errorMessage.toLowerCase().includes('connection')) {
        return {
            type: 'NETWORK_ERROR',
            code: 'CONNECTION_FAILED',
            message: 'Connection error',
            details: 'Unable to connect to the server.',
            suggestions: [
                'Check your internet connection',
                'Try again in a few moments',
                'Contact support if the problem persists'
            ],
            originalError: errorCode
        };
    }
    

    return {
        type: 'SERVER_ERROR',
        code: 'INTERNAL_ERROR',
        message: 'Server error occurred',
        details: 'An unexpected error occurred on the server.',
        suggestions: [
            'Try again in a few moments',
            'Refresh the page',
            'Contact support if the problem persists'
        ],
        originalError: errorCode,
        context: context
    };
}


app.post('/api/payment/create-checkout', (req, res) => {

    res.json({ message: 'Payment endpoint ready' });
});




app.post('/api/subscription/status', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      return res.json({ 
        active: false,
        message: 'No subscription found' 
      });
    }
    
    const currentDate = new Date();
    const expiryDate = new Date(data.expires_at);
    const isActive = expiryDate > currentDate;
    
    return res.json({ 
      active: isActive, 
      subscription: data 
    });
    
  } catch (err) {
    return res.status(500).json({ 
      active: false, 
      message: 'Error checking subscription' 
    });
  }
});

app.listen(PORT, () => {

});
