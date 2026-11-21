import { 
    auth, 
    signInWithEmailAndPassword 
} from './firebase-config.js';

import { getErrorMessage } from './auth-errors.js';
import { 
    checkLoginRateLimit, 
    recordFailedLoginAttempt, 
    clearLoginRateLimit,
    escapeHtml 
} from './security-utils.js';

// Single DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    
    // ===== GET DOM ELEMENTS =====
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const btnText = document.querySelector('.btn-text');
    const btnLoader = document.querySelector('.btn-loader');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const emailInput = document.getElementById('email');
    const signupLink = document.getElementById('signupLink');
    const forgotLink = document.getElementById('forgotPassword');
    const socialBtns = document.querySelectorAll('.social-btn');
    const rememberCheckbox = document.getElementById('remember');

    let cooldownTimer = null;

    // Check for session timeout redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('timeout') === '1') {
        showNotification('Your session expired due to inactivity. Please sign in again.', 'info');
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // ===== COOLDOWN TIMER HELPER =====
    function startCooldownTimer(seconds) {
        if (cooldownTimer) clearInterval(cooldownTimer);
        loginBtn.disabled = true;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';

        let remaining = seconds;
        btnText.textContent = `Locked (${remaining}s)`;

        cooldownTimer = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(cooldownTimer);
                cooldownTimer = null;
                loginBtn.disabled = false;
                btnText.textContent = 'Sign In';
            } else {
                btnText.textContent = `Locked (${remaining}s)`;
            }
        }, 1000);
    }

    // Check rate limit on email blur or change
    function checkEmailRateLimit() {
        const email = emailInput.value.trim();
        if (!email) return;
        const status = checkLoginRateLimit(email);
        if (status.isLocked) {
            showNotification(status.message, 'error');
            startCooldownTimer(status.remainingSeconds);
        }
    }

    emailInput.addEventListener('blur', checkEmailRateLimit);

    // ===== PASSWORD TOGGLE FUNCTIONALITY =====
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
            
            this.classList.add('pulse');
            setTimeout(() => {
                this.classList.remove('pulse');
            }, 300);
        });
    }

    // ===== VALIDATION FUNCTIONS =====
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function validatePassword(password) {
        return password && password.length >= 6;
    }

    // ===== UI FEEDBACK FUNCTIONS =====
    function showNotification(message, type = 'error') {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const iconClass = type === 'success' 
            ? 'fa-check-circle' 
            : type === 'info' 
                ? 'fa-info-circle' 
                : 'fa-exclamation-circle';

        const safeMessage = escapeHtml(message);
        notification.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <span>${safeMessage}</span>
        `;

        notification.style.position = 'fixed';
        notification.style.top = '24px';
        notification.style.right = '24px';
        notification.style.padding = '14px 22px';
        notification.style.borderRadius = '10px';
        notification.style.background = type === 'success' ? 'rgba(10, 28, 22, 0.95)' : type === 'info' ? 'rgba(10, 20, 35, 0.95)' : 'rgba(32, 10, 18, 0.95)';
        notification.style.border = type === 'success' ? '1px solid #00FF9D' : type === 'info' ? '1px solid #00F0FF' : '1px solid #FF2A5F';
        notification.style.color = type === 'success' ? '#00FF9D' : type === 'info' ? '#00F0FF' : '#FF2A5F';
        notification.style.fontFamily = "'JetBrains Mono', monospace";
        notification.style.fontSize = '12.5px';
        notification.style.fontWeight = '600';
        notification.style.boxShadow = type === 'success' ? '0 0 24px rgba(0, 255, 157, 0.35)' : '0 0 24px rgba(255, 42, 95, 0.35)';
        notification.style.backdropFilter = 'blur(16px)';
        notification.style.zIndex = '9999';
        notification.style.display = 'flex';
        notification.style.alignItems = 'center';
        notification.style.gap = '12px';
        notification.style.animation = 'slideIn 0.3s ease';

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 4000);
    }

    // ===== REAL-TIME VALIDATION =====
    emailInput.addEventListener('input', function() {
        const inputGroup = this.closest('.input-group');
        const icon = inputGroup.querySelector('.input-icon i');
        
        if (this.value && !validateEmail(this.value)) {
            this.style.borderColor = '#FF2A5F';
            icon.style.color = '#FF2A5F';
        } else if (this.value && validateEmail(this.value)) {
            this.style.borderColor = '#00FF9D';
            icon.style.color = '#00FF9D';
        } else {
            this.style.borderColor = '';
            icon.style.color = '';
        }
    });

    passwordInput.addEventListener('input', function() {
        const inputGroup = this.closest('.input-group');
        const icon = inputGroup.querySelector('.input-icon i');
        
        if (this.value && !validatePassword(this.value)) {
            this.style.borderColor = '#ef4444';
            icon.style.color = '#ef4444';
        } else if (this.value && validatePassword(this.value)) {
            this.style.borderColor = '#22c55e';
            icon.style.color = '#22c55e';
        } else {
            this.style.borderColor = '';
            icon.style.color = '';
        }
    });

    // ===== FIREBASE LOGIN FUNCTION =====
    async function loginUser(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return {
                success: true,
                user: userCredential.user
            };
        } catch (error) {
            return {
                success: false,
                error: error
            };
        }
    }

    // ===== FORM SUBMISSION WITH FIREBASE & BRUTE-FORCE HARDENING =====
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validation
        if (!email || !password) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        if (!validateEmail(email)) {
            showNotification('Please enter a valid email address', 'error');
            emailInput.focus();
            return;
        }

        // Check brute force cooldown before making any network request
        const rateCheck = checkLoginRateLimit(email);
        if (rateCheck.isLocked) {
            showNotification(rateCheck.message, 'error');
            startCooldownTimer(rateCheck.remainingSeconds);
            return;
        }

        // Show loading state
        loginBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
        loginBtn.style.opacity = '0.8';

        emailInput.classList.remove('error');
        passwordInput.classList.remove('error');

        // Attempt Firebase login
        const result = await loginUser(email, password);

        // Hide loading state
        loginBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        loginBtn.style.opacity = '1';

        if (result.success) {
            // Authentication succeeded: clear rate limiter for this email
            clearLoginRateLimit(email);

            // Save email if "Remember me" is checked (only store email, never credentials)
            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('rememberEmail', email);
            } else {
                localStorage.removeItem('rememberEmail');
            }
            
            showNotification('Login successful! Redirecting to dashboard...', 'success');
            passwordInput.value = '';
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
        } else {
            // Authentication failed: record attempt and calculate progressive cooldown
            const throttleStatus = recordFailedLoginAttempt(email);

            if (throttleStatus.isLocked) {
                showNotification(throttleStatus.message, 'error');
                startCooldownTimer(throttleStatus.remainingSeconds);
            } else {
                const errorMessage = getErrorMessage(result.error);
                showNotification(errorMessage, 'error');
            }

            passwordInput.classList.add('error');
            passwordInput.value = '';
            passwordInput.focus();
        }
    });

    // ===== OTHER EVENT HANDLERS =====
    if (forgotLink) {
        forgotLink.addEventListener('click', function(event) {
            event.preventDefault();
            window.location.href = 'forgot-password.html';
        });
    }

    // Social login buttons
    if (socialBtns.length > 0) {
        socialBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const provider = this.classList.contains('google') ? 'Google' : 'GitHub';
                showNotification(`${provider} login is not enabled for this project.`, 'info');
            });
        });
    }

    // Check for saved email
    const savedEmail = localStorage.getItem('rememberEmail');
    if (savedEmail) {
        emailInput.value = savedEmail;
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }

    // Add floating label effect
    const inputs = document.querySelectorAll('.input-field input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentNode.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentNode.classList.remove('focused');
            }
        });
    });

    // Add animation keyframes if they don't exist
    if (!document.querySelector('#animation-styles')) {
        const style = document.createElement('style');
        style.id = 'animation-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .pulse { animation: pulse 0.3s ease; }
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
});
