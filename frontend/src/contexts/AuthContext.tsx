import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { AuthToken, User, Empresa } from '../types';

interface AuthContextType {
  token: string | null;
  user: User | null;
  empresa: Empresa | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isConsultor: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('gestor_mei_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('gestor_mei_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [empresa, setEmpresa] = useState<Empresa | null>(() => {
    const saved = localStorage.getItem('gestor_mei_empresa');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      setEmpresa(response.data.empresa);
      localStorage.setItem('gestor_mei_user', JSON.stringify(response.data.user));
      localStorage.setItem('gestor_mei_empresa', JSON.stringify(response.data.empresa));
    } catch (error) {
      console.error('Failed to fetch user data', error);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUserData().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const response = await api.post<AuthToken>('/auth/login', { email, password });
    const data = response.data;
    
    setToken(data.access_token);
    localStorage.setItem('gestor_mei_token', data.access_token);
    
    // Fetch full profile
    const profileRes = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    
    setUser(profileRes.data.user);
    setEmpresa(profileRes.data.empresa);
    localStorage.setItem('gestor_mei_user', JSON.stringify(profileRes.data.user));
    localStorage.setItem('gestor_mei_empresa', JSON.stringify(profileRes.data.empresa));
  };

  const register = async (regData: any) => {
    const response = await api.post<AuthToken>('/auth/register', regData);
    const data = response.data;
    
    setToken(data.access_token);
    localStorage.setItem('gestor_mei_token', data.access_token);
    
    const profileRes = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    
    setUser(profileRes.data.user);
    setEmpresa(profileRes.data.empresa);
    localStorage.setItem('gestor_mei_user', JSON.stringify(profileRes.data.user));
    localStorage.setItem('gestor_mei_empresa', JSON.stringify(profileRes.data.empresa));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setEmpresa(null);
    localStorage.removeItem('gestor_mei_token');
    localStorage.removeItem('gestor_mei_user');
    localStorage.removeItem('gestor_mei_empresa');
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'ADMIN';
  const isConsultor = user?.role === 'CONSULTOR' || user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        empresa,
        isAuthenticated,
        isAdmin,
        isConsultor,
        isLoading,
        login,
        register,
        logout,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
