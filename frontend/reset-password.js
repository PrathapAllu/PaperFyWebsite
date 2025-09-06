document.addEventListener("DOMContentLoaded", function () {
    const resetForm = document.getElementById("resetForm");
    const errorMessage = document.getElementById("errorMessage");
    const successMessage = document.getElementById("successMessage");

    if (!resetForm) return;

    // Check if we have access token from URL (password reset link)
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const type = urlParams.get('type');

    if (type !== 'recovery' || !accessToken) {
        showError("Invalid or expired reset link. Please request a new password reset.");
        return;
    }

    resetForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        
        const newPassword = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const resetBtn = document.getElementById("resetBtn");
        const btnText = resetBtn.querySelector(".btn-text");
        const btnLoader = resetBtn.querySelector(".btn-loader");

        // Clear previous messages
        hideMessages();

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            showError("Passwords don't match. Please try again.");
            return;
        }

        // Validate password length
        if (newPassword.length < 6) {
            showError("Password must be at least 6 characters long.");
            return;
        }

        // Show loading state
        btnText.style.display = "none";
        btnLoader.style.display = "block";
        resetBtn.disabled = true;

        try {
            // Update the user's password
            const { error } = await window.supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) {
                throw error;
            }

            // Show success message
            showSuccess("Password updated successfully! You can now log in with your new password.");
            
            // Clear form
            resetForm.reset();
            
            // Redirect to login page after 3 seconds
            setTimeout(() => {
                window.location.href = "login.html?reset=success";
            }, 3000);

        } catch (error) {
            showError(error.message || "An error occurred. Please try again.");
        } finally {
            // Reset button state
            btnText.style.display = "block";
            btnLoader.style.display = "none";
            resetBtn.disabled = false;
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = "block";
        successMessage.style.display = "none";
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = "block";
        errorMessage.style.display = "none";
    }

    function hideMessages() {
        errorMessage.style.display = "none";
        successMessage.style.display = "none";
    }

    // Handle password confirmation validation in real-time
    const newPasswordInput = document.getElementById("newPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");

    if (newPasswordInput && confirmPasswordInput) {
        confirmPasswordInput.addEventListener("input", function() {
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            if (confirmPassword && newPassword !== confirmPassword) {
                confirmPasswordInput.setCustomValidity("Passwords don't match");
            } else {
                confirmPasswordInput.setCustomValidity("");
            }
        });
    }
});
