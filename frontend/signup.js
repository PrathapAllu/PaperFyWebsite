document.addEventListener("DOMContentLoaded", function () {
  const googleBtn = document.querySelector('.google-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async function() {
      try {
        const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/dashboard.html`
          }
        });
        
        if (error) {
          console.error('Google signup error:', error);
        }
      } catch (error) {
        console.error('Google signup error:', error);
      }
    });
  }
});
