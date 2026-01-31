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

## User Personas
1. **Employee**: Creates loans, marks payments, cannot see full IDs or export
2. **Manager**: Creates loans, marks payments, can export and see full IDs
3. **Admin**: Full access including user management, archiving, settings

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
- ✅ Admin panel (users, settings, security)
- ✅ Audit logs viewer with detail modal
- ✅ Dark "Tactical Finance" theme
- ✅ Role-based navigation and access control

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

### P2 (Medium) - PARTIALLY DONE
- [x] Electron packaging configuration (main.js, preload.js, database.js created)
- [x] SQLite local database with full schema (electron/database.js)
- [x] Export folder path configuration and file saving (/api/export with save_to_path)
- [ ] Windows AD/LDAP integration (optional)
- [ ] Data encryption at rest with DPAPI (master password derived key used)
- [ ] End-of-day record locking after export

### P3 (Low/Nice-to-have)
- [ ] Code signing for EXE
- [ ] Currency formatting with commas (R1,412.00)
- [ ] Backup/restore functionality
- [ ] Report generation (PDF)
- [ ] Dark/light theme toggle

## Next Tasks
1. **Electron Packaging**: Convert React app to Electron for Windows EXE distribution
2. **SQLite Migration**: Move from MongoDB to encrypted SQLite for true offline capability
3. **DPAPI Integration**: Use Windows DPAPI for secure encryption key storage
4. **Export Path Usage**: Actually save exports to admin-configured folder path
5. **Windows AD**: Add optional Active Directory authentication

## Technical Notes
- Backend: FastAPI on port 8001
- Frontend: React on port 3000
- Database: MongoDB (for prototype; migrate to SQLite for production)
- Authentication: JWT with bcrypt password hashing
- Test master password: TestMaster123!
- Default admin: admin / admin123

## Test SA ID Numbers (Valid Luhn)
- 8001015009087
- 9202204720083
