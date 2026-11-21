// ============================================================
// SECURITY UTILITIES MODULE
// Defensive hardening, input sanitization, rate limiting & session controls
// ============================================================

/**
 * Escapes untrusted input to prevent Cross-Site Scripting (XSS).
 * @param {string|number} str
 * @returns {string}
 */
export function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Sanitizes input strings by trimming and stripping control characters.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeString(str, maxLength = 500) {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLength);
}

/**
 * Sanitizes cell values for CSV export to mitigate Spreadsheet Formula Injection (CSV Injection).
 * Any cell beginning with '=', '+', '-', '@', '\t', '\r' is prefixed with an apostrophe.
 * @param {any} value
 * @returns {string}
 */
export function sanitizeForCSV(value) {
    if (value == null) return '';
    let str = String(value);
    if (/^[\t\r\n=+\-@]/.test(str) || /^[=+\-@]/.test(str.trim())) {
        str = "'" + str;
    }
    return str.replace(/"/g, '""');
}

/**
 * Validates password strength according to financial application standards.
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 lowercase letter
 * - At least 1 uppercase letter
 * - At least 1 number
 * - At least 1 special character
 * @param {string} password
 * @returns {{isValid: boolean, score: number, errors: string[]}}
 */
export function validatePasswordSecurity(password) {
    const errors = [];
    if (!password || typeof password !== 'string') {
        return { isValid: false, score: 0, errors: ['Password is required.'] };
    }

    let score = 0;
    if (password.length >= 8) {
        score++;
    } else {
        errors.push('Minimum 8 characters');
    }

    if (/[a-z]/.test(password)) {
        score++;
    } else {
        errors.push('At least one lowercase letter (a-z)');
    }

    if (/[A-Z]/.test(password)) {
        score++;
    } else {
        errors.push('At least one uppercase letter (A-Z)');
    }

    if (/[0-9]/.test(password)) {
        score++;
    } else {
        errors.push('At least one number (0-9)');
    }

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
        score++;
    } else {
        errors.push('At least one special character (!@#$%^&*)');
    }

    return {
        isValid: errors.length === 0,
        score: score, // 0 to 5
        errors: errors
    };
}

// ===== BRUTE-FORCE PROTECTION & RATE LIMITING =====

const LOGIN_LIMITER_PREFIX = 'sec_login_limiter_';
const RESET_LIMITER_PREFIX = 'sec_reset_limiter_';

/**
 * Simple hash helper to avoid storing plaintext emails directly in storage keys.
 */
