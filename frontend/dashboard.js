document.addEventListener("DOMContentLoaded", async function () {
  const overlay = document.getElementById("dashboardLoadingOverlay");
  const mainContent = document.getElementById("mainDashboardContent");
  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const userAvatar = document.getElementById("userAvatar");
  const licenseCard = document.querySelector(".license-card .license-info");
  const downloadBtn = document.querySelector(".download-btn.windows-btn");
  const macDropdownBtn = document.getElementById("macDropdownBtn");
  const macDropdownMenu = document.getElementById("macDropdownMenu");

  let user, subscription;

  function openSubscriptionModal() {
    const modal = document.getElementById("subscriptionModalOverlay");
    if (modal) {
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
  }

  function closeSubscriptionModal() {
    const modal = document.getElementById("subscriptionModalOverlay");
    if (modal) {
      modal.style.setProperty("display", "none", "important");
      document.body.style.overflow = "auto";
    }
  }

  function setupModalListeners() {
    const modalClose = document.getElementById("subscriptionModalClose");
    const freeButton = document.querySelector('[data-plan="free"]');

    if (modalClose) {
      modalClose.addEventListener("click", closeSubscriptionModal);
    }

    if (freeButton) {
      freeButton.addEventListener("click", closeSubscriptionModal);
    }

    // Setup billing toggle functionality
    const toggleOptions = document.querySelectorAll('.toggle-option');
    toggleOptions.forEach(option => {
        option.addEventListener('click', function() {
            toggleOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            const period = this.dataset.period;
            updatePricing(period);
        });
    });
  }

  function updatePricing(period) {
    const proAmount = document.querySelector('.pro-plan .amount');
    const proPrice = document.querySelector('.pro-plan .period');
    const proPlusAmount = document.querySelector('.pro-plus-plan .amount');
    const proPlusPrice = document.querySelector('.pro-plus-plan .period');
    
    if (period === 'yearly') {
        if (proAmount) proAmount.textContent = '$7.99';
        if (proPrice) proPrice.innerHTML = 'per month<br><small style="font-size: 0.7rem; color: #666; font-weight: normal; line-height: 0.8; margin: -2px 0 0 0; padding: 0; display: block;">billed annually</small>';
        if (proPlusAmount) proPlusAmount.textContent = '$11.99';
        if (proPlusPrice) proPlusPrice.innerHTML = 'per month<br><small style="font-size: 0.7rem; color: #666; font-weight: normal; line-height: 0.8; margin: -2px 0 0 0; padding: 0; display: block;">billed annually</small>';
    } else {
        if (proAmount) proAmount.textContent = '$9.99';
        if (proPrice) proPrice.textContent = 'per month';
        if (proPlusAmount) proPlusAmount.textContent = '$14.99';
        if (proPlusPrice) proPlusPrice.textContent = 'per month';
    }
  }

  function loadSubscriptionModal() {
    return fetch("subscription-modal-component.html")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then((html) => {
        document.getElementById("subscriptionModalContainer").innerHTML = html;
        return new Promise((resolve) => {
          setTimeout(() => {
            setupModalListeners();
            resolve();
          }, 200);
        });
      })
      .catch((error) => {
        throw error;
      });
  }

  // Enhanced authentication check using AuthManager
  if (window.authManager) {
    const isAuthenticated = await window.authManager.requireAuth();
    if (!isAuthenticated) {
      return; // User will be redirected to login
    }
    user = window.authManager.user;
  } else {
    // Fallback to direct Supabase check
    const { data: { user: supaUser } } = await window.supabaseClient.auth.getUser();
    if (!supaUser) {
      window.location.href = "login.html";
      return;
    }
    user = supaUser;
  }

  userName.textContent = user.user_metadata?.full_name || user.user_metadata?.name || user.email;
  userEmail.textContent = user.email;
  if (user.user_metadata?.avatar_url) {
    userAvatar.innerHTML = `<img src="${user.user_metadata.avatar_url}" alt="avatar" style="width:32px;height:32px;border-radius:50%">`;
  } else {
    userAvatar.textContent = (user.user_metadata?.name || user.email)[0].toUpperCase();
  }

  // Fetch user subscription data
  let { data: subs } = await window.supabaseClient
    .from("subscriptions")
    .select("plan_type,expires_at")
    .eq("user_id", user.id)
    .order("expires_at", { ascending: false })
    .limit(1);

  subscription = subs && subs.length ? subs[0] : { plan_type: "free" };
  
  // Determine user's current plan and access level
  const planInfo = getUserPlanInfo(subscription);
  
  function getUserPlanInfo(subscription) {
    const now = new Date();
    const expiry = subscription.expires_at ? new Date(subscription.expires_at) : null;
    const planType = (subscription.plan_type || "free").toLowerCase();
    
    // Check if subscription is active (not expired and not free)
    const isActiveSubscription = expiry && expiry > now && planType !== "free";
    
    const plan = isActiveSubscription ? formatPlanName(planType) : "Free";
    const canDownload = isActiveSubscription; // Pro and Pro Plus can download
    const status = canDownload ? "Active" : (planType === "free" ? "Free Tier" : "Expired");
    const validUntil = expiry ? expiry.toLocaleDateString() : "-";
    const daysRemaining = expiry ? Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))) : "-";
    
    return { plan, canDownload, status, validUntil, daysRemaining, isActiveSubscription };
  }
  
  function formatPlanName(planType) {
    switch(planType) {
      case "pro": return "Pro";
      case "pro plus": return "Pro Plus";
      default: return "Free";
    }
  }

  // Update license information display
  updateLicenseDisplay(planInfo);
  
  // Update download access based on plan
  updateDownloadAccess(planInfo);
  
  function updateLicenseDisplay(planInfo) {
    const statusClass = planInfo.canDownload ? "active" : "inactive";
    licenseCard.innerHTML = `
      <div class="license-row"><span class="license-label">Plan</span><span class="license-value">${planInfo.plan}</span></div>
      <div class="license-row"><span class="license-label">Status</span><span class="license-value"><span class="status-badge status-${statusClass}">${planInfo.status}</span></span></div>
      <div class="license-row"><span class="license-label">Valid Until</span><span class="license-value">${planInfo.validUntil}</span></div>
      <div class="license-row"><span class="license-label">Days Remaining</span><span class="license-value">${planInfo.daysRemaining}</span></div>
    `;
  }
  
  function updateDownloadAccess(planInfo) {
    if (planInfo.canDownload) {
      // Enable downloads for Pro and Pro Plus users
      enableDownloads();
    } else {
      // Disable downloads for Free users and show upgrade modal
      disableDownloads();
      showUpgradeModal();
    }
  }
  
  function enableDownloads() {
    downloadBtn.classList.remove("disabled");
    downloadBtn.removeAttribute("tabindex");
    downloadBtn.removeAttribute("aria-disabled");
    macDropdownBtn.classList.remove("disabled");
    macDropdownBtn.removeAttribute("tabindex");
    macDropdownBtn.removeAttribute("aria-disabled");
    macDropdownMenu.style.pointerEvents = "auto";
    
    // Remove upgrade message for paying users
    removeUpgradeMessage();
  }
  
  function disableDownloads() {
    downloadBtn.classList.add("disabled");
    downloadBtn.setAttribute("tabindex", "-1");
    downloadBtn.setAttribute("aria-disabled", "true");
    macDropdownBtn.classList.add("disabled");
    macDropdownBtn.setAttribute("tabindex", "-1");
    macDropdownBtn.setAttribute("aria-disabled", "true");
    macDropdownMenu.style.pointerEvents = "none";
    
    // Add upgrade message for free users
    addUpgradeMessage();
  }
  
  function addUpgradeMessage() {
    const downloadCard = document.querySelector('.download-card');
    let upgradeMessage = downloadCard.querySelector('.upgrade-message');
    
    if (!upgradeMessage) {
      upgradeMessage = document.createElement('div');
      upgradeMessage.className = 'upgrade-message';
      upgradeMessage.innerHTML = `
        <div class="upgrade-text">
          <span class="upgrade-icon">🔒</span>
          <span>Upgrade to Pro or Pro Plus to download</span>
        </div>
        <button class="upgrade-btn" onclick="openSubscriptionModal()">Upgrade Now</button>
      `;
      downloadCard.appendChild(upgradeMessage);
    }
  }
  
  function removeUpgradeMessage() {
    const upgradeMessage = document.querySelector('.upgrade-message');
    if (upgradeMessage) {
      upgradeMessage.remove();
    }
  }
  
  function showUpgradeModal() {
    loadSubscriptionModal().then(() => {
      setTimeout(() => {
        openSubscriptionModal();
      }, 1000);
    });
  }

  overlay.style.display = "none";
  mainContent.style.display = "block";

  // Setup user dropdown functionality
  const userDropdown = document.getElementById("userDropdown");
  const logoutBtn = document.getElementById("logoutBtn");

  // Toggle dropdown when clicking user avatar
  userAvatar.addEventListener("click", function(e) {
    e.stopPropagation();
    userDropdown.classList.toggle("show");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function(e) {
    if (!userAvatar.contains(e.target) && !userDropdown.contains(e.target)) {
      userDropdown.classList.remove("show");
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", async function(e) {
    e.preventDefault();
    try {
      await window.supabaseClient.auth.signOut();
      window.location.href = "login.html";
    } catch (error) {
      // Silent error handling for production
      window.location.href = "login.html";
    }
  });

  // Setup contact support modal functionality
  const contactSupportBtn = document.getElementById("contactSupportBtn");
  const contactModal = document.getElementById("contactModal");
  const closeContactModal = document.getElementById("closeContactModal");
  const contactForm = document.getElementById("contactForm");

  contactSupportBtn.addEventListener("click", function() {
    contactModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  });

  closeContactModal.addEventListener("click", function() {
    contactModal.style.display = "none";
    document.body.style.overflow = "auto";
  });

  // Close modal when clicking outside content
  contactModal.addEventListener("click", function(e) {
    if (e.target === contactModal) {
      contactModal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  });

  // Handle contact form submission
  contactForm.addEventListener("submit", function(e) {
    e.preventDefault();
    // You can add actual form submission logic here
    alert("Thank you for your message! We'll get back to you soon.");
    contactModal.style.display = "none";
    document.body.style.overflow = "auto";
    contactForm.reset();
  });

  // Setup Mac dropdown functionality
  macDropdownBtn.addEventListener("click", function(e) {
    e.stopPropagation();
    if (!macDropdownBtn.classList.contains("disabled")) {
      macDropdownMenu.classList.toggle("show");
    }
  });

  // Close Mac dropdown when clicking outside
  document.addEventListener("click", function(e) {
    if (!macDropdownBtn.contains(e.target) && !macDropdownMenu.contains(e.target)) {
      macDropdownMenu.classList.remove("show");
    }
  });

  // Handle Mac option selection
  const macOptions = document.querySelectorAll(".mac-option");
  macOptions.forEach(option => {
    option.addEventListener("click", function(e) {
      e.preventDefault();
      const link = this.dataset.link;
      const text = this.dataset.text;
      
      if (link) {
        // Create temporary download link
        const a = document.createElement("a");
        a.href = link;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      macDropdownMenu.classList.remove("show");
    });
  });

logoutBtn.addEventListener("click", async function(e) {
  e.preventDefault();
  try {
    await window.supabaseClient.auth.signOut();
    notifyExtensionLogout();
    window.location.href = "login.html";
  } catch (error) {
    window.location.href = "login.html";
  }
});

  // Handle Windows download
  downloadBtn.addEventListener("click", function(e) {
    e.preventDefault();
    if (!this.classList.contains("disabled")) {
      const link = this.dataset.link;
      if (link) {
        // Create temporary download link
        const a = document.createElement("a");
        a.href = link;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  });
  
  window.openSubscriptionModal = openSubscriptionModal;
  window.closeSubscriptionModal = closeSubscriptionModal;
});


function notifyExtensionLogout() {
  if (window.chrome && chrome.runtime) {
    try {
      chrome.runtime.sendMessage('fceeckdhanpanhlgmnlldmchogncaifh', {
        type: 'AUTH_STATUS_CHANGED',
        isLoggedIn: false,
        userName: null,
        timestamp: Date.now()
      });
    } catch (error) {}
  }
}