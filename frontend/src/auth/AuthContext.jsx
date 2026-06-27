import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/client';

const TOKEN_STORAGE_KEY = 'lichvannien.auth.token';
const AuthContext = createContext(null);

function readStoredToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures; auth state still works for the current render tree.
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readStoredToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    storeToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const setSession = useCallback((nextToken, nextUser) => {
    storeToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const loadCurrentUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.me(token);
      setUser(response.data.user);
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession, token]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const login = useCallback(
    async (credentials) => {
      const response = await authApi.login(credentials);
      setSession(response.data.token, response.data.user);
      return response.data.user;
    },
    [setSession]
  );

  const register = useCallback(
    async (details) => {
      const response = await authApi.register(details);
      setSession(response.data.token, response.data.user);
      return response.data.user;
    },
    [setSession]
  );

  const logout = useCallback(async () => {
    const activeToken = token;

    try {
      if (activeToken) {
        await authApi.logout(activeToken);
      }
    } finally {
      clearSession();
    }
  }, [clearSession, token]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      reloadUser: loadCurrentUser,
    }),
    [loadCurrentUser, loading, login, logout, register, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
