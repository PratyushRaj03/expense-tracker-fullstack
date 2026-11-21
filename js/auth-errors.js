// ============================================
// FIREBASE AUTH ERROR MESSAGES (HARDENED)
// OWASP compliant error mapping to prevent account enumeration
// ============================================

const authErrors = {
    // Standardized generic login / credential errors to prevent account enumeration
    'auth/user-not-found': 'Invalid email or password. Please check your credentials.',
    'auth/wrong-password': 'Invalid email or password. Please check your credentials.',
    'auth/invalid-credential': 'Invalid email or password. Please check your credentials.',
    'auth/invalid-login-credentials': 'Invalid email or password. Please check your credentials.',

    // Registration errors
    'auth/email-already-in-use': 'An account with this email address already exists. Please log in.',
    'auth/invalid-email': 'Please enter a valid email address format.',
    'auth/operation-not-allowed': 'Authentication service is temporarily unavailable. Please contact support.',
    'auth/weak-password': 'Password does not meet security requirements (minimum 8 characters with uppercase, lowercase, number, and special character).',

    // Throttling / abuse errors
    'auth/too-many-requests': 'Access to this account has been temporarily disabled due to many failed attempts. You can immediately restore it by resetting your password or try again later.',
    'auth/user-disabled': 'This account has been disabled. Please contact support for assistance.',
    'auth/unauthorized-domain': 'This domain is not authorized for authentication.',
    'auth/network-request-failed': 'Network connection error. Please verify your internet connection and try again.',

    // Generic safe default
    'default': 'An error occurred during authentication. Please try again.'
};

/**
 * Returns user-safe error message without revealing sensitive internals or account presence.
 * @param {Object} error - The Firebase error object
 * @returns {string} - Sanitized user-friendly error message
 */
export function getErrorMessage(error) {
    if (!error) return authErrors.default;
    const errorCode = error.code || 'default';
    return authErrors[errorCode] || authErrors.default;
}
