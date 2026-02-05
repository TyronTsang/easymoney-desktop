const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Database = require('./database');
const AppUpdater = require('./updater');

let mainWindow;
let db;
let updater;

// App version and GitHub repo - UPDATE THESE!
const APP_VERSION = '1.0.0';
const GITHUB_REPO = 'yourusername/easymoney-desktop'; // Change this to your GitHub repo

// Get the correct path for resources in both dev and production
function getResourcePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app');
  }
  // Development mode
  return path.join(__dirname, '..', 'frontend', 'build');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.ico'),
    title: 'EasyMoneyLoans Desktop',
    backgroundColor: '#09090b',
    show: false
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(getResourcePath(), 'index.html');
    console.log('Loading app from:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize database
  db = new Database();
  
  // Initialize updater
  updater = new AppUpdater(APP_VERSION, GITHUB_REPO);
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==================== IPC HANDLERS ====================

// Folder Selection Dialog
ipcMain.handle('dialog:selectFolder', async (event, defaultPath) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: defaultPath || '',
    title: 'Select Export Folder'
  });
  
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0];
});

// Master Password
ipcMain.handle('db:checkMasterPassword', async () => {
  return db.checkMasterPasswordSet();
});

ipcMain.handle('db:setupMasterPassword', async (event, password) => {
  return db.setupMasterPassword(password);
});

ipcMain.handle('db:verifyMasterPassword', async (event, password) => {
  return db.verifyMasterPassword(password);
});

// Auth
ipcMain.handle('db:login', async (event, username, password) => {
  return db.login(username, password);
});

ipcMain.handle('db:getUser', async (event, userId) => {
  return db.getUser(userId);
});

// Users
ipcMain.handle('db:getUsers', async () => {
  return db.getUsers();
});

ipcMain.handle('db:createUser', async (event, userData) => {
  return db.createUser(userData);
});

ipcMain.handle('db:toggleUserActive', async (event, userId) => {
  return db.toggleUserActive(userId);
});

// Customers
ipcMain.handle('db:getCustomers', async () => {
  return db.getCustomers();
});

ipcMain.handle('db:createCustomer', async (event, customerData, userId) => {
  return db.createCustomer(customerData, userId);
});

ipcMain.handle('db:getCustomer', async (event, customerId) => {
  return db.getCustomer(customerId);
});

// Loans
ipcMain.handle('db:getLoans', async (event, status) => {
  return db.getLoans(status);
});

ipcMain.handle('db:createLoan', async (event, loanData, userId) => {
  return db.createLoan(loanData, userId);
});

ipcMain.handle('db:getLoan', async (event, loanId) => {
  return db.getLoan(loanId);
});

// Payments
ipcMain.handle('db:markPaymentPaid', async (event, loanId, installmentNumber, userId) => {
  return db.markPaymentPaid(loanId, installmentNumber, userId);
});

// Dashboard
ipcMain.handle('db:getDashboardStats', async () => {
  return db.getDashboardStats();
});

// Audit Logs
ipcMain.handle('db:getAuditLogs', async (event, filters) => {
  return db.getAuditLogs(filters);
});

ipcMain.handle('db:verifyAuditIntegrity', async () => {
  return db.verifyAuditIntegrity();
});

// Settings
ipcMain.handle('db:getSettings', async () => {
  return db.getSettings();
});

ipcMain.handle('db:updateSettings', async (event, settings) => {
  return db.updateSettings(settings);
});

// Archive
ipcMain.handle('db:archiveEntity', async (event, entityType, entityId, reason, userId) => {
  return db.archiveEntity(entityType, entityId, reason, userId);
});

// Export
ipcMain.handle('db:exportData', async (event, exportType, userId) => {
  const settings = db.getSettings();
  const exportPath = settings.export_folder_path;
  
  if (!exportPath) {
    // Ask user to select folder
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Export Folder'
    });
    
    if (result.canceled) {
      return { success: false, error: 'Export cancelled' };
    }
    
    return db.exportToExcel(exportType, result.filePaths[0], userId);
  }
  
  return db.exportToExcel(exportType, exportPath, userId);
});

// Select folder dialog
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Export Folder'
  });
  
  if (result.canceled) {
    return null;
  }
  
  return result.filePaths[0];
});