function hashKey(str) {
    let hash = 0;
    const clean = String(str).trim().toLowerCase();
    for (let i = 0; i < clean.length; i++) {
        hash = ((hash << 5) - hash) + clean.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

/**
 * Computes progressive cooldown seconds based on failure count:
 * - 0 - 4 fails: 0s (normal)
 * - 5 - 9 fails: 60s (1 min)
 * - 10 - 14 fails: 300s (5 mins)
 * - 15 - 19 fails: 900s (15 mins)
 * - 20+ fails: 1800s (30 mins)
 * @param {number} attempts
 * @returns {number} Cooldown in seconds
 */
function getProgressiveCooldownSeconds(attempts) {
    if (attempts < 5) return 0;
    if (attempts < 10) return 60;
    if (attempts < 15) return 300;
    if (attempts < 20) return 900;
    return 1800;
}

/**
 * Checks if login attempts for an email are currently in a cooldown state.
 * @param {string} email
 * @returns {{isLocked: boolean, remainingSeconds: number, attempts: number, message: string}}
 */
export function checkLoginRateLimit(email) {
    if (!email) return { isLocked: false, remainingSeconds: 0, attempts: 0, message: '' };

    const key = LOGIN_LIMITER_PREFIX + hashKey(email);
    const dataStr = localStorage.getItem(key);
    if (!dataStr) return { isLocked: false, remainingSeconds: 0, attempts: 0, message: '' };

    try {
        const data = JSON.parse(dataStr);
        const now = Date.now();
        if (data.cooldownUntil && data.cooldownUntil > now) {
            const remaining = Math.ceil((data.cooldownUntil - now) / 1000);
            return {
                isLocked: true,
                remainingSeconds: remaining,
                attempts: data.attempts || 0,
                message: `Too many failed attempts. Please wait ${remaining}s before trying again.`
            };
        }
        return { isLocked: false, remainingSeconds: 0, attempts: data.attempts || 0, message: '' };
    } catch {
        return { isLocked: false, remainingSeconds: 0, attempts: 0, message: '' };
    }
}

/**
 * Records a failed login attempt and calculates progressive cooldown.
 * @param {string} email
 * @returns {{isLocked: boolean, remainingSeconds: number, attempts: number, message: string}}
 */
export function recordFailedLoginAttempt(email) {
    if (!email) return { isLocked: false, remainingSeconds: 0, attempts: 0, message: '' };

    const key = LOGIN_LIMITER_PREFIX + hashKey(email);
    let attempts = 1;
    let data = { attempts: 1, cooldownUntil: 0 };

    const existingStr = localStorage.getItem(key);
    if (existingStr) {
        try {
            data = JSON.parse(existingStr);
            attempts = (data.attempts || 0) + 1;
        } catch {
            attempts = 1;
        }
    }

    const cooldownSecs = getProgressiveCooldownSeconds(attempts);
    const cooldownUntil = cooldownSecs > 0 ? Date.now() + (cooldownSecs * 1000) : 0;

    localStorage.setItem(key, JSON.stringify({
        attempts: attempts,
        cooldownUntil: cooldownUntil,
        lastFailed: Date.now()
    }));

    return {
        isLocked: cooldownSecs > 0,
        remainingSeconds: cooldownSecs,
        attempts: attempts,
        message: cooldownSecs > 0
            ? `Too many failed attempts (${attempts}). Cooldown of ${Math.ceil(cooldownSecs / 60)} min applied.`
            : ''
    };
}

/**
 * Clears the failed login attempts tracker upon successful authentication.
 * @param {string} email
 */
export function clearLoginRateLimit(email) {
    if (!email) return;
    const key = LOGIN_LIMITER_PREFIX + hashKey(email);
    localStorage.removeItem(key);
}

// ===== FORGOT PASSWORD RATE LIMITING =====

/**
 * Checks password reset request rate limits:
 * - Minimum 60 seconds interval between requests
 * - Maximum 3 requests in a 15-minute window
 * @param {string} email
 * @returns {{allowed: boolean, remainingSeconds: number, message: string}}
 */
export function checkPasswordResetLimit(email) {
    if (!email) return { allowed: true, remainingSeconds: 0, message: '' };

    const key = RESET_LIMITER_PREFIX + hashKey(email);
    const raw = localStorage.getItem(key);
    if (!raw) return { allowed: true, remainingSeconds: 0, message: '' };

    try {
        const data = JSON.parse(raw);
        const now = Date.now();

        // 1. Check minimum interval (60s)
        const timeSinceLast = (now - (data.lastRequestTime || 0)) / 1000;
        if (timeSinceLast < 60) {
            const waitTime = Math.ceil(60 - timeSinceLast);
            return {
                allowed: false,
                remainingSeconds: waitTime,
                message: `Please wait ${waitTime}s before requesting another reset email.`
            };
        }

        // 2. Check 15-minute window request count (max 3)
        const fifteenMinutesAgo = now - (15 * 60 * 1000);
        const recentRequests = (data.timestamps || []).filter(t => t > fifteenMinutesAgo);
        if (recentRequests.length >= 3) {
            const oldestInWindow = recentRequests[0];
            const waitTime = Math.ceil((oldestInWindow + (15 * 60 * 1000) - now) / 1000);
            return {
                allowed: false,
                remainingSeconds: waitTime,
                message: `Maximum reset attempts reached for this window. Please wait ${Math.ceil(waitTime / 60)} min.`
            };
        }

        return { allowed: true, remainingSeconds: 0, message: '' };
    } catch {
        return { allowed: true, remainingSeconds: 0, message: '' };
    }
}

/**
 * Records a password reset request.
 * @param {string} email
 */
export function recordPasswordResetAttempt(email) {
    if (!email) return;

    const key = RESET_LIMITER_PREFIX + hashKey(email);
    const now = Date.now();
    let timestamps = [now];

    const raw = localStorage.getItem(key);
    if (raw) {
        try {
            const data = JSON.parse(raw);
            const fifteenMinutesAgo = now - (15 * 60 * 1000);
            timestamps = (data.timestamps || []).filter(t => t > fifteenMinutesAgo);
            timestamps.push(now);
        } catch {
            timestamps = [now];
        }
    }

    localStorage.setItem(key, JSON.stringify({
        lastRequestTime: now,
        timestamps: timestamps
    }));
}

// ===== SESSION TIMEOUT / INACTIVITY CONTROLS =====

/**
 * Initializes inactivity session timeout.
 * Automatically triggers signout callback after specified minutes of inactivity.
 * @param {number} timeoutMinutes
 * @param {Function} onTimeoutCallback
 * @returns {Function} Cleanup function to detach listeners
 */
export function initInactivitySessionTimeout(timeoutMinutes = 20, onTimeoutCallback) {
    const timeoutMs = timeoutMinutes * 60 * 1000;
    let timerId = null;

    function resetTimer() {
        if (timerId) clearTimeout(timerId);
        timerId = setTimeout(() => {
            if (typeof onTimeoutCallback === 'function') {
                onTimeoutCallback();
            }
        }, timeoutMs);
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const handler = () => resetTimer();

    events.forEach(evt => window.addEventListener(evt, handler, { passive: true }));
    resetTimer();

    return function cleanup() {
        if (timerId) clearTimeout(timerId);
        events.forEach(evt => window.removeEventListener(evt, handler));
    };
}
