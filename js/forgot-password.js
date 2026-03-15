import { 
    auth, 
    sendPasswordResetEmail 
} from './firebase-config.js';

import { getErrorMessage } from './auth-errors.js';

document.addEventListener('DOMContentLoaded', function() {
    const forgotForm = document.getElementById('forgotPasswordForm');
    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('emailError');
    const resetBtn = document.getElementById('resetBtn');
    const btnText = document.querySelector('.btn-text');
    const btnLoader = document.querySelector('.btn-loader');
    const successMessage = document.getElementById('successMessage');

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

    function showNotification(message, type = 'error') {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '16px 24px';
        notification.style.borderRadius = '8px';
        notification.style.background = type === 'success' ? '#22c55e' : '#ef4444';
        notification.style.color = 'white';
        notification.style.zIndex = '9999';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
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
        
        // Validate email
        if (!email) {
            showError('Please enter your email address');
            return;
        }
        
        if (!validateEmail(email)) {
            showError('Please enter a valid email address');
            return;
        }
        
        clearError();
        
        // Show loading state
        resetBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
        
        try {
            // Send password reset email
            await sendPasswordResetEmail(auth, email);
            
            console.log('✅ Password reset email sent to:', email);
            
            // Hide form, show success message
            document.querySelectorAll('.input-group').forEach(el => el.style.display = 'none');
            resetBtn.style.display = 'none';
            successMessage.style.display = 'block';
            
            showNotification('Reset link sent! Check your email.', 'success');
            
        } catch (error) {
            console.error('❌ Password reset error:', error);
            
            const errorMessage = getErrorMessage(error);
            showError(errorMessage);
            showNotification(errorMessage, 'error');
            
            // Reset button state
            resetBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    });

    // Real-time validation
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