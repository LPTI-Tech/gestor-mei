import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/Layout';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Vendas } from './pages/Vendas';
import { PedidosEntrega } from './pages/PedidosEntrega';
import { RegioesEntrega } from './pages/RegioesEntrega';
import { RelatorioEntregas } from './pages/RelatorioEntregas';
import { Clientes } from './pages/Clientes';
import { Produtos } from './pages/Produtos';
import { Estoque } from './pages/Estoque';
import { Caixa } from './pages/Caixa';
import { Despesas } from './pages/Despesas';
import { ControleDas } from './pages/ControleDas';
import { Motoboys } from './pages/Motoboys';
import { IFood } from './pages/IFood';
import { RelatorioMei } from './pages/RelatorioMei';
import { SaudeNegocioPage } from './pages/SaudeNegocio';
import { Usuarios } from './pages/Usuarios';
import { Configuracoes } from './pages/Configuracoes';

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="vendas" element={<Vendas />} />
              <Route path="pedidos-entrega" element={<PedidosEntrega />} />
              <Route path="regioes-entrega" element={<RegioesEntrega />} />
              <Route path="relatorio-entregas" element={<RelatorioEntregas />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="produtos" element={<Produtos />} />
              <Route path="estoque" element={<Estoque />} />
              <Route path="caixa" element={<Caixa />} />
              <Route path="despesas" element={<Despesas />} />
              <Route path="das" element={<ControleDas />} />
              <Route path="motoboys" element={<Motoboys />} />
              <Route path="ifood" element={<IFood />} />
              <Route path="relatorio-mei" element={<RelatorioMei />} />
              <Route path="saude-negocio" element={<SaudeNegocioPage />} />

              {/* Admin Only */}
              <Route
                path="usuarios"
                element={
                  <ProtectedRoute adminOnly>
                    <Usuarios />
                  </ProtectedRoute>
                }
              />
              <Route
                path="configuracoes"
                element={
                  <ProtectedRoute adminOnly>
                    <Configuracoes />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
