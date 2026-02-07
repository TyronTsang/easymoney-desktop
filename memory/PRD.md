# EasyMoneyLoans - Product Requirements Document

## Original Problem Statement
Build an offline Windows desktop application named "EasyMoneyLoans" using Electron and SQLite for managing small loans. The app must function fully offline with local data storage.

## Architecture
- **Frontend**: React.js (web preview mode via FastAPI, desktop mode via Electron IPC)
- **Backend**: FastAPI (web testing) + Electron main process (desktop)
- **Database**: SQLite (via better-sqlite3) for offline desktop, MongoDB for web preview
- **Build**: electron-builder -> portable .EXE for Windows

## Key Files
- `electron/main.js` - Electron main process, IPC handlers, auto-updater
- `electron/database.js` - SQLite database class with all business logic
- `electron/preload.js` - IPC channel exposure to frontend
- `electron/updater.js` - Custom GitHub release updater
- `electron/package.json` - Electron deps + electron-builder config
- `frontend/src/context/AuthContext.js` - Auth + API proxy (web vs Electron)
- `frontend/src/pages/LoanList.js` - Main loan management UI with admin controls
- `frontend/src/pages/Export.js` - Data export with date filtering
- `backend/server.py` - FastAPI backend for web preview

## Database Schema
- **customers**: id, client_name, id_number (13-digit SA ID), mandate_id, cell_phone, sassa_end_date
- **loans**: id, customer_id, principal_amount, interest_rate (40%), service_fee (R12), total_repayable, repayment_plan_code (1=monthly, 2=fortnightly, 4=weekly), outstanding_balance, status (open/paid)
- **payments**: id, loan_id, installment_number, amount_due, due_date, is_paid, paid_at, paid_by
- **users**: id, username, password_hash, full_name, role (employee/manager/admin), branch
- **settings**: key-value store (master_password_hash, etc.)
- **audit_logs**: immutable hash-chained audit trail

## What's Been Implemented (as of 2025-02-07)

### Core Features
- Master password unlock + user authentication (admin/employee/manager)
- Full loan lifecycle: create -> payments -> paid
- Customer management with SA ID validation (Luhn algorithm)
- Payment tracking: monthly (1x), fortnightly (2x), weekly (4x)
- Payment locking: monthly locked immediately, weekly/fortnightly locked only when ALL paid
- Dashboard with statistics and fraud detection
- Audit log system with hash-chain integrity verification
- Data export to Excel with date filtering (today/7 days/30 days/custom/all)

### Admin Controls
- Edit customer details (name, ID number, phone, mandate)
- Delete entire loans
- Edit payment amounts
- Unmark payments as paid (multi-payment plans only, before all paid)
- **Loan Top-Up**: Increase principal amount on open loans (recalculates interest/total/installments)

### Bug Fixes Applied (Session 2025-02-07)
- Fixed "existing customer" loan creation: auto-detects customer by ID number instead of throwing error
- Fixed Electron export: now passes date range to export function (was ignoring date selection)
- Fixed Excel export detail: comprehensive columns (loan amounts, interest, phone, installments, etc.)
- Added `publish` provider to electron-builder config for auto-updater

## Credentials
- Master Password: TestMaster123!
- Admin: admin / admin123

## Pending / Upcoming Tasks

### P0 - Auto-Updater
- Config fix applied (publish provider added), user needs to rebuild and test on their Windows machine

### P1 - LAN Sync
- Sync SQLite data between computers on same local network
- One computer acts as "primary", others sync with it

### Backlog
- Refactor LoanList.js into smaller components (currently large but functional)
