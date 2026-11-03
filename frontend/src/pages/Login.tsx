import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  InputAdornment,
  IconButton,
  Link,
  Chip,
} from '@mui/material';
import {
  CheckCircleOutline,
  FlashOn,
  Security,
  Visibility,
  VisibilityOff,
  LockOutlined,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { ApiStatusIndicator } from '../components/ApiStatusIndicator';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState<string>('admin@gestormei.com.br');
  const [loginPassword, setLoginPassword] = useState<string>('admin123');

  const getLoginErrorMessage = (err: any): string => {
    if (!err) return 'Erro inesperado ao realizar login.';
    const status = err.response?.status;
    const detail = err.response?.data?.detail;

    if (status === 401) {
      return 'E-mail ou senha incorretos.';
    }
    if (status === 404) {
      return 'Serviço de autenticação não encontrado. Verifique a conexão com o servidor.';
    }
    if (status === 403) {
      return typeof detail === 'string'
        ? detail
        : 'Acesso negado. Sua conta não possui permissão para acessar o sistema.';
    }
    if (status === 422) {
      return 'Por favor, informe um e-mail válido e preencha a senha.';
    }
    if (status && status >= 500) {
      return 'Erro interno do servidor. Tente novamente.';
    }
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return 'O servidor demorou para responder. Tente novamente em instantes.';
    }
    if (!err.response) {
      return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
    }
    return typeof detail === 'string' ? detail : 'Erro ao realizar login. Verifique suas credenciais.';
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrorMessage(null);
    setLoading(true);

    try {
      await login(loginEmail, loginPassword);
      navigate('/');
    } catch (err: any) {
      setErrorMessage(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'admin' | 'operador') => {
    if (role === 'admin') {
      setLoginEmail('admin@gestormei.com.br');
      setLoginPassword('admin123');
    } else {
      setLoginEmail('operador@gestormei.com.br');
      setLoginPassword('operador123');
    }
    setErrorMessage(null);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: { xs: 2, sm: 4 },
      }}
    >
      <Box sx={{ maxWidth: 440, width: '100%' }}>
        {/* Branding */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              bgcolor: 'primary.main',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 800,
              boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
              mb: 1.5,
            }}
          >
            MEI
          </Box>
          <Typography variant="h4" fontWeight={800} color="primary">
            GESTOR MEI
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Controle de Vendas, Caixa e Gestão Interna
          </Typography>
          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
            <ApiStatusIndicator size="small" />
          </Box>
        </Box>

        <Card elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box
            sx={{
              py: 2,
              px: 3,
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
            }}
          >
            <LockOutlined fontSize="small" />
            <Typography variant="subtitle1" fontWeight={700}>
              Acesso Restrito ao Sistema
            </Typography>
          </Box>

          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2.5 }}>
                {errorMessage}
              </Alert>
            )}

            <Box component="form" onSubmit={handleLoginSubmit}>
              <TextField
                fullWidth
                label="E-mail de Acesso"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                margin="normal"
                required
                autoFocus
                disabled={loading}
              />
              <TextField
                fullWidth
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                margin="normal"
                required
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="alternar visibilidade da senha"
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                        tabIndex={-1}
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.8, mb: 1.5 }}>
                <Link
                  component={RouterLink}
                  to="/esqueci-senha"
                  variant="body2"
                  color="primary"
                  sx={{
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Esqueceu sua senha?
                </Link>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 2, mb: 2, height: 48, fontWeight: 700 }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <CircularProgress size={22} color="inherit" />
                    <span>Entrando no Sistema...</span>
                  </Box>
                ) : (
                  'Entrar no Sistema'
                )}
              </Button>

              {/* 1-Click Demo Accounts */}
              <Paper
                variant="outlined"
                sx={{ p: 2, mt: 2, bgcolor: 'background.default', borderRadius: 2 }}
              >
                <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>
                  ACESSO RÁPIDO DE DEMONSTRAÇÃO:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    disabled={loading}
                    onClick={() => fillDemo('admin')}
                    startIcon={<Security fontSize="small" />}
                    sx={{ flexGrow: 1 }}
                  >
                    Dono (OWNER)
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    disabled={loading}
                    onClick={() => fillDemo('operador')}
                    startIcon={<FlashOn fontSize="small" />}
                    sx={{ flexGrow: 1 }}
                  >
                    Operador (Caixa)
                  </Button>
                </Box>
              </Paper>
            </Box>
          </CardContent>
        </Card>

        {/* Value props badges */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mt: 3, flexWrap: 'wrap' }}>
          <Chip icon={<CheckCircleOutline />} label="100% Multiempresa" size="small" variant="outlined" />
          <Chip icon={<CheckCircleOutline />} label="Segurança RBAC" size="small" variant="outlined" />
          <Chip icon={<CheckCircleOutline />} label="Venda em < 10 segundos" size="small" variant="outlined" />
        </Box>
      </Box>
    </Box>
  );
};
