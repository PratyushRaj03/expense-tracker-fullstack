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
    
    // Currency elements
    const currencySelect = document.getElementById('currencySelect');
    
    // State variables
    let currentUser = null;
    let selectedCurrency = 'USD'; // Default currency
    let currencySymbols = {
        'USD': '$',
        'INR': '₹',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CAD': 'C$',
        'AUD': 'A$'
    };

    // ===== CHART.JS VARIABLES =====
    let categoryChartInstance = null;
    let monthlyChartInstance = null;
    
    const chartColors = [
        '#4361ee', '#f72585', '#4cc9f0', '#f8961e', '#f9c74f',
        '#90be6d', '#577590', '#b5179e', '#2b9348', '#ee6c4d'
    ];

    // ===== ADD EMPTY CHART STYLES =====
    const chartEmptyStyles = `
        .empty-chart {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.02);
            border-radius: 12px;
            color: var(--gray-color);
            font-size: 14px;
            min-height: 200px;
        }
        
        @media (prefers-color-scheme: dark) {
            .empty-chart {
                background: rgba(255, 255, 255, 0.02);
            }
        }
    `;
    
    // Add the styles to the document
    const styleSheet = document.createElement("style");
    styleSheet.textContent = chartEmptyStyles;
    document.head.appendChild(styleSheet);

    // ===== CURRENCY FUNCTIONS =====
    
    /**
     * Load user's currency preference from Firestore
     * @param {string} userId - The user's UID
     */
    async function loadUserCurrency(userId) {
        try {
            const userRef = doc(db, "users", userId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.preferredCurrency) {
                    selectedCurrency = userData.preferredCurrency;
                    
                    // Update dropdown
                    if (currencySelect) {
                        currencySelect.value = selectedCurrency;
                    }
                    
                    console.log("💰 Loaded currency preference:", selectedCurrency);
                }
            }
        } catch (error) {
            console.error("Error loading currency preference:", error);
        }
    }

    /**
     * Save user's currency preference to Firestore
     * @param {string} userId - The user's UID
     * @param {string} currency - The selected currency code
     * @returns {boolean} - Success status
     */
    async function saveUserCurrency(userId, currency) {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                preferredCurrency: currency,
                updatedAt: new Date().toISOString()
            });
            console.log("✅ Currency preference saved:", currency);
            return true;
        } catch (error) {
            console.error("❌ Error saving currency preference:", error);
            return false;
        }
    }

    /**
     * Format amount with currency symbol
     * @param {number} amount - The amount to format
     * @param {string} currency - Currency code (defaults to selectedCurrency)
     * @returns {string} - Formatted amount with symbol
     */
    function formatAmount(amount, currency = selectedCurrency) {
        const symbol = currencySymbols[currency] || '$';
        
        // Handle different currency formatting if needed
        if (currency === 'INR') {
            // For Indian Rupees, you could add lakh/crore formatting here
            return `${symbol} ${amount.toFixed(2)}`;
        }
        
        // Default formatting
        return `${symbol}${amount.toFixed(2)}`;
    }

    // ===== CHART FUNCTIONS =====

    /**
     * Process expenses for category chart
     * @param {Array} expenses - List of expenses
     * @returns {Object} - Categories and amounts
     */
    function processCategoryData(expenses) {
        const categoryMap = new Map();
        
        expenses.forEach(expense => {
            const category = expense.category;
            const amount = expense.amount;
            
            if (categoryMap.has(category)) {
                categoryMap.set(category, categoryMap.get(category) + amount);
            } else {
                categoryMap.set(category, amount);
            }
        });
        
        // Sort by amount (highest first)
        const sortedEntries = Array.from(categoryMap.entries())
            .sort((a, b) => b[1] - a[1]);
        
        return {
            labels: sortedEntries.map(entry => entry[0]),
            data: sortedEntries.map(entry => entry[1])
        };
    }

    /**
     * Process expenses for monthly chart (last 6 months)
     * @param {Array} expenses - List of expenses
     * @returns {Object} - Months and amounts
     */
    function processMonthlyData(expenses) {
        const monthMap = new Map();
        const months = [];
        
        // Get last 6 months
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
            const monthLabel = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            
            monthMap.set(monthKey, {
                label: monthLabel,
                total: 0
            });
            months.push(monthKey);
        }
        
        // Aggregate expenses by month
        expenses.forEach(expense => {
            const expenseDate = new Date(expense.date);
            const monthKey = `${expenseDate.getFullYear()}-${expenseDate.getMonth() + 1}`;
            
            if (monthMap.has(monthKey)) {
                const monthData = monthMap.get(monthKey);
                monthData.total += expense.amount;
                monthMap.set(monthKey, monthData);
            }
        });
        
        // Prepare data for chart
        const labels = [];
        const data = [];
        
        months.forEach(monthKey => {
            const monthData = monthMap.get(monthKey);
            labels.push(monthData.label);
            data.push(monthData.total);
        });
        
        return { labels, data };
    }

    /**
     * Create or update category pie chart
     * @param {Array} expenses - List of expenses
     */
    function renderCategoryChart(expenses) {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const container = canvas.parentNode;
        
        // Destroy existing chart instance
        if (categoryChartInstance) {
            categoryChartInstance.destroy();
        }
        
        const categoryData = processCategoryData(expenses);
        
        if (categoryData.labels.length === 0) {
            // Show empty state
            canvas.style.display = 'none';
            let emptyDiv = container.querySelector('.empty-chart');
            if (!emptyDiv) {
                emptyDiv = document.createElement('div');
                emptyDiv.className = 'empty-chart';
                container.appendChild(emptyDiv);
            }
            emptyDiv.innerHTML = '<p>No category data yet</p>';
            return;
        }
        
        // Hide empty state if visible
        canvas.style.display = 'block';
        const emptyDiv = container.querySelector('.empty-chart');
        if (emptyDiv) emptyDiv.remove();
        
        // Create new chart
        categoryChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.data,
                    backgroundColor: chartColors.slice(0, categoryData.labels.length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: getComputedStyle(document.body).getPropertyValue('--dark-color').trim() || '#333',
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${formatAmount(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Create or update monthly bar chart
     * @param {Array} expenses - List of expenses
     */
    function renderMonthlyChart(expenses) {
        const canvas = document.getElementById('monthlyChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const container = canvas.parentNode;
        
        // Destroy existing chart instance
        if (monthlyChartInstance) {
            monthlyChartInstance.destroy();
        }
        
        const monthlyData = processMonthlyData(expenses);
        
        // Check if all data is zero
        const hasData = monthlyData.data.some(value => value > 0);
        
        if (!hasData) {
            // Show empty state
            canvas.style.display = 'none';
            let emptyDiv = container.querySelector('.empty-chart');
            if (!emptyDiv) {
                emptyDiv = document.createElement('div');
                emptyDiv.className = 'empty-chart';
                container.appendChild(emptyDiv);
            }
            emptyDiv.innerHTML = '<p>No monthly data yet</p>';
            return;
        }
        
        // Hide empty state if visible
        canvas.style.display = 'block';
        const emptyDiv = container.querySelector('.empty-chart');
        if (emptyDiv) emptyDiv.remove();
        
        // Create new chart
        monthlyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Spending',
                    data: monthlyData.data,
                    backgroundColor: chartColors[0],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Total: ${formatAmount(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatAmount(value);
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Update all charts with new expense data
     * @param {Array} expenses - List of expenses
     */
    function updateCharts(expenses) {
        renderCategoryChart(expenses);
        renderMonthlyChart(expenses);
    }

    // ===== CHECK AUTHENTICATION =====
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("✅ User authenticated:", user.uid);
            currentUser = user;
            
            // Display user info
            if (userNameSpan) userNameSpan.textContent = user.displayName || 'User';
            if (userEmailSpan) userEmailSpan.textContent = user.email;
            
            // Load user's currency preference
            await loadUserCurrency(user.uid);
            
            // Load expenses
            await loadExpenses(user.uid);
            
            // Set default date to today
            const today = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById('date');
            if (dateInput) dateInput.value = today;
            
        } else {
            console.log("❌ No user authenticated, redirecting...");
            window.location.href = 'index.html';
        }
    });

    // ===== CURRENCY CHANGE LISTENER =====
    if (currencySelect) {
        currencySelect.addEventListener('change', async function() {
            const newCurrency = this.value;
            
            if (!currentUser) {
                showNotification('Please log in first', 'error');
                return;
            }
            
            // Save to Firestore
            const saved = await saveUserCurrency(currentUser.uid, newCurrency);
            
            if (saved) {
                selectedCurrency = newCurrency;
                
                // Refresh display with new currency
                await loadExpenses(currentUser.uid);
                
                // Show confirmation
                const currencyName = currencySelect.options[currencySelect.selectedIndex].text;
                showNotification(`Currency changed to ${currencyName}`, 'success');
            } else {
                showNotification('Failed to save currency preference', 'error');
                // Revert dropdown
                currencySelect.value = selectedCurrency;
            }
        });
    }

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
                // Create expense data - store amount in base currency (always as number)
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
                
                // Show success message with current currency
                showNotification(`Expense added successfully! (${formatAmount(amount)})`, 'success');
                
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
                updateCharts([]); // Update charts with empty data
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
                        <td class="amount-positive">${formatAmount(expense.amount)}</td>
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
            
            // Update stats and charts
            updateStats(expenses);
            updateCharts(expenses); // Update charts with expense data
            
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
            
            // Update amount label to show current currency
            const amountLabel = document.querySelector('label[for="editAmount"]');
            if (amountLabel) {
                amountLabel.innerHTML = `Amount (${currencySymbols[selectedCurrency] || '$'})`;
            }
            
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
            showNotification(`Expense updated successfully! (${formatAmount(updatedData.amount)})`, 'success');
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
        totalExpensesSpan.textContent = formatAmount(total);
        
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
            monthlyTotalSpan.textContent = formatAmount(monthlyTotal);
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
        notification.style.display = 'flex';
        notification.style.alignItems = 'center';
        notification.style.gap = '10px';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
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
                // Clear currency preference from memory
                selectedCurrency = 'USD';
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

    // ===== DARK MODE SUPPORT FOR CHARTS =====
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    darkModeMediaQuery.addEventListener('change', () => {
        if (currentUser) {
            loadExpenses(currentUser.uid);
        }
    });

    // Make functions globally available for onclick handlers
    window.deleteExpense = deleteExpense;
    window.editExpense = editExpense;
    window.closeEditModal = closeEditModal;
});
