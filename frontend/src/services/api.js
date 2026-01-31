/**
 * Unified API Service
 * Automatically detects if running in Electron and switches between IPC and HTTP calls
 */
import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Check if running in Electron
export const isElectron = () => {
  return window.electronAPI !== undefined;
};

// Create axios instance for web mode
const createAxiosInstance = (token) => {
  return axios.create({
    baseURL: API_BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
};

// Electron API wrapper
const electronAPI = window.electronAPI;

// ==================== API SERVICE ====================

export const apiService = {
  // Master Password
  checkMasterPassword: async () => {
    if (isElectron()) {
      return electronAPI.checkMasterPassword();
    }
    const res = await axios.get(`${API_BASE}/master-password/status`);
    return res.data;
  },

  setupMasterPassword: async (password) => {
    if (isElectron()) {
      return electronAPI.setupMasterPassword(password);
    }
    const res = await axios.post(`${API_BASE}/master-password/setup`, { password });
    return res.data;
  },

  verifyMasterPassword: async (password) => {
    if (isElectron()) {
      return electronAPI.verifyMasterPassword(password);
    }
    const res = await axios.post(`${API_BASE}/master-password/verify`, { password });
    return res.data;
  },

  // Auth
  login: async (username, password) => {
    if (isElectron()) {
      const result = await electronAPI.login(username, password);
      // In Electron mode, we store user info locally, no JWT needed
      return { user: result.user, token: 'electron-local' };
    }
    const res = await axios.post(`${API_BASE}/auth/login`, { username, password });
    return res.data;
  },

  getMe: async (token) => {
    if (isElectron()) {
      // In Electron, user is stored in context, this is a no-op
      return null;
    }
    const api = createAxiosInstance(token);
    const res = await api.get('/auth/me');
    return res.data;
  },

  // Users
  getUsers: async (token) => {
    if (isElectron()) {
      return electronAPI.getUsers();
    }
    const api = createAxiosInstance(token);
    const res = await api.get('/admin/users');
    return res.data;
  },

  createUser: async (token, userData) => {
    if (isElectron()) {
      return electronAPI.createUser(userData);
    }
    const api = createAxiosInstance(token);
    const res = await api.post('/admin/users', userData);
    return res.data;
  },

  toggleUserActive: async (token, userId) => {
    if (isElectron()) {
      return electronAPI.toggleUserActive(userId);
    }
    const api = createAxiosInstance(token);
    const res = await api.patch(`/admin/users/${userId}/toggle`);
    return res.data;
  },

  // Customers
  getCustomers: async (token) => {
    if (isElectron()) {
      return electronAPI.getCustomers();
    }
    const api = createAxiosInstance(token);
    const res = await api.get('/customers');
    return res.data;
  },

  createCustomer: async (token, customerData, userId) => {
    if (isElectron()) {
      return electronAPI.createCustomer(customerData, userId);
    }
    const api = createAxiosInstance(token);
    const res = await api.post('/customers', customerData);
    return res.data;
  },

  getCustomer: async (token, customerId) => {
    if (isElectron()) {
      return electronAPI.getCustomer(customerId);
    }
    const api = createAxiosInstance(token);
    const res = await api.get(`/customers/${customerId}`);
    return res.data;
  },

  // Loans
  getLoans: async (token, status) => {
    if (isElectron()) {
      return electronAPI.getLoans(status);
    }
    const api = createAxiosInstance(token);
    const params = status ? { status } : {};
    const res = await api.get('/loans', { params });
    return res.data;
  },

  createLoan: async (token, loanData, userId) => {
    if (isElectron()) {
      return electronAPI.createLoan(loanData, userId);
    }
    const api = createAxiosInstance(token);
    const res = await api.post('/loans', loanData);
    return res.data;
  },

  getLoan: async (token, loanId) => {
    if (isElectron()) {
      return electronAPI.getLoan(loanId);
    }
    const api = createAxiosInstance(token);
    const res = await api.get(`/loans/${loanId}`);
    return res.data;
  },

  // Payments
  markPaymentPaid: async (token, loanId, installmentNumber, userId) => {
    if (isElectron()) {
      return electronAPI.markPaymentPaid(loanId, installmentNumber, userId);
    }
    const api = createAxiosInstance(token);
    const res = await api.post(`/loans/${loanId}/payments/${installmentNumber}/mark-paid`);
    return res.data;
  },

  // Dashboard
  getDashboardStats: async (token) => {
    if (isElectron()) {
      return electronAPI.getDashboardStats();
    }
    const api = createAxiosInstance(token);
    const res = await api.get('/dashboard/stats');
    return res.data;
  },

  // Audit Logs
  getAuditLogs: async (token, filters = {}) => {
    if (isElectron()) {
      return electronAPI.getAuditLogs(filters);
    }
    const api = createAxiosInstance(token);
    const res = await api.get('/audit-logs', { params: filters });
    return res.data;
  },

  verifyAuditIntegrity: async (token) => {
    if (isElectron()) {
      return electronAPI.verifyAuditIntegrity();
    }
    const api = createAxiosInstance(token);
    const res = await api.post('/audit-logs/verify-integrity');
    return res.data;
  },

  // Settings
  getSettings: async (token) => {
    if (isElectron()) {
      return electronAPI.getSettings();
    }
    const api = createAxiosInstance(token);
    const res = await api.get('/settings');
    return res.data;
  },

  updateSettings: async (token, settings) => {
    if (isElectron()) {
      return electronAPI.updateSettings(settings);
    }
    const api = createAxiosInstance(token);
    const res = await api.patch('/settings', settings);
    return res.data;
  },

  // Archive
  archiveEntity: async (token, entityType, entityId, reason, userId) => {
    if (isElectron()) {
      return electronAPI.archiveEntity(entityType, entityId, reason, userId);
    }
    const api = createAxiosInstance(token);
    const res = await api.post(`/${entityType}s/${entityId}/archive`, { reason });
    return res.data;
  },

  // Export
  exportData: async (token, exportType, userId) => {
    if (isElectron()) {
      return electronAPI.exportData(exportType, userId);
    }
    const api = createAxiosInstance(token);
    const res = await api.post('/export', { export_type: exportType });
    return res.data;
  },

  // Dialogs (Electron only)
  selectFolder: async () => {
    if (isElectron()) {
      return electronAPI.selectFolder();
    }
    // In web mode, this is not available
    return null;
  }
};

export default apiService;
