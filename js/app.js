// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    
    // Get DOM elements
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

    // Toggle password visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle icon
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
            
            // Add animation class
            this.classList.add('pulse');
            setTimeout(() => {
                this.classList.remove('pulse');
            }, 300);
        });
    }

    // Real-time validation with animations
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function validatePassword(password) {
        return password.length >= 6;
    }

    // Add input event listeners with visual feedback
    emailInput.addEventListener('input', function() {
        const inputGroup = this.closest('.input-group');
        const icon = inputGroup.querySelector('.input-icon i');
        
        if (this.value && !validateEmail(this.value)) {
            this.style.borderColor = '#ef4444';
            icon.style.color = '#ef4444';
            
            // Add shake animation for invalid input
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
            
            // Show password strength indicator
            showPasswordStrength(this.value);
        } else if (this.value && validatePassword(this.value)) {
            this.style.borderColor = '#22c55e';
            icon.style.color = '#22c55e';
        } else {
            this.style.borderColor = '';
            icon.style.color = '';
        }
    });

    // Password strength indicator
    function showPasswordStrength(password) {
        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.match(/[a-z]+/)) strength++;
        if (password.match(/[A-Z]+/)) strength++;
        if (password.match(/[0-9]+/)) strength++;
        if (password.match(/[$@#&!]+/)) strength++;

        const strengthColors = ['#ef4444', '#f59e0b', '#f59e0b', '#22c55e', '#22c55e'];
        const strengthTexts = ['Very Weak', 'Weak', 'Medium', 'Strong', 'Very Strong'];

        // Create or update strength indicator
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

    // Form submission with loading animation
    loginForm.addEventListener('submit', function(event) {
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

        // Simulate API call (will be replaced with actual backend)
        setTimeout(() => {
            // Hide loading state
            loginBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            loginBtn.style.opacity = '1';

            // Success notification
            showNotification('Login successful! Redirecting...', 'success');

            // Store remember me preference
            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('rememberEmail', email);
            }

            // Clear form
            loginForm.reset();

            // Remove password strength indicator
            const indicator = document.querySelector('.password-strength');
            if (indicator) indicator.remove();

            // Redirect to dashboard (will be implemented later)
            setTimeout(() => {
                alert('Dashboard page will be implemented next!');
            }, 1500);
        }, 2000);
    });

    // Custom notification system
    function showNotification(message, type) {
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

        // Add animation keyframes
        const style = document.createElement('style');
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

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Sign up link click handler
    // signupLink.addEventListener('click', function(event) {
    //     event.preventDefault();
    //     showNotification('Sign up page coming soon!', 'info');
        
    //     // Add bounce animation to link
    //     this.classList.add('pulse');
    //     setTimeout(() => {
    //         this.classList.remove('pulse');
    //     }, 300);
    // });

    // Forgot password link click handler
    forgotLink.addEventListener('click', function(event) {
        event.preventDefault();
        showNotification('Password reset feature coming soon!', 'info');
    });

    // Social login buttons
    socialBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const provider = this.classList.contains('google') ? 'Google' : 'GitHub';
            showNotification(`${provider} login will be implemented later!`, 'info');
        });
    });

    // Check for saved email
    const savedEmail = localStorage.getItem('rememberEmail');
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberCheckbox.checked = true;
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
});