import { 
    escapeHtml, 
    sanitizeString, 
    sanitizeForCSV, 
    validatePasswordSecurity,
    checkLoginRateLimit,
    recordFailedLoginAttempt,
    clearLoginRateLimit,
    checkPasswordResetLimit,
    recordPasswordResetAttempt
} from '../js/security-utils.js';

// Mock localStorage for Node.js test environment
const mockStorage = {};
global.localStorage = {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, val) => { mockStorage[key] = String(val); },
    removeItem: (key) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

let passed = 0;
let failed = 0;

function assert(condition, testName) {
    if (condition) {
        console.log(`  [PASS] ${testName}`);
        passed++;
    } else {
        console.error(`  [FAIL] ${testName}`);
        failed++;
    }
}

console.log('--- RUNNING SECURITY UTILITIES TESTS ---');

// 1. XSS Escaping Tests
console.log('\n1. XSS Escaping Tests:');
assert(escapeHtml("<script>alert('xss')</script>") === "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;", "Escapes script tags");
assert(escapeHtml('<img src="x" onerror="evil()">') === '&lt;img src=&quot;x&quot; onerror=&quot;evil()&quot;&gt;', "Escapes img tag and onerror attribute");
assert(escapeHtml(null) === '', "Handles null safely");
assert(escapeHtml(undefined) === '', "Handles undefined safely");
assert(escapeHtml('Hello & "World"') === 'Hello &amp; &quot;World&quot;', "Escapes ampersand and quotes");

// 2. CSV Formula Injection Tests
console.log('\n2. CSV Formula Injection Tests:');
assert(sanitizeForCSV('=1+1') === "'=1+1", "Prefixes = formula with apostrophe");
assert(sanitizeForCSV('@SUM(A1:A10)') === "'@SUM(A1:A10)", "Prefixes @ formula with apostrophe");
assert(sanitizeForCSV('+cmd|calc') === "'+cmd|calc", "Prefixes + formula with apostrophe");
assert(sanitizeForCSV('-100') === "'-100", "Prefixes - formula with apostrophe");
assert(sanitizeForCSV('\tDDE') === "'\tDDE", "Prefixes tab formula with apostrophe");
assert(sanitizeForCSV('Normal Grocery') === 'Normal Grocery', "Leaves normal text unchanged");
assert(sanitizeForCSV('He said "hello"') === 'He said ""hello""', "Escapes internal quotes for CSV");

// 3. Password Strength Validation Tests
console.log('\n3. Password Strength Validation Tests:');
assert(!validatePasswordSecurity('short').isValid, "Rejects short password (<8 chars)");
assert(!validatePasswordSecurity('alllowercase1!').isValid, "Rejects password without uppercase");
assert(!validatePasswordSecurity('ALLUPPERCASE1!').isValid, "Rejects password without lowercase");
assert(!validatePasswordSecurity('NoDigitsHere!').isValid, "Rejects password without numbers");
assert(!validatePasswordSecurity('NoSpecialChars123').isValid, "Rejects password without special characters");
const strongResult = validatePasswordSecurity('Secure#Pass2026!');
assert(strongResult.isValid === true && strongResult.score === 5, "Accepts strong password meeting all criteria");

// 4. Brute-Force Rate Limiting Tests
console.log('\n4. Brute-Force Rate Limiting Tests:');
const testEmail = 'victim_test@example.com';
clearLoginRateLimit(testEmail);

// First 4 attempts should not trigger cooldown
for (let i = 1; i <= 4; i++) {
    const status = recordFailedLoginAttempt(testEmail);
    assert(status.isLocked === false, `Attempt ${i} does not trigger cooldown`);
}

// 5th attempt should trigger 60s cooldown
const fifthStatus = recordFailedLoginAttempt(testEmail);
assert(fifthStatus.isLocked === true && fifthStatus.remainingSeconds === 60, "5th failed attempt triggers 60s cooldown");

// Check rate limit check immediately reflects locked state
const checkStatus = checkLoginRateLimit(testEmail);
assert(checkStatus.isLocked === true && checkStatus.remainingSeconds > 0, "checkLoginRateLimit correctly reports locked state");

// Clear rate limit simulates successful login
clearLoginRateLimit(testEmail);
const afterClear = checkLoginRateLimit(testEmail);
assert(afterClear.isLocked === false, "Clearing rate limit resets locked state");

// 5. Password Reset Request Rate Limiting Tests
console.log('\n5. Password Reset Rate Limiting Tests:');
const resetEmail = 'reset_user@example.com';
mockStorage[`sec_reset_limiter_${resetEmail}`] = null;

// First request is allowed
const firstReset = checkPasswordResetLimit(resetEmail);
assert(firstReset.allowed === true, "Initial reset request is allowed");

// Record first attempt
recordPasswordResetAttempt(resetEmail);

// Immediate second request is blocked by minimum 60s interval
const secondReset = checkPasswordResetLimit(resetEmail);
assert(secondReset.allowed === false && secondReset.remainingSeconds <= 60, "Immediate second reset request is blocked by cooldown");

console.log(`\n========================================`);
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log(`========================================`);

if (failed > 0) {
    process.exit(1);
}
