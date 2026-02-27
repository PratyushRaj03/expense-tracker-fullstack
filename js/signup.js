import { 
    auth, 
    createUserWithEmailAndPassword,
    db,
    doc,
    setDoc
} from './firebase-config.js';

import { getErrorMessage } from './auth-errors.js';

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
    
    // ===== KEEP ALL YOUR VALIDATION FUNCTIONS EXACTLY AS THEY ARE =====
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
            showError(nameInput, nameError, 'Name is required');
            return false;
        }
        if (name.length < 2) {
            showError(nameInput, nameError, 'Name must be at least 2 characters');
            return false;
        }
        
        showSuccess(nameInput, nameError);
        return true;
    }
    
    function validateEmail() {
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            showError(emailInput, emailError, 'Email is required');
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
        
        if (!password) {
            showError(passwordInput, passwordError, 'Password is required');
            return false;
        }
        if (password.length < 6) {
            showError(passwordInput, passwordError, 'Password must be at least 6 characters');
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
    
    // ===== NEW: CREATE USER PROFILE IN FIRESTORE =====
    async function createUserProfile(user, name) {
        try {
            // Create user document with UID as document ID
            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: user.email,
                createdAt: new Date().toISOString(),
                totalExpenses: 0,
                monthlyBudget: 0,
                preferredCurrency: "USD",
                updatedAt: new Date().toISOString()
            });
            console.log("✅ User profile created in Firestore:", user.uid);
            return { success: true };
        } catch (error) {
            console.error("❌ Error creating user profile:", error);
            return { 
                success: false, 
                error: error 
            };
        }
    }
    
    // ===== FORM SUBMISSION HANDLER =====
    signupForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        // Validate all fields
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
            // Signup successful!
            console.log('✅ User created in Auth:', result.user.uid);
            
            // ===== NEW: Create user profile in Firestore =====
            const profileResult = await createUserProfile(result.user, name);
            
            if (profileResult.success) {
                showNotification('Account created successfully! Redirecting to login...', 'success');
            } else {
                // Profile creation failed but auth succeeded
                console.error("Profile creation failed:", profileResult.error);
                showNotification('Account created but profile setup incomplete. Please contact support.', 'warning');
            }
            
            // Clear form
            signupForm.reset();
            
            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            await setDoc(doc(db, "users", result.user.uid), {
                name: name,
                email: result.user.email,
                createdAt: new Date().toISOString(),
                totalExpenses: 0,
                monthlyBudget: 0,
                preferredCurrency: "USD"
            });
                    
        } else {
            // Signup failed
            const errorMessage = getErrorMessage(result.error);
            showNotification(errorMessage, 'error');
            
            console.error('Signup error details:', result.error);
            
            // Reset button state
            signupBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            
            // Highlight appropriate field
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
    
    // ===== KEEP ALL YOUR EXISTING EVENT LISTENERS =====
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
