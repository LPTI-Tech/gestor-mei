import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Security,
  FlashOn,
  ArrowForward,
  MailOutline,
  LockOutlined,
  HelpOutline,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/AuthLayout';

// SVG Oficial Google
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: 10 }}>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

// SVG Oficial Microsoft (4 cores)
const MicrosoftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 23 23" style={{ marginRight: 10 }}>
    <path fill="#f35325" d="M1 1h10v10H1z" />
    <path fill="#81bc06" d="M12 1h10v10H12z" />
    <path fill="#05a6f0" d="M1 12h10v10H1z" />
    <path fill="#ffba08" d="M12 12h10v10H12z" />
  </svg>
);

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { login, loginWithGoogle, loginWithMicrosoft } = useAuth();

  const [loading, setLoading] = useState<boolean>(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'microsoft' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState<string>('admin@gestormei.com.br');
  const [loginPassword, setLoginPassword] = useState<string>('admin123');

  // Modal de Simulação / Configuração OAuth
  const [oauthModalOpen, setOauthModalOpen] = useState(false);
  const [oauthModalProvider, setOauthModalProvider] = useState<'google' | 'microsoft'>('google');
  const [customOauthEmail, setCustomOauthEmail] = useState('drrestaurantebetim@hotmail.com');

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const microsoftClientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;

  // Carrega SDK do Google Identity Services dinamicamente se configurado
  useEffect(() => {
    if (googleClientId && !(window as any).google?.accounts?.id) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        try {
          (window as any).google?.accounts?.id.initialize({
            client_id: googleClientId,
            callback: async (response: any) => {
              if (response?.credential) {
                setSocialLoading('google');
                try {
                  await loginWithGoogle(response.credential);
                  navigate('/');
                } catch (err: any) {
                  setErrorMessage(getLoginErrorMessage(err));
                } finally {
                  setSocialLoading(null);
                }
              }
            },
          });
        } catch (e) {
          console.warn('Erro ao inicializar Google Identity Services:', e);
        }
      };
      document.body.appendChild(script);
    }
  }, [googleClientId]);

  const getLoginErrorMessage = (err: any): string => {
    if (!err) return 'Erro inesperado ao realizar login.';
    const status = err.response?.status;
    const detail = err.response?.data?.detail;

    if (status === 401) {
      return 'E-mail ou senha incorretos. Por favor, verifique seus dados.';
    }
    if (status === 429) {
      return 'Muitas tentativas consecutivas de login detectadas. Por segurança, aguarde 1 minuto e tente novamente.';
    }
    if (status === 404) {
      return 'Serviço de autenticação não encontrado. Verifique se o backend está online.';
    }
    if (status === 403) {
      return typeof detail === 'string'
        ? detail
        : 'Acesso negado. Sua conta não possui permissão para acessar o sistema ou não está vinculada a nenhuma empresa.';
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
    if (loading || socialLoading) return;
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

  const handleGoogleClick = () => {
    setErrorMessage(null);
    if (googleClientId && (window as any).google?.accounts?.id) {
      // Exibe prompt One-tap ou popup do Google Identity Services
      try {
        (window as any).google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Abre modal assistido se o prompt for bloqueado pelo navegador
            setOauthModalProvider('google');
            setOauthModalOpen(true);
          }
        });
      } catch (err) {
        setOauthModalProvider('google');
        setOauthModalOpen(true);
      }
    } else {
      // Abre assistente de login social / teste para desenvolvedor
      setOauthModalProvider('google');
      setOauthModalOpen(true);
    }
  };

  const handleMicrosoftClick = () => {
    setErrorMessage(null);
    if (microsoftClientId) {
      // Redireciona para o fluxo OAuth da Microsoft Identity Platform
      const redirectUri = encodeURIComponent(`${window.location.origin}/login`);
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${microsoftClientId}&response_type=token&redirect_uri=${redirectUri}&scope=User.Read%20openid%20profile%20email&response_mode=fragment`;
      window.location.href = authUrl;
    } else {
      setOauthModalProvider('microsoft');
      setOauthModalOpen(true);
    }
  };

  const handleExecuteSocialLoginMock = async () => {
    setOauthModalOpen(false);
    setErrorMessage(null);
    const targetEmail = customOauthEmail.trim().toLowerCase();

    if (oauthModalProvider === 'google') {
      setSocialLoading('google');
      try {
        await loginWithGoogle(`mock-google-uid_${Date.now()}:${targetEmail}`);
        navigate('/');
      } catch (err: any) {
        setErrorMessage(getLoginErrorMessage(err));
      } finally {
        setSocialLoading(null);
      }
    } else {
      setSocialLoading('microsoft');
      try {
        await loginWithMicrosoft(`mock-microsoft-uid_${Date.now()}:${targetEmail}`, 'access_token');
        navigate('/');
      } catch (err: any) {
        setErrorMessage(getLoginErrorMessage(err));
      } finally {
        setSocialLoading(null);
      }
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
      subtitle="Acesse seu painel com sua conta Google, Microsoft ou credenciais locais."
      badgeText="Acesso Seguro • OpenID & TLS 1.3"
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

      {/* ==================================================================== */}
      {/* SPRINT RBAC 03: BOTÕES DE LOGIN SOCIAL (GOOGLE E MICROSOFT) */}
      {/* ==================================================================== */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
        <Button
          fullWidth
          variant="outlined"
          size="large"
          disabled={loading || socialLoading !== null}
          onClick={handleGoogleClick}
          sx={{
            height: 46,
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.92rem',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
            color: isDark ? '#f8fafc' : '#1e293b',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
            '&:hover': {
              borderColor: '#4285F4',
              bgcolor: isDark ? 'rgba(66, 133, 244, 0.08)' : 'rgba(66, 133, 244, 0.04)',
            },
          }}
        >
          {socialLoading === 'google' ? (
            <CircularProgress size={20} sx={{ color: '#4285F4', mr: 1 }} />
          ) : (
            <GoogleIcon />
          )}
          <span>Entrar com Google</span>
        </Button>

        <Button
          fullWidth
          variant="outlined"
          size="large"
          disabled={loading || socialLoading !== null}
          onClick={handleMicrosoftClick}
          sx={{
            height: 46,
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.92rem',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
            color: isDark ? '#f8fafc' : '#1e293b',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
            '&:hover': {
              borderColor: '#05a6f0',
              bgcolor: isDark ? 'rgba(5, 166, 240, 0.08)' : 'rgba(5, 166, 240, 0.04)',
            },
          }}
        >
          {socialLoading === 'microsoft' ? (
            <CircularProgress size={20} sx={{ color: '#05a6f0', mr: 1 }} />
          ) : (
            <MicrosoftIcon />
          )}
          <span>Entrar com Microsoft</span>
        </Button>
      </Box>

      {/* Divisor Visual */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 3,
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
          Ou entre com e-mail e senha
        </Typography>
      </Box>

      {/* Formulário de Acesso Tradicional com Senha */}
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
            disabled={loading || socialLoading !== null}
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
                '& fieldset': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0',
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
            disabled={loading || socialLoading !== null}
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
                '& fieldset': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0',
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
          disabled={loading || socialLoading !== null}
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
            '&:hover': {
              background: 'linear-gradient(180deg, #0369a1 0%, #075985 100%)',
            },
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.2 }}>
              <CircularProgress size={20} color="inherit" thickness={4} />
              <span>Autenticando...</span>
            </Box>
          ) : (
            'Entrar com Senha'
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
            disabled={loading || socialLoading !== null}
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
            }}
          >
            Dono (OWNER)
          </Button>

          <Button
            type="button"
            variant="outlined"
            size="small"
            disabled={loading || socialLoading !== null}
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
            }}
          >
            Operador (Caixa)
          </Button>
        </Box>
      </Box>

      {/* ==================================================================== */}
      {/* DIÁLOGO ASSISTIDO DE LOGIN SOCIAL / HOMOLOGAÇÃO MULTIEMPRESA */}
      {/* ==================================================================== */}
      <Dialog
        open={oauthModalOpen}
        onClose={() => setOauthModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            bgcolor: isDark ? '#1e293b' : '#ffffff',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          {oauthModalProvider === 'google' ? <GoogleIcon /> : <MicrosoftIcon />}
          <span>Login com {oauthModalProvider === 'google' ? 'Google' : 'Microsoft'}</span>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            A autenticação social vincula instantaneamente o seu perfil ao tenant da sua empresa através de OpenID Connect.
          </Typography>

          <Box sx={{ mb: 2.5 }}>
            <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.8 }}>
              E-mail da sua conta {oauthModalProvider === 'google' ? 'Google' : 'Microsoft'}:
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={customOauthEmail}
              onChange={(e) => setCustomOauthEmail(e.target.value)}
              placeholder="ex: drrestaurantebetim@hotmail.com"
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setCustomOauthEmail('drrestaurantebetim@hotmail.com')}
              sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 2 }}
            >
              Rosely (RD Restaurante)
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setCustomOauthEmail('admin@gestormei.com.br')}
              sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 2 }}
            >
              Leonidas (Admin)
            </Button>
          </Box>

          <Alert severity="info" sx={{ mt: 2, fontSize: '0.78rem' }}>
            ℹ️ <strong>Vinculação Multiempresa:</strong> O e-mail informado será verificado pelo provedor e vinculado automaticamente ao cadastro da sua empresa. Se o e-mail não estiver cadastrado, o acesso será bloqueado por segurança.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOauthModalOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleExecuteSocialLoginMock}
            sx={{
              fontWeight: 700,
              bgcolor: oauthModalProvider === 'google' ? '#4285F4' : '#05a6f0',
              '&:hover': {
                bgcolor: oauthModalProvider === 'google' ? '#3367d6' : '#0487c5',
              },
            }}
          >
            Autenticar Agora
          </Button>
        </DialogActions>
      </Dialog>
    </AuthLayout>
  );
};
