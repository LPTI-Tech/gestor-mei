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

// SVG Oficial Google
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 8, flexShrink: 0 }}>
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
  <svg width="18" height="18" viewBox="0 0 23 23" style={{ marginRight: 8, flexShrink: 0 }}>
    <path fill="#f35325" d="M1 1h10v10H1z" />
    <path fill="#81bc06" d="M12 1h10v10H12z" />
    <path fill="#05a6f0" d="M1 12h10v10H1z" />
    <path fill="#ffba08" d="M12 12h10v10H12z" />
  </svg>
);

// Identifica se o ambiente é de desenvolvimento local (oculto em qualquer domínio de produção/staging)
const isDevOrHomolog = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    Boolean(import.meta.env.DEV)
  );
};

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { login, loginWithGoogle, loginWithMicrosoft } = useAuth();

  const [loading, setLoading] = useState<boolean>(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'microsoft' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form state: em dev/homolog mantém atalhos convenientes; em produção inicia limpo
  const [loginEmail, setLoginEmail] = useState<string>(
    isDevOrHomolog() ? 'admin@gestormei.com.br' : ''
  );
  const [loginPassword, setLoginPassword] = useState<string>(
    isDevOrHomolog() ? 'admin123' : ''
  );

  // Modal de Simulação / Configuração OAuth (Fallback Dev)
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
      try {
        (window as any).google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setOauthModalProvider('google');
            setOauthModalOpen(true);
          }
        });
      } catch (err) {
        setOauthModalProvider('google');
        setOauthModalOpen(true);
      }
    } else {
      setOauthModalProvider('google');
      setOauthModalOpen(true);
    }
  };

  const handleMicrosoftClick = () => {
    setErrorMessage(null);
    if (microsoftClientId) {
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

  // LOGIN 2.3: Inputs com fundo branco, border-radius 6px, altura 42px
  const sentinelInputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '6px',
      height: 42,
      color: '#0F172A',
      bgcolor: '#FFFFFF',
      transition: 'all 0.2s ease-in-out',
      '& fieldset': {
        borderColor: '#CBD5E1',
        transition: 'all 0.2s ease-in-out',
      },
      '&:hover': {
        bgcolor: '#FAFAFA',
      },
      '&:hover fieldset': {
        borderColor: '#94a3b8',
      },
      '&.Mui-focused': {
        bgcolor: '#FFFFFF !important',
        color: '#0F172A !important',
        boxShadow: '0 0 0 3px rgba(2, 132, 199, 0.15)',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#0284c7 !important',
        borderWidth: '1.5px',
      },
      '& input': {
        color: '#0F172A !important',
        fontSize: '0.84rem',
        backgroundColor: 'transparent !important',
        '&:focus': {
          backgroundColor: 'transparent !important',
          color: '#0F172A !important',
          outline: 'none',
        },
      },
      '& input::placeholder': {
        color: '#94a3b8',
        opacity: 1,
        fontSize: '0.8rem',
      },
      '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active': {
        WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset !important',
        WebkitTextFillColor: '#0F172A !important',
        caretColor: '#0F172A',
        transition: 'background-color 5000s ease-in-out 0s',
      },
    },
  };

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Entre para continuar"
      badgeText="🔒 Seus dados protegidos"
      securitySubtext="🔒 Controle seguro de acesso"
    >
      {errorMessage && (
        <Alert
          severity="error"
          onClose={() => setErrorMessage(null)}
          sx={{
            mb: 2,
            py: 0.5,
            borderRadius: 2,
            borderLeft: '4px solid #ef4444',
            bgcolor: '#fef2f2',
            color: '#991b1b',
            fontSize: '0.82rem',
            '& .MuiAlert-icon': {
              color: '#ef4444',
            },
          }}
        >
          {errorMessage}
        </Alert>
      )}

      {/* ==================================================================== */}
      {/* SPRINT UX LOGIN 2.0: BOTÕES SOCIAIS COMPACTOS (GOOGLE E MICROSOFT) */}
      {/* ==================================================================== */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 0.8,
          mb: 0.8,
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          size="small"
          disabled={loading || socialLoading !== null}
          onClick={handleGoogleClick}
          sx={{
            height: 38,
            borderRadius: '6px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.82rem',
            borderColor: '#CBD5E1',
            bgcolor: '#FFFFFF',
            color: '#374151',
            boxShadow: 'none',
            '&:hover': {
              borderColor: '#4285F4',
              bgcolor: 'rgba(66, 133, 244, 0.06)',
            },
          }}
        >
          {socialLoading === 'google' ? (
            <CircularProgress size={15} sx={{ color: '#4285F4', mr: 0.8 }} />
          ) : (
            <GoogleIcon />
          )}
          <span>Google</span>
        </Button>

        <Button
          fullWidth
          variant="outlined"
          size="small"
          disabled={loading || socialLoading !== null}
          onClick={handleMicrosoftClick}
          sx={{
            height: 38,
            borderRadius: '6px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.82rem',
            borderColor: '#CBD5E1',
            bgcolor: '#FFFFFF',
            color: '#374151',
            boxShadow: 'none',
            '&:hover': {
              borderColor: '#05a6f0',
              bgcolor: 'rgba(5, 166, 240, 0.06)',
            },
          }}
        >
          {socialLoading === 'microsoft' ? (
            <CircularProgress size={15} sx={{ color: '#05a6f0', mr: 0.8 }} />
          ) : (
            <MicrosoftIcon />
          )}
          <span>Microsoft</span>
        </Button>
      </Box>

      {/* Divisor Visual: ──────── ou ──────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          my: 0.6,
          '::before, ::after': {
            content: '""',
            flex: 1,
            borderBottom: '1px solid #E2E8F0',
          },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            px: 1,
            color: '#94a3b8',
            fontWeight: 500,
            fontSize: '0.7rem',
          }}
        >
          ou
        </Typography>
      </Box>

      {/* Formulário de Acesso Tradicional com Senha */}
      <Box component="form" onSubmit={handleLoginSubmit} noValidate>
        {/* Campo de Email */}
        <Box sx={{ mb: 0.8 }}>
          <Typography
            component="label"
            htmlFor="login-email"
            variant="caption"
            sx={{
              display: 'block',
              mb: 0.2,
              fontWeight: 600,
              fontSize: '0.74rem',
              color: '#374151',
            }}
          >
            Email
          </Typography>
          <TextField
            id="login-email"
            fullWidth
            size="small"
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
                  <MailOutline sx={{ fontSize: 16, color: '#94a3b8' }} />
                </InputAdornment>
              ),
            }}
            sx={sentinelInputSx}
          />
        </Box>

        {/* Campo de Senha com Link Esqueceu a Senha */}
        <Box sx={{ mb: 0.8 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.2 }}>
            <Typography
              component="label"
              htmlFor="login-password"
              variant="caption"
              sx={{
                fontWeight: 600,
                fontSize: '0.74rem',
                color: '#374151',
              }}
            >
              Senha
            </Typography>
            <Link
              component={RouterLink}
              to="/esqueci-senha"
              variant="caption"
              sx={{
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.72rem',
                color: '#0284c7',
                '&:hover': { color: '#0369a1', textDecoration: 'underline' },
              }}
            >
              Esqueceu a senha?
            </Link>
          </Box>
          <TextField
            id="login-password"
            fullWidth
            size="small"
            placeholder="••••••••••••"
            type={showPassword ? 'text' : 'password'}
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            required
            disabled={loading || socialLoading !== null}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined sx={{ fontSize: 16, color: '#94a3b8' }} />
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
                    sx={{ color: '#64748b' }}
                  >
                    {showPassword ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={sentinelInputSx}
          />
        </Box>

        {/* Botão Entrar */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading || socialLoading !== null}
          endIcon={!loading ? <ArrowForward sx={{ fontSize: 16 }} /> : undefined}
          sx={{
            mt: 1.2,
            height: 42,
            fontWeight: 700,
            fontSize: '0.9rem',
            borderRadius: '6px',
            textTransform: 'none',
            background: '#0284c7',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: '#0369a1',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.45)',
              transform: 'translateY(-1px)',
            },
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <CircularProgress size={15} color="inherit" thickness={4} />
              <span>Entrando...</span>
            </Box>
          ) : (
            'Entrar'
          )}
        </Button>

        {/* ALTERAÇÃO 4: Atalhos Demo (Exibidos APENAS em localhost ou desenvolvimento local) */}
        {isDevOrHomolog() && (
          <Box
            sx={{
              mt: 1,
              pt: 0.8,
              borderTop: '1px dashed #CBD5E1',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                mb: 0.4,
                color: '#94a3b8',
                fontWeight: 600,
                fontSize: '0.64rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Ambiente de Testes • Acesso Rápido
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.8 }}>
              <Button
                type="button"
                variant="outlined"
                size="small"
                disabled={loading || socialLoading !== null}
                onClick={() => fillDemo('admin')}
                startIcon={<Security sx={{ fontSize: 14 }} />}
                sx={{
                  py: 0.4,
                  height: 30,
                  borderRadius: '6px',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  borderColor: '#CBD5E1',
                  color: '#374151',
                  bgcolor: '#F8FAFC',
                  '&:hover': {
                    borderColor: '#94a3b8',
                    bgcolor: '#F1F5F9',
                  },
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
                startIcon={<FlashOn sx={{ fontSize: 14 }} />}
                sx={{
                  py: 0.4,
                  height: 30,
                  borderRadius: '6px',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  borderColor: '#CBD5E1',
                  color: '#374151',
                  bgcolor: '#F8FAFC',
                  '&:hover': {
                    borderColor: '#94a3b8',
                    bgcolor: '#F1F5F9',
                  },
                }}
              >
                Operador (Caixa)
              </Button>
            </Box>
          </Box>
        )}
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
export default Login;
