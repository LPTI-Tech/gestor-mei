import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/Layout';

// Pages
import { Login } from './pages/Login';
import { EsqueciSenha } from './pages/EsqueciSenha';
import { RedefinirSenha } from './pages/RedefinirSenha';
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
import { ImportarNfe } from './pages/ImportarNfe';
import { Compras } from './pages/Compras';
import { DetalheCompra } from './pages/DetalheCompra';
import { NovaCompraManual } from './pages/NovaCompraManual';
import { PainelConsultor } from './pages/PainelConsultor';
import { Motoboys } from './pages/Motoboys';
import { IFood } from './pages/IFood';
import { RelatorioMei } from './pages/RelatorioMei';
import { SaudeNegocioPage } from './pages/SaudeNegocio';
import { Usuarios } from './pages/Usuarios';
import { Configuracoes } from './pages/Configuracoes';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
  adminOrConsultorOnly?: boolean;
}> = ({
  children,
  adminOnly = false,
  adminOrConsultorOnly = false,
}) => {
  const { isAuthenticated, isAdmin, isConsultor, isLoading } = useAuth();

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

  if (adminOrConsultorOnly && !isAdmin && !isConsultor) {
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
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />

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
              {/* Rotas de Gestão Executiva / Consultoria (Bloqueadas para OPERATOR) */}
              <Route path="despesas" element={<ProtectedRoute adminOrConsultorOnly><Despesas /></ProtectedRoute>} />
              <Route path="das" element={<ProtectedRoute adminOrConsultorOnly><ControleDas /></ProtectedRoute>} />
              <Route path="nfe" element={<ProtectedRoute adminOrConsultorOnly><ImportarNfe /></ProtectedRoute>} />
              <Route path="compras" element={<ProtectedRoute adminOrConsultorOnly><Compras /></ProtectedRoute>} />
              <Route path="compras/nova" element={<ProtectedRoute adminOrConsultorOnly><NovaCompraManual /></ProtectedRoute>} />
              <Route path="compras/:id" element={<ProtectedRoute adminOrConsultorOnly><DetalheCompra /></ProtectedRoute>} />
              <Route path="consultor" element={<ProtectedRoute adminOrConsultorOnly><PainelConsultor /></ProtectedRoute>} />
              <Route path="relatorio-mei" element={<ProtectedRoute adminOrConsultorOnly><RelatorioMei /></ProtectedRoute>} />
              <Route path="saude-negocio" element={<ProtectedRoute adminOrConsultorOnly><SaudeNegocioPage /></ProtectedRoute>} />

              {/* Módulos Operacionais */}
              <Route path="motoboys" element={<Motoboys />} />
              <Route path="ifood" element={<IFood />} />

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
