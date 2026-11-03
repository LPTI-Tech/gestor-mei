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
  Link,
} from '@mui/material';
import { ArrowBack, EmailOutlined, CheckCircleOutline } from '@mui/icons-material';
import api from '../services/api';
import { ApiStatusIndicator } from '../components/ApiStatusIndicator';

export const EsqueciSenha: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
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
      // Mesmo em erro não 500, a política anti-enumeração do backend garante a resposta padrão
      const detail = err.response?.data?.detail;
      if (err.response?.status >= 500) {
        setErrorMessage('Erro interno do servidor. Tente novamente em instantes.');
      } else {
        setErrorMessage(typeof detail === 'string' ? detail : 'Erro ao processar solicitação. Tente novamente.');
      }
    } finally {
      setLoading(false);
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
            Recuperação de Acesso & Redefinição de Senha
          </Typography>
          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
            <ApiStatusIndicator size="small" />
          </Box>
        </Box>

        <Card elevation={3} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
              Esqueceu sua senha?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Digite o e-mail cadastrado na sua conta. Se houver um cadastro correspondente, enviaremos um link seguro para redefinição.
            </Typography>

            {successMessage ? (
              <Box>
                <Alert
                  severity="success"
                  icon={<CheckCircleOutline fontSize="inherit" />}
                  sx={{ mb: 3, borderRadius: 2 }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {successMessage}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Verifique sua caixa de entrada e pasta de spam. O link expira em <b>15 minutos</b>.
                  </Typography>
                </Alert>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => navigate('/login')}
                  startIcon={<ArrowBack />}
                  sx={{ height: 48, fontWeight: 700 }}
                >
                  Voltar para o Login
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleSubmit}>
                {errorMessage && (
                  <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                    {errorMessage}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  label="E-mail Cadastrado"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@gestormei.com.br"
                  required
                  autoFocus
                  disabled={loading}
                  margin="normal"
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading || !email.trim()}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <EmailOutlined />}
                  sx={{ mt: 2.5, mb: 2, height: 48, fontWeight: 700 }}
                >
                  {loading ? 'Enviando Instruções...' : 'Enviar Link de Recuperação'}
                </Button>

                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Link
                    component={RouterLink}
                    to="/login"
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      textDecoration: 'none',
                      fontWeight: 600,
                      '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                    }}
                  >
                    <ArrowBack fontSize="small" /> Voltar para o Login
                  </Link>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

