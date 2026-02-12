# EasyMoneyLoans - Product Requirements Document

## Original Problem Statement
Build an offline Windows desktop application named "EasyMoneyLoans" using Electron and SQLite for managing small loans. The app must function fully offline with local data storage.

## Architecture
- **Frontend**: React.js (web preview mode via FastAPI, desktop mode via Electron IPC)
- **Backend**: FastAPI (web testing) + Electron main process (desktop)
- **Database**: SQLite (via better-sqlite3) for offline desktop, MongoDB for web preview
- **Build**: electron-builder -> portable .EXE for Windows

## What's Been Implemented

### Core Features
- Master password unlock + user authentication (admin/employee/manager)
- Full loan lifecycle: create -> payments -> paid
- Customer management with SA ID validation (Luhn algorithm)
- Payment tracking: monthly (1x), fortnightly (2x), weekly (4x)
- Dashboard with statistics and fraud detection
- Audit log system with hash-chain integrity verification

### Admin Controls
- Edit customer details (name, ID number, phone, mandate)
- Delete entire loans
- Edit payment amounts
- Unmark payments as paid
- Loan Top-Up: increase principal on open loans
- Change own password (Settings tab)
- Reset any user's password (Users tab)

### Export & Backup
- Excel export with date filtering (today/7 days/30 days/custom/all)
- Comprehensive export: all loan data, amounts, interest, phone, status, plan
- Database backup to JSON (works in Electron via folder dialog)

### Auto-Updater
- Reads version from package.json (not hardcoded)
- Checks GitHub releases for .exe assets
- Handles private repos, drafts, missing assets with clear error messages
- publish provider configured for GitHub

## Session 2025-02-12 Changes
- Fixed auto-updater: repo was private (root cause), added publish provider, version reads from package.json
- Implemented database backup for Electron (IPC handler + folder dialog)
- Added password change feature (own password + admin reset)
- Added bcryptjs dependency for Electron password hashing
- Added repository field to electron/package.json
- Bumped version to 1.0.2

## Credentials
- Master Password: TestMaster123!
- Admin: admin / admin123

## Pending Tasks
- **P1**: LAN Sync feature
- **Backlog**: Refactor LoanList.js into smaller components
