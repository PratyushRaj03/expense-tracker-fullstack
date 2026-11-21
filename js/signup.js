import { 
    auth, 
    createUserWithEmailAndPassword,
    db,
    doc,
    setDoc
} from './firebase-config.js';

import { getErrorMessage } from './auth-errors.js';
import { 
    validatePasswordSecurity, 
    sanitizeString, 
    escapeHtml 
} from './security-utils.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    
    // Get DOM elements
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
    
    function showError(inputElement, errorElement, message) {
        inputElement.classList.add('error');
        inputElement.classList.remove('success');
        errorElement.textContent = message;
        errorElement.style.color = '#ef4444';
    }
    
    function showSuccess(inputElement, errorElement) {
        inputElement.classList.remove('error');
        inputElement.classList.add('success');
        errorElement.textContent = '';
    }
    
    function validateName() {
        const name = nameInput.value.trim();
        
        if (!name) {
            showError(nameInput, nameError, 'Full name is required');
            return false;
        }
        if (name.length < 2) {
            showError(nameInput, nameError, 'Name must be at least 2 characters');
            return false;
        }
        if (name.length > 100) {
            showError(nameInput, nameError, 'Name must be under 100 characters');
            return false;
        }
        
        showSuccess(nameInput, nameError);
        return true;
    }
    
    function validateEmail() {
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            showError(emailInput, emailError, 'Email address is required');
            return false;
        }
        if (!emailRegex.test(email)) {
            showError(emailInput, emailError, 'Please enter a valid email address');
            return false;
        }
        
        showSuccess(emailInput, emailError);
        return true;
    }
    
    function validatePassword() {
        const password = passwordInput.value;
        const result = validatePasswordSecurity(password);
        
        if (!password) {
            showError(passwordInput, passwordError, 'Password is required');
            return false;
        }
        if (!result.isValid) {
            showError(passwordInput, passwordError, result.errors[0]);
            return false;
        }
        
        showSuccess(passwordInput, passwordError);
        return true;
    }
    
    function validateConfirmPassword() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (!confirmPassword) {
            showError(confirmPasswordInput, confirmPasswordError, 'Please confirm your password');
            return false;
        }
        if (password !== confirmPassword) {
            showError(confirmPasswordInput, confirmPasswordError, 'Passwords do not match');
            return false;
        }
        
        showSuccess(confirmPasswordInput, confirmPasswordError);
        return true;
    }
    
    function validateTerms() {
        if (!termsCheckbox.checked) {
            showNotification('Please agree to the Terms and Privacy Policy to continue', 'error');
            return false;
        }
        return true;
    }
    
    // ===== NOTIFICATION FUNCTION =====
    function showNotification(message, type = 'error') {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        const iconClass = type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle';
        
        const safeMessage = escapeHtml(message);
        notification.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <span>${safeMessage}</span>
        `;
        
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '16px 24px';
        notification.style.borderRadius = '8px';
        notification.style.background = type === 'success' ? '#22c55e' : type === 'warning' ? '#f59e0b' : '#ef4444';
        notification.style.color = 'white';
        notification.style.fontWeight = '500';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
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
        }, 5000);
    }
    
    // ===== FIREBASE SIGNUP FUNCTION =====
    async function signupUser(email, password) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
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
    
    // ===== CREATE USER PROFILE IN FIRESTORE =====
    async function createUserProfile(user, rawName) {
        try {
            const cleanName = sanitizeString(rawName, 100);
            const now = new Date().toISOString();

            // Set profile strictly following schema allowed by firestore.rules
            await setDoc(doc(db, "users", user.uid), {
                name: cleanName,
                email: user.email,
                createdAt: now,
                totalExpenses: 0,
                monthlyBudget: 0,
                preferredCurrency: "USD",
                updatedAt: now
            });
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error 
            };
        }
    }
    
    // ===== FORM SUBMISSION HANDLER =====
    signupForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const isNameValid = validateName();
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();
        const isConfirmValid = validateConfirmPassword();
        const isTermsValid = validateTerms();
        
        if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmValid || !isTermsValid) {
            const firstError = document.querySelector('.input-field input.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.focus();
            }
            return;
        }
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const name = nameInput.value.trim();
        
        // Show loading state
        signupBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
        
        // Attempt Firebase signup
        const result = await signupUser(email, password);
        
        if (result.success) {
            // Create user profile in Firestore
            const profileResult = await createUserProfile(result.user, name);
            
            if (profileResult.success) {
                showNotification('Account created successfully! Redirecting to login...', 'success');
            } else {
                showNotification('Account created. Setting up dashboard...', 'warning');
            }
            
            signupForm.reset();
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
                    
        } else {
            // Signup failed
            const errorMessage = getErrorMessage(result.error);
            showNotification(errorMessage, 'error');
            
            signupBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            
            if (result.error.code === 'auth/email-already-in-use' || 
                result.error.code === 'auth/invalid-email') {
                emailInput.classList.add('error');
                emailInput.focus();
            }
            
            if (result.error.code === 'auth/weak-password') {
                passwordInput.classList.add('error');
                passwordInput.focus();
            }
        }
    });
    
    // Event listeners for real-time validation
    nameInput.addEventListener('input', validateName);
    emailInput.addEventListener('input', validateEmail);
    passwordInput.addEventListener('input', function() {
        validatePassword();
        if (confirmPasswordInput.value) {
            validateConfirmPassword();
        }
    });
    confirmPasswordInput.addEventListener('input', validateConfirmPassword);
    
    nameInput.addEventListener('blur', validateName);
    emailInput.addEventListener('blur', validateEmail);
    passwordInput.addEventListener('blur', validatePassword);
    confirmPasswordInput.addEventListener('blur', validateConfirmPassword);
    
    // Password toggle
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    
    function setupPasswordToggle(toggleButton, passwordField) {
        if (toggleButton) {
            toggleButton.addEventListener('click', function() {
                const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordField.setAttribute('type', type);
                
                const icon = this.querySelector('i');
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            });
        }
    }
    
    setupPasswordToggle(togglePassword, passwordInput);
    setupPasswordToggle(toggleConfirmPassword, confirmPasswordInput);
});
