// dashboard.js
import { 
    auth, 
    db, 
    signOut,
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy,
    deleteDoc,
    doc,
    onAuthStateChanged
} from './firebase-config.js';

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    
    // Get DOM elements
    const expenseForm = document.getElementById('expenseForm');
    const expensesContainer = document.getElementById('expensesContainer');
    const logoutBtn = document.getElementById('logoutBtn');
    const userNameSpan = document.getElementById('userName');
    const userEmailSpan = document.getElementById('userEmail');
    
    // Check authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("✅ User logged in:", user.uid);
            
            // Display user info
            if (userNameSpan) userNameSpan.textContent = user.displayName || 'User';
            if (userEmailSpan) userEmailSpan.textContent = user.email;
            
            // Load user's expenses
            loadExpenses(user.uid);
        } else {
            console.log("❌ No user logged in");
            window.location.href = 'index.html';
        }
    });
    
    // ===== ADD EXPENSE CODE - PUT THIS HERE =====
    if (expenseForm) {
        expenseForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            // Get current user
            const user = auth.currentUser;
            if (!user) {
                alert('Please log in first');
                window.location.href = 'index.html';
                return;
            }
            
            // Get form values
            const amount = parseFloat(document.getElementById('amount').value);
            const category = document.getElementById('category').value;
            const description = document.getElementById('description').value;
            const date = document.getElementById('date').value;
            
            // Validate
            if (!amount || amount <= 0) {
                showNotification('Please enter a valid amount', 'error');
                return;
            }
            
            if (!category) {
                showNotification('Please select a category', 'error');
                return;
            }
            
            if (!description) {
                showNotification('Please enter a description', 'error');
                return;
            }
            
            if (!date) {
                showNotification('Please select a date', 'error');
                return;
            }
            
            // Show loading state
            const submitBtn = expenseForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
            submitBtn.disabled = true;
            
            try {
                // ===== YOUR CODE GOES HERE =====
                // Create reference to user's expenses collection
                const expensesRef = collection(db, "users", user.uid, "expenses");
                
                // Add the expense document
                const docRef = await addDoc(expensesRef, {
                    amount: amount,
                    category: category,
                    description: description,
                    date: date,
                    createdAt: new Date().toISOString()
                });
                
                console.log("✅ Expense added with ID:", docRef.id);
                
                // Clear form
                expenseForm.reset();
                
                // Show success message
                showNotification('Expense added successfully!', 'success');
                
                // Reload expenses list
                await loadExpenses(user.uid);
                
            } catch (error) {
                console.error("❌ Error adding expense:", error);
                showNotification('Failed to add expense: ' + error.message, 'error');
            } finally {
                // Restore button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // ===== LOAD EXPENSES FUNCTION =====
    async function loadExpenses(userId) {
        if (!expensesContainer) return;
        
        try {
            expensesContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>';
            
            const expensesRef = collection(db, "users", userId, "expenses");
            const q = query(expensesRef, orderBy("date", "desc"));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                expensesContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>No expenses yet. Add your first expense!</p>
                    </div>
                `;
                return;
            }
            
            let html = '<table class="expenses-table">';
            html += '<tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Action</th></tr>';
            
            querySnapshot.forEach((doc) => {
                const expense = doc.data();
                html += `
                    <tr>
                        <td>${formatDate(expense.date)}</td>
                        <td><span class="category-badge category-${expense.category.toLowerCase()}">${expense.category}</span></td>
                        <td>${expense.description}</td>
                        <td>$${expense.amount.toFixed(2)}</td>
                        <td>
                            <button onclick="deleteExpense('${doc.id}')" class="action-btn delete-btn">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</table>';
            expensesContainer.innerHTML = html;
            
        } catch (error) {
            console.error("Error loading expenses:", error);
            expensesContainer.innerHTML = '<p>Error loading expenses</p>';
        }
    }
    
    // ===== DELETE EXPENSE FUNCTION =====
    window.deleteExpense = async function(expenseId) {
        if (!confirm('Are you sure?')) return;
        
        const user = auth.currentUser;
        if (!user) return;
        
        try {
            await deleteDoc(doc(db, "users", user.uid, "expenses", expenseId));
            loadExpenses(user.uid);
            showNotification('Expense deleted', 'success');
        } catch (error) {
            console.error("Error deleting:", error);
            showNotification('Delete failed', 'error');
        }
    };
    
    // ===== LOGOUT FUNCTION =====
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                await signOut(auth);
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Logout error:", error);
            }
        });
    }
    
    // ===== HELPER FUNCTIONS =====
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
    
    function showNotification(message, type) {
        // Your existing notification code or use alert for now
        if (type === 'error') {
            alert('Error: ' + message);
        } else {
            alert(message);
        }
    }
});