# 💰 Expense Tracker — Full Stack Web Application

[![Live Demo](https://img.shields.io/badge/Demo-Live%20Application-brightgreen?style=for-the-badge&logo=firebase)](https://expense-tracker-app-fb8cc.web.app/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore%20%7C%20Hosting-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![JavaScript](https://img.shields.io/badge/ES6+-JavaScript-yellow?style=for-the-badge&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Chart.js](https://img.shields.io/badge/Chart.js-Analytics-FF6384?style=for-the-badge&logo=chartdotjs)](https://www.chartjs.org/)

A modern, responsive Full Stack Expense Tracking Web Application built with **HTML5, CSS3, vanilla JavaScript (ES6 Modules)**, and backed by **Firebase Authentication, Cloud Firestore, and Firebase Hosting**.

The application empowers users to monitor personal finances, analyze monthly spending patterns with interactive visual charts, set custom monthly budgets with alert thresholds, export data to CSV and PDF, and customize their interface with multi-currency and dark/light mode support.

---

## 🌐 Live Demo

🔗 **Live Application URL:** [https://expense-tracker-app-fb8cc.web.app/](https://expense-tracker-app-fb8cc.web.app/)

---

## ✨ Key Features

### 🔐 Authentication & Account Management
- **User Registration & Login:** Secure authentication powered by Firebase Auth (Email/Password).
- **Password Reset:** Dedicated forgot-password recovery workflow sending reset emails via Firebase.
- **Session Persistence:** Remembers user session with customizable "Remember me" option.
- **User Data Isolation:** Every user's data is stored securely in Firestore scoped strictly under their unique User ID (`UID`).
- **Legal & Privacy Protection:** Terms & Conditions and Privacy Policy modals built directly into the onboarding flow.

### 💳 Complete Expense Management (CRUD)
- **Add Expenses:** Log amount, category (Food, Rent, Shopping, Utilities, Entertainment, etc.), description, and date.
- **View & Filter:** Real-time table display with date and category filtering.
- **Edit Records:** Intuitive modal-based editing for updating existing transactions in real time.
- **Delete Records:** Remove redundant or mistaken expense entries with instant Firestore synchronization.

### 📊 Financial Analytics & Visualizations
- **Category Spending Distribution:** Interactive donut/pie chart showcasing expenses per category via Chart.js.
- **Monthly Expenditure Trends:** Dynamic bar chart featuring gradient styling and monthly spending aggregates.
- **Instant UI Updates:** All charts automatically refresh upon adding, editing, or deleting an expense.

### 🎯 Monthly Budget System
- **Budget Goal Setting:** Set and update custom monthly spending limits saved directly to Firestore.
- **Live Utilization Tracking:** Visual progress bar tracking current month's expenditure against budget.
- **Smart Warning Indicators:**
  - 🟢 **Normal:** Spending within comfortable range.
  - 🟡 **Warning (80%+):** Caution prompt as spending approaches threshold.
  - 🔴 **Exceeded (100%+):** Critical alert warning user of budget overrun.

### 💱 Multi-Currency Support
- Switch between major global currencies:
  - **USD ($)**, **INR (₹)**, **EUR (€)**, **GBP (£)**, **JPY (¥)**, **CAD ($)**, **AUD ($)**
- User's currency preference is saved to Firestore and persists across sessions and devices.
- Dynamic formatting with proper localization and thousand separators.

### 📥 Data Export (CSV & PDF)
- **CSV Export:** Clean format with UTF-8 BOM encoding for seamless Excel import and date-safe formatting.
- **PDF Export:** Polished, branded report created using `jsPDF` and `jspdf-autotable`, including metadata, expense table, and category breakdown.

### 🌓 Dark / Light Mode Theme
- High-contrast, accessibility-tested themes (Dark and Light modes).
- Theme preferences saved to `localStorage` for instant application on return visits.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend UI** | HTML5, CSS3 (CSS Variables, Flexbox, Grid), Font Awesome 6, Google Fonts |
| **Logic & Scripting** | Vanilla JavaScript (ES6 Modules, Async/Await) |
| **Backend & Database** | Firebase Authentication, Cloud Firestore Database |
| **Data Visualizations** | Chart.js 4.x |
| **Export Engines** | jsPDF, jsPDF-AutoTable |
| **Hosting & Deployment**| Firebase Hosting |

---

## 📁 Project Architecture & File Structure

```
expense-tracker-fullstack/
├── css/
│   ├── dashboard.css       # Core dashboard layout, widgets, themes & animations
│   └── style.css           # Auth pages styles (Login, Signup, Forgot Password)
├── js/
│   ├── app.js              # Login flow, validations & UI notifications
│   ├── auth-errors.js      # Centralized Firebase authentication error mapper
│   ├── dashboard.js        # Main dashboard logic: Firestore CRUD, Charts, Budget, Exports
│   ├── firebase-config.js  # Firebase SDK initialization & exported services
│   ├── forgot-password.js  # Password reset logic & email triggers
│   └── signup.js           # Signup validation, strength checker & modal interactions
├── .firebaserc             # Firebase project configuration
├── .gitignore              # Git ignore rules for dependencies and build artifacts
├── .vercelignore           # Vercel deployment exclusions
├── 404.html                # Custom 404 page for Firebase hosting
├── dashboard.html          # Main application dashboard
├── firebase.json           # Firebase Hosting rewrites and rules
├── forgot-password.html    # Password reset view
├── index.html              # Landing and login page
├── package.json            # Project dependencies manifest
├── signup.html             # User registration page
└── README.md               # Project documentation
```

---

## 🚀 Local Development Setup

To run this project locally on your machine:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/PratyushRaj03/expense-tracker-fullstack.git
   cd expense-tracker-fullstack
   ```

2. **Serve the project:**
   Because the project uses ES6 Modules (`type="module"`), it must be served via a local HTTP server:
   - **Using VS Code Live Server:** Right click `index.html` and select **"Open with Live Server"**.
   - **Using Python:**
     ```bash
     python -m http.server 8000
     ```
   - **Using Node `serve`:**
     ```bash
     npx serve .
     ```

3. **Open in browser:**
   Navigate to `http://localhost:8000` (or the URL provided by your local server).

---

## 🔒 Security & Data Privacy

- **User Isolation:** All expense documents are stored under `/users/{userId}/expenses/{expenseId}`.
- **Firestore Security Rules:** Ensure each authenticated user can read, create, update, and delete only their own records.
- **Credentials:** No sensitive credentials or secrets are committed. Firebase Web API keys are scoped for client authentication and protected by Firebase Security Rules.

---

## 👤 Author

**Pratyush Raj Srivastava**  
- GitHub: [@PratyushRaj03](https://github.com/PratyushRaj03)
- Live App: [expense-tracker-app-fb8cc.web.app](https://expense-tracker-app-fb8cc.web.app/)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
