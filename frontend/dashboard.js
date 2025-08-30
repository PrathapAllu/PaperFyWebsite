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

            await this.checkAuthStatus();

            if (loadingOverlay) loadingOverlay.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';

            this.initializeEventListeners();
            this.loadUserData();
            this.loadDashboardData();
        } catch (error) {
            const loadingOverlay = document.getElementById('dashboardLoadingOverlay');
            const mainContent = document.getElementById('mainDashboardContent');
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            if (mainContent) mainContent.style.display = 'none';
            this.redirectToLogin();
        }
    }

    async checkAuthStatus() {
        try {
            const { data: { user }, error } = await window.supabaseClient.auth.getUser();
            if (error || !user) {
                this.redirectToLogin();
                return;
            }
            this.currentUser = user;
        } catch (error) {
            this.redirectToLogin();
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
                    console.log('Contact form submitted:', data);
                    alert('Thank you for your message! We will get back to you soon.');
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
            this.showLoading(false);
        } catch (error) {
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
            localStorage.removeItem('stepdoc_remember_me');
            if (error) {
                return;
            }
            this.redirectToLogin();
        } catch (error) {
        }
    }

    redirectToLogin() {
        window.location.href = 'login.html';
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


