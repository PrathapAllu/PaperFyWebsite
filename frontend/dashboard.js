class Dashboard {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            // Check authentication status
            await this.checkAuthStatus();
            
            // Initialize UI components
            this.initializeEventListeners();
            this.loadUserData();
            this.loadDashboardData();
            
            console.log('Dashboard initialized successfully');
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.redirectToLogin();
        }
    }

    async checkAuthStatus() {
        try {
            // Check if user is authenticated with Supabase
            const { data: { user }, error } = await window.supabaseClient.auth.getUser();
            
            if (error || !user) {
                console.log('No authenticated user found');
                this.redirectToLogin();
                return;
            }
            
            this.currentUser = user;
            console.log('Authenticated user:', user.email);
        } catch (error) {
            console.error('Auth check failed:', error);
            this.redirectToLogin();
        }
    }

    initializeEventListeners() {
        // User avatar click
        const userAvatar = document.querySelector('.user-avatar');
        const userDropdown = document.querySelector('.user-dropdown');
        
        if (userAvatar && userDropdown) {
            userAvatar.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!userDropdown.contains(e.target) && !userAvatar.contains(e.target)) {
                    userDropdown.classList.remove('show');
                }
            });
        }

        // Logout functionality
        const logoutBtn = document.querySelector('.logout-item');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // Navigation items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                this.handleNavigation(item);
            });
        });

        // Quick action buttons
        const actionBtns = document.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleQuickAction(btn);
            });
        });

        // Mobile sidebar toggle (for responsive design)
        this.initializeMobileNavigation();
    }

    initializeMobileNavigation() {
        // Add hamburger menu for mobile
        const topNav = document.querySelector('.top-nav');
        const sideNav = document.querySelector('.side-nav');
        
        if (window.innerWidth <= 768) {
            // Create mobile menu button if it doesn't exist
            let mobileMenuBtn = document.querySelector('.mobile-menu-btn');
            if (!mobileMenuBtn) {
                mobileMenuBtn = document.createElement('button');
                mobileMenuBtn.className = 'mobile-menu-btn';
                mobileMenuBtn.innerHTML = '☰';
                mobileMenuBtn.style.cssText = `
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 4px;
                `;
                
                const navLeft = document.querySelector('.nav-left');
                navLeft.appendChild(mobileMenuBtn);
                
                mobileMenuBtn.addEventListener('click', () => {
                    sideNav.classList.toggle('mobile-open');
                });
            }
        }
    }

    loadUserData() {
        if (!this.currentUser) return;

        // Update user info in dropdown
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
        // Simulate loading dashboard data
        try {
            this.showLoading(true);
            
            // Simulate API calls
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update stats (in a real app, this would come from your API)
            this.updateStats({
                documents: Math.floor(Math.random() * 50) + 10,
                collaborators: Math.floor(Math.random() * 20) + 5,
                projects: Math.floor(Math.random() * 15) + 3,
                storage: Math.floor(Math.random() * 80) + 20
            });

            // Load recent activity
            this.loadRecentActivity();
            
            this.showLoading(false);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showLoading(false);
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

    handleNavigation(navItem) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        navItem.classList.add('active');
        
        // Get the navigation target
        const target = navItem.dataset.nav;
        
        // Handle navigation based on target
        switch (target) {
            case 'dashboard':
                this.showDashboard();
                break;
            case 'documents':
                this.showDocuments();
                break;
            case 'projects':
                this.showProjects();
                break;
            case 'team':
                this.showTeam();
                break;
            case 'analytics':
                this.showAnalytics();
                break;
            case 'settings':
                this.showSettings();
                break;
            default:
                console.log('Navigation not implemented:', target);
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
            default:
                console.log('Quick action not implemented:', action);
        }
    }

    // Navigation methods (placeholder implementations)
    showDashboard() {
        console.log('Showing dashboard');
        // Implementation for dashboard view
    }

    showDocuments() {
        console.log('Showing documents');
        // Implementation for documents view
    }

    showProjects() {
        console.log('Showing projects');
        // Implementation for projects view
    }

    showTeam() {
        console.log('Showing team');
        // Implementation for team view
    }

    showAnalytics() {
        console.log('Showing analytics');
        // Implementation for analytics view
    }

    showSettings() {
        console.log('Showing settings');
        // Implementation for settings view
    }

    // Quick action methods (placeholder implementations)
    createNewDocument() {
        console.log('Creating new document');
        // Implementation for creating new document
        alert('New document creation will be implemented soon!');
    }

    uploadFile() {
        console.log('Uploading file');
        // Implementation for file upload
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.txt';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                console.log('File selected:', file.name);
                alert(`File "${file.name}" selected. Upload functionality will be implemented soon!`);
            }
        };
        input.click();
    }

    inviteTeamMember() {
        console.log('Inviting team member');
        // Implementation for team invitation
        const email = prompt('Enter email address to invite:');
        if (email && this.isValidEmail(email)) {
            console.log('Inviting:', email);
            alert(`Invitation will be sent to ${email} soon!`);
        } else if (email) {
            alert('Please enter a valid email address.');
        }
    }

    viewAnalytics() {
        console.log('Viewing analytics');
        // Implementation for analytics view
        this.handleNavigation(document.querySelector('[data-nav="analytics"]'));
    }

    // Utility methods
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
            
            if (error) {
                console.error('Logout error:', error);
                alert('Failed to logout. Please try again.');
                return;
            }
            
            console.log('User logged out successfully');
            this.redirectToLogin();
        } catch (error) {
            console.error('Logout failed:', error);
            alert('Failed to logout. Please try again.');
        }
    }

    redirectToLogin() {
        window.location.href = 'login.html';
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing dashboard...');
    
    try {
        // Wait for services to be available with more detailed logging
        let attempts = 0;
        const maxAttempts = 50;
        
        console.log('⏳ Waiting for services to load...');
        
        while (attempts < maxAttempts) {
            // Check Supabase
            const supabaseAvailable = typeof window.supabase !== 'undefined' && 
                                    typeof window.supabase.createClient === 'function';
            
            // Check AuthService
            const authServiceAvailable = typeof authService !== 'undefined' && 
                                       typeof authService.waitForSupabase === 'function';
            
            console.log(`Attempt ${attempts + 1}: Supabase=${supabaseAvailable}, AuthService=${authServiceAvailable}`);
            
            if (supabaseAvailable && authServiceAvailable) {
                console.log('✅ All services loaded successfully');
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            console.error('❌ Services not available after 5 seconds');
            throw new Error('Services not available after waiting');
        }
        
        // Wait for Supabase to be properly initialized
        console.log('⏳ Waiting for Supabase initialization...');
        await authService.waitForSupabase();
        
        // Initialize dashboard
        new Dashboard();
        console.log('✅ Dashboard initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize dashboard:', error);
        console.error('Error details:', error);
        window.location.href = 'login.html';
    }
});

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    // Handle navigation state if needed
    console.log('Navigation state changed');
});

// Handle window resize for responsive behavior
window.addEventListener('resize', () => {
    const dashboard = window.dashboardInstance;
    if (dashboard) {
        dashboard.initializeMobileNavigation();
    }
});
