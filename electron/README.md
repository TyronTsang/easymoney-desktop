# EasyMoneyLoans Desktop Application

## Building the Windows EXE

### Prerequisites
- Node.js 18+ installed
- Windows machine (or Wine on Linux/Mac for cross-compilation)

### Build Steps

1. **Install Electron dependencies:**
```bash
cd electron
npm install
```

2. **Build the React frontend:**
```bash
cd ../frontend
yarn build
```

3. **Build the Windows EXE:**
```bash
cd ../electron
npm run build
```

The output will be in `electron/dist/`:
- `EasyMoneyLoans Setup.exe` - Installer version
- `EasyMoneyLoans.exe` - Portable version (in `win-unpacked/`)

### Directory Structure
```
electron/
├── main.js          # Electron main process
├── preload.js       # Secure bridge to renderer
├── database.js      # SQLite database with encryption
├── package.json     # Electron config & build settings
└── dist/            # Built executables (after build)
```

## Features

### Security
- **Master Password**: Encrypts all local data using PBKDF2 key derivation
- **SQLite Database**: Local encrypted storage with no cloud dependency
- **Payment Immutability**: Database triggers prevent unmarking paid payments
- **Audit Log Integrity**: SHA-256 hash chain for tamper detection
- **Role-Based Access**: Employee/Manager/Admin with different permissions

### Functionality
- Customer management with SA ID validation (Luhn algorithm)
- Loan creation with automatic calculation (40% interest + R12 fee)
- Payment scheduling (Monthly/Fortnightly/Weekly)
- Fraud detection (Quick-close, Duplicate customers)
- Excel export to configured Dropbox folder
- Complete audit trail

### ID Masking
- **Employee**: Sees `8001******087`
- **Manager/Admin**: Sees full `8001015009087`

## Database Location
The SQLite database is stored at:
- Windows: `%APPDATA%/easymoney-desktop/easymoney.db`
- Development: Current working directory

## Default Credentials
After first-time setup with master password:
- Username: `admin`
- Password: `admin123`

**IMPORTANT**: Change the admin password after first login!

## Export to Dropbox
1. Configure export folder in Admin Panel → Settings
2. Set path to your Dropbox sync folder (e.g., `C:\Users\Staff\Dropbox\EasyMoneyLoans\Exports`)
3. Use Export page with "Save to Dropbox Folder" toggle enabled
4. Files are automatically synced to cloud by Dropbox client
