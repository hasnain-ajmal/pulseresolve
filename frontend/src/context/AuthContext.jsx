import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getToken, getCurrentUser, setAuth, clearAuth, isMockMode, setApiMode, checkBackendHealth } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken());
  const [user, setUserState] = useState(getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [isLiveApi, setIsLiveApi] = useState(!isMockMode());
  const [healthStatus, setHealthStatus] = useState('Checking connection...');

  // Check backend connection on mount
  useEffect(() => {
    async function initCheck() {
      try {
        const health = await checkBackendHealth();
        setIsLiveApi(health.live);
        setHealthStatus(health.status);
      } catch (err) {
        setIsLiveApi(false);
        setHealthStatus('Mock Data Mode');
      } finally {
        setLoading(false);
      }
    }
    initCheck();
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.login(username, password);
    setTokenState(res.access_token);
    setUserState(res.user);
    return res;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setTokenState(null);
    setUserState(null);
  }, []);

  const toggleApiMode = useCallback((live) => {
    setApiMode(live);
    setIsLiveApi(live);
    setHealthStatus(live ? 'Connected to live backend' : 'Using local mock data engine');
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token),
    loading,
    isLiveApi,
    healthStatus,
    login,
    logout,
    toggleApiMode
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
