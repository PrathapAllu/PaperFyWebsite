class Dashboard {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            const loadingOverlay = document.getElementById('dashboardLoadingOverlay');
            const mainContent = document.getElementById('mainDashboardContent');
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (mainContent) mainContent.style.display = 'none';

            await this.handleAuthFlow();

            if (loadingOverlay) loadingOverlay.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';

            this.initializeEventListeners();
            this.loadUserData();
            this.loadDashboardData();
            this.setupVisibilityHandler();
        } catch (error) {
            const loadingOverlay = document.getElementById('dashboardLoadingOverlay');
            const mainContent = document.getElementById('mainDashboardContent');
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            if (mainContent) mainContent.style.display = 'none';
            this.redirectToLogin();
        }
    }

    async handleAuthFlow() {
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
            this.redirectToLogin(`?error=${encodeURIComponent(errorDescription || 'Authentication failed')}`);
            return;
        }

        if (accessToken && refreshToken) {
            try {
                const { data, error: sessionError } = await window.supabaseClient.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });

                if (sessionError) {
                    throw sessionError;
                }

                window.history.replaceState({}, document.title, window.location.pathname);
                this.currentUser = data.user;
                await this.checkSubscriptionAndProceed(data.user);
                return;
            } catch (error) {
                this.redirectToLogin('?error=Session setup failed');
                return;
            }
        }

        await this.checkAuthStatus();
    }

    async checkAuthStatus() {
        try {
            const { data: { user }, error } = await window.supabaseClient.auth.getUser();
            
            if (error || !user) {
                localStorage.removeItem('stepdoc_remember_me');
                this.redirectToLogin();
                return;
            }
            
            this.currentUser = user;
            await this.checkSubscriptionAndProceed(user);
            
        } catch (error) {
            localStorage.removeItem('stepdoc_remember_me');
            this.redirectToLogin();
        }
    }

    async checkSubscriptionAndProceed(user) {
        if (!user.email_confirmed) {
            localStorage.removeItem('stepdoc_remember_me');
            this.redirectToLogin('?message=Please verify your email before accessing dashboard');
            return;
        }
        
        const hasSubscription = await this.checkSubscriptionStatus(user);
        if (!hasSubscription) {
            window.location.href = 'subscription.html';
            return;
        }
        
        const rememberMeFlag = localStorage.getItem('stepdoc_remember_me') === 'true';
        const urlParams = new URLSearchParams(window.location.search);
        const isNewSession = urlParams.get('new_session') === 'true';
        
        if (!rememberMeFlag && !isNewSession) {
            await this.forceLogout();
            this.redirectToLogin();
            return;
        }
        
        if (isNewSession) {
            const url = new URL(window.location);
            url.searchParams.delete('new_session');
            window.history.replaceState({}, document.title, url.pathname);
            sessionStorage.setItem('current_session', 'active');
        }
    }

    async checkSubscriptionStatus(user) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const skipSubscription = urlParams.get('skip_subscription') === 'true';
            
            if (skipSubscription) {
                return true;
            }
            
            const subscriptionData = localStorage.getItem('user_subscription');
            if (subscriptionData) {
                const subscription = JSON.parse(subscriptionData);
                const now = new Date();
                const expiryDate = new Date(subscription.expiresAt);
                
                if (subscription.planType === 'free' || now < expiryDate) {
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            return false;
        }
    }

    initializeEventListeners() {
        const userAvatar = document.querySelector('.user-avatar');
        const userDropdown = document.querySelector('.user-dropdown');
        if (userAvatar && userDropdown) {
            userAvatar.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });
            document.addEventListener('click', (e) => {
                if (!userDropdown.contains(e.target) && !userAvatar.contains(e.target)) {
                    userDropdown.classList.remove('show');
                }
            });
        }
        const logoutBtn = document.querySelector('.logout-item');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
        const actionBtns = document.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleQuickAction(btn);
            });
        });
        const macDropdownBtn = document.getElementById('macDropdownBtn');
        const macDropdownMenu = document.getElementById('macDropdownMenu');
        if (macDropdownBtn && macDropdownMenu) {
            macDropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                macDropdownBtn.classList.toggle('active');
                macDropdownMenu.classList.toggle('show');
            });
            document.addEventListener('click', (e) => {
                if (!macDropdownBtn.contains(e.target) && !macDropdownMenu.contains(e.target)) {
                    macDropdownBtn.classList.remove('active');
                    macDropdownMenu.classList.remove('show');
                }
            });
            const macOptions = document.querySelectorAll('.mac-option');
            macOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.preventDefault();
                    const selectedText = option.dataset.text;
                    const link = option.dataset.link;
                    const btnText = macDropdownBtn.querySelector('.btn-text');
                    btnText.textContent = selectedText;
                    macDropdownBtn.classList.remove('active');
                    macDropdownMenu.classList.remove('show');
                    if (link && link !== 'https://example.com/mac-silicon.dmg' && link !== 'https://example.com/mac-intel.dmg') {
                        window.open(link, '_blank');
                    }
                });
            });
        }
        const windowsBtn = document.querySelector('.windows-btn');
        if (windowsBtn) {
            windowsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const link = windowsBtn.dataset.link;
                if (link && link !== 'https://example.com/windows.exe') {
                    window.open(link, '_blank');
                }
            });
        }

        const contactSupportBtn = document.getElementById('contactSupportBtn');
        const contactModal = document.getElementById('contactModal');
        const closeContactModal = document.getElementById('closeContactModal');
        const contactForm = document.getElementById('contactForm');

        if (contactSupportBtn && contactModal) {
            contactSupportBtn.addEventListener('click', () => {
                contactModal.classList.add('show');
            });

            if (closeContactModal) {
                closeContactModal.addEventListener('click', () => {
                    contactModal.classList.remove('show');
                });
            }

            contactModal.addEventListener('click', (e) => {
                if (e.target === contactModal) {
                    contactModal.classList.remove('show');
                }
            });

            if (contactForm) {
                contactForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const formData = new FormData(contactForm);
                    const data = Object.fromEntries(formData);
                    // ...existing code...
                    contactModal.classList.remove('show');
                    contactForm.reset();
                });
            }
        }
    }




    loadUserData() {
        if (!this.currentUser) return;

        const userNameEl = document.querySelector('.user-name');
        const userEmailEl = document.querySelector('.user-email');
        const userInitialEl = document.querySelector('.user-initial');

        if (userNameEl) {
            const displayName = this.currentUser.user_metadata?.full_name || 
                              this.currentUser.email.split('@')[0];
            userNameEl.textContent = displayName;
        }

        if (userEmailEl) {
            userEmailEl.textContent = this.currentUser.email;
        }

        if (userInitialEl) {
            const initial = this.currentUser.user_metadata?.full_name?.[0] || 
                           this.currentUser.email[0];
            userInitialEl.textContent = initial.toUpperCase();
        }
    }

    async loadDashboardData() {
        try {
            this.showLoading(true);
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.updateStats({
                documents: Math.floor(Math.random() * 50) + 10,
                collaborators: Math.floor(Math.random() * 20) + 5,
                projects: Math.floor(Math.random() * 15) + 3,
                storage: Math.floor(Math.random() * 80) + 20
            });
            this.loadRecentActivity();
            await this.loadSubscriptionData();
            this.showLoading(false);
        } catch (error) {
            this.showLoading(false);
        }
    }

    async fetchSubscriptionData() {
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session?.access_token) {
                throw new Error('No valid session');
            }

            const response = await fetch('/api/subscription/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch subscription');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            return { active: false, subscription: null };
        }
    }

    async loadSubscriptionData() {
        try {
            const subscriptionData = await this.fetchSubscriptionData();
            this.updateLicenseCard(subscriptionData);
            this.updateDownloadAccess(subscriptionData);
        } catch (error) {
            this.updateLicenseCard({ active: false, subscription: null });
            this.updateDownloadAccess({ active: false, subscription: null });
        }
    }

    updateLicenseCard(subscriptionData) {
        const planElement = document.querySelector('.license-row .license-value');
        const statusElement = document.querySelector('.status-badge');
        const validUntilElement = document.querySelectorAll('.license-row .license-value')[2];
        const daysRemainingElement = document.querySelectorAll('.license-row .license-value')[3];

        if (subscriptionData.subscription) {
            const subscription = subscriptionData.subscription;
            const planName = this.getPlanDisplayName(subscription.plan_type);
            const expiryDate = new Date(subscription.expires_at);
            const daysRemaining = this.calculateDaysRemaining(expiryDate);
            const isActive = subscriptionData.active;

            if (planElement) planElement.textContent = planName;
            if (statusElement) {
                if (isActive) {
                    statusElement.textContent = 'Active';
                    statusElement.className = 'status-badge status-active';
                } else {
                    statusElement.textContent = 'Expired';
                    statusElement.className = 'status-badge status-inactive';
                }
            }
            if (validUntilElement) validUntilElement.textContent = this.formatDate(expiryDate);
            if (daysRemainingElement) {
                if (isActive) {
                    daysRemainingElement.textContent = `${daysRemaining} days`;
                } else {
                    daysRemainingElement.textContent = 'Expired';
                }
            }
        } else {
            if (planElement) planElement.textContent = 'Free';
            if (statusElement) {
                statusElement.textContent = 'Active';
                statusElement.className = 'status-badge status-active';
            }
            if (validUntilElement) validUntilElement.textContent = 'N/A';
            if (daysRemainingElement) daysRemainingElement.textContent = 'N/A';
        }
    }

    getPlanDisplayName(planType) {
        switch (planType) {
            case 'pro':
                return 'Pro';
            case 'pro_plus':
                return 'Pro Plus';
            default:
                return 'Free';
        }
    }

    calculateDaysRemaining(expiryDate) {
        const now = new Date();
        const timeDiff = expiryDate.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return Math.max(0, daysDiff);
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    updateDownloadAccess(subscriptionData) {
        const windowsBtn = document.querySelector('.windows-btn');
        const macDropdownBtn = document.getElementById('macDropdownBtn');
        const macOptions = document.querySelectorAll('.mac-option');

        const hasProPlus = subscriptionData.subscription && 
                          subscriptionData.active && 
                          subscriptionData.subscription.plan_type === 'pro_plus';

        if (windowsBtn) {
            if (hasProPlus) {
                windowsBtn.style.opacity = '1';
                windowsBtn.style.pointerEvents = 'auto';
                windowsBtn.removeAttribute('disabled');
            } else {
                windowsBtn.style.opacity = '0.5';
                windowsBtn.style.pointerEvents = 'none';
                windowsBtn.setAttribute('disabled', 'true');
            }
        }

        if (macDropdownBtn) {
            if (hasProPlus) {
                macDropdownBtn.style.opacity = '1';
                macDropdownBtn.style.pointerEvents = 'auto';
                macDropdownBtn.removeAttribute('disabled');
            } else {
                macDropdownBtn.style.opacity = '0.5';
                macDropdownBtn.style.pointerEvents = 'none';
                macDropdownBtn.setAttribute('disabled', 'true');
            }
        }

        macOptions.forEach(option => {
            if (hasProPlus) {
                option.style.opacity = '1';
                option.style.pointerEvents = 'auto';
            } else {
                option.style.opacity = '0.5';
                option.style.pointerEvents = 'none';
            }
        });
    }

    updateStats(stats) {
        const statNumbers = document.querySelectorAll('.stat-number');
        
        if (statNumbers[0]) statNumbers[0].textContent = stats.documents;
        if (statNumbers[1]) statNumbers[1].textContent = stats.collaborators;
        if (statNumbers[2]) statNumbers[2].textContent = stats.projects;
        if (statNumbers[3]) statNumbers[3].textContent = `${stats.storage}%`;
    }

    loadRecentActivity() {
        const activities = [
            {
                icon: '📄',
                title: 'Created new document "Project Proposal"',
                time: '2 minutes ago'
            },
            {
                icon: '👥',
                title: 'Added collaborator to Marketing Team',
                time: '1 hour ago'
            },
            {
                icon: '✅',
                title: 'Completed review for Q4 Report',
                time: '3 hours ago'
            },
            {
                icon: '💾',
                title: 'Exported document to PDF',
                time: '1 day ago'
            }
        ];

        const activityList = document.querySelector('.activity-list');
        if (activityList) {
            activityList.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">${activity.icon}</div>
                    <div class="activity-content">
                        <div class="activity-title">${activity.title}</div>
                        <div class="activity-time">${activity.time}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    updateStats(stats) {
        const statNumbers = document.querySelectorAll('.stat-number');
        
        if (statNumbers[0]) statNumbers[0].textContent = stats.documents;
        if (statNumbers[1]) statNumbers[1].textContent = stats.collaborators;
        if (statNumbers[2]) statNumbers[2].textContent = stats.projects;
        if (statNumbers[3]) statNumbers[3].textContent = `${stats.storage}%`;
    }

    loadRecentActivity() {
        const activities = [
            {
                icon: '📄',
                title: 'Created new document "Project Proposal"',
                time: '2 minutes ago'
            },
            {
                icon: '👥',
                title: 'Added collaborator to Marketing Team',
                time: '1 hour ago'
            },
            {
                icon: '✅',
                title: 'Completed review for Q4 Report',
                time: '3 hours ago'
            },
            {
                icon: '💾',
                title: 'Exported document to PDF',
                time: '1 day ago'
            }
        ];

        const activityList = document.querySelector('.activity-list');
        if (activityList) {
            activityList.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">${activity.icon}</div>
                    <div class="activity-content">
                        <div class="activity-title">${activity.title}</div>
                        <div class="activity-time">${activity.time}</div>
                    </div>
                </div>
            `).join('');
        }
    }



    handleQuickAction(actionBtn) {
        const action = actionBtn.dataset.action;
        switch (action) {
            case 'new-document':
                this.createNewDocument();
                break;
            case 'upload-file':
                this.uploadFile();
                break;
            case 'invite-team':
                this.inviteTeamMember();
                break;
            case 'view-analytics':
                this.viewAnalytics();
                break;
        }
    }

    createNewDocument() {
    // ...existing code...
    }

    uploadFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.txt';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                // ...existing code...
            }
        };
        input.click();
    }

    inviteTeamMember() {
        const email = prompt('Enter email address to invite:');
        if (email && this.isValidEmail(email)) {
            // ...existing code...
        }
    }

    viewAnalytics() {
    // ...existing code...
    }



    // Quick action methods (placeholder implementations)
    createNewDocument() {
    // ...existing code...
    }

    uploadFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.txt';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                // ...existing code...
            }
        };
        input.click();
    }

    inviteTeamMember() {
        const email = prompt('Enter email address to invite:');
        if (email && this.isValidEmail(email)) {
            // ...existing code...
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showLoading(show) {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            if (show) {
                mainContent.classList.add('loading');
            } else {
                mainContent.classList.remove('loading');
            }
        }
    }

    async handleLogout() {
        try {
            const { error } = await window.supabaseClient.auth.signOut();
            // Clear the remember me flag when logging out
            localStorage.removeItem('stepdoc_remember_me');
            if (error) {
                return;
            }
            this.redirectToLogin();
        } catch (error) {
            // Clear the flag even if there's an error
            localStorage.removeItem('stepdoc_remember_me');
            this.redirectToLogin();
        }
    }

    async forceLogout() {
        try {
            // Force clear Supabase session regardless of state
            if (window.supabaseClient) {
                await window.supabaseClient.auth.signOut();
            }
            // Clear all local storage flags and tokens
            localStorage.removeItem('stepdoc_remember_me');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
        } catch (error) {
            // Even if Supabase logout fails, clear local storage
            localStorage.removeItem('stepdoc_remember_me');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
        }
    }

    setupVisibilityHandler() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Page became visible - check if session should persist
                const rememberMeFlag = localStorage.getItem('stepdoc_remember_me') === 'true';
                const hasActiveSession = sessionStorage.getItem('current_session') === 'active';
                
                if (!rememberMeFlag && !hasActiveSession) {
                    // No remember me and no active session - redirect to login
                    this.redirectToLogin();
                }
            }
        });
        
        // Handle window beforeunload for non-remember-me sessions
        window.addEventListener('beforeunload', () => {
            const rememberMeFlag = localStorage.getItem('stepdoc_remember_me') === 'true';
            if (!rememberMeFlag) {
                // Clear session for non-remember-me users when tab closes
                sessionStorage.removeItem('current_session');
            }
        });
        
        // Handle page focus
        window.addEventListener('focus', () => {
            const rememberMeFlag = localStorage.getItem('stepdoc_remember_me') === 'true';
            const hasActiveSession = sessionStorage.getItem('current_session') === 'active';
            
            if (!rememberMeFlag && !hasActiveSession) {
                this.redirectToLogin();
            }
        });
    }

    redirectToLogin(params = '') {
        window.location.href = 'login.html' + params;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        let attempts = 0;
        const maxAttempts = 50;
        while (attempts < maxAttempts) {
            const supabaseAvailable = typeof window.supabase !== 'undefined' && 
                                    typeof window.supabase.createClient === 'function';
            if (supabaseAvailable) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        if (attempts >= maxAttempts) {
            throw new Error('Supabase not available after waiting');
        }
        new Dashboard();
    } catch (error) {
        window.location.href = 'login.html';
    }
});

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
});


