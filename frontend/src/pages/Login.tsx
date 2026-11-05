import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Link,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Security,
  FlashOn,
  ArrowForward,
  MailOutline,
  LockOutlined,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/AuthLayout';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
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
      return 'E-mail ou senha incorretos. Por favor, verifique seus dados.';
    }
    if (status === 429) {
      return 'Muitas tentativas consecutivas de login detectadas. Por segurança, sua taxa de requisições foi limitada. Aguarde 1 minuto e tente novamente.';
    }
    if (status === 404) {
      return 'Serviço de autenticação não encontrado. Verifique se o servidor backend está online.';
    }
    if (status === 403) {
      return typeof detail === 'string'
        ? detail
        : 'Acesso negado. Sua conta não possui permissão para acessar o sistema.';
    }
    if (status === 422) {
      return 'Por favor, informe um endereço de e-mail válido e preencha a senha.';
    }
    if (status && status >= 500) {
      return 'Erro interno do servidor. Tente novamente em instantes.';
    }
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return 'O servidor demorou para responder. Tente novamente em instantes.';
    }
    if (!err.response) {
      return 'Não foi possível conectar ao servidor. Verifique se a API está online e se sua conexão está ativa.';
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
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Acesse seu painel com e-mail e senha para gerenciar seu negócio."
      badgeText="Acesso Seguro • TLS 1.3"
    >
      {errorMessage && (
        <Alert
          severity="error"
          onClose={() => setErrorMessage(null)}
          sx={{
            mb: 3,
            borderRadius: 2.5,
            borderLeft: '4px solid #ef4444',
            bgcolor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
            color: isDark ? '#fca5a5' : '#991b1b',
            '& .MuiAlert-icon': {
              color: '#ef4444',
            },
          }}
        >
          {errorMessage}
        </Alert>
      )}

      <Box component="form" onSubmit={handleLoginSubmit} noValidate>
        {/* Campo de E-mail */}
        <Box sx={{ mb: 2.5 }}>
          <Typography
            component="label"
            htmlFor="login-email"
            variant="caption"
            sx={{
              display: 'block',
              mb: 0.8,
              fontWeight: 700,
              fontSize: '0.82rem',
              color: isDark ? '#cbd5e1' : '#334155',
            }}
          >
            E-mail de Acesso
          </Typography>
          <TextField
            id="login-email"
            fullWidth
            placeholder="seu.email@empresa.com.br"
            type="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            required
            autoFocus
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MailOutline sx={{ fontSize: 20, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                '& fieldset': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0',
                },
                '&:hover fieldset': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : '#cbd5e1',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                  borderWidth: 1.5,
                },
                '&.Mui-focused': {
                  boxShadow: '0 0 0 3px rgba(2, 132, 199, 0.15)',
                },
              },
            }}
          />
        </Box>

        {/* Campo de Senha */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
            <Typography
              component="label"
              htmlFor="login-password"
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: '0.82rem',
                color: isDark ? '#cbd5e1' : '#334155',
              }}
            >
              Senha
            </Typography>
            <Link
              component={RouterLink}
              to="/esqueci-senha"
              variant="caption"
              color="primary"
              sx={{
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Esqueceu a senha?
            </Link>
          </Box>
          <TextField
            id="login-password"
            fullWidth
            placeholder="••••••••••••"
            type={showPassword ? 'text' : 'password'}
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            required
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined sx={{ fontSize: 20, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="alternar visibilidade da senha"
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                    tabIndex={-1}
                    disabled={loading}
                    size="small"
                    sx={{ color: 'text.secondary' }}
                  >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                '& fieldset': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0',
                },
                '&:hover fieldset': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : '#cbd5e1',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                  borderWidth: 1.5,
                },
                '&.Mui-focused': {
                  boxShadow: '0 0 0 3px rgba(2, 132, 199, 0.15)',
                },
              },
            }}
          />
        </Box>

        {/* Botão de Submissão Primário */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={loading}
          endIcon={!loading ? <ArrowForward fontSize="small" /> : undefined}
          sx={{
            mt: 2,
            mb: 3,
            height: 48,
            fontWeight: 800,
            fontSize: '0.96rem',
            borderRadius: 2.5,
            textTransform: 'none',
            background: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            '&:hover': {
              background: 'linear-gradient(180deg, #0369a1 0%, #075985 100%)',
              boxShadow: '0 6px 18px rgba(2, 132, 199, 0.45)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.2 }}>
              <CircularProgress size={20} color="inherit" thickness={4} />
              <span>Autenticando...</span>
            </Box>
          ) : (
            'Entrar no Sistema'
          )}
        </Button>

        {/* Divisor Elegante de Acesso Rápido */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            my: 2.5,
            '::before, ::after': {
              content: '""',
              flex: 1,
              borderBottom: '1px solid',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              px: 1.5,
              color: 'text.secondary',
              fontWeight: 700,
              fontSize: '0.74rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Acesso Rápido (Demonstração)
          </Typography>
        </Box>

        {/* Botões Segmentados de Preenchimento Demo */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1.5,
          }}
        >
          <Button
            type="button"
            variant="outlined"
            size="small"
            disabled={loading}
            onClick={() => fillDemo('admin')}
            startIcon={<Security sx={{ fontSize: 18 }} />}
            sx={{
              py: 1.2,
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0',
              color: isDark ? '#f1f5f9' : '#1e293b',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(248, 250, 252, 0.8)',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: isDark ? 'rgba(2, 132, 199, 0.08)' : 'rgba(2, 132, 199, 0.04)',
              },
            }}
          >
            Dono (OWNER)
          </Button>

          <Button
            type="button"
            variant="outlined"
            size="small"
            disabled={loading}
            onClick={() => fillDemo('operador')}
            startIcon={<FlashOn sx={{ fontSize: 18 }} />}
            sx={{
              py: 1.2,
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0',
              color: isDark ? '#f1f5f9' : '#1e293b',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(248, 250, 252, 0.8)',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: isDark ? 'rgba(2, 132, 199, 0.08)' : 'rgba(2, 132, 199, 0.04)',
              },
            }}
          >
            Operador (Caixa)
          </Button>
        </Box>
      </Box>
    </AuthLayout>
  );
};
