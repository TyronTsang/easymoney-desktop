# EasyMoneyLoans Desktop Application - Build Instructions

## Prerequisites

1. **Node.js 18+** - Download from https://nodejs.org/
2. **Windows 10/11** - The build must be performed on a Windows machine
3. **Git** (optional) - For cloning the repository

## Directory Structure
```
/app/
├── electron/           # Electron configuration and build files
│   ├── main.js         # Main Electron process
│   ├── preload.js      # Secure IPC bridge
│   ├── database.js     # SQLite database handler
│   └── package.json    # Electron dependencies
└── frontend/           # React frontend application
    └── build/          # Production build (created during build process)
```

## Build Steps

### Step 1: Build the React Frontend

Open Command Prompt or PowerShell and navigate to the frontend directory:

```bash
cd frontend
npm install
npm run build
```

This creates the `frontend/build/` folder with the production-ready React app.

### Step 2: Prepare Electron Dependencies

Navigate to the electron directory:

```bash
cd ../electron
npm install
```

This installs Electron and its dependencies (better-sqlite3, exceljs).

### Step 3: Build the Windows Executable

Still in the electron directory, run:

```bash
# For installer version (.exe installer)
npm run build

# For portable version (single .exe file)
npm run build:portable

# For quick testing (unpacked directory)
npm run build:dir
```

### Step 4: Find Your Built Application

After successful build, find your files in:
```
electron/dist/
├── EasyMoneyLoans Setup 1.0.0.exe    # NSIS Installer
├── EasyMoneyLoans 1.0.0.exe          # Portable executable
└── win-unpacked/                      # Unpacked application directory
    └── EasyMoneyLoans.exe            # The main executable
```

## First-Time Setup

1. Run the application
2. Create a **Master Password** - This encrypts all local data
3. Login with default credentials:
   - Username: `admin`
   - Password: `admin123`
4. **IMPORTANT**: Change the admin password immediately after first login!

## Application Features

### Security
- **Master Password Protection**: All data is encrypted with your master password
- **Local SQLite Database**: No cloud dependency, fully offline
- **Payment Immutability**: Paid payments cannot be unmarked
- **Audit Log Integrity**: SHA-256 hash chain for tamper detection
- **Role-Based Access**: Employee/Manager/Admin roles

### Functionality
- Customer management with SA ID validation
- Loan creation with automatic interest calculation (40% + R12 fee)
- Payment scheduling (Monthly/Fortnightly/Weekly)
- Fraud detection (Quick-close alerts, Duplicate customer alerts)
- Excel export to any folder
- Complete audit trail

## Troubleshooting

### Native Module Issues
If you encounter errors with `better-sqlite3`:

```bash
# In the electron directory
npm rebuild better-sqlite3 --runtime=electron --target=28.0.0 --disturl=https://electronjs.org/headers --abi=119
```

### Build Fails
1. Delete `node_modules` in both directories
2. Delete `package-lock.json` files
3. Run `npm install` again in both directories
4. Try the build again

### Application Won't Start
Check the Windows Event Viewer for error details, or run from command line:
```bash
"electron/dist/win-unpacked/EasyMoneyLoans.exe"
```

## Data Location

The SQLite database is stored at:
```
%APPDATA%/easymoney-desktop/easymoney.db
```

To back up your data, copy this file to a secure location.

## Code Signing (Recommended for Production)

For production deployment, code sign the executable:

1. Obtain a Code Signing Certificate from a trusted CA (DigiCert, Sectigo, etc.)
2. Add to your `package.json`:
```json
"build": {
  "win": {
    "certificateFile": "path/to/certificate.pfx",
    "certificatePassword": "your-password"
  }
}
```

## Support

For issues and questions, contact the IT department.
