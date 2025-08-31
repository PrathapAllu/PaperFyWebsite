class SubscriptionPage {
    constructor() {
        this.stripe = null;
        this.cardElement = null;
        this.selectedPlan = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            await this.handleAuthFlow();
            await this.initializeStripe();
            this.initializeEventListeners();
        } catch (error) {
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
                this.populateUserData();
                return;
            } catch (error) {
                this.redirectToLogin('?error=Session setup failed');
                return;
            }
        }

        try {
            const { data: { user }, error } = await window.supabaseClient.auth.getUser();
            
            if (error || !user) {
                throw new Error('Not authenticated');
            }
            
            this.currentUser = user;
            this.populateUserData();
        } catch (error) {
            throw error;
        }
    }

    populateUserData() {
        const billingNameInput = document.getElementById('billingName');
        const billingEmailInput = document.getElementById('billingEmail');

        if (billingNameInput && this.currentUser.user_metadata?.full_name) {
            billingNameInput.value = this.currentUser.user_metadata.full_name;
        }

        if (billingEmailInput && this.currentUser.email) {
            billingEmailInput.value = this.currentUser.email;
        }
    }

    async initializeStripe() {
        try {
            this.stripe = Stripe('pk_test_51QOgm5H8ltXuaWEpQFV4QLGrfE9v3u8hx7Q7sJQ6EZGZH4Kt7SyS2EjLjDqClUFXMtOv7QnL5qQNrFlDJWgVDhCL00TKtQ6Wqk');
            
            const elements = this.stripe.elements({
                appearance: {
                    theme: 'stripe',
                    variables: {
                        colorPrimary: '#667eea',
                        colorBackground: '#ffffff',
                        colorText: '#333333',
                        colorDanger: '#dc2626',
                        fontFamily: 'Roboto, sans-serif',
                        borderRadius: '8px',
                        spacingUnit: '4px'
                    }
                }
            });

            this.cardElement = elements.create('card', {
                hidePostalCode: true,
                style: {
                    base: {
                        fontSize: '16px',
                        color: '#333333',
                        '::placeholder': {
                            color: '#aab7c4',
                        },
                    },
                }
            });

            this.cardElement.mount('#card-element');

            this.cardElement.on('change', (event) => {
                this.handleCardChange(event);
            });

        } catch (error) {
            this.showError('Failed to initialize payment system. Please refresh the page.');
        }
    }

    handleCardChange(event) {
        const errorElement = document.getElementById('card-errors');
        
        if (event.error) {
            errorElement.textContent = event.error.message;
            errorElement.style.display = 'block';
        } else {
            errorElement.style.display = 'none';
        }
    }

    initializeEventListeners() {
        const planButtons = document.querySelectorAll('.plan-button');
        planButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.handlePlanSelection(e);
            });
        });

        const toggleOptions = document.querySelectorAll('.toggle-option');
        toggleOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                this.handleBillingToggle(e);
            });
        });

        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.showPlansSection();
            });
        }

        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => {
                this.handlePaymentSubmit(e);
            });
        }
    }

    handleBillingToggle(event) {
        const clickedOption = event.currentTarget;
        const period = clickedOption.dataset.period;
        
        document.querySelectorAll('.toggle-option').forEach(option => {
            option.classList.remove('active');
        });
        
        clickedOption.classList.add('active');
        
        this.updatePricing(period);
    }

    updatePricing(period) {
        const monthlyPrices = { pro: 9.99, pro_plus: 14.99 };
        const yearlyPrices = { pro: 7.99, pro_plus: 11.99 };
        
        const prices = period === 'yearly' ? yearlyPrices : monthlyPrices;
        const suffix = period === 'yearly' ? '/year' : '/month';
        
        Object.keys(prices).forEach(planType => {
            const priceElement = document.querySelector(`[data-plan="${planType}"] .price .amount`);
            const periodElement = document.querySelector(`[data-plan="${planType}"] .price .period`);
            
            if (priceElement) {
                priceElement.textContent = `$${prices[planType]}`;
            }
            if (periodElement) {
                periodElement.textContent = suffix;
            }
        });
    }

    handlePlanSelection(event) {
        const planType = event.target.dataset.plan;
        
        if (planType === 'free') {
            this.handleFreePlan();
        } else {
            this.selectedPlan = planType;
            this.showPaymentSection();
        }
    }

    async handleFreePlan() {
        try {
            this.showLoading(true);
            
            localStorage.setItem('user_subscription', JSON.stringify({
                planType: 'free',
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            }));
            
            setTimeout(() => {
                this.showLoading(false);
                window.location.href = 'dashboard.html?skip_subscription=true';
            }, 1000);
            
        } catch (error) {
            this.showLoading(false);
            this.showError('Something went wrong. Please try again.');
        }
    }

    showPaymentSection() {
        const plansContainer = document.querySelector('.plans-container');
        const paymentSection = document.getElementById('paymentSection');
        const selectedPlanInfo = document.getElementById('selectedPlanInfo');

        if (plansContainer) plansContainer.style.display = 'none';
        if (paymentSection) paymentSection.style.display = 'block';

        const planDetails = this.getPlanDetails(this.selectedPlan);
        if (selectedPlanInfo && planDetails) {
            selectedPlanInfo.innerHTML = `
                <strong>${planDetails.name}</strong> - $${planDetails.price}/month
            `;
        }

        document.querySelector('.subscription-container').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    showPlansSection() {
        const plansContainer = document.querySelector('.plans-container');
        const paymentSection = document.getElementById('paymentSection');

        if (plansContainer) plansContainer.style.display = 'grid';
        if (paymentSection) paymentSection.style.display = 'none';

        this.selectedPlan = null;
    }

    getPlanDetails(planType) {
        const plans = {
            'pro': { name: 'Pro', price: 9 },
            'pro_plus': { name: 'Pro Plus', price: 19 }
        };
        return plans[planType] || null;
    }

    async handlePaymentSubmit(event) {
        event.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        this.showLoading(true);
        this.setButtonState(true);

        try {
            const billingDetails = this.getBillingDetails();
            const planDetails = this.getPlanDetails(this.selectedPlan);

            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session?.access_token) {
                throw new Error('Authentication required');
            }

            const response = await fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    planType: this.selectedPlan,
                    billingDetails: billingDetails
                })
            });

            if (!response.ok) {
                throw new Error('Payment setup failed');
            }

            const { clientSecret } = await response.json();

            const { error: paymentError } = await this.stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: this.cardElement,
                    billing_details: {
                        name: billingDetails.name,
                        email: billingDetails.email,
                        address: {
                            country: billingDetails.country,
                            postal_code: billingDetails.zip
                        }
                    }
                }
            });

            if (paymentError) {
                throw new Error(paymentError.message);
            }

            await this.createSubscription();
            localStorage.setItem('user_subscription', JSON.stringify({
                planType: this.selectedPlan,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }));
            
            this.showSuccess();
            
            setTimeout(() => {
                window.location.href = 'dashboard.html?skip_subscription=true';
            }, 2000);

        } catch (error) {
            this.showError(error.message || 'Payment failed. Please try again.');
            this.setButtonState(false);
        } finally {
            this.showLoading(false);
        }
    }

    async createSubscription() {
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 1);

            const response = await fetch('/api/create-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    planType: this.selectedPlan,
                    expiresAt: expiryDate.toISOString()
                })
            });

            if (!response.ok) {
                throw new Error('Subscription creation failed');
            }

        } catch (error) {
            throw error;
        }
    }

    validateForm() {
        const requiredFields = [
            'billingName',
            'billingEmail', 
            'billingCountry',
            'billingZip'
        ];

        let isValid = true;

        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                this.showFieldError(field, 'This field is required');
                isValid = false;
            } else {
                this.clearFieldError(field);
            }
        });

        const emailField = document.getElementById('billingEmail');
        if (emailField && emailField.value && !this.isValidEmail(emailField.value)) {
            this.showFieldError(emailField, 'Please enter a valid email address');
            isValid = false;
        }

        return isValid;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showFieldError(field, message) {
        field.style.borderColor = '#dc2626';
        
        let errorElement = field.parentNode.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            errorElement.style.color = '#dc2626';
            errorElement.style.fontSize = '0.9rem';
            errorElement.style.marginTop = '5px';
            field.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }

    clearFieldError(field) {
        field.style.borderColor = '#e1e5e9';
        
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    getBillingDetails() {
        return {
            name: document.getElementById('billingName').value.trim(),
            email: document.getElementById('billingEmail').value.trim(),
            country: document.getElementById('billingCountry').value,
            zip: document.getElementById('billingZip').value.trim()
        };
    }

    setButtonState(disabled) {
        const submitButton = document.getElementById('submitButton');
        const buttonText = submitButton.querySelector('.button-text');
        const buttonLoader = submitButton.querySelector('.button-loader');

        if (disabled) {
            submitButton.disabled = true;
            buttonText.style.display = 'none';
            buttonLoader.style.display = 'inline';
        } else {
            submitButton.disabled = false;
            buttonText.style.display = 'inline';
            buttonLoader.style.display = 'none';
        }
    }

    showLoading(show) {
        const loadingOverlay = document.getElementById('subscriptionLoadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        const errorContainer = this.getOrCreateMessageContainer('error');
        errorContainer.innerHTML = `
            <div style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <strong>Error:</strong> ${message}
            </div>
        `;
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    showSuccess() {
        const successContainer = this.getOrCreateMessageContainer('success');
        successContainer.innerHTML = `
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <strong>Success!</strong> Payment completed successfully. Redirecting to dashboard...
            </div>
        `;
        successContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    getOrCreateMessageContainer(type) {
        let container = document.getElementById(`${type}-container`);
        if (!container) {
            container = document.createElement('div');
            container.id = `${type}-container`;
            const paymentSection = document.getElementById('paymentSection');
            if (paymentSection) {
                paymentSection.insertBefore(container, paymentSection.firstChild);
            }
        }
        return container;
    }

    redirectToLogin(params = '') {
        window.location.href = `login.html${params}`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            const supabaseAvailable = typeof window.supabase !== 'undefined' && 
                                    typeof window.supabase.createClient === 'function';
            const stripeAvailable = typeof Stripe !== 'undefined';
            
            if (supabaseAvailable && stripeAvailable) {
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            throw new Error('Required libraries not available');
        }
        
        new SubscriptionPage();
    } catch (error) {
        window.location.href = 'login.html';
    }
});
