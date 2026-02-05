# EasyMoneyLoans Desktop - Windows Build Guide

## Prerequisites

### 1. Install Visual Studio Build Tools (REQUIRED for SQLite)
- Download from: https://visualstudio.microsoft.com/downloads/
- Scroll to "Build Tools for Visual Studio 2022" → Click Download
- Run the installer
- Select **"Desktop development with C++"** workload
- Click Install (takes 10-20 minutes)
- **Restart your computer** after installation

### 2. Install Node.js
- Download LTS from: https://nodejs.org/
- During install, check "Automatically install necessary tools" 

### 3. Verify Installation
Open Command Prompt and run:
```
node --version     # Should show v18+ or v20+
npm --version      # Should show 9+
```

## Build Steps

### Step 1: Clone or download the repository
```
git clone https://github.com/TyronTsang/easymoney-desktop.git
cd easymoney-desktop
```

### Step 2: Build the React frontend
```
cd frontend
npm install
npm run build
cd ..
```

### Step 3: Install Electron dependencies (including SQLite)
```
cd electron
npm install
```

**If `better-sqlite3` fails to compile:**
```
npm install --build-from-source
```

Or try:
```
npx electron-rebuild -f -w better-sqlite3
```

### Step 4: Test in development mode
```
npm start
```
This opens the app in development mode. Verify:
- Master password screen appears
- Can set/enter master password
- Can login with admin/admin123
- Can create customers and loans

### Step 5: Build the .EXE
```
npm run build
```

The installer will be in `electron/dist/`. Look for:
- `EasyMoneyLoans Setup 1.0.0.exe` (NSIS installer)
- `EasyMoneyLoans 1.0.0.exe` (Portable version)

## Architecture

```
User clicks button in UI
  → React component calls window.electronAPI.method()
  → preload.js bridges to ipcRenderer.invoke('db:method')
  → main.js IPC handler calls database.method()
  → database.js executes SQL on local SQLite file
  → Result flows back through the chain to the UI
```

**Database location:** `C:\Users\{user}\AppData\Local\EasyMoneyLoans\easymoney.db`

## Troubleshooting

### "better-sqlite3 failed to compile"
1. Make sure Visual Studio Build Tools WITH C++ workload is installed
2. Restart your computer after installing Build Tools
3. Try: `npm install --build-from-source`
4. If still failing, try: `npx electron-rebuild -f -w better-sqlite3`

### App crashes on startup
Check logs in: `%APPDATA%\EasyMoneyLoans\logs\`

### Data not persisting
Check if the database file exists at:
`C:\Users\{username}\AppData\Local\EasyMoneyLoans\easymoney.db`

## Key Files
- `electron/main.js` - Main process with all IPC handlers
- `electron/database.js` - SQLite database operations
- `electron/preload.js` - Secure bridge between main and renderer
- `electron/updater.js` - Auto-update from GitHub Releases
- `frontend/` - React UI (built to frontend/build/)
