# 📅 Day 04 - Expense Management (CRUD Operations)

## 💻 Expense Tracker Project Progress

Today I expanded the functionality of the Expense Tracker Web Application by implementing full **expense management features** using Firebase Firestore.

---

## 🗄️ Firestore Database Operations

Implemented complete CRUD operations for managing user expenses.

### Create
- Added functionality to store expenses in Firestore
- Each expense is stored under the authenticated user's UID
- Captured details such as amount, category, description and date

---

### Read
- Fetched user-specific expenses from Firestore
- Displayed expenses dynamically on the dashboard
- Ensured each user only sees their own expense data

---

### Update
- Implemented edit expense functionality
- Allowed users to update expense details
- Updated data directly in Firestore

---

### Delete
- Implemented delete expense feature
- Allowed users to remove unwanted expense records
- Removed documents from Firestore database

---

## ⚙️ Additional Improvements

- Improved dashboard interaction with expense data
- Structured Firestore queries for better data handling
- Ensured UI updates reflect database changes

---

### 📊 Analytics Dashboard

- Integrated **Chart.js** for financial analytics
- Implemented **Category Spending Pie Chart**
- Implemented **Monthly Spending Bar Chart**
- Charts dynamically update when expenses change
- Added empty state handling for charts

---

### 💱 Currency Management

- Added **currency selector** to dashboard
- Supported currencies: USD, INR, EUR, GBP, JPY, CAD, AUD
- Stored user currency preference in **Firestore**
- Amounts automatically display with selected currency symbol
- Currency preference persists across sessions

---

### 🎯 Monthly Budget System

- Implemented **monthly budget feature**
- Users can set and update a monthly budget
- Budget stored in Firestore user document
- Calculated **current month spending**
- Implemented **budget usage progress bar**
- Warning system:
  - Yellow warning at **80% usage**
  - Red warning at **100% usage**
  - Budget exceeded warning above **110%**

---

### 🔄 Real-Time Dashboard Updates

- Dashboard stats update automatically
- Charts refresh dynamically after expense changes
- Budget calculations update instantly when expenses are added, edited, or deleted

## 📚 Key Learnings

- Firestore document and collection structure
- Managing user-specific data using UID
- Implementing CRUD operations in a cloud database
- Updating frontend UI based on database changes

---

