# EasyMoneyLoans Staff Portal - Product Requirements Document

## Original Problem Statement
Build an internal, offline-first Windows desktop application (.EXE) named "EasyMoneyLoans Staff Portal" for employees to capture sensitive customer information like South African ID numbers. Must function without internet connection and store data locally in an encrypted SQLite database.

## Architecture
- **Desktop**: Electron + React + SQLite (via better-sqlite3) — fully offline
- **Web Preview**: React frontend (port 3000) + FastAPI backend (port 8001) + MongoDB
- **Dual-mode Frontend**: AuthContext.js has Electron IPC proxy — pages work unchanged in both modes

## What's Been Implemented
- [x] Master password unlock system
- [x] User authentication (JWT for web, local auth for Electron)
- [x] Role-based access control (employee, manager, admin)
- [x] Customer creation during loan registration (no separate Customers tab)
- [x] Loan CRUD with auto-calculated interest (40%) + R12 service fee
- [x] Open loan blocking: customers with open loans can't get new ones; fully paid customers CAN
- [x] Payment tracking with smart locking:
  - Monthly (1 payment): locks immediately after marked paid
  - Weekly/Fortnightly (2-4 payments): locks only after ALL payments completed
  - Payments can be unmarked in multi-payment plans before full completion
- [x] Admin powers: edit/delete payments, edit loans/customers (all audit-logged)
- [x] Customer grouping in Loan Register (duplicate customers show once with expandable loans)
- [x] Phone number displayed in Loan Register table
- [x] Today's loans only for ALL users (full 13-digit SA ID search for older loans)
- [x] Fraud detection (quick-close, duplicate customer alerts)
- [x] Immutable audit trail with hash chain integrity
- [x] Smart Export to Excel with date filtering
- [x] Admin Panel (Users, Settings, Backup, Updates)
- [x] SA ID character counter (13 digits)
- [x] Optional cell phone field for customers
- [x] "Interest (40%)" hidden from UI
- [x] Auto-update system via GitHub Releases
- [x] All Electron IPC handlers connected
- [x] HashRouter for Electron file:// compatibility
- [x] Removed Emergent branding
- [x] Build config: asar disabled, portable .EXE target

## Key Files
- `electron/main.js` - Main process with all IPC handlers including admin ops
- `electron/database.js` - Full SQLite CRUD with admin edit/delete, open loan check
- `electron/preload.js` - IPC channels including admin operations
- `frontend/src/context/AuthContext.js` - Dual-mode API proxy with admin routes
- `frontend/src/pages/LoanList.js` - Customer grouping, phone column, admin edit/delete, smart payment locking
- `frontend/src/pages/Dashboard.js` - Quick actions (no New Loan button)
- `backend/server.py` - Web API with admin endpoints

## Removed Features
- Customers tab (customer creation is inside Loan Register)
- CreateLoan separate page (loan creation is inside Loan Register dialog)
- New Loan button from Dashboard
- "Back to website" links and Emergent branding

## Pending / Future
- [ ] SQLite database encryption with master password
- [ ] App icon configuration
- [ ] Branch-specific reporting dashboards
- [ ] Code signing for .EXE distribution
- [ ] NSIS installer build target
