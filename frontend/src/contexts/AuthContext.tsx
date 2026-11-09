import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { AuthToken, User, Empresa } from '../types';

interface AuthContextType {
  token: string | null;
  user: User | null;
  empresa: Empresa | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isMaster: boolean;
  isConsultor: boolean;
  isOperator: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithMicrosoft: (token: string, tokenType?: string) => Promise<void>;
  setContextEmpresaId: (empresaId: number | null) => Promise<void>;
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
      const response = await api.get('/api/auth/me');
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

  const handlePostAuthSuccess = async (accessToken: string) => {
    setToken(accessToken);
    localStorage.setItem('gestor_mei_token', accessToken);

    const profileRes = await api.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    setUser(profileRes.data.user);
    setEmpresa(profileRes.data.empresa);
    localStorage.setItem('gestor_mei_user', JSON.stringify(profileRes.data.user));
    localStorage.setItem('gestor_mei_empresa', JSON.stringify(profileRes.data.empresa));
  };

  const login = async (email: string, password: string) => {
    const response = await api.post<AuthToken>('/api/auth/login', { email, password });
    await handlePostAuthSuccess(response.data.access_token);
  };

  const loginWithGoogle = async (credential: string) => {
    const response = await api.post<AuthToken>('/api/auth/google', { credential });
    await handlePostAuthSuccess(response.data.access_token);
  };

  const loginWithMicrosoft = async (tokenStr: string, tokenType: string = 'access_token') => {
    const response = await api.post<AuthToken>('/api/auth/microsoft', {
      token: tokenStr,
      token_type: tokenType,
    });
    await handlePostAuthSuccess(response.data.access_token);
  };

  const setContextEmpresaId = async (empresaId: number | null) => {
    if (empresaId) {
      localStorage.setItem('gestor_mei_active_empresa_id', String(empresaId));
    } else {
      localStorage.removeItem('gestor_mei_active_empresa_id');
    }
    await refreshUserData();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setEmpresa(null);
    localStorage.removeItem('gestor_mei_token');
    localStorage.removeItem('gestor_mei_user');
    localStorage.removeItem('gestor_mei_empresa');
    localStorage.removeItem('gestor_mei_active_empresa_id');
  };

  const isAuthenticated = !!token && !!user;
  const isMaster = user?.role === 'MASTER';
  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const isOperator = user?.role === 'OPERATOR' || user?.role === 'OPERADOR';
  const isAdmin = isOwner || isMaster;
  const isConsultor = user?.role === 'CONSULTOR' || isMaster;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        empresa,
        isAuthenticated,
        isAdmin,
        isOwner,
        isMaster,
        isConsultor,
        isOperator,
        isLoading,
        login,
        loginWithGoogle,
        loginWithMicrosoft,
        setContextEmpresaId,
        logout,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
