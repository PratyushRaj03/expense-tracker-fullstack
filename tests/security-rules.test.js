import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import fs from 'fs';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs } from 'firebase/firestore';

const rules = fs.readFileSync('firestore.rules', 'utf8');

let testEnv;

async function runRulesTests() {
    console.log('--- STARTING FIRESTORE SECURITY RULES TESTING ---');

    testEnv = await initializeTestEnvironment({
        projectId: 'demo-expense-tracker-security',
        firestore: {
            rules: rules,
            host: '127.0.0.1',
            port: 8080
        }
    });

    let passed = 0;
    let failed = 0;

    async function check(promise, shouldSucceed, testName) {
        try {
            if (shouldSucceed) {
                await assertSucceeds(promise);
                console.log(`  [PASS] ${testName}`);
                passed++;
            } else {
                await assertFails(promise);
                console.log(`  [PASS] ${testName}`);
                passed++;
            }
        } catch (error) {
            console.error(`  [FAIL] ${testName}: ${error.message}`);
            failed++;
        }
    }

    try {
        // Clear data before testing
        await testEnv.clearFirestore();

        const unauthenticatedContext = testEnv.unauthenticatedContext();
        const aliceContext = testEnv.authenticatedContext('user_alice', { email: 'alice@example.com' });
        const bobContext = testEnv.authenticatedContext('user_bob', { email: 'bob@example.com' });

        const unauthDb = unauthenticatedContext.firestore();
        const aliceDb = aliceContext.firestore();
        const bobDb = bobContext.firestore();

        console.log('\n--- 1. UNAUTHENTICATED ACCESS TESTS ---');
        await check(getDoc(doc(unauthDb, 'users', 'user_alice')), false, 'Unauthenticated user CANNOT read user profile');
        await check(setDoc(doc(unauthDb, 'users', 'user_alice'), { name: 'Hacker', email: 'h@h.com', createdAt: new Date().toISOString() }), false, 'Unauthenticated user CANNOT create user profile');
        await check(getDocs(collection(unauthDb, 'users', 'user_alice', 'expenses')), false, 'Unauthenticated user CANNOT read expenses');
        await check(addDoc(collection(unauthDb, 'users', 'user_alice', 'expenses'), { amount: 10, category: 'Food', description: 'Lunch', date: '2026-11-21', userId: 'user_alice' }), false, 'Unauthenticated user CANNOT create expense');

        console.log('\n--- 2. USER PROFILE ISOLATION & ENUMERATION TESTS ---');
        // Alice creates her own profile
        const aliceProfileData = {
            name: 'Alice Smith',
            email: 'alice@example.com',
            createdAt: '2026-11-21T00:00:00.000Z',
            totalExpenses: 0,
            monthlyBudget: 1500,
            preferredCurrency: 'USD',
            updatedAt: '2026-11-21T00:00:00.000Z'
        };
        await check(setDoc(doc(aliceDb, 'users', 'user_alice'), aliceProfileData), true, 'Alice CAN create her own profile');

        // Alice reads her own profile
        await check(getDoc(doc(aliceDb, 'users', 'user_alice')), true, 'Alice CAN read her own profile');

        // Bob attempts to read Alice's profile
        await check(getDoc(doc(bobDb, 'users', 'user_alice')), false, 'Bob CANNOT read Alice profile (Cross-user isolation)');

        // Bob attempts to overwrite or edit Alice's profile
        await check(updateDoc(doc(bobDb, 'users', 'user_alice'), { monthlyBudget: 999999 }), false, 'Bob CANNOT edit Alice profile');

        // Alice attempts to list all users in /users collection
        await check(getDocs(collection(aliceDb, 'users')), false, 'Alice CANNOT list all users (Enumeration blocked)');

        console.log('\n--- 3. FINANCIAL TRANSACTIONS (EXPENSES) ISOLATION TESTS ---');
        // Alice creates an expense under her own UID
        const validExpense = {
            amount: 45.50,
            category: 'Food',
            description: 'Lunch with colleagues',
            date: '2026-11-21',
            createdAt: '2026-11-21T00:00:00.000Z',
            userId: 'user_alice'
        };
        await check(setDoc(doc(aliceDb, 'users', 'user_alice', 'expenses', 'exp_001'), validExpense), true, 'Alice CAN create expense under her own UID');

        // Alice reads her own expense
        await check(getDoc(doc(aliceDb, 'users', 'user_alice', 'expenses', 'exp_001')), true, 'Alice CAN read her own expense');

        // Alice reads her expenses collection
        await check(getDocs(collection(aliceDb, 'users', 'user_alice', 'expenses')), true, 'Alice CAN query her own expenses collection');

        // Bob attempts to read Alice's expense
        await check(getDoc(doc(bobDb, 'users', 'user_alice', 'expenses', 'exp_001')), false, 'Bob CANNOT read Alice expense (Financial data isolation)');

        // Bob attempts to query Alice's expenses
        await check(getDocs(collection(bobDb, 'users', 'user_alice', 'expenses')), false, 'Bob CANNOT query Alice expenses collection');

        // Bob attempts to edit Alice's expense
        await check(updateDoc(doc(bobDb, 'users', 'user_alice', 'expenses', 'exp_001'), { amount: 1.00 }), false, 'Bob CANNOT update Alice expense');

        // Bob attempts to delete Alice's expense
        await check(deleteDoc(doc(bobDb, 'users', 'user_alice', 'expenses', 'exp_001')), false, 'Bob CANNOT delete Alice expense');

        // Alice can update her own expense
        await check(updateDoc(doc(aliceDb, 'users', 'user_alice', 'expenses', 'exp_001'), {
            amount: 50.00,
            category: 'Food',
            description: 'Updated lunch',
            date: '2026-11-21',
            userId: 'user_alice'
        }), true, 'Alice CAN update her own expense');

        console.log('\n--- 4. FINANCIAL DATA VALIDATION & INTEGRITY TESTS ---');
        // Negative amount
        await check(setDoc(doc(aliceDb, 'users', 'user_alice', 'expenses', 'exp_neg'), {
            amount: -25.00,
            category: 'Food',
            description: 'Negative test',
            date: '2026-11-21',
            userId: 'user_alice'
        }), false, 'REJECTS negative expense amount');

        // Zero amount
        await check(setDoc(doc(aliceDb, 'users', 'user_alice', 'expenses', 'exp_zero'), {
            amount: 0,
            category: 'Food',
            description: 'Zero test',
            date: '2026-11-21',
            userId: 'user_alice'
        }), false, 'REJECTS zero expense amount');

        // Excessive amount (> 10,000,000)
        await check(setDoc(doc(aliceDb, 'users', 'user_alice', 'expenses', 'exp_excessive'), {
            amount: 999999999,
            category: 'Food',
            description: 'Excessive test',
            date: '2026-11-21',
            userId: 'user_alice'
        }), false, 'REJECTS excessive expense amount (> 10,000,000)');

        // Invalid category
        await check(setDoc(doc(aliceDb, 'users', 'user_alice', 'expenses', 'exp_bad_cat'), {
            amount: 25.00,
            category: 'ExploitCategory',
            description: 'Invalid category test',
            date: '2026-11-21',
            userId: 'user_alice'
        }), false, 'REJECTS invalid expense category not in whitelist');

        // Malformed date
        await check(setDoc(doc(aliceDb, 'users', 'user_alice', 'expenses', 'exp_bad_date'), {
            amount: 25.00,
            category: 'Food',
            description: 'Malformed date',
            date: '21-11-2026',
            userId: 'user_alice'
        }), false, 'REJECTS malformed date format (non-YYYY-MM-DD)');

        // Mismatched userId
        await check(setDoc(doc(aliceDb, 'users', 'user_alice', 'expenses', 'exp_spoof_user'), {
            amount: 25.00,
            category: 'Food',
            description: 'Spoofed user',
            date: '2026-11-21',
            userId: 'user_bob'
        }), false, 'REJECTS expense with mismatched userId in payload');

        // Arbitrary unauthorized fields
        await check(setDoc(doc(aliceDb, 'users', 'user_alice', 'expenses', 'exp_extra_field'), {
            amount: 25.00,
            category: 'Food',
            description: 'Injected extra property',
            date: '2026-11-21',
            userId: 'user_alice',
            isAdmin: true,
            role: 'superuser'
        }), false, 'REJECTS arbitrary unauthorized fields (privilege escalation)');

        // Immutability: changing userId on update
        await check(updateDoc(doc(aliceDb, 'users', 'user_alice', 'expenses', 'exp_001'), {
            userId: 'user_bob'
        }), false, 'REJECTS changing ownership/userId on expense update');

        console.log('\n--- 5. DEFAULT DENY RULES (UNKNOWN COLLECTIONS) ---');
        await check(getDoc(doc(aliceDb, 'admin_settings', 'config')), false, 'REJECTS reading unknown collections');
        await check(setDoc(doc(aliceDb, 'admin_settings', 'config'), { backdoor: true }), false, 'REJECTS writing to unknown collections');
        await check(getDoc(doc(unauthDb, 'random_data', 'item')), false, 'REJECTS unauthenticated access to unknown paths');

        // Alice deletes her own expense
        console.log('\n--- 6. EXPENSE DELETION TESTS ---');
        await check(deleteDoc(doc(aliceDb, 'users', 'user_alice', 'expenses', 'exp_001')), true, 'Alice CAN delete her own expense');

        console.log(`\n========================================`);
        console.log(`SECURITY RULES TEST SUMMARY:`);
        console.log(`  PASSED: ${passed}`);
        console.log(`  FAILED: ${failed}`);
        console.log(`========================================`);

        if (failed > 0) {
            process.exit(1);
        }
    } finally {
        await testEnv.cleanup();
    }
}

runRulesTests().catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
});
