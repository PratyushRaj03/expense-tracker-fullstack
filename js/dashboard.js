import { 
    auth, 
    db, 
    signOut,
    collection, 
    addDoc, 
    getDocs, 
    getDoc,
    query, 
    orderBy,
    deleteDoc,
    doc,
    updateDoc,
    onAuthStateChanged
} from './firebase-config.js';

// ===== DASHBOARD CODE =====
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Dashboard loaded");
    
    // Get DOM elements
    const expenseForm = document.getElementById('expenseForm');
    const expensesContainer = document.getElementById('expensesContainer');
    const logoutBtn = document.getElementById('logoutBtn');
    const userNameSpan = document.getElementById('userName');
    const userEmailSpan = document.getElementById('userEmail');
    const totalExpensesSpan = document.getElementById('totalExpenses');
    const monthlyTotalSpan = document.getElementById('monthlyTotal');
    const categoryCountSpan = document.getElementById('categoryCount');
    
    // Modal elements
    const editModal = document.getElementById('editModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const editForm = document.getElementById('editExpenseForm');
    
    let currentUser = null;

    // ===== CHECK AUTHENTICATION =====
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("✅ User authenticated:", user.uid);
            currentUser = user;
            
            // Display user info
            if (userNameSpan) userNameSpan.textContent = user.displayName || 'User';
            if (userEmailSpan) userEmailSpan.textContent = user.email;
            
            // Load expenses
            loadExpenses(user.uid);
            
            // Set default date to today
            const today = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById('date');
            if (dateInput) dateInput.value = today;
            
        } else {
            console.log("❌ No user authenticated, redirecting...");
            window.location.href = 'index.html';
        }
    });

    // ===== ADD EXPENSE FORM SUBMISSION =====
    if (expenseForm) {
        expenseForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            if (!currentUser) {
                showNotification('Please log in first', 'error');
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
            
            if (!description.trim()) {
                showNotification('Please enter a description', 'error');
                return;
            }
            
            if (!date) {
                showNotification('Please select a date', 'error');
                return;
            }
            
            // Show loading state
            const submitBtn = document.getElementById('submitExpenseBtn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
            submitBtn.disabled = true;
            
            try {
                // Create expense data
                const expenseData = {
                    amount: amount,
                    category: category,
                    description: description.trim(),
                    date: date,
                    createdAt: new Date().toISOString(),
                    userId: currentUser.uid
                };
                
                // Add to Firestore
                const expensesRef = collection(db, "users", currentUser.uid, "expenses");
                const docRef = await addDoc(expensesRef, expenseData);
                
                console.log("✅ Expense added with ID:", docRef.id);
                
                // Clear form
                expenseForm.reset();
                
                // Set today's date again
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('date').value = today;
                
                // Show success message
                showNotification('Expense added successfully!', 'success');
                
                // Reload expenses
                await loadExpenses(currentUser.uid);
                
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
            expensesContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading expenses...</div>';
            
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
                updateStats([]);
                return;
            }
            
            // Build expenses table
            let expenses = [];
            let html = '<table class="expenses-table">';
            html += '<thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Actions</th></tr></thead>';
            html += '<tbody>';
            
            querySnapshot.forEach((doc) => {
                const expense = { id: doc.id, ...doc.data() };
                expenses.push(expense);
                
                const categoryClass = expense.category.toLowerCase().replace(/\s+/g, '-');
                
                html += `
                    <tr id="expense-${expense.id}">
                        <td>${formatDate(expense.date)}</td>
                        <td><span class="category-badge category-${categoryClass}">${expense.category}</span></td>
                        <td>${expense.description}</td>
                        <td class="amount-positive">$${expense.amount.toFixed(2)}</td>
                        <td>
                            <button onclick="editExpense('${expense.id}')" class="action-btn edit-btn">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteExpense('${expense.id}')" class="action-btn delete-btn">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            expensesContainer.innerHTML = html;
            
            // Update stats
            updateStats(expenses);
            
        } catch (error) {
            console.error("❌ Error loading expenses:", error);
            expensesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading expenses.</p>
                    <p style="font-size:12px; color:#ef4444;">${error.message}</p>
                </div>
            `;
        }
    }

    // ===== DELETE EXPENSE FUNCTION =====
    async function deleteExpense(expenseId) {
        if (!currentUser) {
            showNotification('Please log in first', 'error');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this expense?')) {
            return;
        }
        
        try {
            // Show loading on the specific button
            const deleteBtn = event?.target?.closest('button');
            if (deleteBtn) {
                deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                deleteBtn.disabled = true;
            }
            
            console.log("🗑️ Deleting expense:", expenseId);
            
            const expenseRef = doc(db, "users", currentUser.uid, "expenses", expenseId);
            await deleteDoc(expenseRef);
            
            console.log("✅ Expense deleted successfully!");
            
            showNotification('Expense deleted successfully!', 'success');
            
            // Refresh the list
            await loadExpenses(currentUser.uid);
            
        } catch (error) {
            console.error("❌ Error deleting expense:", error);
            showNotification('Failed to delete expense: ' + error.message, 'error');
            
            // Reset button if it exists
            if (deleteBtn) {
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.disabled = false;
            }
        }
    }

    // ===== EDIT EXPENSE FUNCTIONS =====
    async function editExpense(expenseId) {
        if (!currentUser) {
            showNotification('Please log in first', 'error');
            return;
        }
        
        try {
            console.log("✏️ Editing expense:", expenseId);
            
            const expenseRef = doc(db, "users", currentUser.uid, "expenses", expenseId);
            const expenseSnap = await getDoc(expenseRef);
            
            if (!expenseSnap.exists()) {
                showNotification('Expense not found', 'error');
                return;
            }
            
            const expense = expenseSnap.data();
            
            // Populate the modal form
            document.getElementById('editExpenseId').value = expenseId;
            document.getElementById('editAmount').value = expense.amount;
            document.getElementById('editCategory').value = expense.category;
            document.getElementById('editDescription').value = expense.description;
            document.getElementById('editDate').value = expense.date;
            
            // Show the modal
            editModal.style.display = 'block';
            
        } catch (error) {
            console.error("❌ Error loading expense for edit:", error);
            showNotification('Failed to load expense', 'error');
        }
    }

    async function updateExpense(expenseId, updatedData) {
        if (!currentUser) {
            showNotification('Please log in first', 'error');
            return;
        }
        
        try {
            console.log("🔄 Updating expense:", expenseId, updatedData);
            
            const updateBtn = document.getElementById('updateExpenseBtn');
            const originalText = updateBtn.innerHTML;
            updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            updateBtn.disabled = true;
            
            const expenseRef = doc(db, "users", currentUser.uid, "expenses", expenseId);
            
            await updateDoc(expenseRef, {
                amount: updatedData.amount,
                category: updatedData.category,
                description: updatedData.description,
                date: updatedData.date,
                updatedAt: new Date().toISOString()
            });
            
            console.log("✅ Expense updated successfully!");
            
            closeEditModal();
            showNotification('Expense updated successfully!', 'success');
            await loadExpenses(currentUser.uid);
            
        } catch (error) {
            console.error("❌ Error updating expense:", error);
            showNotification('Failed to update expense: ' + error.message, 'error');
        } finally {
            const updateBtn = document.getElementById('updateExpenseBtn');
            updateBtn.innerHTML = '<i class="fas fa-save"></i> Update Expense';
            updateBtn.disabled = false;
        }
    }

    function closeEditModal() {
        editModal.style.display = 'none';
        editForm.reset();
    }

    // ===== MODAL EVENT LISTENERS =====
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeEditModal);
    }
    
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', closeEditModal);
    }
    
    window.addEventListener('click', function(event) {
        if (event.target === editModal) {
            closeEditModal();
        }
    });
    
    if (editForm) {
        editForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const expenseId = document.getElementById('editExpenseId').value;
            const updatedData = {
                amount: parseFloat(document.getElementById('editAmount').value),
                category: document.getElementById('editCategory').value,
                description: document.getElementById('editDescription').value.trim(),
                date: document.getElementById('editDate').value
            };
            
            // Validate
            if (!updatedData.amount || updatedData.amount <= 0) {
                showNotification('Please enter a valid amount', 'error');
                return;
            }
            
            if (!updatedData.category) {
                showNotification('Please select a category', 'error');
                return;
            }
            
            if (!updatedData.description) {
                showNotification('Please enter a description', 'error');
                return;
            }
            
            if (!updatedData.date) {
                showNotification('Please select a date', 'error');
                return;
            }
            
            await updateExpense(expenseId, updatedData);
        });
    }

    // ===== UPDATE STATS =====
    function updateStats(expenses) {
        if (!totalExpensesSpan) return;
        
        const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        totalExpensesSpan.textContent = `$${total.toFixed(2)}`;
        
        // Monthly total
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const monthlyTotal = expenses
            .filter(exp => {
                const expDate = new Date(exp.date);
                return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
            })
            .reduce((sum, exp) => sum + exp.amount, 0);
        
        if (monthlyTotalSpan) {
            monthlyTotalSpan.textContent = `$${monthlyTotal.toFixed(2)}`;
        }
        
        // Category count
        const uniqueCategories = new Set(expenses.map(exp => exp.category));
        if (categoryCountSpan) {
            categoryCountSpan.textContent = uniqueCategories.size;
        }
    }

    // ===== HELPER FUNCTIONS =====
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    function showNotification(message, type) {
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
        notification.style.zIndex = '9999';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // ===== LOGOUT =====
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

    // ===== FILTERS (Placeholder) =====
    const categoryFilter = document.getElementById('categoryFilter');
    const dateFilter = document.getElementById('dateFilter');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            if (currentUser) loadExpenses(currentUser.uid);
        });
    }
    
    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            if (currentUser) loadExpenses(currentUser.uid);
        });
    }

    // Make functions globally available for onclick handlers
    window.deleteExpense = deleteExpense;
    window.editExpense = editExpense;
    window.closeEditModal = closeEditModal;
});
