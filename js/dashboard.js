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
    
    // Budget elements
    const setBudgetBtn = document.getElementById('setBudgetBtn');
    const saveBudgetBtn = document.getElementById('saveBudgetBtn');
    const cancelBudgetBtn = document.getElementById('cancelBudgetBtn');
    const budgetInput = document.getElementById('monthlyBudget');
    const currencySymbolEl = document.getElementById('budgetCurrencySymbol');
    
    // Export buttons
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    
    // Theme toggle elements
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleText = document.querySelector('.theme-toggle-text');
    const sunIcon = document.querySelector('.fa-sun');
    const moonIcon = document.querySelector('.fa-moon');
    
    // State variables
    let currentUser = null;
    let selectedCurrency = 'USD';
    let currentBudget = 0;
    let currentMonthSpent = 0;
    
    // Global expenses array for filters and export
    window.allExpenses = [];
    
    // Chart instances
    let categoryChartInstance = null;
    let monthlyChartInstance = null;
    
    const chartColors = [
        '#4361ee', '#f72585', '#4cc9f0', '#f8961e', '#f9c74f',
        '#90be6d', '#577590', '#b5179e', '#2b9348', '#ee6c4d'
    ];
    
    let currencySymbols = {
        'USD': '$',
        'INR': '₹',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CAD': 'C$',
        'AUD': 'A$'
    };

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
    
    const styleSheet = document.createElement("style");
    styleSheet.textContent = chartEmptyStyles;
    document.head.appendChild(styleSheet);

    // ===== THEME MANAGEMENT =====
    
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
            updateThemeIcons('dark');
        } else if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
            updateThemeIcons('light');
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.body.classList.add('dark-mode');
                document.body.classList.remove('light-mode');
                updateThemeIcons('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.add('light-mode');
                document.body.classList.remove('dark-mode');
                updateThemeIcons('light');
                localStorage.setItem('theme', 'light');
            }
        }
    }
    
    function updateThemeIcons(theme) {
        if (theme === 'dark') {
            if (sunIcon) sunIcon.style.display = 'none';
            if (moonIcon) moonIcon.style.display = 'inline-block';
            if (themeToggleText) themeToggleText.textContent = 'Dark';
        } else {
            if (sunIcon) sunIcon.style.display = 'inline-block';
            if (moonIcon) moonIcon.style.display = 'none';
            if (themeToggleText) themeToggleText.textContent = 'Light';
        }
    }
    
    function toggleTheme() {
        if (document.body.classList.contains('dark-mode')) {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            localStorage.setItem('theme', 'light');
            updateThemeIcons('light');
        } else {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
            updateThemeIcons('dark');
        }
        
        if (currentUser) {
            loadExpenses(currentUser.uid);
        }
    }
    
    initTheme();
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // ===== CURRENCY FUNCTIONS =====
    
    async function loadUserCurrency(userId) {
        try {
            const userRef = doc(db, "users", userId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.preferredCurrency) {
                    selectedCurrency = userData.preferredCurrency;
                    
                    if (currencySelect) {
                        currencySelect.value = selectedCurrency;
                    }
                    
                    if (currencySymbolEl) {
                        currencySymbolEl.textContent = currencySymbols[selectedCurrency] || '$';
                    }
                    
                    console.log("💰 Loaded currency preference:", selectedCurrency);
                }
            }
        } catch (error) {
            console.error("Error loading currency preference:", error);
        }
    }

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

    function formatAmount(amount, currency = selectedCurrency) {
        const symbol = currencySymbols[currency] || '$';
        
        if (currency === 'INR') {
            return `${symbol} ${amount.toFixed(2)}`;
        }
        
        return `${symbol}${amount.toFixed(2)}`;
    }

    // ===== BUDGET FUNCTIONS =====

    async function loadUserBudget(userId) {
        try {
            const userRef = doc(db, "users", userId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                currentBudget = userData.monthlyBudget || 0;
                
                updateBudgetDisplay();
                console.log("💰 Loaded budget:", currentBudget);
            }
        } catch (error) {
            console.error("Error loading budget:", error);
        }
    }

    async function saveUserBudget(budget) {
        if (!currentUser) {
            showNotification('Please log in first', 'error');
            return false;
        }
        
        try {
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, {
                monthlyBudget: budget,
                updatedAt: new Date().toISOString()
            });
            
            currentBudget = budget;
            console.log("✅ Budget saved:", budget);
            
            await calculateMonthlySpending();
            updateBudgetDisplay();
            showBudgetForm(false);
            showNotification('Budget saved successfully!', 'success');
            
            return true;
        } catch (error) {
            console.error("❌ Error saving budget:", error);
            showNotification('Failed to save budget', 'error');
            return false;
        }
    }

    async function calculateMonthlySpending() {
        if (!currentUser) return 0;
        
        try {
            const expensesRef = collection(db, "users", currentUser.uid, "expenses");
            const querySnapshot = await getDocs(expensesRef);
            
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            let monthlyTotal = 0;
            
            querySnapshot.forEach((doc) => {
                const expense = doc.data();
                const expenseDate = new Date(expense.date);
                
                if (expenseDate.getMonth() === currentMonth && 
                    expenseDate.getFullYear() === currentYear) {
                    monthlyTotal += expense.amount;
                }
            });
            
            currentMonthSpent = monthlyTotal;
            return monthlyTotal;
            
        } catch (error) {
            console.error("Error calculating monthly spending:", error);
            return 0;
        }
    }

    function updateBudgetDisplay() {
        const budgetDisplay = document.getElementById('budgetDisplay');
        const budgetForm = document.getElementById('budgetForm');
        const setBudgetBtn = document.getElementById('setBudgetBtn');
        
        const budgetAmountEl = document.getElementById('budgetAmount');
        const budgetSpentEl = document.getElementById('budgetSpent');
        const budgetRemainingEl = document.getElementById('budgetRemaining');
        const progressBar = document.getElementById('budgetProgressBar');
        const budgetWarning = document.getElementById('budgetWarning');
        const warningMessage = document.getElementById('warningMessage');
        
        if (currencySymbolEl) {
            currencySymbolEl.textContent = currencySymbols[selectedCurrency] || '$';
        }
        
        if (currentBudget > 0) {
            if (budgetDisplay) budgetDisplay.style.display = 'block';
            if (budgetForm) budgetForm.style.display = 'none';
            if (setBudgetBtn) setBudgetBtn.innerHTML = '<i class="fas fa-pencil-alt"></i> Edit Budget';
            
            const remaining = currentBudget - currentMonthSpent;
            const percentageUsed = (currentMonthSpent / currentBudget) * 100;
            
            if (budgetAmountEl) budgetAmountEl.textContent = formatAmount(currentBudget);
            if (budgetSpentEl) budgetSpentEl.textContent = formatAmount(currentMonthSpent);
            if (budgetRemainingEl) budgetRemainingEl.textContent = formatAmount(remaining);
            
            if (progressBar) {
                progressBar.style.width = `${Math.min(percentageUsed, 100)}%`;
                
                progressBar.classList.remove('warning', 'danger');
                
                if (percentageUsed >= 110) {
                    progressBar.classList.add('danger');
                    if (budgetWarning) {
                        budgetWarning.className = 'budget-warning danger';
                        warningMessage.textContent = `⚠️ You've exceeded your budget by ${formatAmount(Math.abs(remaining))}!`;
                        budgetWarning.style.display = 'flex';
                    }
                    
                } else if (percentageUsed >= 100) {
                    progressBar.classList.add('danger');
                    if (budgetWarning) {
                        budgetWarning.className = 'budget-warning danger';
                        warningMessage.textContent = `⚠️ You've reached your monthly budget!`;
                        budgetWarning.style.display = 'flex';
                    }
                    
                } else if (percentageUsed >= 80) {
                    progressBar.classList.add('warning');
                    if (budgetWarning) {
                        budgetWarning.className = 'budget-warning warning';
                        warningMessage.textContent = `⚠️ You've used ${percentageUsed.toFixed(1)}% of your budget`;
                        budgetWarning.style.display = 'flex';
                    }
                    
                } else {
                    if (budgetWarning) budgetWarning.style.display = 'none';
                }
            }
            
        } else {
            if (budgetDisplay) budgetDisplay.style.display = 'none';
            if (budgetForm) budgetForm.style.display = 'none';
            if (setBudgetBtn) setBudgetBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Set Budget';
        }
    }

    function showBudgetForm(show) {
        const budgetDisplay = document.getElementById('budgetDisplay');
        const budgetForm = document.getElementById('budgetForm');
        const setBudgetBtn = document.getElementById('setBudgetBtn');
        
        if (show) {
            if (budgetDisplay) budgetDisplay.style.display = 'none';
            if (budgetForm) budgetForm.style.display = 'block';
            if (setBudgetBtn) setBudgetBtn.style.display = 'none';
            
            const budgetInput = document.getElementById('monthlyBudget');
            if (budgetInput && currentBudget > 0) {
                budgetInput.value = currentBudget;
            }
        } else {
            if (budgetForm) budgetForm.style.display = 'none';
            if (setBudgetBtn) setBudgetBtn.style.display = 'flex';
            if (currentBudget > 0 && budgetDisplay) {
                budgetDisplay.style.display = 'block';
            }
        }
    }

    // ===== CHART FUNCTIONS =====

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
        
        const sortedEntries = Array.from(categoryMap.entries())
            .sort((a, b) => b[1] - a[1]);
        
        return {
            labels: sortedEntries.map(entry => entry[0]),
            data: sortedEntries.map(entry => entry[1])
        };
    }

    function processMonthlyData(expenses) {
        const monthMap = new Map();
        const months = [];
        
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
        
        expenses.forEach(expense => {
            const expenseDate = new Date(expense.date);
            const monthKey = `${expenseDate.getFullYear()}-${expenseDate.getMonth() + 1}`;
            
            if (monthMap.has(monthKey)) {
                const monthData = monthMap.get(monthKey);
                monthData.total += expense.amount;
                monthMap.set(monthKey, monthData);
            }
        });
        
        const labels = [];
        const data = [];
        
        months.forEach(monthKey => {
            const monthData = monthMap.get(monthKey);
            labels.push(monthData.label);
            data.push(monthData.total);
        });
        
        return { labels, data };
    }

    function renderCategoryChart(expenses) {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const container = canvas.parentNode;
        
        if (categoryChartInstance) {
            categoryChartInstance.destroy();
        }
        
        const categoryData = processCategoryData(expenses);
        
        if (categoryData.labels.length === 0) {
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
        
        canvas.style.display = 'block';
        const emptyDiv = container.querySelector('.empty-chart');
        if (emptyDiv) emptyDiv.remove();
        
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

    function renderMonthlyChart(expenses) {
        const canvas = document.getElementById('monthlyChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const container = canvas.parentNode;
        
        if (monthlyChartInstance) {
            monthlyChartInstance.destroy();
        }
        
        const monthlyData = processMonthlyData(expenses);
        
        const hasData = monthlyData.data.some(value => value > 0);
        
        if (!hasData) {
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
        
        canvas.style.display = 'block';
        const emptyDiv = container.querySelector('.empty-chart');
        if (emptyDiv) emptyDiv.remove();
        
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

    function updateCharts(expenses) {
        renderCategoryChart(expenses);
        renderMonthlyChart(expenses);
    }

    // ===== EXPORT FUNCTIONS =====

    /**
     * Get filtered expenses based on current filter selections
     * @returns {Array} - Filtered expenses array
     */
    function getFilteredExpenses() {
        let filtered = [...window.allExpenses];
        
        // Apply category filter
        const categoryFilter = document.getElementById('categoryFilter')?.value;
        if (categoryFilter && categoryFilter !== 'all') {
            filtered = filtered.filter(exp => exp.category === categoryFilter);
        }
        
        // Apply date filter
        const dateFilter = document.getElementById('dateFilter')?.value;
        if (dateFilter && dateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            filtered = filtered.filter(exp => {
                const expDate = new Date(exp.date);
                
                switch(dateFilter) {
                    case 'today':
                        return expDate.toDateString() === today.toDateString();
                        
                    case 'week':
                        const weekAgo = new Date(today);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return expDate >= weekAgo;
                        
                    case 'month':
                        return expDate.getMonth() === now.getMonth() && 
                               expDate.getFullYear() === now.getFullYear();
                        
                    default:
                        return true;
                }
            });
        }
        
        return filtered;
    }

    /**
     * Prepare expense data for export
     * @param {Array} expenses - Array of expense objects
     * @returns {Array} - Formatted data for export
     */
    function prepareExportData(expenses) {
        return expenses.map(exp => ({
            Date: formatDateForExport(exp.date),
            Category: exp.category,
            Description: exp.description,
            Amount: formatAmount(exp.amount)
        }));
    }

    /**
     * Format date for export (YYYY-MM-DD)
     * @param {string} dateString - Original date string
     * @returns {string} - Formatted date
     */
    function formatDateForExport(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Calculate totals for report
     * @param {Array} expenses - Array of expenses
     * @returns {Object} - Total and other statistics
     */
    function calculateReportTotals(expenses) {
        const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        
        // Category breakdown
        const categoryTotals = {};
        expenses.forEach(exp => {
            categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
        });
        
        return {
            total: formatAmount(total),
            count: expenses.length,
            categoryTotals
        };
    }

    /**
     * Export expenses as CSV file
     */
    function exportToCSV() {
        const expenses = getFilteredExpenses();
        
        if (expenses.length === 0) {
            showNotification('No expenses to export', 'error');
            return;
        }
        
        try {
            // Prepare data
            const exportData = prepareExportData(expenses);
            
            // Create CSV headers
            const headers = ['Date', 'Category', 'Description', 'Amount'];
            
            // Convert to CSV string
            const csvRows = [];
            
            // Add headers
            csvRows.push(headers.join(','));
            
            // Add data rows
            exportData.forEach(row => {
                // Escape commas and quotes in description
                const escapedDescription = row.Description.replace(/"/g, '""');
                const values = [
                    row.Date,
                    row.Category,
                    `"${escapedDescription}"`, // Wrap in quotes to handle commas
                    row.Amount
                ];
                csvRows.push(values.join(','));
            });
            
            // Add summary row
            const totals = calculateReportTotals(expenses);
            csvRows.push(''); // Empty row
            csvRows.push(`Total Expenses,,,${totals.total}`);
            csvRows.push(`Number of Transactions,,,${totals.count}`);
            
            // Create blob and download
            const csvString = csvRows.join('\n');
            const blob = new Blob([csvString], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            
            // Generate filename with date
            const date = new Date().toISOString().split('T')[0];
            a.download = `expenses_${date}.csv`;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showNotification(`Exported ${expenses.length} expenses to CSV`, 'success');
            
        } catch (error) {
            console.error('CSV Export Error:', error);
            showNotification('Failed to export CSV', 'error');
        }
    }

    /**
     * Export expenses as PDF report
     */
    function exportToPDF() {
        const expenses = getFilteredExpenses();
        
        if (expenses.length === 0) {
            showNotification('No expenses to export', 'error');
            return;
        }
        
        try {
            // Initialize jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // Add title
            doc.setFontSize(20);
            doc.setTextColor(67, 97, 238);
            doc.text('Expense Report', 14, 20);
            
            // Add date
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            const reportDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            doc.text(`Generated: ${reportDate}`, 14, 28);
            
            // Add filter info
            const categoryFilter = document.getElementById('categoryFilter')?.value;
            const dateFilter = document.getElementById('dateFilter')?.value;
            
            let filterText = 'Filters: ';
            if (categoryFilter && categoryFilter !== 'all') {
                filterText += `Category: ${categoryFilter} `;
            }
            if (dateFilter && dateFilter !== 'all') {
                filterText += `Period: ${dateFilter}`;
            }
            if (filterText === 'Filters: ') {
                filterText = 'Filters: All expenses';
            }
            
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text(filterText, 14, 35);
            
            // Prepare table data
            const tableData = expenses.map(exp => [
                formatDateForExport(exp.date),
                exp.category,
                exp.description,
                formatAmount(exp.amount)
            ]);
            
            // Add table using autoTable plugin
            doc.autoTable({
                startY: 40,
                head: [['Date', 'Category', 'Description', 'Amount']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [67, 97, 238],
                    textColor: [255, 255, 255],
                    fontSize: 10,
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    fontSize: 9
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                columnStyles: {
                    0: { cellWidth: 30 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 30, halign: 'right' }
                },
                margin: { left: 14, right: 14 }
            });
            
            // Add summary section
            const finalY = doc.lastAutoTable.finalY + 10;
            
            const totals = calculateReportTotals(expenses);
            
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text('Summary', 14, finalY);
            
            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);
            doc.text(`Total Expenses: ${totals.total}`, 14, finalY + 8);
            doc.text(`Number of Transactions: ${totals.count}`, 14, finalY + 16);
            
            // Category breakdown
            let categoryY = finalY + 24;
            doc.text('Category Breakdown:', 14, categoryY);
            
            let i = 1;
            for (const [category, amount] of Object.entries(totals.categoryTotals)) {
                doc.text(`${category}: ${amount}`, 20, categoryY + (i * 7));
                i++;
            }
            
            // Add currency note
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`All amounts shown in ${selectedCurrency}`, 14, categoryY + (i * 7) + 5);
            
            // Save PDF
            const filename = `expense_report_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            
            showNotification(`Exported ${expenses.length} expenses to PDF`, 'success');
            
        } catch (error) {
            console.error('PDF Export Error:', error);
            showNotification('Failed to export PDF. Make sure jsPDF is loaded.', 'error');
        }
    }

    // ===== CHECK AUTHENTICATION =====
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("✅ User authenticated:", user.uid);
            currentUser = user;
            
            // Load user profile to get name
            try {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    
                    if (userNameSpan) {
                        userNameSpan.textContent = userData.name || 'User';
                    }
                    
                    if (userEmailSpan) {
                        userEmailSpan.textContent = userData.email || user.email;
                    }
                } else {
                    if (userNameSpan) {
                        userNameSpan.textContent = user.displayName || 'User';
                    }
                    if (userEmailSpan) {
                        userEmailSpan.textContent = user.email;
                    }
                }
            } catch (error) {
                console.error("Error loading user profile:", error);
                if (userNameSpan) userNameSpan.textContent = user.displayName || 'User';
                if (userEmailSpan) userEmailSpan.textContent = user.email;
            }
            
            await loadUserCurrency(user.uid);
            await loadUserBudget(user.uid);
            await calculateMonthlySpending();
            await loadExpenses(user.uid);
            
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
            
            const saved = await saveUserCurrency(currentUser.uid, newCurrency);
            
            if (saved) {
                selectedCurrency = newCurrency;
                
                if (currencySymbolEl) {
                    currencySymbolEl.textContent = currencySymbols[selectedCurrency] || '$';
                }
                
                await loadExpenses(currentUser.uid);
                updateBudgetDisplay();
                
                const currencyName = currencySelect.options[currencySelect.selectedIndex].text;
                showNotification(`Currency changed to ${currencyName}`, 'success');
            } else {
                showNotification('Failed to save currency preference', 'error');
                currencySelect.value = selectedCurrency;
            }
        });
    }

    // ===== EXPORT BUTTON LISTENERS =====
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', exportToCSV);
    }
    
    if (exportPDFBtn) {
        exportPDFBtn.addEventListener('click', exportToPDF);
    }

    // ===== ADD EXPENSE FORM SUBMISSION =====
    if (expenseForm) {
        expenseForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            if (!currentUser) {
                showNotification('Please log in first', 'error');
                return;
            }
            
            const amount = parseFloat(document.getElementById('amount').value);
            const category = document.getElementById('category').value;
            const description = document.getElementById('description').value;
            const date = document.getElementById('date').value;
            
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
            
            const submitBtn = document.getElementById('submitExpenseBtn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
            submitBtn.disabled = true;
            
            try {
                const expenseData = {
                    amount: amount,
                    category: category,
                    description: description.trim(),
                    date: date,
                    createdAt: new Date().toISOString(),
                    userId: currentUser.uid
                };
                
                const expensesRef = collection(db, "users", currentUser.uid, "expenses");
                const docRef = await addDoc(expensesRef, expenseData);
                
                console.log("✅ Expense added with ID:", docRef.id);
                
                expenseForm.reset();
                
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('date').value = today;
                
                showNotification(`Expense added successfully! (${formatAmount(amount)})`, 'success');
                
                await loadExpenses(currentUser.uid);
                
            } catch (error) {
                console.error("❌ Error adding expense:", error);
                showNotification('Failed to add expense: ' + error.message, 'error');
            } finally {
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
                window.allExpenses = [];
                updateStats([]);
                updateCharts([]);
                
                await calculateMonthlySpending();
                updateBudgetDisplay();
                return;
            }
            
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
            
            // Store expenses globally for filters and export
            window.allExpenses = expenses;
            
            updateStats(expenses);
            updateCharts(expenses);
            
            await calculateMonthlySpending();
            updateBudgetDisplay();
            
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
            
            await loadExpenses(currentUser.uid);
            
        } catch (error) {
            console.error("❌ Error deleting expense:", error);
            showNotification('Failed to delete expense: ' + error.message, 'error');
            
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
            
            document.getElementById('editExpenseId').value = expenseId;
            document.getElementById('editAmount').value = expense.amount;
            document.getElementById('editCategory').value = expense.category;
            document.getElementById('editDescription').value = expense.description;
            document.getElementById('editDate').value = expense.date;
            
            const amountLabel = document.querySelector('label[for="editAmount"]');
            if (amountLabel) {
                amountLabel.innerHTML = `Amount (${currencySymbols[selectedCurrency] || '$'})`;
            }
            
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

    // ===== BUDGET EVENT LISTENERS =====
    if (setBudgetBtn) {
        setBudgetBtn.addEventListener('click', () => {
            showBudgetForm(true);
        });
    }

    if (saveBudgetBtn) {
        saveBudgetBtn.addEventListener('click', async () => {
            const budgetInput = document.getElementById('monthlyBudget');
            const budget = parseFloat(budgetInput.value);
            
            if (isNaN(budget) || budget < 0) {
                showNotification('Please enter a valid budget amount', 'error');
                return;
            }
            
            await saveUserBudget(budget);
        });
    }

    if (cancelBudgetBtn) {
        cancelBudgetBtn.addEventListener('click', () => {
            showBudgetForm(false);
        });
    }

    if (budgetInput) {
        budgetInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (saveBudgetBtn) saveBudgetBtn.click();
            }
        });
    }

    // ===== UPDATE STATS =====
    function updateStats(expenses) {
        if (!totalExpensesSpan) return;
        
        const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        totalExpensesSpan.textContent = formatAmount(total);
        
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
                selectedCurrency = 'USD';
                currentBudget = 0;
                currentMonthSpent = 0;
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Logout error:", error);
            }
        });
    }

    // ===== FILTERS =====
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

    // Make functions globally available
    window.deleteExpense = deleteExpense;
    window.editExpense = editExpense;
    window.closeEditModal = closeEditModal;
});
