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
  Container,
} from '@mui/material';
import {
  CheckCircleOutline,
  FlashOn,
  Security,
  Visibility,
  VisibilityOff,
  LockOutlined,
  VerifiedUser,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { ApiStatusIndicator } from '../components/ApiStatusIndicator';
import logoOficial from '../assets/branding/gestor-mei-logo-tight.png';

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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'radial-gradient(ellipse at 50% 0%, #0d2847 0%, #071933 60%, #040d1a 100%)'
            : 'radial-gradient(ellipse at 50% 0%, #e3f2fd 0%, #f4f7fb 60%, #e8eef6 100%)',
        p: { xs: 2, sm: 3, md: 4 },
        position: 'relative',
      }}
    >
      <Container maxWidth="xs" sx={{ p: 0 }}>
        {/* Bloco de Branding Oficial */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {/* Logo Oficial com Container Refinado */}
          <Box
            sx={{
              display: 'inline-block',
              p: 1,
              borderRadius: 4,
              bgcolor: '#071933',
              boxShadow: '0 12px 32px rgba(7, 25, 51, 0.25)',
              mb: 2,
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'scale(1.02)',
              },
            }}
          >
            <Box
              component="img"
              src={logoOficial}
              alt="Logo Oficial Gestor MEI"
              sx={{
                width: { xs: 150, sm: 170 },
                height: 'auto',
                display: 'block',
                borderRadius: 2,
              }}
            />
          </Box>

          {/* Subtítulo Oficial */}
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: { xs: '0.85rem', sm: '0.92rem' },
              letterSpacing: '-0.01em',
              mb: 1,
            }}
          >
            ERP Inteligente para MEIs e Pequenos Negócios
          </Typography>

          {/* Status da API */}
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <ApiStatusIndicator size="small" />
          </Box>
        </Box>

        {/* Card Principal de Login */}
        <Card
          elevation={4}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Cabeçalho do Card */}
          <Box
            sx={{
              py: 1.8,
              px: 3,
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LockOutlined fontSize="small" />
              <Typography variant="subtitle2" fontWeight={700} sx={{ letterSpacing: '0.02em' }}>
                Acesso Seguro ao Sistema
              </Typography>
            </Box>
            <VerifiedUser sx={{ fontSize: 18, opacity: 0.85 }} />
          </Box>

          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
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
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 2 },
                }}
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
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 2 },
                }}
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
                    fontSize: '0.85rem',
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
                sx={{
                  mt: 1.5,
                  mb: 2,
                  height: 48,
                  fontWeight: 800,
                  fontSize: '0.98rem',
                  borderRadius: 2.5,
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(25, 118, 210, 0.35)',
                }}
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

              {/* Contas de Demonstração (1-Clique) */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mt: 2,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                  borderRadius: 2.5,
                }}
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
                    sx={{ flexGrow: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
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
                    sx={{ flexGrow: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    Operador (Caixa)
                  </Button>
                </Box>
              </Paper>
            </Box>
          </CardContent>
        </Card>

        {/* Badges de Valor */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3, flexWrap: 'wrap' }}>
          <Chip icon={<CheckCircleOutline />} label="Multiempresa" size="small" variant="outlined" sx={{ borderRadius: 2 }} />
          <Chip icon={<CheckCircleOutline />} label="Segurança RBAC" size="small" variant="outlined" sx={{ borderRadius: 2 }} />
          <Chip icon={<CheckCircleOutline />} label="PDV Instantâneo" size="small" variant="outlined" sx={{ borderRadius: 2 }} />
        </Box>

        {/* Assinatura Oficial Discreta */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.75rem',
              letterSpacing: '0.02em',
              opacity: 0.85,
            }}
          >
            Desenvolvido por <strong>LPTI Tech</strong> • Todos os direitos reservados
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
