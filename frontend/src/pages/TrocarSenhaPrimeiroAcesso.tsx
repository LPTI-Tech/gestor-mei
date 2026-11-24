import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Stack,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LockOutlined,
  VpnKeyOutlined,
  CheckCircle,
  RadioButtonUnchecked,
  Cancel,
  ShieldOutlined,
  Logout,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import api from '../services/api';

export const TrocarSenhaPrimeiroAcesso: React.FC = () => {
  const navigate = useNavigate();
  const { user, markPasswordChanged, logout } = useAuth();

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoNovaSenha, setConfirmacaoNovaSenha] = useState('');

  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmacao, setShowConfirmacao] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Validação em tempo real dos critérios de segurança
  const rules = useMemo(() => {
    const minLength = novaSenha.length >= 8;
    const hasUpper = /[A-Z]/.test(novaSenha);
    const hasLower = /[a-z]/.test(novaSenha);
    const hasNum = /[0-9]/.test(novaSenha);
    const byteLength = new TextEncoder().encode(novaSenha).length;
    const withinLimit = byteLength <= 72;
    const isDifferent = novaSenha.length > 0 && novaSenha !== senhaAtual;
    const isMatching = confirmacaoNovaSenha.length > 0 && novaSenha === confirmacaoNovaSenha;

    return {
      minLength,
      hasUpper,
      hasLower,
      hasNum,
      withinLimit,
      isDifferent,
      isMatching,
      isValid:
        minLength &&
        hasUpper &&
        hasLower &&
        hasNum &&
        withinLimit &&
        isDifferent &&
        isMatching &&
        senhaAtual.trim().length > 0,
    };
  }, [novaSenha, confirmacaoNovaSenha, senhaAtual]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!senhaAtual) {
      setErrorMessage('Informe sua senha atual.');
      return;
    }

    if (!rules.isValid) {
      if (!rules.minLength) {
        setErrorMessage('A nova senha deve ter no mínimo 8 caracteres.');
        return;
      }
      if (!rules.hasUpper || !rules.hasLower || !rules.hasNum) {
        setErrorMessage('A nova senha deve conter ao menos uma letra maiúscula, uma minúscula e um número.');
        return;
      }
      if (!rules.isDifferent) {
        setErrorMessage('A nova senha não pode ser igual à senha atual.');
        return;
      }
      if (!rules.isMatching) {
        setErrorMessage('A confirmação da nova senha não confere.');
        return;
      }
      if (!rules.withinLimit) {
        setErrorMessage('A nova senha excede o limite permitido de segurança (72 bytes).');
        return;
      }
    }

    setLoading(true);

    try {
      await api.post('/api/auth/trocar-senha-primeiro-acesso', {
        senha_atual: senhaAtual,
        nova_senha: novaSenha,
        confirmacao_nova_senha: confirmacaoNovaSenha,
      });

      setSuccessMessage('Senha atualizada com sucesso! Acessando o sistema...');
      setTimeout(() => {
        markPasswordChanged();
        navigate('/', { replace: true });
      }, 700);
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 400) {
        setErrorMessage(typeof detail === 'string' ? detail : 'Dados inválidos para troca de senha.');
      } else if (status === 401) {
        setErrorMessage('Sessão expirada. Por favor, realize login novamente.');
        setTimeout(() => {
          logout();
          navigate('/login', { replace: true });
        }, 1500);
      } else if (status === 403) {
        setErrorMessage(typeof detail === 'string' ? detail : 'Acesso restrito: conclua a troca de senha.');
      } else if (status === 429) {
        setErrorMessage('Muitas tentativas consecutivas. Aguarde alguns instantes antes de tentar novamente.');
      } else if (status >= 500) {
        setErrorMessage('Erro interno no servidor ao processar a troca. Tente novamente mais tarde.');
      } else if (!err.response) {
        setErrorMessage('Não foi possível conectar ao servidor. Verifique sua conexão com a internet.');
      } else {
        setErrorMessage(typeof detail === 'string' ? detail : 'Erro ao trocar a senha.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const sentinelInputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      height: 42,
      color: '#FFFFFF',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      transition: 'all 0.2s ease',
      '&:hover': {
        borderColor: 'rgba(56, 189, 248, 0.45)',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
      },
      '&.Mui-focused': {
        borderColor: '#38bdf8',
        boxShadow: '0 0 0 2px rgba(56, 189, 248, 0.2)',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
      },
      '& input': {
        fontSize: '0.85rem',
        padding: '8px 12px',
        color: '#FFFFFF',
      },
      '& input::placeholder': {
        color: '#64748B',
        opacity: 1,
      },
    },
  };

  const renderRuleIndicator = (condition: boolean, label: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
      {condition ? (
        <CheckCircle sx={{ fontSize: 13, color: '#10b981', flexShrink: 0 }} />
      ) : (
        <RadioButtonUnchecked sx={{ fontSize: 13, color: 'rgba(148, 163, 184, 0.5)', flexShrink: 0 }} />
      )}
      <Typography
        sx={{
          fontSize: '0.72rem',
          color: condition ? '#34d399' : '#94a3b8',
          fontWeight: condition ? 600 : 400,
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
    </Box>
  );

  return (
    <AuthLayout
      title="Primeiro Acesso — Troca de Senha"
      subtitle="Por motivos de segurança, você deve definir uma nova senha definitiva antes de utilizar a plataforma."
    >
      {/* Alerta de Contexto do Usuário */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.8,
          mb: 1.8,
          borderRadius: 2,
          bgcolor: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
        }}
      >
        <ShieldOutlined sx={{ fontSize: 18, color: '#38bdf8', flexShrink: 0 }} />
        <Typography sx={{ fontSize: '0.76rem', color: '#e2e8f0', lineHeight: 1.3 }}>
          Conta: <strong>{user?.email || 'Usuário autenticado'}</strong>
        </Typography>
      </Box>

      {errorMessage && (
        <Alert
          severity="error"
          sx={{
            mb: 1.8,
            py: 0.3,
            px: 1.5,
            fontSize: '0.78rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#fca5a5',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            alignItems: 'center',
          }}
        >
          {errorMessage}
        </Alert>
      )}

      {successMessage && (
        <Alert
          severity="success"
          sx={{
            mb: 1.8,
            py: 0.3,
            px: 1.5,
            fontSize: '0.78rem',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#6ee7b7',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            alignItems: 'center',
          }}
        >
          {successMessage}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        {/* Campo Senha Atual */}
        <Box sx={{ mb: 1.5 }}>
          <Typography
            component="label"
            htmlFor="senha-atual"
            sx={{
              display: 'block',
              color: '#94A3B8',
              fontSize: '0.75rem',
              fontWeight: 500,
              mb: 0.4,
              textAlign: 'left',
            }}
          >
            Senha Atual (Temporária)
          </Typography>
          <TextField
            id="senha-atual"
            type={showSenhaAtual ? 'text' : 'password'}
            fullWidth
            required
            placeholder="Digite a senha recebida"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            disabled={loading || Boolean(successMessage)}
            autoComplete="current-password"
            sx={sentinelInputSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined sx={{ color: '#64748B', fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowSenhaAtual(!showSenhaAtual)}
                    edge="end"
                    aria-label="alternar visibilidade da senha atual"
                    sx={{ color: '#64748B', '&:hover': { color: '#94A3B8' } }}
                  >
                    {showSenhaAtual ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Campo Nova Senha */}
        <Box sx={{ mb: 1.5 }}>
          <Typography
            component="label"
            htmlFor="nova-senha"
            sx={{
              display: 'block',
              color: '#94A3B8',
              fontSize: '0.75rem',
              fontWeight: 500,
              mb: 0.4,
              textAlign: 'left',
            }}
          >
            Nova Senha Definitiva
          </Typography>
          <TextField
            id="nova-senha"
            type={showNovaSenha ? 'text' : 'password'}
            fullWidth
            required
            placeholder="Mínimo 8 caracteres, maiúscula, minúscula e número"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            disabled={loading || Boolean(successMessage)}
            autoComplete="new-password"
            sx={sentinelInputSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <VpnKeyOutlined sx={{ color: '#64748B', fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowNovaSenha(!showNovaSenha)}
                    edge="end"
                    aria-label="alternar visibilidade da nova senha"
                    sx={{ color: '#64748B', '&:hover': { color: '#94A3B8' } }}
                  >
                    {showNovaSenha ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Campo Confirmação da Nova Senha */}
        <Box sx={{ mb: 1.5 }}>
          <Typography
            component="label"
            htmlFor="confirmacao-nova-senha"
            sx={{
              display: 'block',
              color: '#94A3B8',
              fontSize: '0.75rem',
              fontWeight: 500,
              mb: 0.4,
              textAlign: 'left',
            }}
          >
            Confirmar Nova Senha
          </Typography>
          <TextField
            id="confirmacao-nova-senha"
            type={showConfirmacao ? 'text' : 'password'}
            fullWidth
            required
            placeholder="Repita a nova senha exatamente"
            value={confirmacaoNovaSenha}
            onChange={(e) => setConfirmacaoNovaSenha(e.target.value)}
            disabled={loading || Boolean(successMessage)}
            autoComplete="new-password"
            sx={sentinelInputSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined sx={{ color: '#64748B', fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowConfirmacao(!showConfirmacao)}
                    edge="end"
                    aria-label="alternar visibilidade da confirmação de senha"
                    sx={{ color: '#64748B', '&:hover': { color: '#94A3B8' } }}
                  >
                    {showConfirmacao ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Checklist Compacto de Requisitos de Segurança */}
        <Box
          sx={{
            mb: 2,
            p: 1.2,
            borderRadius: '8px',
            bgcolor: 'rgba(15, 23, 42, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: '#cbd5e1',
              mb: 0.8,
              textAlign: 'left',
            }}
          >
            Requisitos de Segurança:
          </Typography>
          <Stack spacing={0.5}>
            {renderRuleIndicator(rules.minLength, 'Mínimo de 8 caracteres')}
            {renderRuleIndicator(rules.hasUpper, 'Ao menos uma letra maiúscula (A-Z)')}
            {renderRuleIndicator(rules.hasLower, 'Ao menos uma letra minúscula (a-z)')}
            {renderRuleIndicator(rules.hasNum, 'Ao menos um número (0-9)')}
            {renderRuleIndicator(rules.isDifferent, 'Diferente da senha atual')}
            {renderRuleIndicator(rules.isMatching, 'Confirmação idêntica')}
          </Stack>
        </Box>

        {/* Botão de Envio */}
        <Button
          type="submit"
          fullWidth
          disabled={loading || !rules.isValid || Boolean(successMessage)}
          sx={{
            height: 42,
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.88rem',
            color: '#FFFFFF',
            background: rules.isValid
              ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
              : 'rgba(51, 65, 85, 0.5)',
            boxShadow: rules.isValid
              ? '0 4px 14px 0 rgba(2, 132, 199, 0.39)'
              : 'none',
            border: '1px solid',
            borderColor: rules.isValid ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: 'linear-gradient(135deg, #0369a1 0%, #075985 100%)',
              boxShadow: '0 6px 20px 0 rgba(2, 132, 199, 0.5)',
            },
            '&.Mui-disabled': {
              color: 'rgba(255, 255, 255, 0.35)',
              background: 'rgba(30, 41, 59, 0.5)',
            },
          }}
        >
          {loading ? (
            <CircularProgress size={20} sx={{ color: '#ffffff' }} />
          ) : (
            'Salvar Nova Senha e Acessar'
          )}
        </Button>

        {/* Opção Segura de Cancelar / Logout */}
        <Box sx={{ mt: 1.8, textAlign: 'center' }}>
          <Button
            size="small"
            onClick={handleLogout}
            startIcon={<Logout sx={{ fontSize: 15 }} />}
            sx={{
              color: '#94a3b8',
              fontSize: '0.75rem',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': {
                color: '#f8fafc',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
              },
            }}
          >
            Sair do sistema e voltar ao login
          </Button>
        </Box>
      </Box>
    </AuthLayout>
  );
};
