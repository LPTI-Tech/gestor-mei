import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  Paper,
} from '@mui/material';
import { Storefront, CheckCircleOutline, FlashOn, Security } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { ApiStatusIndicator } from '../components/ApiStatusIndicator';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [tabIndex, setTabIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState<string>('admin@gestormei.com.br');
  const [loginPassword, setLoginPassword] = useState<string>('admin123');

  // Register form state
  const [regData, setRegData] = useState({
    nome_empresarial: '',
    nome_fantasia: '',
    cnpj: '',
    cpf_proprietario: '',
    endereco: '',
    telefone: '',
    email_empresa: '',
    nome_usuario: '',
    email_usuario: '',
    password: '',
  });

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      await login(loginEmail, loginPassword);
      navigate('/');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || 'Erro ao realizar login. Verifique suas credenciais.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      await register(regData);
      navigate('/');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || 'Erro ao cadastrar empresa. Verifique os dados preenchidos.'
      );
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
      <Box sx={{ maxWidth: 520, width: '100%' }}>
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
            Controle de Vendas, Caixa e Declaração Anual sem Complicação
          </Typography>
          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
            <ApiStatusIndicator size="small" />
          </Box>
        </Box>

        <Card elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Tabs
            value={tabIndex}
            onChange={(_, val) => {
              setTabIndex(val);
              setErrorMessage(null);
            }}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Entrar na Conta" sx={{ fontWeight: 600 }} />
            <Tab label="Criar Novo MEI" sx={{ fontWeight: 600 }} />
          </Tabs>

          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2.5 }}>
                {errorMessage}
              </Alert>
            )}

            {/* TAB 0: LOGIN */}
            {tabIndex === 0 && (
              <Box component="form" onSubmit={handleLoginSubmit}>
                <TextField
                  fullWidth
                  label="E-mail"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  margin="normal"
                  required
                  autoFocus
                />
                <TextField
                  fullWidth
                  label="Senha"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  margin="normal"
                  required
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ mt: 2.5, mb: 2, height: 48, fontWeight: 700 }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Entrar no Sistema'}
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
                      onClick={() => fillDemo('admin')}
                      startIcon={<Security fontSize="small" />}
                      sx={{ flexGrow: 1 }}
                    >
                      Admin (Dono)
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      onClick={() => fillDemo('operador')}
                      startIcon={<FlashOn fontSize="small" />}
                      sx={{ flexGrow: 1 }}
                    >
                      Operador (Caixa)
                    </Button>
                  </Box>
                </Paper>
              </Box>
            )}

            {/* TAB 1: CADASTRO */}
            {tabIndex === 1 && (
              <Box component="form" onSubmit={handleRegisterSubmit}>
                <Typography variant="subtitle2" color="primary" fontWeight={700} mb={1}>
                  Dados da Empresa MEI
                </Typography>

                <Grid container spacing={1.5}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nome Fantasia (Como o cliente conhece)"
                      size="small"
                      required
                      value={regData.nome_fantasia}
                      onChange={(e) => setRegData({ ...regData, nome_fantasia: e.target.value })}
                      placeholder="Ex: Marmitaria da Dona Maria"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Razão Social (Nome Empresarial)"
                      size="small"
                      required
                      value={regData.nome_empresarial}
                      onChange={(e) => setRegData({ ...regData, nome_empresarial: e.target.value })}
                      placeholder="Ex: Maria dos Santos 12345678900"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="CNPJ"
                      size="small"
                      required
                      value={regData.cnpj}
                      onChange={(e) => setRegData({ ...regData, cnpj: e.target.value })}
                      placeholder="00.000.000/0001-00"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="CPF do Proprietário"
                      size="small"
                      required
                      value={regData.cpf_proprietario}
                      onChange={(e) => setRegData({ ...regData, cpf_proprietario: e.target.value })}
                      placeholder="000.000.000-00"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Telefone / WhatsApp"
                      size="small"
                      value={regData.telefone}
                      onChange={(e) => setRegData({ ...regData, telefone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="E-mail da Empresa"
                      type="email"
                      size="small"
                      required
                      value={regData.email_empresa}
                      onChange={(e) => setRegData({ ...regData, email_empresa: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Endereço Completo"
                      size="small"
                      value={regData.endereco}
                      onChange={(e) => setRegData({ ...regData, endereco: e.target.value })}
                      placeholder="Rua, Número, Bairro, Cidade - UF"
                    />
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" color="primary" fontWeight={700} mt={2.5} mb={1}>
                  Conta de Administrador
                </Typography>

                <Grid container spacing={1.5}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Seu Nome Completo"
                      size="small"
                      required
                      value={regData.nome_usuario}
                      onChange={(e) => setRegData({ ...regData, nome_usuario: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Seu E-mail de Login"
                      type="email"
                      size="small"
                      required
                      value={regData.email_usuario}
                      onChange={(e) => setRegData({ ...regData, email_usuario: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Crie sua Senha"
                      type="password"
                      size="small"
                      required
                      value={regData.password}
                      onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    />
                  </Grid>
                </Grid>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="secondary"
                  size="large"
                  disabled={loading}
                  sx={{ mt: 3, height: 48, fontWeight: 700 }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Cadastrar Meu Negócio'}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Value props badges */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mt: 3, flexWrap: 'wrap' }}>
          <Chip icon={<CheckCircleOutline />} label="100% Multiempresa" size="small" variant="outlined" />
          <Chip icon={<CheckCircleOutline />} label="Preparado para DASN-SIMEI" size="small" variant="outlined" />
          <Chip icon={<CheckCircleOutline />} label="Venda em < 10 segundos" size="small" variant="outlined" />
        </Box>
      </Box>
    </Box>
  );
};
