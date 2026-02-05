const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Master Password
  checkMasterPassword: () => ipcRenderer.invoke('db:checkMasterPassword'),
  setupMasterPassword: (password) => ipcRenderer.invoke('db:setupMasterPassword', password),
  verifyMasterPassword: (password) => ipcRenderer.invoke('db:verifyMasterPassword', password),
  
  // Auth
  login: (username, password) => ipcRenderer.invoke('db:login', username, password),
  getUser: (userId) => ipcRenderer.invoke('db:getUser', userId),
  
  // Users
  getUsers: () => ipcRenderer.invoke('db:getUsers'),
  createUser: (userData) => ipcRenderer.invoke('db:createUser', userData),
  toggleUserActive: (userId) => ipcRenderer.invoke('db:toggleUserActive', userId),
  
  // Customers
  getCustomers: () => ipcRenderer.invoke('db:getCustomers'),
  createCustomer: (customerData, userId) => ipcRenderer.invoke('db:createCustomer', customerData, userId),
  getCustomer: (customerId) => ipcRenderer.invoke('db:getCustomer', customerId),
  
  // Loans
  getLoans: (status) => ipcRenderer.invoke('db:getLoans', status),
  createLoan: (loanData, userId) => ipcRenderer.invoke('db:createLoan', loanData, userId),
  getLoan: (loanId) => ipcRenderer.invoke('db:getLoan', loanId),
  
  // Payments
  markPaymentPaid: (loanId, installmentNumber, userId) => 
    ipcRenderer.invoke('db:markPaymentPaid', loanId, installmentNumber, userId),
  
  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('db:getDashboardStats'),
  
  // Audit
  getAuditLogs: (filters) => ipcRenderer.invoke('db:getAuditLogs', filters),
  verifyAuditIntegrity: () => ipcRenderer.invoke('db:verifyAuditIntegrity'),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  updateSettings: (settings) => ipcRenderer.invoke('db:updateSettings', settings),
  
  // Archive
  archiveEntity: (entityType, entityId, reason, userId) => 
    ipcRenderer.invoke('db:archiveEntity', entityType, entityId, reason, userId),
  
  // Export
  exportData: (exportType, userId) => ipcRenderer.invoke('db:exportData', exportType, userId),
  
  // Dialogs
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  
  // App Updates
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  downloadUpdate: (downloadUrl) => ipcRenderer.invoke('app:downloadUpdate', downloadUrl),
  installUpdate: (filePath) => ipcRenderer.invoke('app:installUpdate', filePath),
  onDownloadProgress: (callback) => {
    ipcRenderer.on('update:downloadProgress', (event, progress) => callback(progress));
  },
  
  // Platform info
  platform: process.platform,
  isElectron: true
});
