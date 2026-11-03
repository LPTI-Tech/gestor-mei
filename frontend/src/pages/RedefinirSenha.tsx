import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Chip,
  Paper,
} from '@mui/material';
import {
  LockReset,
  Visibility,
  VisibilityOff,
  CheckCircleOutline,
  ErrorOutline,
  ArrowBack,
} from '@mui/icons-material';
import api from '../services/api';
import { ApiStatusIndicator } from '../components/ApiStatusIndicator';

export const RedefinirSenha: React.FC = () => {
  const navigate = useNavigate();
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
      setTokenErrorMsg('Link de redefinição incompleto ou inválido. O parâmetro de segurança não foi informado.');
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
      <Box sx={{ maxWidth: 460, width: '100%' }}>
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
            Crie uma Nova Senha Segura
          </Typography>
          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
            <ApiStatusIndicator size="small" />
          </Box>
        </Box>

        <Card elevation={3} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            {validating ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress size={36} color="primary" sx={{ mb: 2 }} />
                <Typography variant="body1" fontWeight={600}>
                  Validando link de segurança...
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Aguarde enquanto verificamos a autenticidade e validade de 15 minutos.
                </Typography>
              </Box>
            ) : !tokenValido ? (
              <Box>
                <Alert
                  severity="error"
                  icon={<ErrorOutline fontSize="inherit" />}
                  sx={{ mb: 3, borderRadius: 2 }}
                >
                  <Typography variant="subtitle2" fontWeight={700}>
                    Link Expirado ou Inválido
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {tokenErrorMsg}
                  </Typography>
                </Alert>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => navigate('/esqueci-senha')}
                  startIcon={<LockReset />}
                  sx={{ height: 48, fontWeight: 700, mb: 1.5 }}
                >
                  Solicitar Novo Link de Recuperação
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate('/login')}
                  startIcon={<ArrowBack />}
                  sx={{ height: 44, fontWeight: 600 }}
                >
                  Voltar para o Login
                </Button>
              </Box>
            ) : success ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <CheckCircleOutline color="success" sx={{ fontSize: 64, mb: 1 }} />
                <Typography variant="h6" fontWeight={800} color="success.main" gutterBottom>
                  Senha Redefinida com Sucesso!
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Sua nova senha já está ativa. Você será redirecionado para a tela de login em alguns segundos...
                </Typography>

                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/login')}
                  sx={{ height: 48, fontWeight: 700 }}
                >
                  Ir para o Login Agora
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleSubmit}>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
                  Redefinir Senha
                </Typography>
                {emailMascarado && (
                  <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Conta identificada:
                    </Typography>
                    <Chip label={emailMascarado} size="small" variant="outlined" color="primary" sx={{ fontWeight: 600 }} />
                  </Box>
                )}

                {errorMessage && (
                  <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                    {errorMessage}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  label="Nova Senha"
                  type={showNovaSenha ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoFocus
                  disabled={submitting}
                  margin="normal"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="alternar visibilidade da nova senha"
                          onClick={() => setShowNovaSenha((prev) => !prev)}
                          edge="end"
                          tabIndex={-1}
                          disabled={submitting}
                        >
                          {showNovaSenha ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Confirmar Nova Senha"
                  type={showConfirmarSenha ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Digite a mesma senha novamente"
                  required
                  disabled={submitting}
                  margin="normal"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="alternar visibilidade da confirmação"
                          onClick={() => setShowConfirmarSenha((prev) => !prev)}
                          edge="end"
                          tabIndex={-1}
                          disabled={submitting}
                        >
                          {showConfirmarSenha ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Paper variant="outlined" sx={{ p: 1.5, my: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    • Mínimo de 6 caracteres.<br />
                    • Evite senhas fáceis ou sequências óbvias.
                  </Typography>
                </Paper>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={submitting || !novaSenha || !confirmarSenha}
                  startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <LockReset />}
                  sx={{ mt: 1, mb: 2, height: 48, fontWeight: 700 }}
                >
                  {submitting ? 'Salvando Nova Senha...' : 'Salvar Nova Senha'}
                </Button>

                <Box sx={{ textAlign: 'center', mt: 1 }}>
                  <Button
                    component={RouterLink}
                    to="/login"
                    color="inherit"
                    size="small"
                    startIcon={<ArrowBack />}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Cancelar e voltar ao login
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

