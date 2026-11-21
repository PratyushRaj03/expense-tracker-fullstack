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

import {
    escapeHtml,
    sanitizeForCSV,
    sanitizeString,
    initInactivitySessionTimeout
} from './security-utils.js';

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
        '#00F0FF', '#8B5CF6', '#00FF9D', '#D946EF', '#FFB800',
        '#3B82F6', '#FF2A5F', '#10F0A0', '#A855F7', '#06B6D4'
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

    // Realistic Baseline Exchange Rates (1 USD = X Currency)
    // Synchronized to market benchmarks: 100 USD = 9,000 INR
    const DEFAULT_RATES = {
        'USD': 1.0,
        'INR': 90.0,
        'EUR': 0.95,
        'GBP': 0.79,
        'JPY': 155.0,
        'CAD': 1.44,
        'AUD': 1.58
    };

    let exchangeRates = { ...DEFAULT_RATES };

    function getExchangeRate(currency = selectedCurrency) {
        return exchangeRates[currency] || DEFAULT_RATES[currency] || 1.0;
    }

    function convertFromUSD(amountInUSD, targetCurrency = selectedCurrency) {
        const rate = getExchangeRate(targetCurrency);
        return (parseFloat(amountInUSD) || 0) * rate;
    }

    function convertToUSD(amountInCurrency, sourceCurrency = selectedCurrency) {
        const rate = getExchangeRate(sourceCurrency);
        if (!rate || rate <= 0) return parseFloat(amountInCurrency) || 0;
        return (parseFloat(amountInCurrency) || 0) / rate;
    }

    function convertCurrency(amount, fromCurr, toCurr) {
        const num = parseFloat(amount);
        if (isNaN(num) || num === 0) return 0;
        if (fromCurr === toCurr) return num;
        const fromRate = getExchangeRate(fromCurr);
        const toRate = getExchangeRate(toCurr);
        if (!fromRate || fromRate <= 0) return num;
        const inUSD = num / fromRate;
        return inUSD * toRate;
    }

    async function fetchLiveExchangeRates() {
        try {
            const res = await fetch('https://open.er-api.com/v6/latest/USD');
            if (res.ok) {
                const data = await res.json();
                if (data && data.rates) {
                    Object.keys(DEFAULT_RATES).forEach(curr => {
                        if (data.rates[curr] && typeof data.rates[curr] === 'number') {
                            exchangeRates[curr] = data.rates[curr];
                        }
                    });
                    console.log('🌐 Exchange rates synchronized with live market:', exchangeRates);
                    if (currentUser) {
                        updateBudgetDisplay();
                        updateStats(window.allExpenses || []);
                        updateCharts(window.allExpenses || []);
                        renderExpensesTable(window.allExpenses || []);
                    }
                }
            }
        } catch (e) {
            console.log('Using baseline exchange rates:', exchangeRates);
        }
    }

    fetchLiveExchangeRates();

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
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
            updateThemeIcons('dark');
            localStorage.setItem('theme', 'dark');
        }
    }
    
    function updateThemeIcons(theme) {
        if (sunIcon) sunIcon.style.display = '';
        if (moonIcon) moonIcon.style.display = '';
        if (themeToggleText) themeToggleText.textContent = theme === 'dark' ? 'Dark' : 'Light';
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
            const localPref = localStorage.getItem('preferredCurrency');
            if (localPref && currencySymbols[localPref]) {
                selectedCurrency = localPref;
                if (currencySelect) currencySelect.value = selectedCurrency;
                if (currencySymbolEl) currencySymbolEl.textContent = currencySymbols[selectedCurrency] || '$';
            }
            
            const userRef = doc(db, "users", userId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.preferredCurrency && currencySymbols[userData.preferredCurrency]) {
                    selectedCurrency = userData.preferredCurrency;
                    localStorage.setItem('preferredCurrency', selectedCurrency);
                    
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

    function formatAmount(amountInUSD, currency = selectedCurrency) {
        const converted = convertFromUSD(amountInUSD, currency);
        const symbol = currencySymbols[currency] || '$';
        const formattedNumber = formatAmountWithCommas(converted, currency);
        
        if (currency === 'INR') {
            return `${symbol} ${formattedNumber}`;
        }
        return `${symbol}${formattedNumber}`;
    }

    function formatAmountRaw(amountInCurrency, currency = selectedCurrency) {
        const symbol = currencySymbols[currency] || '$';
        const formattedNumber = formatAmountWithCommas(amountInCurrency, currency);
        
        if (currency === 'INR') {
            return `${symbol} ${formattedNumber}`;
        }
        return `${symbol}${formattedNumber}`;
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
        const budgetInput = document.getElementById('monthlyBudget');
        
        if (currencySymbolEl) {
            currencySymbolEl.textContent = currencySymbols[selectedCurrency] || '$';
        }

        const isFormOpen = budgetForm && budgetForm.style.display === 'block';
        
        if (currentBudget > 0) {
            if (!isFormOpen) {
                if (budgetDisplay) budgetDisplay.style.display = 'block';
                if (budgetForm) budgetForm.style.display = 'none';
            }
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
            if (!isFormOpen && budgetForm) budgetForm.style.display = 'none';
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
            
            if (currencySymbolEl) {
                currencySymbolEl.textContent = currencySymbols[selectedCurrency] || '$';
            }
            
            const budgetInput = document.getElementById('monthlyBudget');
            if (budgetInput) {
                if (currentBudget > 0) {
                    const converted = convertFromUSD(currentBudget, selectedCurrency);
                    budgetInput.value = selectedCurrency === 'JPY' ? Math.round(converted) : parseFloat(converted.toFixed(2));
                }
                budgetInput.focus();
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
            const amountInSelected = convertFromUSD(expense.amount, selectedCurrency);
            
            if (categoryMap.has(category)) {
                categoryMap.set(category, categoryMap.get(category) + amountInSelected);
            } else {
                categoryMap.set(category, amountInSelected);
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
                monthData.total += convertFromUSD(expense.amount, selectedCurrency);
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
        
        const isDark = !document.body.classList.contains('light-mode');
        const textColor = isDark ? '#94A3B8' : '#475569';
        const bgColor = isDark ? '#0D111A' : '#FFFFFF';

        categoryChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.data,
                    backgroundColor: chartColors.slice(0, categoryData.labels.length),
                    borderColor: bgColor,
                    borderWidth: 2,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: textColor,
                            font: { size: 12, family: "'Plus Jakarta Sans', sans-serif", weight: '600' },
                            padding: 16,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 8,
                            boxHeight: 8
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? 'rgba(13, 17, 26, 0.95)' : '#FFFFFF',
                        titleColor: isDark ? '#FFFFFF' : '#0B132B',
                        bodyColor: isDark ? '#00F0FF' : '#0284C7',
                        borderColor: isDark ? 'rgba(0, 240, 255, 0.3)' : 'rgba(2, 132, 199, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { family: "'Space Grotesk', sans-serif", weight: '700' },
                        bodyFont: { family: "'JetBrains Mono', monospace", weight: '600' },
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                                return `  ${label}: ${formatAmountRaw(value)} (${percentage}%)`;
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
        
        const isDarkBar = !document.body.classList.contains('light-mode');
        const textColorBar = isDarkBar ? '#94A3B8' : '#475569';
        const gridColorBar = isDarkBar ? 'rgba(0, 240, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        
        const gradient = ctx.createLinearGradient(0, 0, 0, 260);
        if (isDarkBar) {
            gradient.addColorStop(0, 'rgba(0, 240, 255, 0.85)');
            gradient.addColorStop(1, 'rgba(0, 114, 255, 0.25)');
        } else {
            gradient.addColorStop(0, '#0284C7');
            gradient.addColorStop(1, '#0052CC');
        }

        monthlyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Telemetry Expenditure',
                    data: monthlyData.data,
                    backgroundColor: gradient,
                    hoverBackgroundColor: isDarkBar ? '#00F0FF' : '#0369A1',
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDarkBar ? 'rgba(13, 17, 26, 0.95)' : '#FFFFFF',
                        titleColor: isDarkBar ? '#FFFFFF' : '#0B132B',
                        bodyColor: isDarkBar ? '#00FF9D' : '#059669',
                        borderColor: isDarkBar ? 'rgba(0, 240, 255, 0.3)' : 'rgba(2, 132, 199, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { family: "'Space Grotesk', sans-serif", weight: '700' },
                        bodyFont: { family: "'JetBrains Mono', monospace", weight: '600' },
                        callbacks: {
                            label: function(context) {
                                return `  Total: ${formatAmountRaw(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: textColorBar, font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" } },
                        border: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColorBar },
                        border: { display: false, dash: [4, 4] },
                        ticks: {
                            color: textColorBar,
                            font: { size: 11, family: "'JetBrains Mono', monospace" },
                            callback: function(value) {
                                return formatAmountRaw(value);
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

    function getFilteredExpenses() {
        let filtered = [...window.allExpenses];
        
        const categoryFilter = document.getElementById('categoryFilter')?.value;
        if (categoryFilter && categoryFilter !== 'all') {
            filtered = filtered.filter(exp => exp.category === categoryFilter);
        }
        
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

    // ===== DATE FORMATTING FUNCTIONS =====
    
    function formatDateForDisplay(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/,/g, '');
    }

    function formatDateForCSV(dateString) {
        const date = new Date(dateString);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const day = String(date.getDate()).padStart(2, '0');
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `\t${day} ${month} ${year}`;
    }

    // ===== AMOUNT FORMATTING FUNCTIONS =====
    
    function formatAmountWithCommas(amount, currency = selectedCurrency) {
        const num = parseFloat(amount);
        if (isNaN(num)) return currency === 'JPY' ? '0' : '0.00';
        
        const decimals = currency === 'JPY' ? 0 : 2;
        const parts = num.toFixed(decimals).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }

    function formatAmountForCSV(amount) {
        return amount.toFixed(2);
    }

    function calculateReportTotals(expenses) {
        const totalUSD = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
        const totalInSelected = convertFromUSD(totalUSD, selectedCurrency);
        
        const categoryTotals = {};
        const categoryTotalsInSelected = {};
        expenses.forEach(exp => {
            const amtUSD = parseFloat(exp.amount) || 0;
            categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + amtUSD;
            categoryTotalsInSelected[exp.category] = (categoryTotalsInSelected[exp.category] || 0) + convertFromUSD(amtUSD, selectedCurrency);
        });
        
        return {
            total: totalUSD,
            totalInSelected: totalInSelected,
            totalFormatted: formatAmount(totalUSD),
            totalWithCommas: formatAmountWithCommas(totalInSelected, selectedCurrency),
            count: expenses.length,
            categoryTotals: categoryTotals,
            categoryTotalsInSelected: categoryTotalsInSelected,
            categoryTotalsFormatted: Object.fromEntries(
                Object.entries(categoryTotals).map(([cat, amt]) => [cat, formatAmount(amt)])
            )
        };
    }

    // ===== CSV EXPORT (PROTECTED AGAINST FORMULA INJECTION) =====

    function csvCell(value) {
        return `"${sanitizeForCSV(value)}"`;
    }

    function exportToCSV() {
        const expenses = getFilteredExpenses();
        
        if (expenses.length === 0) {
            showNotification('No expenses to export', 'error');
            return;
        }
        
        try {
            const totals = calculateReportTotals(expenses);

            const rows = [];

            rows.push([csvCell('EXPENSE REPORT'), ''].join(','));
            rows.push([csvCell('Generated on'), csvCell(formatDateForCSV(new Date().toISOString().split('T')[0]))].join(','));
            rows.push([csvCell('Currency'), csvCell(selectedCurrency)].join(','));
            rows.push([csvCell('Exchange Rate (1 USD)'), csvCell(getExchangeRate(selectedCurrency).toString())].join(','));
            rows.push([csvCell(`Total Expenses (${selectedCurrency})`), csvCell(totals.totalInSelected.toFixed(2))].join(','));
            rows.push([csvCell('Number of Transactions'), csvCell(totals.count)].join(','));
            rows.push('');

            rows.push(['Date', 'Category', 'Description', `Amount (${selectedCurrency})`].map(csvCell).join(','));

            expenses.forEach(exp => {
                const converted = convertFromUSD(exp.amount, selectedCurrency);
                rows.push([
                    csvCell(formatDateForCSV(exp.date)),
                    csvCell(exp.category),
                    csvCell(exp.description),
                    csvCell(converted.toFixed(2))
                ].join(','));
            });

            rows.push('');
            rows.push([csvCell('CATEGORY BREAKDOWN'), ''].join(','));
            rows.push(['Category', `Amount (${selectedCurrency})`].map(csvCell).join(','));
            Object.entries(totals.categoryTotalsInSelected).forEach(([category, amount]) => {
                rows.push([csvCell(category), csvCell(amount.toFixed(2))].join(','));
            });

            const csvContent = '\uFEFF' + rows.join('\r\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `expenses_${selectedCurrency}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showNotification(`Exported ${expenses.length} expenses to CSV (${selectedCurrency})`, 'success');
            
        } catch (error) {
            console.error('CSV Export Error:', error);
            showNotification('Failed to export CSV', 'error');
        }
    }

    // ===== PDF EXPORT =====

    function exportToPDF() {
        const expenses = getFilteredExpenses();
        
        if (expenses.length === 0) {
            showNotification('No expenses to export', 'error');
            return;
        }
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            const totals = calculateReportTotals(expenses);
            const pageWidth = doc.internal.pageSize.getWidth();
            
            doc.setFontSize(24);
            doc.setTextColor(0, 240, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('EXPENSE REPORT', 14, 20);
            
            doc.setFontSize(11);
            doc.setTextColor(80, 80, 80);
            doc.setFont('helvetica', 'normal');
            
            const today = new Date();
            const formattedDate = today.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            doc.text(`Generated on: ${formattedDate}`, 14, 30);
            doc.text(`Currency: ${selectedCurrency} (Exchange Rate: ${getExchangeRate(selectedCurrency)} per USD)`, 14, 37);
            doc.text(`Total Expenses: ${formatAmountWithCommas(totals.totalInSelected, selectedCurrency)} ${selectedCurrency}`, 14, 44);
            doc.text(`Number of Transactions: ${totals.count}`, 14, 51);
            
            const categoryFilter = document.getElementById('categoryFilter')?.value;
            const dateFilter = document.getElementById('dateFilter')?.value;
            
            let filterText = 'Filters: ';
            if (categoryFilter && categoryFilter !== 'all') filterText += `Category: ${categoryFilter} `;
            if (dateFilter && dateFilter !== 'all') filterText += `Period: ${dateFilter}`;
            if (filterText === 'Filters: ') filterText = 'Filters: All expenses';
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(filterText, 14, 60);
            
            const tableData = expenses.map(exp => [
                formatDateForDisplay(exp.date),
                exp.category,
                exp.description,
                formatAmountWithCommas(convertFromUSD(exp.amount, selectedCurrency), selectedCurrency)
            ]);
            
            doc.autoTable({
                startY: 65,
                head: [['Date', 'Category', 'Description', `Amount (${selectedCurrency})`]],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [13, 17, 26],
                    textColor: [0, 240, 255],
                    fontSize: 10,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 9,
                    textColor: [50, 50, 50]
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                columnStyles: {
                    0: { cellWidth: 30, halign: 'center' },
                    1: { cellWidth: 35, halign: 'left' },
                    2: { cellWidth: 'auto', halign: 'left' },
                    3: { cellWidth: 35, halign: 'right' }
                },
                margin: { left: 14, right: 14 }
            });
            
            const finalY = doc.lastAutoTable.finalY + 15;
            
            doc.setFontSize(14);
            doc.setTextColor(0, 240, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('Summary', 14, finalY);
            
            doc.setDrawColor(200, 200, 200);
            doc.setFillColor(250, 250, 250);
            doc.roundedRect(14, finalY + 5, pageWidth - 28, 20, 3, 3, 'FD');
            
            doc.setFontSize(10);
            doc.setTextColor(50, 50, 50);
            doc.setFont('helvetica', 'normal');
            doc.text(`Total Expenses (${selectedCurrency}): ${formatAmountWithCommas(totals.totalInSelected, selectedCurrency)}`, 20, finalY + 15);
            
            const categoryY = finalY + 35;
            
            doc.setFontSize(14);
            doc.setTextColor(0, 240, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('Category Breakdown', 14, categoryY);
            
            const categoryData = Object.entries(totals.categoryTotalsInSelected).map(([cat, amt]) => [
                cat,
                formatAmountWithCommas(amt, selectedCurrency)
            ]);
            
            doc.autoTable({
                startY: categoryY + 5,
                head: [['Category', 'Amount']],
                body: categoryData,
                theme: 'plain',
                headStyles: {
                    fillColor: [240, 240, 240],
                    textColor: [50, 50, 50],
                    fontSize: 10,
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    fontSize: 9
                },
                columnStyles: {
                    0: { cellWidth: 80, halign: 'left' },
                    1: { cellWidth: 50, halign: 'right' }
                },
                margin: { left: 14, right: 14 }
            });
            
            const footerY = doc.internal.pageSize.getHeight() - 15;
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
                `Report generated by Expense Tracker · All amounts in ${selectedCurrency}`,
                14,
                footerY
            );
            
            doc.save(`expense_report_${new Date().toISOString().split('T')[0]}.pdf`);
            
            showNotification(`Exported ${expenses.length} expenses to PDF`, 'success');
            
        } catch (error) {
            console.error('PDF Export Error:', error);
            showNotification('Failed to export PDF. Make sure jsPDF is loaded.', 'error');
        }
    }

    // ===== CHECK AUTHENTICATION & SESSION LIFECYCLE =====
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            
            // Start inactivity session timeout (auto signout after 20 minutes idle)
            initInactivitySessionTimeout(20, async () => {
                showNotification('Session expired due to inactivity. Signing out...', 'info');
                try {
                    await signOut(auth);
                } catch (e) {}
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace('index.html?timeout=1');
            });
            
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
                if (userNameSpan) userNameSpan.textContent = user.displayName || 'User';
                if (userEmailSpan) userEmailSpan.textContent = user.email;
            }
            
            await loadUserCurrency(user.uid);
            await loadUserBudget(user.uid);
            await calculateMonthlySpending();
            await loadExpenses(user.uid);

            const amountLabel = document.querySelector('label[for="amount"]');
            if (amountLabel) {
                amountLabel.textContent = `Transaction Amount (${currencySymbols[selectedCurrency] || '$'})`;
            }
            
            const today = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById('date');
            if (dateInput) dateInput.value = today;
            
        } else {
            currentUser = null;
            window.location.replace('index.html');
        }
    });

    // ===== CURRENCY CHANGE LISTENER =====
    if (currencySelect) {
        currencySelect.addEventListener('change', function() {
            const oldCurrency = selectedCurrency;
            const newCurrency = this.value;
            if (!newCurrency || newCurrency === oldCurrency) return;
            
            // 1. Immediately update active currency state & localStorage
            selectedCurrency = newCurrency;
            localStorage.setItem('preferredCurrency', newCurrency);
            
            // 2. Update currency symbol displays across the DOM
            const newSymbol = currencySymbols[newCurrency] || '$';
            if (currencySymbolEl) {
                currencySymbolEl.textContent = newSymbol;
            }
            
            const amountLabel = document.querySelector('label[for="amount"]');
            if (amountLabel) {
                amountLabel.textContent = `Transaction Amount (${newSymbol})`;
            }

            const editAmountLabel = document.querySelector('label[for="editAmount"]');
            if (editAmountLabel) {
                editAmountLabel.textContent = `Transaction Amount (${newSymbol})`;
            }
            
            // 3. Actively convert user inputs currently entered in forms
            // A) Budget input field:
            const budgetInput = document.getElementById('monthlyBudget');
            if (budgetInput) {
                const enteredVal = parseFloat(budgetInput.value);
                if (!isNaN(enteredVal) && enteredVal > 0) {
                    const converted = convertCurrency(enteredVal, oldCurrency, newCurrency);
                    budgetInput.value = newCurrency === 'JPY' ? Math.round(converted) : parseFloat(converted.toFixed(2));
                } else if (currentBudget > 0) {
                    const converted = convertFromUSD(currentBudget, newCurrency);
                    budgetInput.value = newCurrency === 'JPY' ? Math.round(converted) : parseFloat(converted.toFixed(2));
                }
            }
            
            // B) Add expense amount input field:
            const amountInput = document.getElementById('amount');
            if (amountInput) {
                const enteredVal = parseFloat(amountInput.value);
                if (!isNaN(enteredVal) && enteredVal > 0) {
                    const converted = convertCurrency(enteredVal, oldCurrency, newCurrency);
                    amountInput.value = newCurrency === 'JPY' ? Math.round(converted) : parseFloat(converted.toFixed(2));
                }
            }
            
            // C) Edit expense modal input field:
            const editAmountInput = document.getElementById('editAmount');
            if (editAmountInput) {
                const enteredVal = parseFloat(editAmountInput.value);
                if (!isNaN(enteredVal) && enteredVal > 0) {
                    const converted = convertCurrency(enteredVal, oldCurrency, newCurrency);
                    editAmountInput.value = newCurrency === 'JPY' ? Math.round(converted) : parseFloat(converted.toFixed(2));
                }
            }
            
            // 4. Update stats cards, budget summary, charts, and expenses ledger
            updateBudgetDisplay();
            updateStats(window.allExpenses || []);
            updateCharts(window.allExpenses || []);
            renderExpensesTable(window.allExpenses || []);
            
            // 5. Show toast notification demonstrating concrete conversion
            const sampleUSD = 100;
            const sampleConverted = convertCurrency(sampleUSD, 'USD', newCurrency);
            const sampleStr = formatAmountRaw(sampleConverted, newCurrency);
            showNotification(`Currency converted to ${newCurrency} ($100 USD = ${sampleStr})`, 'success');
            
            // 6. Asynchronously save preference to Firestore if logged in
            if (currentUser) {
                saveUserCurrency(currentUser.uid, newCurrency).catch(err => {
                    console.warn("Could not save currency preference to cloud:", err);
                });
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

    // Allowed expense categories matching server-side validation
    const ALLOWED_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Education', 'Other'];

    // ===== ADD EXPENSE FORM SUBMISSION =====
    if (expenseForm) {
        expenseForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            if (!currentUser) {
                showNotification('Please log in first', 'error');
                return;
            }
            
            const rawAmount = document.getElementById('amount').value;
            const enteredAmount = parseFloat(rawAmount);
            const category = document.getElementById('category').value;
            const description = sanitizeString(document.getElementById('description').value, 500);
            const date = document.getElementById('date').value;
            
            if (isNaN(enteredAmount) || enteredAmount <= 0) {
                showNotification('Please enter a valid positive amount', 'error');
                return;
            }

            // Convert entered amount in selected currency to base USD for storage
            const baseAmountUSD = convertToUSD(enteredAmount, selectedCurrency);
            
            if (baseAmountUSD > 10000000) {
                showNotification('Amount exceeds maximum transaction threshold', 'error');
                return;
            }
            
            if (!category || !ALLOWED_CATEGORIES.includes(category)) {
                showNotification('Please select a valid category from the list', 'error');
                return;
            }
            
            if (!description || description.length < 1 || description.length > 500) {
                showNotification('Please enter a description (1-500 characters)', 'error');
                return;
            }
            
            if (!date || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) {
                showNotification('Please select a valid date (YYYY-MM-DD)', 'error');
                return;
            }
            
            const submitBtn = document.getElementById('submitExpenseBtn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
            submitBtn.disabled = true;
            
            try {
                const expenseData = {
                    amount: parseFloat(baseAmountUSD.toFixed(2)),
                    category: category,
                    description: description,
                    date: date,
                    createdAt: new Date().toISOString(),
                    userId: currentUser.uid
                };
                
                const expensesRef = collection(db, "users", currentUser.uid, "expenses");
                await addDoc(expensesRef, expenseData);
                
                expenseForm.reset();
                
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('date').value = today;
                
                showNotification(`Expense added successfully! (${formatAmount(baseAmountUSD)})`, 'success');
                await loadExpenses(currentUser.uid);
                
            } catch (error) {
                showNotification('Failed to add expense. Please check your inputs.', 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // ===== RENDER EXPENSES TABLE (SYNCHRONOUS & SAFE) =====
    function renderExpensesTable(expenses) {
        if (!expensesContainer) return;
        
        if (!expenses || expenses.length === 0) {
            expensesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>No expenses yet. Add your first expense!</p>
                </div>
            `;
            return;
        }
        
        let html = '<table class="expenses-table">';
        html += '<thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Actions</th></tr></thead>';
        html += '<tbody>';
        
        expenses.forEach((expense) => {
            const safeId = escapeHtml(expense.id);
            const safeCategory = escapeHtml(expense.category);
            const safeDesc = escapeHtml(expense.description);
            const categoryClass = escapeHtml(String(expense.category || '').toLowerCase().replace(/[^a-z0-9\-]/g, '-'));
            const formattedDate = escapeHtml(formatDate(expense.date));
            const formattedAmount = escapeHtml(formatAmount(expense.amount));
            
            html += `
                <tr id="expense-${safeId}">
                    <td>${formattedDate}</td>
                    <td><span class="category-badge category-${categoryClass}">${safeCategory}</span></td>
                    <td>${safeDesc}</td>
                    <td class="amount-positive">${formattedAmount}</td>
                    <td>
                        <button type="button" data-action="edit" data-id="${safeId}" class="action-btn edit-btn" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" data-action="delete" data-id="${safeId}" class="action-btn delete-btn" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        expensesContainer.innerHTML = html;
        
        // Attach event delegation listener once to prevent duplicate handlers
        if (!expensesContainer._hasSecDelegation) {
            expensesContainer._hasSecDelegation = true;
            expensesContainer.addEventListener('click', function(e) {
                const btn = e.target.closest('button[data-action]');
                if (!btn) return;
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                if (action === 'edit') editExpense(id);
                if (action === 'delete') deleteExpense(id);
            });
        }
    }

    // ===== LOAD EXPENSES FUNCTION (HARDENED AGAINST STORED XSS) =====
    async function loadExpenses(userId) {
        if (!expensesContainer) return;
        
        try {
            expensesContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading expenses...</div>';
            
            const expensesRef = collection(db, "users", userId, "expenses");
            const q = query(expensesRef, orderBy("date", "desc"));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                window.allExpenses = [];
                renderExpensesTable([]);
                updateStats([]);
                updateCharts([]);
                await calculateMonthlySpending();
                updateBudgetDisplay();
                return;
            }
            
            let expenses = [];
            querySnapshot.forEach((doc) => {
                expenses.push({ id: doc.id, ...doc.data() });
            });
            
            window.allExpenses = expenses;
            renderExpensesTable(expenses);
            updateStats(expenses);
            updateCharts(expenses);
            await calculateMonthlySpending();
            updateBudgetDisplay();
            
        } catch (error) {
            expensesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading expenses.</p>
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
            const convertedAmount = convertFromUSD(expense.amount, selectedCurrency);
            document.getElementById('editAmount').value = selectedCurrency === 'JPY' ? Math.round(convertedAmount) : parseFloat(convertedAmount.toFixed(2));
            document.getElementById('editCategory').value = expense.category;
            document.getElementById('editDescription').value = expense.description;
            document.getElementById('editDate').value = expense.date;
            
            const amountLabel = document.querySelector('label[for="editAmount"]');
            if (amountLabel) {
                amountLabel.textContent = `Transaction Amount (${currencySymbols[selectedCurrency] || '$'})`;
            }
            
            editModal.style.display = 'flex';
            
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

        const amount = parseFloat(updatedData.amount);
        const category = updatedData.category;
        const description = sanitizeString(updatedData.description, 500);
        const date = updatedData.date;

        if (isNaN(amount) || amount <= 0 || amount > 10000000) {
            showNotification('Please enter a valid amount between 0.01 and 10,000,000', 'error');
            return;
        }

        if (!category || !ALLOWED_CATEGORIES.includes(category)) {
            showNotification('Please select a valid category from the list', 'error');
            return;
        }

        if (!description || description.length < 1 || description.length > 500) {
            showNotification('Description must be between 1 and 500 characters', 'error');
            return;
        }

        if (!date || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) {
            showNotification('Invalid date format', 'error');
            return;
        }
        
        try {
            const updateBtn = document.getElementById('updateExpenseBtn');
            const originalText = updateBtn.innerHTML;
            updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            updateBtn.disabled = true;
            
            const expenseRef = doc(db, "users", currentUser.uid, "expenses", expenseId);
            
            await updateDoc(expenseRef, {
                amount: amount,
                category: category,
                description: description,
                date: date,
                updatedAt: new Date().toISOString()
            });
            
            closeEditModal();
            showNotification(`Expense updated successfully! (${formatAmount(amount)})`, 'success');
            await loadExpenses(currentUser.uid);
            
        } catch (error) {
            showNotification('Failed to update expense. Please check your inputs.', 'error');
        } finally {
            const updateBtn = document.getElementById('updateExpenseBtn');
            if (updateBtn) {
                updateBtn.innerHTML = '<i class="fas fa-save"></i> Update Expense';
                updateBtn.disabled = false;
            }
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
            const enteredAmount = parseFloat(document.getElementById('editAmount').value);
            
            if (isNaN(enteredAmount) || enteredAmount <= 0) {
                showNotification('Please enter a valid amount', 'error');
                return;
            }

            // Convert entered amount in selected currency to base USD for storage
            const baseAmountUSD = convertToUSD(enteredAmount, selectedCurrency);
            
            const updatedData = {
                amount: parseFloat(baseAmountUSD.toFixed(2)),
                category: document.getElementById('editCategory').value,
                description: document.getElementById('editDescription').value.trim(),
                date: document.getElementById('editDate').value
            };
            
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
            const enteredBudget = parseFloat(budgetInput.value);
            
            if (isNaN(enteredBudget) || enteredBudget < 0) {
                showNotification('Please enter a valid budget amount', 'error');
                return;
            }
            
            // Convert entered budget in selected currency back to base USD for storage
            const baseBudgetUSD = convertToUSD(enteredBudget, selectedCurrency);
            await saveUserBudget(baseBudgetUSD);
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
        const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
        notification.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <span>${escapeHtml(message)}</span>
        `;
        
        notification.style.position = 'fixed';
        notification.style.top = '24px';
        notification.style.right = '24px';
        notification.style.padding = '14px 22px';
        notification.style.borderRadius = '10px';
        notification.style.background = type === 'success' ? 'rgba(10, 28, 22, 0.95)' : 'rgba(32, 10, 18, 0.95)';
        notification.style.border = type === 'success' ? '1px solid #00FF9D' : '1px solid #FF2A5F';
        notification.style.color = type === 'success' ? '#00FF9D' : '#FF2A5F';
        notification.style.fontFamily = "'JetBrains Mono', monospace";
        notification.style.fontSize = '12.5px';
        notification.style.fontWeight = '600';
        notification.style.letterSpacing = '0.04em';
        notification.style.zIndex = '9999';
        notification.style.boxShadow = type === 'success' ? '0 0 24px rgba(0, 255, 157, 0.35)' : '0 0 24px rgba(255, 42, 95, 0.35)';
        notification.style.backdropFilter = 'blur(16px)';
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

    // ===== FIXED LOGOUT =====
    // ===== FIXED LOGOUT =====
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                console.log("🚪 Logging out...");
                
                logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
                logoutBtn.disabled = true;
                
                await signOut(auth);
                
                console.log("✅ Logout successful");
                
                // Clear ALL storage
                localStorage.clear();
                sessionStorage.clear();
                
                // Reset state
                selectedCurrency = 'USD';
                currentBudget = 0;
                currentMonthSpent = 0;
                
                // Redirect to login page
                window.location.replace('./index.html'); // This now goes to the actual login page
                
            } catch (error) {
                console.error("Logout error:", error);
                
                logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                logoutBtn.disabled = false;
                
                showNotification('Failed to logout. Please try again.', 'error');
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