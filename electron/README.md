# EasyMoneyLoans Desktop Application

## Overview

EasyMoneyLoans Staff Portal is an offline-first Windows desktop application for managing customer loans and payments. Built with Electron, React, and FastAPI, it provides a secure, locally-running application that doesn't require internet connectivity for core operations.

## Features

### Core Features
- **Customer Management**: Register and manage customers with SA ID validation (Luhn algorithm)
- **Loan Management**: Create loans with automatic interest calculation (40% + R12 service fee)
- **Payment Tracking**: Mark payments as paid with payment immutability enforcement
- **Fraud Detection**: Automatic alerts for quick-close loans and duplicate customers
- **Excel Export**: Export data to a configurable local folder (e.g., Dropbox-synced folder)

### Security Features
- **Master Password Protection**: Application unlock requires master password
- **Role-Based Access Control**: Employee, Manager, and Admin roles with different permissions
- **Immutable Audit Logs**: SHA-256 hash chain for tamper detection
- **SA ID Masking**: Employees see masked IDs, Managers/Admins see full IDs
- **Payment Immutability**: Paid payments cannot be unmarked

### Windows Active Directory Integration
- Authenticate users against your organization's AD domain
- Auto-create user accounts from AD
- Configure default role and branch for AD users
- Test connection before enabling

## Building the Windows EXE

### Prerequisites
- Node.js 18+ installed
- Windows 10/11 (or Wine for cross-compilation)
- Git (optional)

### Quick Build (Windows)

1. Double-click `electron/build.bat` and follow the prompts.

### Manual Build

```bash
# Step 1: Build React frontend
cd frontend
npm install
npm run build

# Step 2: Install Electron dependencies
cd ../electron
npm install

# Step 3: Build the EXE
npm run build        # Full build (installer + portable)
# OR
npm run build:portable  # Portable only
# OR
npm run build:dir    # Unpacked directory for testing
```

### Output Files

After building, find your files in `electron/dist/`:
- `EasyMoneyLoans Setup 1.0.0.exe` - NSIS Installer
- `EasyMoneyLoans 1.0.0.exe` - Portable executable
- `win-unpacked/EasyMoneyLoans.exe` - Unpacked application

## First-Time Setup

1. Run the application
2. Set up the **Master Password** (encrypts local data)
3. Login with default admin credentials:
   - Username: `admin`
   - Password: `admin123`
4. **IMPORTANT**: Change the admin password immediately!

## Active Directory Configuration

To enable Windows AD authentication:

1. Login as Admin
2. Go to Admin Panel → Active Directory tab
3. Configure:
   - **Server URL**: `ldap://ad.yourcompany.com:389` (or `ldaps://` for secure)
   - **Domain**: Your Windows domain name (e.g., `COMPANY`)
   - **Base DN** (optional): `OU=Users,DC=company,DC=com`
   - **Default Role**: Role assigned to new AD users
   - **Default Branch**: Branch assigned to new AD users
4. Click "Test Connection" to verify
5. Enable the toggle and save

### How AD Authentication Works

- Users can login with Windows username (e.g., `john.smith`)
- New AD users are automatically created with default role
- Local users can still login normally
- Admins can promote AD users after they login

## Data Storage

### Database Location
- **Windows**: `%APPDATA%/easymoney-desktop/easymoney.db`
- **Development**: Current working directory

### Backup
To backup your data, copy the database file to a secure location.

## ID Number Format (SA IDs)

South African ID numbers are 13 digits with the following structure:
- Digits 1-6: Birth date (YYMMDD)
- Digits 7-10: Gender/citizenship sequence
- Digit 11: Citizenship status
- Digit 12: Race (deprecated)
- Digit 13: Checksum (Luhn algorithm)

The application validates ID numbers using the Luhn algorithm.

## Repayment Plans

- **Monthly (1 payment)**: Due in 30 days
- **Fortnightly (2 payments)**: Due every 14 days
- **Weekly (4 payments)**: Due every 7 days

Interest rate: 40% + R12 service fee

## Role Permissions

| Feature | Employee | Manager | Admin |
|---------|----------|---------|-------|
| View Customers | ✓ (masked ID) | ✓ (full ID) | ✓ (full ID) |
| Create Customers | ✓ | ✓ | ✓ |
| View Loans | ✓ | ✓ | ✓ |
| Create Loans | ✓ | ✓ | ✓ |
| Mark Payments | ✓ | ✓ | ✓ |
| View Fraud Alerts | - | ✓ | ✓ |
| Export Data | - | ✓ | ✓ |
| Manage Users | - | - | ✓ |
| Configure AD | - | - | ✓ |
| View Audit Logs | - | - | ✓ |

## Troubleshooting

### Native Module Issues
If `better-sqlite3` fails:
```bash
cd electron
npm rebuild better-sqlite3 --runtime=electron --target=28.0.0
```

### Application Won't Start
Run from command line to see error:
```bash
"electron/dist/win-unpacked/EasyMoneyLoans.exe"
```

### AD Connection Issues
- Verify server URL is reachable
- Check firewall rules for LDAP ports (389/636)
- Ensure domain name is correct (NetBIOS format)
- Try both `ldap://` and `ldaps://`

## Code Signing (Production)

For production deployment, code sign the executable:

1. Obtain a Code Signing Certificate (DigiCert, Sectigo, etc.)
2. Add to `electron/package.json`:
```json
"build": {
  "win": {
    "certificateFile": "path/to/certificate.pfx",
    "certificatePassword": "your-password"
  }
}
```

## License

UNLICENSED - Internal use only

## Support

Contact IT department for support.
