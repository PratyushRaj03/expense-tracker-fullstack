import { 
    auth, 
    signInWithEmailAndPassword 
} from './firebase-config.js';

import { getErrorMessage } from './auth-errors.js';

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
        return password.length >= 6;
    }

    // ===== UI FEEDBACK FUNCTIONS =====
    function showNotification(message, type = 'error') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        // Style notification
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '16px 24px';
        notification.style.borderRadius = '8px';
        notification.style.background = type === 'success' ? '#22c55e' : '#ef4444';
        notification.style.color = 'white';
        notification.style.fontWeight = '500';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        notification.style.zIndex = '9999';
        notification.style.display = 'flex';
        notification.style.alignItems = 'center';
        notification.style.gap = '12px';
        notification.style.animation = 'slideIn 0.3s ease';

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // ===== REAL-TIME VALIDATION =====
    emailInput.addEventListener('input', function() {
        const inputGroup = this.closest('.input-group');
        const icon = inputGroup.querySelector('.input-icon i');
        
        if (this.value && !validateEmail(this.value)) {
            this.style.borderColor = '#ef4444';
            icon.style.color = '#ef4444';
            
            this.classList.add('shake');
            setTimeout(() => {
                this.classList.remove('shake');
            }, 500);
        } else if (this.value && validateEmail(this.value)) {
            this.style.borderColor = '#22c55e';
            icon.style.color = '#22c55e';
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
            
            showPasswordStrength(this.value);
        } else if (this.value && validatePassword(this.value)) {
            this.style.borderColor = '#22c55e';
            icon.style.color = '#22c55e';
        } else {
            this.style.borderColor = '';
            icon.style.color = '';
        }
    });

    // ===== PASSWORD STRENGTH INDICATOR =====
    function showPasswordStrength(password) {
        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.match(/[a-z]+/)) strength++;
        if (password.match(/[A-Z]+/)) strength++;
        if (password.match(/[0-9]+/)) strength++;
        if (password.match(/[$@#&!]+/)) strength++;

        const strengthColors = ['#ef4444', '#f59e0b', '#f59e0b', '#22c55e', '#22c55e'];
        const strengthTexts = ['Very Weak', 'Weak', 'Medium', 'Strong', 'Very Strong'];

        let indicator = document.querySelector('.password-strength');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'password-strength';
            passwordInput.parentNode.appendChild(indicator);
        }

        indicator.style.marginTop = '8px';
        indicator.style.fontSize = '12px';
        indicator.style.color = strengthColors[strength];
        indicator.textContent = `Password strength: ${strengthTexts[strength]}`;
    }

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

    // ===== FORM SUBMISSION WITH FIREBASE =====
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        // Get values
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

        if (!validatePassword(password)) {
            showNotification('Password must be at least 6 characters long', 'error');
            passwordInput.focus();
            return;
        }

        // Show loading state
        loginBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
        loginBtn.style.opacity = '0.8';

        // Remove any existing error classes
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
            // Login successful!
            console.log('User logged in:', result.user.uid);
            
            // Save email if "Remember me" is checked
            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('rememberEmail', email);
            } else {
                localStorage.removeItem('rememberEmail');
            }
            
            // Show success message
            showNotification('Login successful! Redirecting to dashboard...', 'success');
            
            // Clear password field for security
            passwordInput.value = '';
            
            // Remove password strength indicator
            const indicator = document.querySelector('.password-strength');
            if (indicator) indicator.remove();
            
            // Redirect to dashboard after 1.5 seconds
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } else {
            // Login failed - show user-friendly error message
            const errorMessage = getErrorMessage(result.error);
            showNotification(errorMessage, 'error');
            
            // Log error for debugging
            console.error('Login error details:', result.error);
            
            // Field-specific error handling
            switch (result.error.code) {
                case 'auth/invalid-email':
                case 'auth/user-not-found':
                case 'auth/user-disabled':
                    emailInput.classList.add('error');
                    emailInput.focus();
                    break;
                    
                case 'auth/wrong-password':
                case 'auth/too-many-requests':
                    passwordInput.classList.add('error');
                    passwordInput.value = '';  // Clear password
                    passwordInput.focus();
                    break;
                    
                default:
                    // For network errors etc., don't highlight specific field
                    break;
            }
        }
    });

    // ===== OTHER EVENT HANDLERS =====
    // Forgot password link
    if (forgotLink) {
        forgotLink.addEventListener('click', function(event) {
            event.preventDefault();
            showNotification('Password reset feature coming soon!', 'info');
        });
    }

    // Social login buttons
    if (socialBtns.length > 0) {
        socialBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const provider = this.classList.contains('google') ? 'Google' : 'GitHub';
                showNotification(`${provider} login will be implemented later!`, 'info');
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

    // Smooth scroll to top when page loads
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

    // Add intersection observer for fade-in effects
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements
    document.querySelectorAll('.input-group, .login-btn, .social-btn').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });

    // Add animation keyframes if they don't exist
    if (!document.querySelector('#animation-styles')) {
        const style = document.createElement('style');
        style.id = 'animation-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            .shake {
                animation: shake 0.5s ease-in-out;
            }
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            .pulse {
                animation: pulse 0.3s ease;
            }
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
});
