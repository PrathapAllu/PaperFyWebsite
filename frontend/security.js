// Security Configuration and Utilities
class SecurityManager {
  constructor() {
    this.initSecurityHeaders();
    this.setupCSRFProtection();
    this.initInputSanitization();
  }

  // Initialize basic security headers (for client-side awareness)
  initSecurityHeaders() {
    // Content Security Policy (inform developers about needed headers)
    this.requiredHeaders = {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://bqemaogpiunlbdhzvlyd.supabase.co;",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
  }

  // Basic CSRF protection for forms
  setupCSRFProtection() {
    this.csrfToken = this.generateCSRFToken();
    
    // Add CSRF token to all forms
    document.addEventListener('DOMContentLoaded', () => {
      this.addCSRFTokenToForms();
    });
  }

  generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  addCSRFTokenToForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      // Skip if already has CSRF token
      if (form.querySelector('input[name="csrf_token"]')) return;
      
      const csrfInput = document.createElement('input');
      csrfInput.type = 'hidden';
      csrfInput.name = 'csrf_token';
      csrfInput.value = this.csrfToken;
      form.appendChild(csrfInput);
    });
  }

  // Input sanitization utilities
  initInputSanitization() {
    this.sanitizers = {
      html: this.sanitizeHTML.bind(this),
      email: this.sanitizeEmail.bind(this),
      phone: this.sanitizePhone.bind(this),
      name: this.sanitizeName.bind(this)
    };
  }

  sanitizeHTML(input) {
    const temp = document.createElement('div');
    temp.textContent = input;
    return temp.innerHTML;
  }

  sanitizeEmail(email) {
    return email.toLowerCase().trim().replace(/[^a-zA-Z0-9@._-]/g, '');
  }

  sanitizePhone(phone) {
    return phone.replace(/[^0-9+\-\s\(\)]/g, '');
  }

  sanitizeName(name) {
    return name.trim().replace(/[^a-zA-Z\s\'-]/g, '');
  }

  // Validate input against common attack patterns
  validateInput(input, type = 'general') {
    const threats = {
      xss: /<script|javascript:|on\w+\s*=/i,
      sql: /('|(union|select|insert|update|delete|drop|create|alter)\s)/i,
      ldap: /(\*|\(|\)|\\|\||\&)/,
      xxe: /<!entity|<!doctype/i,
      path: /\.\.\//
    };

    for (const [threatType, pattern] of Object.entries(threats)) {
      if (pattern.test(input)) {
        return { isValid: false, threat: threatType };
      }
    }

    return { isValid: true };
  }

  // Rate limiting for client-side actions
  rateLimit(action, maxAttempts = 5, timeWindow = 5 * 60 * 1000) {
    const key = `rate_limit_${action}`;
    const now = Date.now();
    
    let attempts = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Remove old attempts outside time window
    attempts = attempts.filter(timestamp => now - timestamp < timeWindow);
    
    if (attempts.length >= maxAttempts) {
      const oldestAttempt = Math.min(...attempts);
      const remainingTime = timeWindow - (now - oldestAttempt);
      return {
        allowed: false,
        remainingTime: Math.ceil(remainingTime / 1000),
        message: `Too many attempts. Please try again in ${Math.ceil(remainingTime / 60000)} minutes.`
      };
    }
    
    // Add current attempt
    attempts.push(now);
    localStorage.setItem(key, JSON.stringify(attempts));
    
    return { allowed: true };
  }

  // Secure password validation
  validatePassword(password) {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[@$!%*?&]/.test(password),
      noCommon: !this.isCommonPassword(password),
      noPersonal: !this.containsPersonalInfo(password)
    };

    const score = Object.values(checks).filter(Boolean).length;
    const strength = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][Math.min(score, 5)];

    return {
      isValid: score >= 5,
      strength,
      score,
      checks,
      requirements: this.getPasswordRequirements(checks)
    };
  }

  isCommonPassword(password) {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'welcome', 'login', 'master'
    ];
    return commonPasswords.includes(password.toLowerCase());
  }

  containsPersonalInfo(password) {
    // This would ideally check against user's personal information
    // For now, just check for common personal patterns
    const personalPatterns = [
      /\b(admin|user|test|demo)\b/i,
      /\b\d{4}\b/, // Birth years
      /\b(19|20)\d{2}\b/ // Years
    ];

    return personalPatterns.some(pattern => pattern.test(password));
  }

  getPasswordRequirements(checks) {
    const requirements = [];
    if (!checks.length) requirements.push('At least 8 characters');
    if (!checks.uppercase) requirements.push('One uppercase letter');
    if (!checks.lowercase) requirements.push('One lowercase letter');
    if (!checks.numbers) requirements.push('One number');
    if (!checks.symbols) requirements.push('One symbol (@$!%*?&)');
    if (!checks.noCommon) requirements.push('Not a common password');
    if (!checks.noPersonal) requirements.push('No personal information');
    
    return requirements;
  }

  // Secure session storage
  secureStorage = {
    set: (key, value, encrypt = true) => {
      try {
        const data = encrypt ? this.simpleEncrypt(JSON.stringify(value)) : JSON.stringify(value);
        sessionStorage.setItem(key, data);
        return true;
      } catch (error) {
        return false;
      }
    },

    get: (key, decrypt = true) => {
      try {
        const data = sessionStorage.getItem(key);
        if (!data) return null;
        
        const parsed = decrypt ? this.simpleDecrypt(data) : data;
        return JSON.parse(parsed);
      } catch (error) {
        return null;
      }
    },

    remove: (key) => {
      sessionStorage.removeItem(key);
    },

    clear: () => {
      sessionStorage.clear();
    }
  };

  // Simple encryption/decryption (not for sensitive data, just obfuscation)
  simpleEncrypt(text) {
    return btoa(encodeURIComponent(text));
  }

  simpleDecrypt(encodedText) {
    return decodeURIComponent(atob(encodedText));
  }

  // Security audit logging
  logSecurityEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // In production, send to security logging service
    // console.log('Security Event:', logEntry);
    
    // Store locally for debugging
    const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
    logs.push(logEntry);
    
    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    
    localStorage.setItem('security_logs', JSON.stringify(logs));
  }

  // Check for suspicious activity
  detectSuspiciousActivity() {
    const indicators = [];

    // Check for multiple failed login attempts
    const failedLogins = JSON.parse(localStorage.getItem('rate_limit_login') || '[]');
    if (failedLogins.length >= 3) {
      indicators.push('Multiple failed login attempts');
    }

    // Check for rapid form submissions
    const formSubmissions = JSON.parse(localStorage.getItem('rate_limit_signup') || '[]');
    if (formSubmissions.length >= 5) {
      indicators.push('Rapid form submissions');
    }

    // Check for development tools
    if (this.isDevToolsOpen()) {
      indicators.push('Developer tools detected');
    }

    return indicators;
  }

  isDevToolsOpen() {
    const threshold = 160;
    return window.outerHeight - window.innerHeight > threshold ||
           window.outerWidth - window.innerWidth > threshold;
  }

  // Initialize security monitoring
  startSecurityMonitoring() {
    // Monitor for suspicious activity
    setInterval(() => {
      const indicators = this.detectSuspiciousActivity();
      if (indicators.length > 0) {
        this.logSecurityEvent('suspicious_activity', { indicators });
      }
    }, 30000); // Check every 30 seconds

    // Monitor for page focus/blur (session hijacking detection)
    let focusTime = Date.now();
    
    window.addEventListener('focus', () => {
      focusTime = Date.now();
    });

    window.addEventListener('blur', () => {
      const blurDuration = Date.now() - focusTime;
      if (blurDuration > 30 * 60 * 1000) { // 30 minutes
        this.logSecurityEvent('extended_session_inactive', { duration: blurDuration });
      }
    });
  }
}

// Initialize security manager
window.securityManager = new SecurityManager();

// Start security monitoring when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.securityManager.startSecurityMonitoring();
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityManager;
}
