import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

// Detect Electron environment
const isElectron = () => typeof window !== 'undefined' && window.electronAPI !== undefined;
const electronAPI = typeof window !== 'undefined' ? window.electronAPI : null;

// Electron IPC proxy - maps axios-style calls to IPC calls
function createElectronApiProxy(getUserId) {
  const routeHandlers = {
    'GET:/master-password/status': () => electronAPI.checkMasterPassword(),
    'GET:/dashboard/stats': () => electronAPI.getDashboardStats(),
    'GET:/loans': (params) => electronAPI.getLoans(params?.status || params?.loan_status),
    'GET:/customers': () => electronAPI.getCustomers(),
    'GET:/users': () => electronAPI.getUsers(),
    'GET:/settings': () => electronAPI.getSettings(),
    'GET:/audit-logs': (params) => electronAPI.getAuditLogs(params || {}),
    'GET:/audit-logs/verify-integrity': () => electronAPI.verifyAuditIntegrity(),
    'GET:/auth/me': () => {
      const stored = localStorage.getItem('electronUser');
      return stored ? JSON.parse(stored) : null;
    },
    'GET:/backup/status': () => ({ backup_folder_path: '', auto_backup_enabled: false, last_backup: null }),
    'GET:/settings/ad-config': () => ({ enabled: false, ldap_available: false }),
    'POST:/master-password/setup': (data) => electronAPI.setupMasterPassword(data.password),
    'POST:/master-password/verify': (data) => electronAPI.verifyMasterPassword(data.password),
    'POST:/auth/login': (data) => electronAPI.login(data.username, data.password),
    'POST:/customers': (data) => electronAPI.createCustomer(data, getUserId()),
    'POST:/loans': (data) => electronAPI.createLoan(data, getUserId()),
    'POST:/payments/mark-paid': (data) => electronAPI.markPaymentPaid(data.loan_id, data.installment_number, getUserId()),
    'POST:/payments/unmark-paid': (data) => electronAPI.unmarkPaymentPaid(data.loan_id, data.installment_number, getUserId()),
    'POST:/users': (data) => electronAPI.createUser(data),
    'POST:/export': (data) => electronAPI.exportData(data.export_type, getUserId()),
    'POST:/archive': (data) => electronAPI.archiveEntity(data.entity_type, data.entity_id, data.reason, getUserId()),
    'POST:/backup/create': () => ({ success: false, message: 'Use Electron export dialog' }),
    'POST:/settings/ad-config/test': () => ({ success: false, message: 'AD not available in offline mode' }),
    'PUT:/settings': (data) => electronAPI.updateSettings(data),
    'PUT:/settings/ad-config': () => ({ message: 'AD not available in offline mode' }),
    'PUT:/backup/config': () => ({ message: 'Backup config saved' }),
  };

  // Dynamic route matching (for routes with parameters)
  const dynamicHandlers = [
    { pattern: /^GET:\/loans\/(.+)$/, handler: (m) => electronAPI.getLoan(m[1]) },
    { pattern: /^GET:\/customers\/(.+)$/, handler: (m) => electronAPI.getCustomer(m[1]) },
    { pattern: /^PUT:\/users\/(.+)\/toggle-active$/, handler: (m) => electronAPI.toggleUserActive(m[1]) },
    { pattern: /^PUT:\/admin\/payments\/(.+)$/, handler: (m, data) => electronAPI.adminEditPayment(m[1], data) },
    { pattern: /^DELETE:\/admin\/loans\/(.+)$/, handler: (m) => electronAPI.adminDeleteLoan(m[1]) },
    { pattern: /^PUT:\/admin\/loans\/(.+)$/, handler: (m, data) => electronAPI.adminEditLoan(m[1], data) },
    { pattern: /^PUT:\/admin\/customers\/(.+)$/, handler: (m, data) => electronAPI.adminEditCustomer(m[1], data) },
  ];

  const resolveHandler = (method, url, data, params) => {
    const key = `${method}:${url}`;
    if (routeHandlers[key]) {
      return routeHandlers[key](data || params);
    }
    for (const { pattern, handler } of dynamicHandlers) {
      const match = key.match(pattern);
      if (match) return handler(match, data);
    }
    console.warn(`[ElectronProxy] No handler for ${key}`);
    return Promise.resolve(null);
  };

  return {
    get: async (url, config) => {
      const data = await resolveHandler('GET', url, null, config?.params);
      return { data };
    },
    post: async (url, data) => {
      const result = await resolveHandler('POST', url, data);
      return { data: result };
    },
    put: async (url, data, config) => {
      const result = await resolveHandler('PUT', url, data);
      return { data: result };
    },
    patch: async (url, data) => {
      const result = await resolveHandler('PUT', url, data);
      return { data: result };
    },
    delete: async (url) => {
      const result = await resolveHandler('DELETE', url);
      return { data: result };
    }
  };
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAppUnlocked, setIsAppUnlocked] = useState(localStorage.getItem('appUnlocked') === 'true');
  const [masterPasswordSet, setMasterPasswordSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(null);

  // Keep userRef in sync
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const getUserId = useCallback(() => userRef.current?.id || '', []);

  const api = useCallback(() => {
    if (isElectron()) {
      return createElectronApiProxy(getUserId);
    }
    return axios.create({
      baseURL: API,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }, [token, getUserId]);

  // Check master password status on mount
  useEffect(() => {
    const checkMasterPassword = async () => {
      try {
        if (isElectron()) {
          const result = await electronAPI.checkMasterPassword();
          setMasterPasswordSet(result.is_set);
        } else {
          const res = await axios.get(`${API}/master-password/status`);
          setMasterPasswordSet(res.data.is_set);
        }
      } catch (err) {
        console.error('Failed to check master password status:', err);
      }
      setLoading(false);
    };
    checkMasterPassword();
  }, []);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (isElectron()) {
        const storedUser = localStorage.getItem('electronUser');
        if (storedUser && isAppUnlocked) {
          setUser(JSON.parse(storedUser));
        }
        setLoading(false);
        return;
      }

      if (token && isAppUnlocked) {
        try {
          const res = await api().get('/auth/me');
          setUser(res.data);
        } catch (err) {
          logout();
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, [token, isAppUnlocked]);

  const setupMasterPassword = async (password) => {
    if (isElectron()) {
      const result = await electronAPI.setupMasterPassword(password);
      setMasterPasswordSet(true);
      return result;
    }
    const res = await axios.post(`${API}/master-password/setup`, { password });
    setMasterPasswordSet(true);
    return res.data;
  };

  const unlockApp = async (password) => {
    if (isElectron()) {
      const result = await electronAPI.verifyMasterPassword(password);
      if (result.verified) {
        setIsAppUnlocked(true);
        localStorage.setItem('appUnlocked', 'true');
        return true;
      }
      return false;
    }
    const res = await axios.post(`${API}/master-password/verify`, { password });
    if (res.data.verified) {
      setIsAppUnlocked(true);
      localStorage.setItem('appUnlocked', 'true');
      return true;
    }
    return false;
  };

  const login = async (username, password) => {
    if (isElectron()) {
      const result = await electronAPI.login(username, password);
      setUser(result.user);
      setToken('electron-local');
      localStorage.setItem('token', 'electron-local');
      localStorage.setItem('electronUser', JSON.stringify(result.user));
      return result.user;
    }
    const res = await axios.post(`${API}/auth/login`, { username, password });
    const { token: newToken, user: userData } = res.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    return userData;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('electronUser');
  };

  const lockApp = () => {
    logout();
    setIsAppUnlocked(false);
    localStorage.removeItem('appUnlocked');
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isAppUnlocked,
    masterPasswordSet,
    loading,
    api,
    setupMasterPassword,
    unlockApp,
    login,
    logout,
    lockApp,
    isElectron: isElectron()
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
