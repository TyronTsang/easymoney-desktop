const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const AppUpdater = require('./updater');
const EasyMoneyDatabase = require('./database');

let mainWindow;
let updater;
let database;

// App version read from package.json and GitHub repo
const APP_VERSION = require('./package.json').version;
const GITHUB_REPO = 'TyronTsang/easymoney-desktop';

// Get the correct path for resources in both dev and production
function getResourcePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app');
  }
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
  // Initialize local SQLite database
  database = new EasyMoneyDatabase();
  console.log('SQLite database initialized');

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

// ==================== DATABASE IPC HANDLERS ====================

// --- Master Password ---
ipcMain.handle('db:checkMasterPassword', async () => {
  try {
    return database.checkMasterPasswordSet();
  } catch (error) {
    return { is_set: false, error: error.message };
  }
});

ipcMain.handle('db:setupMasterPassword', async (event, password) => {
  try {
    return database.setupMasterPassword(password);
  } catch (error) {
    throw new Error(error.message);
  }
});

ipcMain.handle('db:verifyMasterPassword', async (event, password) => {
  try {
    return database.verifyMasterPassword(password);
  } catch (error) {
    throw new Error(error.message);
  }
});

// --- Auth ---
ipcMain.handle('db:login', async (event, username, password) => {
  try {
    return database.login(username, password);
  } catch (error) {
    throw new Error(error.message);
  }
});

ipcMain.handle('db:getUser', async (event, userId) => {
  try {
    return database.getUser(userId);
  } catch (error) {
    throw new Error(error.message);
  }
});

// --- Users ---
ipcMain.handle('db:getUsers', async () => {
  try {
    return database.getUsers();
  } catch (error) {
    throw new Error(error.message);
  }
});

ipcMain.handle('db:createUser', async (event, userData) => {
  try {
    return database.createUser(userData);
  } catch (error) {
    throw new Error(error.message);
  }
});

ipcMain.handle('db:toggleUserActive', async (event, userId) => {
  try {
    return database.toggleUserActive(userId);
  } catch (error) {
    throw new Error(error.message);
  }
});

// --- Customers ---
ipcMain.handle('db:getCustomers', async () => {
  try {
    return database.getCustomers();
  } catch (error) {
    throw new Error(error.message);
  }
});

ipcMain.handle('db:createCustomer', async (event, customerData, userId) => {
  try {
    return database.createCustomer(customerData, userId);
  } catch (error) {
    throw new Error(error.message);
  }
});

ipcMain.handle('db:getCustomer', async (event, customerId) => {
  try {
    return database.getCustomer(customerId);
  } catch (error) {
    throw new Error(error.message);
  }
});

// --- Loans ---
ipcMain.handle('db:getLoans', async (event, status) => {
  try {
    return database.getLoans(status);
  } catch (error) {
    throw new Error(error.message);
  }
});

ipcMain.handle('db:createLoan', async (event, loanData, userId) => {
  try {
    return database.createLoan(loanData, userId);
  } catch (error) {
    throw new Error(error.message);
  }
});

ipcMain.handle('db:getLoan', async (event, loanId) => {
  try {
    return database.getLoan(loanId);
  } catch (error) {
    throw new Error(error.message);
  }
});

// --- Payments ---
ipcMain.handle('db:markPaymentPaid', async (event, loanId, installmentNumber, userId) => {
  try {
    return database.markPaymentPaid(loanId, installmentNumber, userId);
  } catch (error) {
    throw new Error(error.message);
  }
});

ipcMain.handle('db:unmarkPaymentPaid', async (event, loanId, installmentNumber, userId) => {
  try {
    return database.unmarkPaymentPaid(loanId, installmentNumber, userId);
  } catch (error) {
    throw new Error(error.message);
  }
});

// --- Dashboard ---
ipcMain.handle('db:getDashboardStats', async () => {
  try {
    return database.getDashboardStats();
  } catch (error) {
    throw new Error(error.message);
  }
});

// --- Audit Logs ---
ipcMain.handle('db:getAuditLogs', async (event, filters) => {
  try {
    return database.getAuditLogs(filters);
  } catch (error) {
    throw new Error(error.message);
  }
});

ipcMain.handle('db:verifyAuditIntegrity', async () => {
  try {
    return database.verifyAuditIntegrity();
  } catch (error) {
    throw new Error(error.message);
  }
});

// --- Settings ---
ipcMain.handle('db:getSettings', async () => {
  try {
    return database.getSettings();
  } catch (error) {
    throw new Error(error.message);
  }
});

ipcMain.handle('db:updateSettings', async (event, settings) => {
  try {
    return database.updateSettings(settings);
  } catch (error) {
    throw new Error(error.message);
  }
});

// --- Archive ---
ipcMain.handle('db:archiveEntity', async (event, entityType, entityId, reason, userId) => {
  try {
    return database.archiveEntity(entityType, entityId, reason, userId);
  } catch (error) {
    throw new Error(error.message);
  }
});


// --- Admin Operations ---
ipcMain.handle('db:adminEditPayment', async (event, paymentId, data) => {
  try {
    return database.adminEditPayment(paymentId, data);
  } catch (error) {
    throw new Error(error.message);
  }
});

ipcMain.handle('db:adminDeleteLoan', async (event, loanId) => {
  try {
    return database.adminDeleteLoan(loanId);
  } catch (error) {
    throw new Error(error.message);
  }
});

ipcMain.handle('db:adminEditLoan', async (event, loanId, data) => {
  try {
    return database.adminEditLoan(loanId, data);
  } catch (error) {
    throw new Error(error.message);
  }
});

ipcMain.handle('db:adminEditCustomer', async (event, customerId, data) => {
  try {
    return database.adminEditCustomer(customerId, data);
  } catch (error) {
    throw new Error(error.message);
  }
});

// --- Export ---
ipcMain.handle('db:exportData', async (event, exportType, userId, dateRange) => {
  try {
    // First ask user to select folder
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Export Folder'
    });

    if (result.canceled) {
      return { success: false, error: 'Export cancelled' };
    }

    const folderPath = result.filePaths[0];
    return await database.exportToExcel(exportType, folderPath, userId, dateRange);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// --- Loan Top-Up ---
ipcMain.handle('db:topUpLoan', async (event, loanId, newPrincipal, userId) => {
  try {
    return database.topUpLoan(loanId, newPrincipal, userId);
  } catch (error) {
    throw new Error(error.message);
  }
});

// --- Find Existing Customer ---
ipcMain.handle('db:findExistingCustomer', async (event, idNumber) => {
  try {
    return database.findExistingCustomer(idNumber);
  } catch (error) {
    return null;
  }
});

// ==================== DIALOG HANDLERS ====================

ipcMain.handle('dialog:selectFolder', async (event, defaultPath) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: defaultPath || '',
    title: 'Select Folder'
  });

  if (result.canceled) {
    return null;
  }
  return result.filePaths[0];
});

// ==================== UPDATE HANDLERS ====================

ipcMain.handle('app:getVersion', async () => {
  return APP_VERSION;
});

ipcMain.handle('app:checkForUpdates', async () => {
  try {
    const updateInfo = await updater.checkForUpdates();
    return { success: true, data: updateInfo };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('app:downloadUpdate', async (event, downloadUrl) => {
  try {
    const filePath = await updater.downloadUpdate(downloadUrl, (progress) => {
      event.sender.send('update:downloadProgress', progress);
    });
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('app:installUpdate', async (event, filePath) => {
  try {
    await updater.installUpdate(filePath);
    setTimeout(() => {
      app.quit();
    }, 1000);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
