import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

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

  const api = useCallback(() => {
    return axios.create({
      baseURL: API,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }, [token]);

  // Check master password status on mount
  useEffect(() => {
    const checkMasterPassword = async () => {
      try {
        const res = await axios.get(`${API}/master-password/status`);
        setMasterPasswordSet(res.data.is_set);
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
      if (token && isAppUnlocked) {
        try {
          const res = await api().get('/auth/me');
          setUser(res.data);
        } catch (err) {
          // Token invalid, clear everything
          logout();
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, [token, isAppUnlocked, api]);

  const setupMasterPassword = async (password) => {
    const res = await axios.post(`${API}/master-password/setup`, { password });
    setMasterPasswordSet(true);
    return res.data;
  };

  const unlockApp = async (password) => {
    const res = await axios.post(`${API}/master-password/verify`, { password });
    if (res.data.verified) {
      setIsAppUnlocked(true);
      localStorage.setItem('appUnlocked', 'true');
      return true;
    }
    return false;
  };

  const login = async (username, password) => {
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
    lockApp
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
