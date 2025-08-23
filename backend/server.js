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

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'StepDoc API is running' });
});

// Auth API (placeholder for Supabase integration)
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

app.post('/api/auth/login', (req, res) => {
    // TODO: Implement Supabase auth
    // Simulate external login success
    const { username } = req.body;
    // You should replace this with actual external login logic
    if (!username) {
        return res.status(400).json({ success: false, message: 'Username required' });
    }
    // Issue JWT
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ username, success: true, token });
});

// JWT verify endpoint
app.post('/api/auth/verify', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ success: true, user: decoded });
    } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
});

app.post('/api/auth/signup', (req, res) => {
    // TODO: Implement Supabase auth
    res.json({ message: 'Signup endpoint ready' });
});

// Payment API (placeholder for Stripe integration)
app.post('/api/payment/create-checkout', (req, res) => {
    // TODO: Implement Stripe checkout
    res.json({ message: 'Payment endpoint ready' });
});

// Subscription API
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.post('/api/subscription/status', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ active: false, message: 'User ID required' });
  }
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .single();
    if (error || !data) {
      return res.json({ active: false });
    }
    return res.json({ active: true, subscription: data });
  } catch (err) {
    return res.status(500).json({ active: false, message: 'Error checking subscription' });
  }
});

app.listen(PORT, () => {
    console.log(`🚀 StepDoc server running on http://localhost:${PORT}`);
});
