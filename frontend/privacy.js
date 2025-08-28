// privacy.js
// Auto-update the last updated date every five days

function updateLastUpdatedDate() {
    const lastUpdatedElem = document.getElementById('lastUpdated');
    if (!lastUpdatedElem) return;
    const now = new Date();
    // Find the most recent date that is a multiple of 5 days before today
    const baseDate = new Date('2025-08-27'); // initial date
    const msInDay = 24 * 60 * 60 * 1000;
    const daysSinceBase = Math.floor((now - baseDate) / msInDay);
    const lastUpdateDays = daysSinceBase - (daysSinceBase % 5);
    const lastUpdateDate = new Date(baseDate.getTime() + lastUpdateDays * msInDay);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    lastUpdatedElem.textContent = 'Last updated: ' + lastUpdateDate.toLocaleDateString(undefined, options);
}

document.addEventListener('DOMContentLoaded', updateLastUpdatedDate);
