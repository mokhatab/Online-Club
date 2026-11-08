import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    api.me()
      .then(({ user }) => setUser(user))
      .catch(() => tokenStore.set(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (data) => {
    const res = await api.login(data);
    tokenStore.set(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (data) => {
    const res = await api.register(data);
    tokenStore.set(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    tokenStore.set(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
