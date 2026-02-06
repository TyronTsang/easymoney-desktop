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
- [x] Customer CRUD with SA ID validation (Luhn algorithm)
- [x] Loan CRUD with auto-calculated interest (40%) + R12 service fee
- [x] Payment tracking with smart locking:
  - Monthly (1 payment): locks immediately after marked paid
  - Weekly/Fortnightly (2-4 payments): locks only after ALL payments completed
  - Payments can be unmarked in multi-payment plans before full completion
- [x] Customer grouping in Loan Register (duplicate customers show once with expandable loans)
- [x] Fraud detection (quick-close, duplicate customer alerts)
- [x] Immutable audit trail with hash chain integrity
- [x] Smart Export to Excel with date filtering (Electron: native folder dialog)
- [x] Admin Panel (Users, Settings, Backup, Updates, AD Config, Security)
- [x] SA ID character counter (13 digits)
- [x] Optional cell phone field for customers
- [x] "Interest (40%)" hidden from UI (shows "Fees & Charges")
- [x] Today's loans restriction for employees
- [x] Auto-update system via GitHub Releases
- [x] All Electron IPC handlers connected to SQLite database.js
- [x] HashRouter for Electron file:// compatibility
- [x] Removed "Made with Emergent" branding, tracking scripts, "Back to website" links
- [x] Build config: asar disabled, portable .EXE target, icon support

## Key Files
- `electron/main.js` - Main process with all IPC handlers + database init
- `electron/database.js` - Full SQLite CRUD (900+ lines)
- `electron/preload.js` - IPC channels including unmarkPaymentPaid
- `electron/package.json` - Build config (asar: false, portable target)
- `frontend/src/context/AuthContext.js` - Dual-mode API proxy
- `frontend/src/pages/LoanList.js` - Customer grouping + smart payment locking
- `frontend/src/pages/Export.js` - Electron-aware export with folder dialog
- `backend/server.py` - Web API including /payments/unmark-paid

## Build Instructions
See `electron/build-instructions.md`

## Pending / Future
- [ ] SQLite database encryption with master password
- [ ] App icon (user has icon.ico, needs correct placement)
- [ ] Branch-specific reporting dashboards
- [ ] Code signing for .EXE distribution
- [ ] NSIS installer build target (for faster launches vs portable)
