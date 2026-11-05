import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Chip,
  useTheme,
} from '@mui/material';
import {
  LockReset,
  Visibility,
  VisibilityOff,
  CheckCircle,
  ErrorOutline,
  ArrowBack,
  LockOutlined,
  Save,
} from '@mui/icons-material';
import api from '../services/api';
import { AuthLayout } from '../components/AuthLayout';

export const RedefinirSenha: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Validation state
  const [validating, setValidating] = useState<boolean>(true);
  const [tokenValido, setTokenValido] = useState<boolean>(false);
  const [emailMascarado, setEmailMascarado] = useState<string | null>(null);
  const [tokenErrorMsg, setTokenErrorMsg] = useState<string | null>(null);

  // Form state
  const [novaSenha, setNovaSenha] = useState<string>('');
  const [confirmarSenha, setConfirmarSenha] = useState<string>('');
  const [showNovaSenha, setShowNovaSenha] = useState<boolean>(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setTokenValido(false);
      setTokenErrorMsg('Link de redefinição incompleto ou inválido. O parâmetro criptográfico não foi detectado.');
      return;
    }

    const validarToken = async () => {
      try {
        setValidating(true);
        const res = await api.get('/auth/validar-token-reset', { params: { token } });
        setTokenValido(true);
        setEmailMascarado(res.data?.email_mascarado || null);
      } catch (err: any) {
        setTokenValido(false);
        const detail = err.response?.data?.detail;
        setTokenErrorMsg(
          typeof detail === 'string'
            ? detail
            : 'Este link de redefinição expirou (validade máxima de 15 minutos) ou já foi utilizado.'
        );
      } finally {
        setValidating(false);
      }
    };

    validarToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMessage(null);

    if (novaSenha.length < 6) {
      setErrorMessage('A nova senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErrorMessage('A confirmação não coincide com a nova senha digitada.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/auth/redefinir-senha', {
        token,
        nova_senha: novaSenha,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorMessage(typeof detail === 'string' ? detail : 'Erro ao redefinir senha. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Criar Nova Senha"
      subtitle="Defina sua nova credencial de acesso para recuperar o controle da sua conta."
      badgeText="Redefinição Segura • Criptografia Bcrypt"
      backTo="/login"
      backText="← Voltar ao login"
    >
      {validating ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <CircularProgress size={36} color="primary" sx={{ mb: 2 }} />
          <Typography variant="body1" sx={{ fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a' }}>
            Validando token de segurança...
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            Verificando assinatura criptográfica e janela de validade de 15 minutos.
          </Typography>
        </Box>
      ) : !tokenValido ? (
        <Box sx={{ py: 1 }}>
          <Alert
            severity="error"
            icon={<ErrorOutline sx={{ color: '#ef4444', fontSize: 24 }} />}
            sx={{
              mb: 3,
              borderRadius: 3,
              borderLeft: '4px solid #ef4444',
              bgcolor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
              color: isDark ? '#fca5a5' : '#991b1b',
              p: 2,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Link Expirado ou Inválido
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.88rem' }}>
              {tokenErrorMsg}
            </Typography>
          </Alert>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => navigate('/esqueci-senha')}
            startIcon={<LockReset />}
            sx={{
              height: 48,
              fontWeight: 800,
              borderRadius: 2.5,
              textTransform: 'none',
              background: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
              mb: 1.5,
            }}
          >
            Solicitar Novo Link de Recuperação
          </Button>

          <Button
            fullWidth
            variant="outlined"
            onClick={() => navigate('/login')}
            startIcon={<ArrowBack />}
            sx={{
              height: 44,
              fontWeight: 700,
              borderRadius: 2.5,
              textTransform: 'none',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0',
              color: isDark ? '#f1f5f9' : '#334155',
            }}
          >
            Voltar para o Login
          </Button>
        </Box>
      ) : success ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CheckCircle sx={{ fontSize: 60, color: '#10b981', mb: 1.5 }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: isDark ? '#34d399' : '#059669',
              mb: 1,
            }}
          >
            Senha Atualizada com Sucesso!
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, maxWidth: 360, mx: 'auto' }}>
            Sua nova senha já está ativa no sistema. Você será redirecionado para a tela de login em alguns segundos...
          </Typography>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => navigate('/login')}
            sx={{
              height: 48,
              fontWeight: 800,
              borderRadius: 2.5,
              textTransform: 'none',
              background: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
            }}
          >
            Ir para o Login Agora
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {emailMascarado && (
            <Box
              sx={{
                mb: 2.5,
                p: 1.2,
                borderRadius: 2.5,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                border: '1px solid',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Conta identificada:
              </Typography>
              <Chip
                label={emailMascarado}
                size="small"
                variant="outlined"
                color="primary"
                sx={{ fontWeight: 700, borderRadius: 2 }}
              />
            </Box>
          )}

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

          {/* Campo Nova Senha */}
          <Box sx={{ mb: 2 }}>
            <Typography
              component="label"
              htmlFor="nova-senha"
              variant="caption"
              sx={{
                display: 'block',
                mb: 0.8,
                fontWeight: 700,
                fontSize: '0.82rem',
                color: isDark ? '#cbd5e1' : '#334155',
              }}
            >
              Nova Senha
            </Typography>
            <TextField
              id="nova-senha"
              fullWidth
              placeholder="Mínimo 6 caracteres"
              type={showNovaSenha ? 'text' : 'password'}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              autoFocus
              disabled={submitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="alternar visibilidade da nova senha"
                      onClick={() => setShowNovaSenha((prev) => !prev)}
                      edge="end"
                      tabIndex={-1}
                      disabled={submitting}
                      size="small"
                    >
                      {showNovaSenha ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
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

          {/* Campo Confirmar Nova Senha */}
          <Box sx={{ mb: 2 }}>
            <Typography
              component="label"
              htmlFor="confirmar-senha"
              variant="caption"
              sx={{
                display: 'block',
                mb: 0.8,
                fontWeight: 700,
                fontSize: '0.82rem',
                color: isDark ? '#cbd5e1' : '#334155',
              }}
            >
              Confirmar Nova Senha
            </Typography>
            <TextField
              id="confirmar-senha"
              fullWidth
              placeholder="Digite a mesma senha novamente"
              type={showConfirmarSenha ? 'text' : 'password'}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
              disabled={submitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="alternar visibilidade da confirmação"
                      onClick={() => setShowConfirmarSenha((prev) => !prev)}
                      edge="end"
                      tabIndex={-1}
                      disabled={submitting}
                      size="small"
                    >
                      {showConfirmarSenha ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
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

          {/* Dica de Segurança */}
          <Box
            sx={{
              p: 1.5,
              mb: 3,
              borderRadius: 2.5,
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.5 }}>
              • Requisito: no mínimo 6 caracteres.<br />
              • Evite senhas curtas ou sequências numéricas previsíveis.
            </Typography>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={submitting || !novaSenha || !confirmarSenha}
            endIcon={!submitting ? <Save sx={{ fontSize: 18 }} /> : undefined}
            sx={{
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
            {submitting ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.2 }}>
                <CircularProgress size={20} color="inherit" thickness={4} />
                <span>Salvando Nova Senha...</span>
              </Box>
            ) : (
              'Salvar Nova Senha'
            )}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
              component={RouterLink}
              to="/login"
              color="inherit"
              size="small"
              startIcon={<ArrowBack />}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                color: 'text.secondary',
                '&:hover': { color: 'primary.main', bgcolor: 'transparent' },
              }}
            >
              Cancelar e voltar ao login
            </Button>
          </Box>
        </Box>
      )}
    </AuthLayout>
  );
};
