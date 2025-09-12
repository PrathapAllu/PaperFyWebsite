// Enhanced Authentication Module with Session Management
class AuthManager {
  constructor() {
    this.supabase = window.supabaseClient;
    this.user = null;
    this.session = null;
    this.sessionCheckInterval = null;
    this.init();
  }

  async init() {
    // Listen to auth state changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.session = session;
      this.user = session?.user || null;
      
      if (event === 'SIGNED_IN') {
        this.onSignIn(session);
      } else if (event === 'SIGNED_OUT') {
        this.onSignOut();
      } else if (event === 'TOKEN_REFRESHED') {
        this.onTokenRefresh(session);
      }
    });

    // Check if authenticated user is on login page
    await this.redirectIfAuthenticated();

    // Start session monitoring
    this.startSessionMonitoring();
  }

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (error) throw error;
      this.user = user;
      return user;
    } catch (error) {
      return null;
    }
  }

  async getCurrentSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error) throw error;
      this.session = session;
      return session;
    } catch (error) {
      return null;
    }
  }

  onSignIn(session) {
    this.updateLastActivity();
    
    // Store session metadata securely
    this.storeSessionMetadata(session);
    
    // Store user data for Chrome extension
    this.storeUserDataForExtension(session);
  }

  onSignOut() {
    this.clearSessionData();
    this.clearUserDataForExtension();
    
    // Redirect to login if on protected page
    if (this.isProtectedPage()) {
      window.location.href = 'login.html';
    }
  }

  onTokenRefresh(session) {
    this.updateLastActivity();
    this.storeUserDataForExtension(session);
  }

  storeSessionMetadata(session) {
    const metadata = {
      lastActivity: Date.now(),
      expiresAt: session.expires_at * 1000, // Convert to milliseconds
      rememberMe: localStorage.getItem('rememberMe') === 'true'
    };
    
    sessionStorage.setItem('auth_metadata', JSON.stringify(metadata));
  }

  updateLastActivity() {
    const metadata = this.getSessionMetadata();
    if (metadata) {
      metadata.lastActivity = Date.now();
      sessionStorage.setItem('auth_metadata', JSON.stringify(metadata));
    }
  }

  getSessionMetadata() {
    try {
      const data = sessionStorage.getItem('auth_metadata');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  clearSessionData() {
    sessionStorage.removeItem('auth_metadata');
    localStorage.removeItem('rememberMe');
    this.user = null;
    this.session = null;
  }

  async storeUserDataForExtension(session) {
    if (session && session.user) {
      try {
        // Get actual subscription data from database
        const userPlan = await this.getUserPlanFromDatabase(session.user.id);
        
        const userData = {
          username: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
          email: session.user.email,
          token: session.access_token,
          expiresAt: session.expires_at,
          plan: userPlan
        };
        localStorage.setItem('stepdoc_user', JSON.stringify(userData));
      } catch (error) {
        console.error('Error setting user data for extension:', error);
        // Fallback to old method
        const userData = {
          username: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
          token: session.access_token,
          expiresAt: session.expires_at,
          plan: this.getUserPlan(session.user)
        };
        localStorage.setItem('stepdoc_user', JSON.stringify(userData));
      }
    }
  }

  clearUserDataForExtension() {
    localStorage.removeItem('stepdoc_user');
  }

  getUserPlan(user) {
    return user.user_metadata?.subscription_status || 'free';
  }

  async getUserPlanFromDatabase(userId) {
    try {
      // Fetch user subscription data (same logic as dashboard.js)
      const { data: subs } = await this.supabase
        .from("subscriptions")
        .select("plan_type,expires_at")
        .eq("user_id", userId)
        .order("expires_at", { ascending: false })
        .limit(1);

      const subscription = subs && subs.length ? subs[0] : { plan_type: "free" };
      
      const now = new Date();
      const expiry = subscription.expires_at ? new Date(subscription.expires_at) : null;
      const planType = (subscription.plan_type || "free").toLowerCase();
      
      // Check if subscription is active (not expired and not free)
      const isActiveSubscription = expiry && expiry > now && planType !== "free";
      
      // Return the display format that matches what dashboard.js uses
      if (isActiveSubscription) {
        switch(planType) {
          case "pro": return "Pro";
          case "pro plus": return "Pro Plus";
          default: return "Free";
        }
      }
      
      return "Free";
    } catch (error) {
      console.error('Error fetching user plan:', error);
      return this.getUserPlan({ user_metadata: {} }); // Fallback to old method
    }
  }

  isProtectedPage() {
    const protectedPages = ['dashboard.html', 'profile.html'];
    return protectedPages.some(page => window.location.pathname.includes(page));
  }

  isLoginPage() {
    return window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html');
  }

  async redirectIfAuthenticated() {
    if (this.isLoginPage()) {
      const session = await this.getCurrentSession();
      const user = await this.getCurrentUser();
      
      if (session && user && !this.isSessionExpired()) {
        window.location.href = 'dashboard.html';
        return true;
      }
    }
    return false;
  }

  isSessionExpired() {
    const metadata = this.getSessionMetadata();
    if (!metadata) return true;
    
    const now = Date.now();
    const expiresAt = metadata.expiresAt;
    const lastActivity = metadata.lastActivity;
    
    // Session expired by timestamp
    if (now > expiresAt) return true;
    
    // Session expired by inactivity (30 minutes for non-remember-me)
    if (!metadata.rememberMe && (now - lastActivity) > 30 * 60 * 1000) {
      return true;
    }
    
    return false;
  }

  startSessionMonitoring() {
    // Check session every 5 minutes
    this.sessionCheckInterval = setInterval(async () => {
      if (this.isSessionExpired()) {
        await this.signOut();
        return;
      }
      
      // Auto-refresh session if expiring within 5 minutes
      const metadata = this.getSessionMetadata();
      if (metadata && (metadata.expiresAt - Date.now()) < 5 * 60 * 1000) {
        try {
          await this.supabase.auth.refreshSession();
        } catch (error) {
          await this.signOut();
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  stopSessionMonitoring() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      // Silent error handling for production
    } finally {
      this.clearSessionData();
      this.stopSessionMonitoring();
    }
  }

  async requireAuth() {
    const session = await this.getCurrentSession();
    const user = await this.getCurrentUser();
    
    if (!session || !user || this.isSessionExpired()) {
      // Clear invalid session
      await this.signOut();
      window.location.href = 'login.html';
      return false;
    }
    
    this.updateLastActivity();
    return true;
  }

  // Rate limiting for auth attempts
  isRateLimited(action) {
    const key = `rate_limit_${action}`;
    const attempts = JSON.parse(localStorage.getItem(key) || '[]');
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    // Remove attempts older than 5 minutes
    const recentAttempts = attempts.filter(time => time > fiveMinutesAgo);
    
    // Check if exceeded limit (5 attempts per 5 minutes)
    if (recentAttempts.length >= 5) {
      return true;
    }
    
    // Add current attempt
    recentAttempts.push(now);
    localStorage.setItem(key, JSON.stringify(recentAttempts));
    
    return false;
  }

  // Utility method for password strength validation
  validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[@$!%*?&]/.test(password);
    
    const checks = [
      { valid: password.length >= minLength, message: 'At least 8 characters' },
      { valid: hasUpper, message: 'One uppercase letter' },
      { valid: hasLower, message: 'One lowercase letter' },
      { valid: hasNumber, message: 'One number' },
      { valid: hasSpecial, message: 'One special character (@$!%*?&)' }
    ];
    
    const score = checks.filter(check => check.valid).length;
    const isValid = score === checks.length;
    
    return {
      isValid,
      score,
      strength: ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][score] || 'Very Weak',
      checks
    };
  }
}

// Initialize auth manager
window.authManager = new AuthManager();

// Activity tracking for session management
let activityTimeout;
const trackActivity = () => {
  clearTimeout(activityTimeout);
  if (window.authManager) {
    window.authManager.updateLastActivity();
  }
};

// Track user activity
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
  document.addEventListener(event, trackActivity, { passive: true });
});

// Legacy compatibility - maintain existing mock for testing
window.mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User'
  }
};

// Backward compatibility for existing code
if (!window.supabaseClient && typeof window !== 'undefined') {
  window.supabaseClient = {
    auth: {
      getUser: async () => ({
        data: { user: window.mockUser }
      }),
      onAuthStateChange: () => {},
      signOut: async () => ({ error: null })
    },
    from: (table) => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [] })
          })
        })
      })
    })
  };
}
