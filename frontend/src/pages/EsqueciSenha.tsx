import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  EmailOutlined,
  CheckCircle,
  MailOutline,
  Send,
} from '@mui/icons-material';
import api from '../services/api';
import { AuthLayout } from '../components/AuthLayout';

export const EsqueciSenha: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !email.trim()) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/esqueci-senha', { email: email.trim() });
      setSuccessMessage(
        res.data?.mensagem ||
          'Se existir uma conta vinculada a este e-mail, você receberá instruções para redefinir sua senha.'
      );
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 429) {
        setErrorMessage(
          'Muitas solicitações de recuperação detectadas para este IP. Por segurança, aguarde alguns instantes antes de tentar novamente.'
        );
      } else if (status && status >= 500) {
        setErrorMessage('Erro interno do servidor. Tente novamente em instantes.');
      } else {
        setErrorMessage(
          typeof detail === 'string'
            ? detail
            : 'Erro ao processar solicitação. Verifique se o e-mail está correto e tente novamente.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Recuperar Senha"
      subtitle="Informe o e-mail cadastrado na sua conta para enviarmos o link seguro de redefinição."
      badgeText="Recuperação Segura • Expiração em 15min"
      backTo="/login"
      backText="← Voltar ao login"
    >
      {successMessage ? (
        <Box sx={{ py: 1 }}>
          <Alert
            severity="success"
            icon={<CheckCircle sx={{ color: '#10b981', fontSize: 24 }} />}
            sx={{
              mb: 3,
              borderRadius: 3,
              borderLeft: '4px solid #10b981',
              bgcolor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
              color: isDark ? '#6ee7b7' : '#065f46',
              p: 2,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.6 }}>
              Solicitação Enviada com Sucesso
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.88rem', lineHeight: 1.5 }}>
              {successMessage}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 1.5,
                color: isDark ? '#a7f3d0' : '#047857',
                fontWeight: 600,
              }}
            >
              • Verifique sua caixa de entrada e pasta de spam.<br />
              • Por segurança, o link tem validade estrita de <strong>15 minutos</strong>.
            </Typography>
          </Alert>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => navigate('/login')}
            startIcon={<ArrowBack />}
            sx={{
              height: 48,
              fontWeight: 800,
              borderRadius: 2.5,
              textTransform: 'none',
              background: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
            }}
          >
            Voltar para o Login
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleSubmit} noValidate>
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
              }}
            >
              {errorMessage}
            </Alert>
          )}

          <Box sx={{ mb: 2.5 }}>
            <Typography
              component="label"
              htmlFor="recovery-email"
              variant="caption"
              sx={{
                display: 'block',
                mb: 0.8,
                fontWeight: 700,
                fontSize: '0.82rem',
                color: isDark ? '#cbd5e1' : '#334155',
              }}
            >
              E-mail da sua Conta
            </Typography>
            <TextField
              id="recovery-email"
              fullWidth
              placeholder="exemplo@gestormei.com.br"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading || !email.trim()}
            endIcon={!loading ? <Send sx={{ fontSize: 18 }} /> : undefined}
            sx={{
              mt: 1.5,
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
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.2 }}>
                <CircularProgress size={20} color="inherit" thickness={4} />
                <span>Enviando Instruções...</span>
              </Box>
            ) : (
              'Enviar Link de Recuperação'
            )}
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Link
              component={RouterLink}
              to="/login"
              variant="body2"
              sx={{
                color: 'text.secondary',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.84rem',
                '&:hover': { color: 'primary.main', textDecoration: 'underline' },
              }}
            >
              <ArrowBack sx={{ fontSize: 16 }} /> Voltar para o Login
            </Link>
          </Box>
        </Box>
      )}
    </AuthLayout>
  );
};
