// ============================================
// FIREBASE AUTH ERROR MESSAGES
// Convert Firebase error codes to user-friendly messages
// ============================================

const authErrors = {
    // Signup errors
    'auth/email-already-in-use': 'This email is already registered. Please login or use a different email.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/operation-not-allowed': 'Email/password signup is not enabled. Please contact support.',
    'auth/weak-password': 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers.',
    
    // Common errors for both signup/login
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/unauthorized-domain': 'This domain is not authorized for Firebase authentication.',
    
    // Default message
    'default': 'An error occurred. Please try again.'
};

/**
 * Get user-friendly error message from Firebase error code
 * @param {Object} error - The Firebase error object
 * @returns {string} - User-friendly error message
 */
export function getErrorMessage(error) {
    console.error('Firebase Auth Error:', error); // For debugging
    
    // Get the error code from the error object
    // Firebase errors typically have a 'code' property like 'auth/email-already-in-use'
    const errorCode = error.code || 'default';
    
    // Return the corresponding message, or default if not found
    return authErrors[errorCode] || authErrors.default;
}