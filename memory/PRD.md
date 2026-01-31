# EasyMoneyLoans Desktop Application - PRD

## Original Problem Statement
Build an INTERNAL Windows DESKTOP application for EasyMoneyLoans Staff Portal with:
- Role-based permissions (Employee/Manager/Admin)
- Immutable audit trail with hash chain verification
- Field locking after loan creation
- Payment immutability
- Fraud detection indicators (quick-close, duplicate customers)
- SA ID validation (Luhn algorithm) and masking
- Excel exports to Dropbox-synced folder
- Soft archiving (Admin only)

## User Choices
- Framework: Electron (React + Node.js) for Windows EXE packaging
- Authentication: Local username/password + optional Windows AD
- Encryption: Master password at app startup
- Export path: Admin-configurable
- Multi-branch support: Branch name in exports
- UI Theme: Dark with red accents and company logo

## User Personas
1. **Employee**: Creates loans, marks payments, cannot see full IDs or export
2. **Manager**: Creates loans, marks payments, can export and see full IDs
3. **Admin**: Full access including user management, AD config, archiving, settings

## Core Requirements (Static)
- Master password encryption for app unlock
- JWT-based authentication with 8-hour token expiration
- Role-based access control (RBAC)
- SA ID validation with Luhn checksum
- Loan calculation: 40% interest + R12 service fee
- Payment plans: Monthly (1), Fortnightly (2), Weekly (4)
- Immutable audit logs with SHA-256 hash chain
- Payment immutability (cannot unmark paid payments)
- Fraud detection: Quick-close (same-day paid), Duplicate customers

## What's Been Implemented (Jan 31, 2026)

### Backend (FastAPI + MongoDB)
- ✅ Master password setup and verification endpoints
- ✅ User authentication with JWT tokens
- ✅ User management (create, toggle active) - Admin only
- ✅ Customer CRUD with SA ID validation (Luhn algorithm)
- ✅ Loan creation with automatic calculation
- ✅ Payment schedule generation
- ✅ Payment marking with immutability enforcement
- ✅ Fraud detection (quick-close, duplicate customers)
- ✅ Excel export with proper ID formatting (text, not scientific notation)
- ✅ Immutable audit logs with hash chain integrity verification
- ✅ Role-based ID masking (Employee sees masked, Manager/Admin sees full)
- ✅ Field locking after loan creation
- ✅ Field override for Manager/Admin with reason logging
- ✅ Soft archiving (Admin only)
- ✅ Dashboard statistics endpoint
- ✅ Windows Active Directory authentication (LDAP/NTLM)
- ✅ AD configuration endpoints (GET/PUT/TEST)
- ✅ Auto-create users from AD with default role/branch
- ✅ Database backup to JSON with timestamps
- ✅ Backup configuration and status endpoints
- ✅ Restore from backup (customers, loans, payments)

### Frontend (React + Tailwind + Shadcn/UI)
- ✅ Master password unlock screen (first-time setup + unlock)
- ✅ Staff login screen
- ✅ Dashboard with stats cards and fraud alerts
- ✅ Customer management (list, create with validation)
- ✅ Loan creation wizard (3-step flow)
- ✅ Loan list with fraud indicators
- ✅ Loan details with payment schedule
- ✅ Payment marking with confirmation dialog
- ✅ Fraud alerts page (quick-close, duplicates tabs)
- ✅ Export page (all/customers/loans/payments)
- ✅ Admin panel with 5 tabs (Users, Settings, Backup, AD, Security)
- ✅ Active Directory configuration tab with test connection
- ✅ Database backup tab with create backup button
- ✅ Last backup info display (date, filename, size, records)
- ✅ Audit logs viewer with detail modal
- ✅ Dark theme with red accents and company logo
- ✅ Role-based navigation and access control

### Electron Desktop App
- ✅ Main process configuration (main.js)
- ✅ Secure preload bridge (preload.js)
- ✅ SQLite database with full schema (database.js)
- ✅ Electron Builder configuration (package.json)
- ✅ Build script for Windows (build.bat)
- ✅ Comprehensive README with build instructions

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Master password setup
- [x] User authentication
- [x] Customer creation with SA ID validation
- [x] Loan creation and calculation
- [x] Payment marking with immutability
- [x] Role-based access control
- [x] Audit logging

### P1 (High) - DONE
- [x] Fraud detection alerts
- [x] Excel export functionality
- [x] ID masking by role
- [x] Admin user management
- [x] Audit integrity verification

### P2 (Medium) - DONE
- [x] Electron packaging configuration
- [x] SQLite local database with full schema
- [x] Export folder path configuration
- [x] Windows AD/LDAP integration

### P3 (Low/Nice-to-have)
- [ ] Code signing for EXE
- [ ] Currency formatting with commas (R1,412.00)
- [ ] Backup/restore functionality
- [ ] Report generation (PDF)
- [ ] Dark/light theme toggle

## Next Tasks
1. **Build Electron EXE**: On Windows, run `build.bat` or:
   ```bash
   cd frontend && npm install && npm run build
   cd ../electron && npm install && npm run build
   ```
2. **Test Electron App**: Verify SQLite database works in packaged EXE
3. **Configure AD**: Admin Panel → Active Directory tab
4. **Code Signing**: For production, sign with code signing certificate

## Electron App Structure
```
electron/
├── main.js          # Electron main process (IPC handlers)
├── preload.js       # Secure bridge between main and renderer
├── database.js      # SQLite database with all features
├── package.json     # Electron Builder configuration
├── build.bat        # Windows build script
└── README.md        # Build instructions
```

## Technical Notes
- Backend: FastAPI on port 8001
- Frontend: React on port 3000
- Database: MongoDB (prototype), SQLite (desktop production)
- Authentication: JWT + optional AD/LDAP
- LDAP: ldap3 library with NTLM authentication
- Test master password: TestMaster123!
- Default admin: admin / admin123

## Test SA ID Numbers (Valid Luhn)
- 8001015009087
- 9202204720083
