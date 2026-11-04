import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  useEffect(() => {
    const saved = localStorage.getItem('resq_user');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = useCallback((email) => {
    const profile = { id: 'usr_' + Math.random().toString(36).slice(2), email, role: 'community_reporter' };
    localStorage.setItem('resq_user', JSON.stringify(profile));
    setUser(profile);
    return profile;
  }, []);

  const register = useCallback((email, fullName, phone) => {
    const profile = {
      id: 'usr_' + Math.random().toString(36).slice(2),
      email,
      fullName,
      phone,
      role: 'community_reporter',
    };
    localStorage.setItem('resq_user', JSON.stringify(profile));
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('resq_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, authMode, setAuthMode, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};