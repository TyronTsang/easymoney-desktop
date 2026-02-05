# EasyMoneyLoans Staff Portal - Product Requirements Document

## Original Problem Statement
Build an internal, offline-first Windows desktop application (.EXE) named "EasyMoneyLoans Staff Portal" for employees to capture sensitive customer information like South African ID numbers. Must function without internet connection and store data locally in an encrypted SQLite database.

## Architecture
- **Web Preview**: React frontend (port 3000) + FastAPI backend (port 8001) + MongoDB
- **Desktop Target**: Electron + React + SQLite (via better-sqlite3)
- **Dual-mode Frontend**: AuthContext.js has Electron IPC proxy - pages work unchanged in both modes

## What's Been Implemented
- [x] Master password unlock system
- [x] User authentication (JWT for web, local auth for Electron)
- [x] Role-based access control (employee, manager, admin)
- [x] Customer CRUD with SA ID validation (Luhn algorithm)
- [x] Loan CRUD with auto-calculated interest (40%) + R12 service fee
- [x] Payment tracking with immutability (can't unmark paid payments)
- [x] Fraud detection (quick-close, duplicate customer alerts)
- [x] Immutable audit trail with hash chain integrity
- [x] Smart Export to Excel with date filtering
- [x] Admin Panel (Users, Settings, Backup, Updates, AD Config, Security)
- [x] SA ID character counter (13 digits)
- [x] Optional cell phone field for customers
- [x] "Interest (40%)" hidden from UI (shows "Fees & Charges")
- [x] Today's loans restriction for employees
- [x] Auto-update system via GitHub Releases
- [x] Electron IPC handlers for ALL database operations
- [x] SQLite database.js with full CRUD operations
- [x] Build configuration for Windows .EXE

## Electron Code Status (Dec 2024)
- `electron/main.js` - COMPLETE: All IPC handlers restored and connected to database.js
- `electron/database.js` - COMPLETE: Full SQLite implementation
- `electron/preload.js` - COMPLETE: All IPC channels defined
- `electron/package.json` - COMPLETE: better-sqlite3, exceljs, electron-rebuild included
- `electron/updater.js` - COMPLETE: GitHub Releases auto-update
- `frontend/src/context/AuthContext.js` - COMPLETE: Dual-mode API proxy (axios for web, IPC for Electron)

## Pending / User Action Required
1. User must install Visual Studio Build Tools (C++ workload) on their Windows machine
2. User builds the .EXE following electron/build-instructions.md
3. Test offline functionality on Windows

## P1 - Future Tasks
- [ ] SQLite database encryption with master password
- [ ] Branch-specific reporting dashboards
- [ ] Code signing for .EXE distribution
- [ ] Windows native file dialogs for export/backup folder selection

## P2 - Nice to Have
- [ ] Data migration tool (MongoDB → SQLite)
- [ ] Multi-branch sync capability
- [ ] PDF report generation
