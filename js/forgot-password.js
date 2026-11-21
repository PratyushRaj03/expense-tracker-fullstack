import { 
    auth, 
    sendPasswordResetEmail 
} from './firebase-config.js';

import { getErrorMessage } from './auth-errors.js';
import { 
    checkPasswordResetLimit, 
    recordPasswordResetAttempt, 
    escapeHtml 
} from './security-utils.js';

document.addEventListener('DOMContentLoaded', function() {
    const forgotForm = document.getElementById('forgotPasswordForm');
    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('emailError');
    const resetBtn = document.getElementById('resetBtn');
    const btnText = document.querySelector('.btn-text');
    const btnLoader = document.querySelector('.btn-loader');
    const successMessage = document.getElementById('successMessage');

    let cooldownTimer = null;

    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function showError(message) {
        emailError.textContent = message;
        emailError.style.color = '#ef4444';
        emailInput.classList.add('error');
    }

    function clearError() {
        emailError.textContent = '';
        emailInput.classList.remove('error');
    }

    function startResetCooldown(seconds) {
        if (cooldownTimer) clearInterval(cooldownTimer);
        resetBtn.disabled = true;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';

        let remaining = seconds;
        btnText.textContent = `Wait (${remaining}s)`;

        cooldownTimer = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(cooldownTimer);
                cooldownTimer = null;
                resetBtn.disabled = false;
                btnText.textContent = 'Send Reset Link';
            } else {
                btnText.textContent = `Wait (${remaining}s)`;
            }
        }, 1000);
    }

    function showNotification(message, type = 'error') {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
        
        notification.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <span>${escapeHtml(message)}</span>
        `;
        
        notification.style.position = 'fixed';
        notification.style.top = '24px';
        notification.style.right = '24px';
        notification.style.padding = '14px 22px';
        notification.style.borderRadius = '10px';
        notification.style.background = type === 'success' ? 'rgba(10, 28, 22, 0.95)' : 'rgba(32, 10, 18, 0.95)';
        notification.style.border = type === 'success' ? '1px solid #00FF9D' : '1px solid #FF2A5F';
        notification.style.color = type === 'success' ? '#00FF9D' : '#FF2A5F';
        notification.style.fontFamily = "'JetBrains Mono', monospace";
        notification.style.fontSize = '12.5px';
        notification.style.fontWeight = '600';
        notification.style.zIndex = '9999';
        notification.style.boxShadow = type === 'success' ? '0 0 24px rgba(0, 255, 157, 0.35)' : '0 0 24px rgba(255, 42, 95, 0.35)';
        notification.style.backdropFilter = 'blur(16px)';
        notification.style.display = 'flex';
        notification.style.alignItems = 'center';
        notification.style.gap = '10px';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    forgotForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const email = emailInput.value.trim();
        
        // Validate email format
        if (!email) {
            showError('Please enter your email address');
            return;
        }
        
        if (!validateEmail(email)) {
            showError('Please enter a valid email address');
            return;
        }
        
        // Check rate limiting on password resets
        const rateCheck = checkPasswordResetLimit(email);
        if (!rateCheck.allowed) {
            showError(rateCheck.message);
            showNotification(rateCheck.message, 'error');
            startResetCooldown(rateCheck.remainingSeconds);
            return;
        }

        clearError();
        
        // Show loading state
        resetBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
        
        try {
            // Record reset request attempt for rate limiting
            recordPasswordResetAttempt(email);

            // Send password reset email via Firebase
            await sendPasswordResetEmail(auth, email);
            
            // Standard success display
            document.querySelectorAll('.input-group').forEach(el => el.style.display = 'none');
            resetBtn.style.display = 'none';
            if (successMessage) successMessage.style.display = 'block';
            
            showNotification('If an account exists with this email, a reset link has been sent.', 'success');
            
        } catch (error) {
            // Anti-enumeration: If user is not found, show the exact same generic success message
            if (error.code === 'auth/user-not-found') {
                document.querySelectorAll('.input-group').forEach(el => el.style.display = 'none');
                resetBtn.style.display = 'none';
                if (successMessage) successMessage.style.display = 'block';
                showNotification('If an account exists with this email, a reset link has been sent.', 'success');
                return;
            }

            // Real network/rate-limiting errors
            const errorMessage = getErrorMessage(error);
            showError(errorMessage);
            showNotification(errorMessage, 'error');
            
            resetBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';

            if (error.code === 'auth/too-many-requests') {
                startResetCooldown(300); // 5 min cooldown for too many requests
            }
        }
    });

    // Real-time email validation
    emailInput.addEventListener('input', function() {
        if (this.value && validateEmail(this.value)) {
            this.style.borderColor = '#22c55e';
            clearError();
        } else if (this.value) {
            this.style.borderColor = '#ef4444';
        } else {
            this.style.borderColor = '';
        }
    });
});
