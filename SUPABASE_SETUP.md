# 🔧 SUPABASE SETUP GUIDE

## Step 1: Create Supabase Account (5 minutes)

1. **Go to [supabase.com](https://supabase.com)**
2. **Click "Start your project"**
3. **Sign up with GitHub or Google**
4. **Create New Project**
   - Project name: `stepdoc-app`
   - Database password: `Generate strong password`
   - Region: `Choose closest to you`
   - Pricing plan: `Free tier`
5. **Wait 2-3 minutes** for setup to complete

## Step 2: Get API Keys

1. **Go to Project Settings** (gear icon in sidebar)
2. **Click "API" tab**
3. **Copy these values:**
   - Project URL: `https://xxxxx.supabase.co`
   - anon public key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Step 3: Update Environment Variables

1. **Open your `.env` file**
2. **Replace the placeholder values:**

```env
# Replace these with your actual Supabase values
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_public_key_here
```

## Step 4: Enable Authentication Providers

1. **In Supabase Dashboard:**
   - Go to **Authentication** → **Providers**
   - Enable **Email** (already enabled)
   - Enable **Google** (optional - for social login)
   - Enable **GitHub** (optional - for social login)

2. **For Google OAuth (optional):**
   - Get Client ID/Secret from [Google Cloud Console](https://console.cloud.google.com)
   - Add redirect URL: `https://your-project-id.supabase.co/auth/v1/callback`

3. **For GitHub OAuth (optional):**
   - Create OAuth App in [GitHub Settings](https://github.com/settings/developers)
   - Add callback URL: `https://your-project-id.supabase.co/auth/v1/callback`

## Step 5: Test Authentication

1. **Restart your server:** `npm start`
2. **Go to:** http://localhost:3000/login
3. **Try creating an account**
4. **Check your email** for verification link
5. **Try logging in**

## Step 6: Database Schema (Automatic)

Supabase automatically creates these tables:
- `auth.users` - User accounts
- `auth.sessions` - Login sessions

You can add custom tables later for:
- User profiles
- Subscription plans
- Usage tracking

## Troubleshooting

**Error: "Invalid API key"**
- Double-check your SUPABASE_URL and SUPABASE_ANON_KEY
- Make sure there are no extra spaces

**Error: "Email not confirmed"**
- Check spam folder for verification email
- In Supabase Dashboard: Authentication → Users → manually confirm user

**Social login not working**
- Make sure OAuth apps are configured correctly
- Check callback URLs match exactly

## Next Steps After Setup

1. ✅ Test user registration
2. ✅ Test login/logout
3. ✅ Test email verification
4. ➡️ **Deploy to Vercel** (Phase 3)
5. ➡️ **Add Stripe payments** (Phase 4)
6. ➡️ **Connect custom domain** (Phase 5)

---

**Need help?** Come back with your Supabase URL and I'll help you configure everything!
