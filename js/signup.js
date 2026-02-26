// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    
    // ==================== GET ALL DOM ELEMENTS ====================
    const signupForm = document.getElementById('signupForm');
    const signupBtn = document.getElementById('signupBtn');
    const btnText = document.querySelector('.btn-text');
    const btnLoader = document.querySelector('.btn-loader');
    
    // Input fields
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsCheckbox = document.getElementById('terms');
    
    // Error message elements
    const nameError = document.getElementById('nameError');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    const passwordStrength = document.getElementById('passwordStrength');
    
    // Toggle password buttons
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

    // ==================== UTILITY FUNCTIONS ====================
    
    /**
     * Shows an error message for a specific field
     * @param {HTMLElement} inputElement - The input field
     * @param {HTMLElement} errorElement - The error message element
     * @param {string} message - Error message to display
     */
    function showError(inputElement, errorElement, message) {
        // Add error class to input
        inputElement.classList.add('error');
        inputElement.classList.remove('success');
        
        // Display error message
        errorElement.textContent = message;
        errorElement.style.color = '#ef4444';
    }
    
    /**
     * Shows success state for a field
     * @param {HTMLElement} inputElement - The input field
     * @param {HTMLElement} errorElement - The error message element
     */
    function showSuccess(inputElement, errorElement) {
        // Add success class to input, remove error
        inputElement.classList.remove('error');
        inputElement.classList.add('success');
        
        // Clear error message
        errorElement.textContent = '';
    }
    
    /**
     * Resets field to normal state
     * @param {HTMLElement} inputElement - The input field
     */
    function resetField(inputElement) {
        inputElement.classList.remove('error', 'success');
    }

    // ==================== VALIDATION FUNCTIONS ====================
    
    /**
     * Validates name field
     * @returns {boolean} - True if valid, false otherwise
     */
    function validateName() {
        const name = nameInput.value.trim();
        
        // Check if empty
        if (!name) {
            showError(nameInput, nameError, 'Name is required');
            return false;
        }
        
        // Check minimum length (at least 2 characters)
        if (name.length < 2) {
            showError(nameInput, nameError, 'Name must be at least 2 characters');
            return false;
        }
        
        // Check if contains only letters and spaces (optional)
        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!nameRegex.test(name)) {
            showError(nameInput, nameError, 'Name can only contain letters and spaces');
            return false;
        }
        
        // All validations passed
        showSuccess(nameInput, nameError);
        return true;
    }
    
    /**
     * Validates email field
     * @returns {boolean} - True if valid, false otherwise
     */
    function validateEmail() {
        const email = emailInput.value.trim();
        
        // Check if empty
        if (!email) {
            showError(emailInput, emailError, 'Email is required');
            return false;
        }
        
        // Email regex pattern
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError(emailInput, emailError, 'Please enter a valid email address');
            return false;
        }
        
        // All validations passed
        showSuccess(emailInput, emailError);
        return true;
    }
    
    /**
     * Calculates password strength
     * @param {string} password - The password to check
     * @returns {object} - Strength level and message
     */
    function checkPasswordStrength(password) {
        let strength = 0;
        let feedback = [];
        
        // Check length
        if (password.length >= 6) strength++;
        else feedback.push('at least 6 characters');
        
        // Check for lowercase
        if (/[a-z]/.test(password)) strength++;
        else feedback.push('lowercase letter');
        
        // Check for uppercase
        if (/[A-Z]/.test(password)) strength++;
        else feedback.push('uppercase letter');
        
        // Check for numbers
        if (/[0-9]/.test(password)) strength++;
        else feedback.push('number');
        
        // Check for special characters
        if (/[!@#$%^&*]/.test(password)) strength++;
        else feedback.push('special character');
        
        return {
            level: strength,
            feedback: feedback,
            // Map strength level to text and color
            getText: function() {
                if (password.length < 6) return 'Password too short';
                switch(this.level) {
                    case 1: return 'Weak';
                    case 2: return 'Fair';
                    case 3: return 'Good';
                    case 4: return 'Strong';
                    case 5: return 'Very Strong';
                    default: return '';
                }
            },
            getClass: function() {
                if (password.length < 6) return 'strength-weak';
                switch(this.level) {
                    case 1: return 'strength-weak';
                    case 2: return 'strength-weak';
                    case 3: return 'strength-medium';
                    case 4: return 'strength-strong';
                    case 5: return 'strength-very-strong';
                    default: return '';
                }
            }
        };
    }
    
    /**
     * Updates password strength indicator
     */
    function updatePasswordStrength() {
        const password = passwordInput.value;
        
        if (!password) {
            passwordStrength.textContent = '';
            passwordStrength.className = 'password-strength';
            return;
        }
        
        const strength = checkPasswordStrength(password);
        
        // Display strength indicator
        passwordStrength.textContent = `Password strength: ${strength.getText()}`;
        passwordStrength.className = `password-strength ${strength.getClass()}`;
        
        // Optional: Show improvement suggestions
        if (strength.feedback.length > 0 && password.length >= 6) {
            passwordStrength.textContent += ` (missing: ${strength.feedback.join(', ')})`;
        }
    }
    
    /**
     * Validates password field
     * @returns {boolean} - True if valid, false otherwise
     */
    function validatePassword() {
        const password = passwordInput.value;
        
        // Check if empty
        if (!password) {
            showError(passwordInput, passwordError, 'Password is required');
            return false;
        }
        
        // Check minimum length
        if (password.length < 6) {
            showError(passwordInput, passwordError, 'Password must be at least 6 characters');
            return false;
        }
        
        // Check password strength (optional - you can make this required)
        const strength = checkPasswordStrength(password);
        if (strength.level < 3) {
            showError(passwordInput, passwordError, 'Password is too weak. Add more character types.');
            return false;
        }
        
        // All validations passed
        showSuccess(passwordInput, passwordError);
        return true;
    }
    
    /**
     * Validates confirm password field
     * @returns {boolean} - True if valid, false otherwise
     */
    function validateConfirmPassword() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // Check if empty
        if (!confirmPassword) {
            showError(confirmPasswordInput, confirmPasswordError, 'Please confirm your password');
            return false;
        }
        
        // Check if passwords match
        if (password !== confirmPassword) {
            showError(confirmPasswordInput, confirmPasswordError, 'Passwords do not match');
            return false;
        }
        
        // All validations passed
        showSuccess(confirmPasswordInput, confirmPasswordError);
        return true;
    }
    
    /**
     * Validates terms checkbox
     * @returns {boolean} - True if checked, false otherwise
     */
    function validateTerms() {
        if (!termsCheckbox.checked) {
            // Show a general error or highlight the checkbox
            alert('Please agree to the Terms and Privacy Policy to continue');
            return false;
        }
        return true;
    }

    // ==================== REAL-TIME VALIDATION ====================
    
    // Real-time name validation
    nameInput.addEventListener('input', function() {
        validateName();
    });
    
    // Real-time email validation
    emailInput.addEventListener('input', function() {
        validateEmail();
    });
    
    // Real-time password validation and strength check
    passwordInput.addEventListener('input', function() {
        validatePassword();
        updatePasswordStrength();
        
        // Also re-validate confirm password if it has value
        if (confirmPasswordInput.value) {
            validateConfirmPassword();
        }
    });
    
    // Real-time confirm password validation
    confirmPasswordInput.addEventListener('input', function() {
        validateConfirmPassword();
    });
    
    // Blur events to validate when user leaves the field
    nameInput.addEventListener('blur', function() {
        validateName();
    });
    
    emailInput.addEventListener('blur', function() {
        validateEmail();
    });
    
    passwordInput.addEventListener('blur', function() {
        validatePassword();
    });
    
    confirmPasswordInput.addEventListener('blur', function() {
        validateConfirmPassword();
    });

    // ==================== PASSWORD VISIBILITY TOGGLE ====================
    
    function setupPasswordToggle(toggleButton, passwordField) {
        toggleButton.addEventListener('click', function() {
            const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordField.setAttribute('type', type);
            
            // Toggle icon
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }
    
    setupPasswordToggle(togglePassword, passwordInput);
    setupPasswordToggle(toggleConfirmPassword, confirmPasswordInput);

    // ==================== FORM SUBMISSION ====================
    
    signupForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        // Run all validations
        const isNameValid = validateName();
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();
        const isConfirmPasswordValid = validateConfirmPassword();
        const isTermsValid = validateTerms();
        
        // Check if all validations passed
        if (isNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid && isTermsValid) {
            
            // Show loading state
            signupBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            
            // Collect form data
            const formData = {
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                password: passwordInput.value,
                // Note: In real app, NEVER log or store passwords in plain text
                timestamp: new Date().toISOString()
            };
            
            console.log('Signup data:', formData); // For debugging only
            
            // Simulate API call (will be replaced with Firebase later)
            setTimeout(() => {
                // Hide loading state
                signupBtn.disabled = false;
                btnText.style.display = 'inline';
                btnLoader.style.display = 'none';
                
                // Show success message
                alert('Account created successfully! Please login.');
                
                // Redirect to login page
                window.location.href = 'index.html';
            }, 2000);
            
        } else {
            // Scroll to first error
            const firstError = document.querySelector('.input-field input.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.focus();
            }
        }
    });

    // ==================== INITIAL SETUP ====================
    
    // Clear any existing validation styles on page load
    resetField(nameInput);
    resetField(emailInput);
    resetField(passwordInput);
    resetField(confirmPasswordInput);
    
    // Pre-fill email if coming from login page (optional)
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    if (email) {
        emailInput.value = email;
        validateEmail();
    }
});