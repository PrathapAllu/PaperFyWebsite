// Configuration management
class Config {
    constructor() {
        this.environment = this.detectEnvironment();
    }

    detectEnvironment() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'development';
        } else if (hostname.includes('vercel.app')) {
            return 'production';
        } else {
            return 'staging';
        }
    }

    getResetPasswordUrl() {
        switch (this.environment) {
            case 'development':
                return 'http://localhost:3000/reset-password.html';
            case 'production':
                return 'https://stepdoc-zeta.vercel.app/reset-password.html';
            default:
                return 'https://stepdoc-zeta.vercel.app/reset-password.html';
        }
    }

    getLoginUrl() {
        switch (this.environment) {
            case 'development':
                return 'http://localhost:3000/login.html';
            case 'production':
                return 'https://stepdoc-zeta.vercel.app/login.html';
            default:
                return 'https://stepdoc-zeta.vercel.app/login.html';
        }
    }

    getDashboardUrl() {
        switch (this.environment) {
            case 'development':
                return 'http://localhost:3000/dashboard.html';
            case 'production':
                return 'https://stepdoc-zeta.vercel.app/dashboard.html';
            default:
                return 'https://stepdoc-zeta.vercel.app/dashboard.html';
        }
    }

    isDevelopment() {
        return this.environment === 'development';
    }

    isProduction() {
        return this.environment === 'production';
    }
}

// Create global config instance
window.config = new Config();
