import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Building2,
  CheckCircle2,
  ShieldAlert,
  Users,
  UserCheck,
  Briefcase,
  Search,
  ExternalLink,
  Lock,
  Unlock,
  RefreshCw,
  PlusCircle,
  Shield,
  Layers,
  ArrowRight,
  TrendingUp,
  History,
} from 'lucide-react';
import api from '../services/api';
import { EmpresaMasterListItem, MetricasGlobais, User, AuditoriaSuporte } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const MasterDashboard: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const { setContextEmpresaId } = useAuth();

  const [metricas, setMetricas] = useState<MetricasGlobais | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaMasterListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState<string>('');
  const [statusFiltro, setStatusFiltro] = useState<'TODAS' | 'ATIVAS' | 'BLOQUEADAS'>('TODAS');

  // Logs de Auditoria de Suporte LPTI Tech
  const [auditoriaLogs, setAuditoriaLogs] = useState<AuditoriaSuporte[]>([]);
  const [loadingAuditoria, setLoadingAuditoria] = useState<boolean>(false);

  // Modal Bloqueio / Desbloqueio
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [targetEmpresa, setTargetEmpresa] = useState<EmpresaMasterListItem | null>(null);
  const [motivoBloqueio, setMotivoBloqueio] = useState('');
  const [blockingSubmitting, setBlockingSubmitting] = useState(false);

  // Modal Transferência Titularidade
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferEmpresa, setTransferEmpresa] = useState<EmpresaMasterListItem | null>(null);
  const [empresaUsers, setEmpresaUsers] = useState<User[]>([]);
  const [novoOwnerId, setNovoOwnerId] = useState<number | ''>('');
  const [transferLoadingUsers, setTransferLoadingUsers] = useState(false);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Cadastrar Nova Empresa & OWNER
  const [createEmpresaModalOpen, setCreateEmpresaModalOpen] = useState(false);
  const [newNomeEmpresarial, setNewNomeEmpresarial] = useState('');
  const [newNomeFantasia, setNewNomeFantasia] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newEmailEmpresa, setNewEmailEmpresa] = useState('');
  const [newTelefone, setNewTelefone] = useState('');
  const [newNomeOwner, setNewNomeOwner] = useState('');
  const [newEmailOwner, setNewEmailOwner] = useState('');
  const [newSenhaOwner, setNewSenhaOwner] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateEmpresaWithOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSubmitting(true);
    try {
      await api.post('/empresa', {
        nome_empresarial: newNomeEmpresarial,
        nome_fantasia: newNomeFantasia,
        cnpj: newCnpj.replace(/\D/g, ''),
        email: newEmailEmpresa,
        telefone: newTelefone,
        nome_owner: newNomeOwner,
        email_owner: newEmailOwner,
        senha_owner: newSenhaOwner,
      });
      setCreateEmpresaModalOpen(false);
      setNewNomeEmpresarial('');
      setNewNomeFantasia('');
      setNewCnpj('');
      setNewEmailEmpresa('');
      setNewTelefone('');
      setNewNomeOwner('');
      setNewEmailOwner('');
      setNewSenhaOwner('');
      setFeedback({ type: 'success', text: `Empresa '${newNomeFantasia}' e OWNER '${newNomeOwner}' cadastrados com sucesso!` });
      carregarDados();
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Erro ao cadastrar nova empresa e OWNER.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resMetricas, resEmpresas] = await Promise.allSettled([
        api.get<MetricasGlobais>('/empresa/metricas-globais'),
        api.get<EmpresaMasterListItem[]>('/empresa/todas'),
      ]);

      let metricasCarregadas = false;
      let empresasData: EmpresaMasterListItem[] = [];

      if (resEmpresas.status === 'fulfilled') {
        empresasData = resEmpresas.value.data;
        setEmpresas(empresasData);
      } else {
        console.error('Erro ao buscar empresas todas:', resEmpresas.reason);
      }

      if (resMetricas.status === 'fulfilled') {
        setMetricas(resMetricas.value.data);
        metricasCarregadas = true;
      } else {
        console.warn('Erro ao buscar metricas-globais diretamente:', resMetricas.reason);
        // Fallback robusto calculado a partir da lista de empresas se o endpoint falhar:
        if (empresasData.length > 0) {
          const ativas = empresasData.filter((e) => e.ativo !== false).length;
          const bloqueadas = empresasData.filter((e) => e.ativo === false).length;
          const owners = empresasData.filter((e) => e.owner).length;
          const totalUsers = empresasData.reduce((acc, e) => acc + (e.total_usuarios || 0), 0);
          setMetricas({
            total_empresas: empresasData.length,
            empresas_ativas: ativas,
            empresas_bloqueadas: bloqueadas,
            total_owners: owners,
            total_operadores: Math.max(0, totalUsers - owners),
            total_consultores: 0,
            total_masters: 1,
          });
          metricasCarregadas = true;
        }
      }

      if (metricasCarregadas || empresasData.length > 0) {
        setError(null);
      } else if (resEmpresas.status === 'rejected') {
        const errorDetail = (resEmpresas.reason as any)?.response?.data?.detail || (resEmpresas.reason as any)?.message;
        setError(errorDetail ? `Erro na API: ${errorDetail}` : 'Não foi possível carregar as métricas do painel MASTER.');
      }
    } catch (err: any) {
      console.error('Erro ao carregar métricas globais MASTER:', err);
      setError('Não foi possível carregar as métricas do painel MASTER.');
    } finally {
      setLoading(false);
    }
    await carregarAuditoria();
  };

  const carregarAuditoria = async () => {
    try {
      setLoadingAuditoria(true);
      const res = await api.get<AuditoriaSuporte[]>('/suporte/auditoria?limit=50');
      setAuditoriaLogs(res.data);
    } catch (err) {
      console.warn('Erro ao carregar auditoria de suporte:', err);
    } finally {
      setLoadingAuditoria(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Handler para alternar status (bloqueio/desbloqueio)
  const handleOpenStatusModal = (empresa: EmpresaMasterListItem) => {
    setTargetEmpresa(empresa);
    if (empresa.ativo) {
      // Vai bloquear: pede motivo
      setMotivoBloqueio('');
      setBlockModalOpen(true);
    } else {
      // Já está bloqueada: desbloqueia imediatamente
      executarToggleStatus(empresa, true, null);
    }
  };

  const executarToggleStatus = async (
    empresa: EmpresaMasterListItem,
    novoAtivo: boolean,
    motivo: string | null
  ) => {
    try {
      setBlockingSubmitting(true);
      await api.patch(`/empresa/${empresa.id}/status`, {
        ativo: novoAtivo,
        motivo_bloqueio: motivo,
      });
      setBlockModalOpen(false);
      setTargetEmpresa(null);
      setFeedback({
        type: 'success',
        text: `Empresa '${empresa.nome_fantasia}' foi ${novoAtivo ? 'desbloqueada' : 'bloqueada'} com sucesso!`,
      });
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao alterar status da empresa.');
    } finally {
      setBlockingSubmitting(false);
    }
  };

  // Handler para alternar contexto e abrir visão operacional da empresa (Modo Suporte)
  const handleAcessarEmpresa = async (empresaId: number) => {
    try {
      await api.post('/suporte/sessao/iniciar', { empresa_id: empresaId });
    } catch (err) {
      console.warn('Erro ao registrar início de auditoria de suporte:', err);
    }
    try {
      await setContextEmpresaId(empresaId);
      navigate('/');
    } catch (err) {
      console.error('Erro ao selecionar empresa:', err);
    }
  };

  // Handler de Transferência de Titularidade
  const handleOpenTransferModal = async (empresa: EmpresaMasterListItem) => {
    setTransferEmpresa(empresa);
    setNovoOwnerId('');
    setTransferModalOpen(true);
    try {
      setTransferLoadingUsers(true);
      const res = await api.get<User[]>(`/users?empresa_id=${empresa.id}`);
      setEmpresaUsers(res.data);
    } catch (err) {
      console.error('Erro ao buscar usuários da empresa:', err);
    } finally {
      setTransferLoadingUsers(false);
    }
  };

  const executarTransferencia = async () => {
    if (!transferEmpresa || !novoOwnerId) return;
    try {
      setTransferSubmitting(true);
      const res = await api.post(`/empresa/${transferEmpresa.id}/transferir-propriedade`, {
        novo_owner_user_id: Number(novoOwnerId),
      });
      setTransferModalOpen(false);
      setFeedback({ type: 'success', text: res.data.message || 'Titularidade transferida com sucesso!' });
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao transferir titularidade da empresa.');
    } finally {
      setTransferSubmitting(false);
    }
  };

  // Filtragem de empresas
  const empresasFiltradas = empresas.filter((emp) => {
    if (statusFiltro === 'ATIVAS' && !emp.ativo) return false;
    if (statusFiltro === 'BLOQUEADAS' && emp.ativo) return false;
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (
      emp.nome_fantasia.toLowerCase().includes(termo) ||
      emp.nome_empresarial.toLowerCase().includes(termo) ||
      emp.cnpj.includes(termo) ||
      (emp.owner?.nome && emp.owner.nome.toLowerCase().includes(termo)) ||
      (emp.owner?.email && emp.owner.email.toLowerCase().includes(termo))
    );
  });

  return (
    <Box sx={{ pb: 3 }}>
      {/* Banner Principal Master Sentinel */}
      <Paper
        elevation={0}
        sx={{
          py: 1.5,
          px: 2.5,
          mb: 1.5,
          borderRadius: '8px',
          background: isDark
            ? 'linear-gradient(135deg, #071933 0%, #0d2847 100%)'
            : 'linear-gradient(135deg, #0a2540 0%, #08213b 100%)',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(14, 165, 233, 0.3)',
          boxShadow: '0 4px 20px rgba(10, 37, 64, 0.15)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 1.5,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* ESQUERDA: Título e Subtítulo */}
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.15rem', md: '1.25rem' },
                letterSpacing: '-0.01em',
                lineHeight: 1.25,
                mb: 0.25,
              }}
            >
              Dashboard Global MASTER
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.75)',
                fontSize: '0.8125rem',
                lineHeight: 1.3,
                maxWidth: 620,
              }}
            >
              Visão macro consolidada da plataforma: empresas, titulares, operadores e status operacional em tempo real.
            </Typography>
          </Box>

          {/* DIREITA: Atualizar e Gestão de Usuários */}
          <Box sx={{ display: 'flex', gap: 1.2, flexShrink: 0, alignItems: 'center' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={carregarDados}
              startIcon={<RefreshCw size={14} />}
              sx={{
                height: 34,
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                bgcolor: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.8125rem',
                textTransform: 'none',
                whiteSpace: 'nowrap',
                px: 1.5,
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.45)',
                  bgcolor: 'rgba(255, 255, 255, 0.12)',
                },
              }}
            >
              Atualizar
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => navigate('/usuarios')}
              startIcon={<PlusCircle size={14} />}
              sx={{
                height: 34,
                bgcolor: '#10b981',
                color: '#ffffff',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.8125rem',
                textTransform: 'none',
                whiteSpace: 'nowrap',
                px: 1.75,
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: '#059669',
                  boxShadow: 'none',
                },
              }}
            >
              Gestão de Usuários
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Alerta de Feedback */}
      {feedback && (
        <Alert
          severity={feedback.type}
          onClose={() => setFeedback(null)}
          sx={{ mb: 2, borderRadius: '6px' }}
        >
          {feedback.text}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
          {error}
        </Alert>
      )}

      {/* Painel de Métricas Globais (6 Indicadores Oficiais) */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        {/* 1. Total de Empresas */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
              bgcolor: 'background.paper',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" sx={{ fontSize: '0.7rem' }}>
                Total Empresas
              </Typography>
              <Box sx={{ p: 0.6, borderRadius: '6px', bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', display: 'flex' }}>
                <Building2 size={16} strokeWidth={2} />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ fontSize: '1.6rem', fontVariantNumeric: 'tabular-nums' }}>
              {loading ? <CircularProgress size={20} /> : metricas?.total_empresas ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, fontSize: '0.72rem' }}>
              Negócios registrados
            </Typography>
          </Card>
        </Grid>

        {/* 2. Empresas Ativas */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: alpha(theme.palette.success.main, 0.3),
              bgcolor: alpha(theme.palette.success.main, 0.04),
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={700} color="success.main" textTransform="uppercase" sx={{ fontSize: '0.7rem' }}>
                Empresas Ativas
              </Typography>
              <Box sx={{ p: 0.6, borderRadius: '6px', bgcolor: alpha(theme.palette.success.main, 0.15), color: 'success.main', display: 'flex' }}>
                <CheckCircle2 size={16} strokeWidth={2} />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={700} color="success.main" sx={{ fontSize: '1.6rem', fontVariantNumeric: 'tabular-nums' }}>
              {loading ? <CircularProgress size={20} /> : metricas?.empresas_ativas ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, fontSize: '0.72rem' }}>
              Operando normalmente
            </Typography>
          </Card>
        </Grid>

        {/* 3. Empresas Bloqueadas */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: alpha(theme.palette.error.main, 0.3),
              bgcolor: alpha(theme.palette.error.main, 0.04),
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={700} color="error.main" textTransform="uppercase" sx={{ fontSize: '0.7rem' }}>
                Bloqueadas
              </Typography>
              <Box sx={{ p: 0.6, borderRadius: '6px', bgcolor: alpha(theme.palette.error.main, 0.15), color: 'error.main', display: 'flex' }}>
                <ShieldAlert size={16} strokeWidth={2} />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={700} color="error.main" sx={{ fontSize: '1.6rem', fontVariantNumeric: 'tabular-nums' }}>
              {loading ? <CircularProgress size={20} /> : metricas?.empresas_bloqueadas ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, fontSize: '0.72rem' }}>
              Suspensas pela gestão
            </Typography>
          </Card>
        </Grid>

        {/* 4. Total de Proprietários (OWNERs) */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
              bgcolor: 'background.paper',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={700} color="secondary.main" textTransform="uppercase" sx={{ fontSize: '0.7rem' }}>
                Proprietários
              </Typography>
              <Box sx={{ p: 0.6, borderRadius: '6px', bgcolor: alpha(theme.palette.secondary.main, 0.1), color: 'secondary.main', display: 'flex' }}>
                <UserCheck size={16} strokeWidth={2} />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ fontSize: '1.6rem', fontVariantNumeric: 'tabular-nums' }}>
              {loading ? <CircularProgress size={20} /> : metricas?.total_owners ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, fontSize: '0.72rem' }}>
              Titulares de negócio
            </Typography>
          </Card>
        </Grid>

        {/* 5. Total de Operadores */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
              bgcolor: 'background.paper',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" sx={{ fontSize: '0.7rem' }}>
                Operadores
              </Typography>
              <Box sx={{ p: 0.6, borderRadius: '6px', bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main', display: 'flex' }}>
                <Users size={16} strokeWidth={2} />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ fontSize: '1.6rem', fontVariantNumeric: 'tabular-nums' }}>
              {loading ? <CircularProgress size={20} /> : metricas?.total_operadores ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, fontSize: '0.72rem' }}>
              Caixas e atendimento
            </Typography>
          </Card>
        </Grid>

        {/* 6. Total de Consultores */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
              bgcolor: 'background.paper',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" sx={{ fontSize: '0.7rem' }}>
                Consultores
              </Typography>
              <Box sx={{ p: 0.6, borderRadius: '6px', bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main', display: 'flex' }}>
                <Briefcase size={16} strokeWidth={2} />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ fontSize: '1.6rem', fontVariantNumeric: 'tabular-nums' }}>
              {loading ? <CircularProgress size={20} /> : metricas?.total_consultores ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, fontSize: '0.72rem' }}>
              Consultores externos
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Gestão das Empresas da Plataforma */}
      <Card
        elevation={0}
        sx={{
          borderRadius: '8px',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho Compacto da Seção */}
        <Box
          sx={{
            px: 2,
            pt: 1.5,
            pb: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.9rem' }}>
              Empresas Cadastradas na Plataforma ({empresasFiltradas.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Gerencie a titularidade, status de operação e acesse qualquer empresa como auditor global.
            </Typography>
          </Box>
        </Box>

        {/* SENTINEL TOOLBAR UNIFICADA */}
        <Box
          sx={{
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            borderTop: '1px solid',
            borderBottom: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            bgcolor: isDark ? 'rgba(255,255,255,0.015)' : '#F8FAFC',
          }}
        >
          {/* ESQUERDA: Campo de busca */}
          <TextField
            size="small"
            placeholder="Buscar por nome, CNPJ ou titular..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            sx={{
              flexGrow: 1,
              maxWidth: { xs: '100%', sm: 340 },
              '& .MuiOutlinedInput-root': {
                height: 36,
                borderRadius: '6px',
                fontSize: '0.8125rem',
                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={15} color="#94A3B8" />
                </InputAdornment>
              ),
            }}
          />

          {/* CENTRO: Divisor técnico */}
          <Divider
            orientation="vertical"
            flexItem
            sx={{
              mx: 1,
              display: { xs: 'none', md: 'block' },
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
            }}
          />

          {/* DIREITA: Filtros + Botão Nova Empresa & OWNER */}
          <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
            {/* Filtros de Status */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Chip
                label="Todas"
                size="small"
                onClick={() => setStatusFiltro('TODAS')}
                sx={{
                  height: 32,
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  bgcolor: statusFiltro === 'TODAS' ? '#1976D2' : isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                  color: statusFiltro === 'TODAS' ? '#FFFFFF' : 'text.primary',
                  border: '1px solid',
                  borderColor: statusFiltro === 'TODAS' ? '#1976D2' : isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: statusFiltro === 'TODAS' ? '#1565C0' : isDark ? 'rgba(255,255,255,0.12)' : '#F1F5F9',
                  },
                }}
              />
              <Chip
                label="Ativas"
                size="small"
                onClick={() => setStatusFiltro('ATIVAS')}
                sx={{
                  height: 32,
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  bgcolor: statusFiltro === 'ATIVAS' ? '#10B981' : isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                  color: statusFiltro === 'ATIVAS' ? '#FFFFFF' : 'text.primary',
                  border: '1px solid',
                  borderColor: statusFiltro === 'ATIVAS' ? '#10B981' : isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: statusFiltro === 'ATIVAS' ? '#059669' : isDark ? 'rgba(255,255,255,0.12)' : '#F1F5F9',
                  },
                }}
              />
              <Chip
                label="Bloqueadas"
                size="small"
                onClick={() => setStatusFiltro('BLOQUEADAS')}
                sx={{
                  height: 32,
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  bgcolor: statusFiltro === 'BLOQUEADAS' ? '#EF4444' : isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                  color: statusFiltro === 'BLOQUEADAS' ? '#FFFFFF' : 'text.primary',
                  border: '1px solid',
                  borderColor: statusFiltro === 'BLOQUEADAS' ? '#EF4444' : isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: statusFiltro === 'BLOQUEADAS' ? '#DC2626' : isDark ? 'rgba(255,255,255,0.12)' : '#F1F5F9',
                  },
                }}
              />
            </Box>

            <Button
              variant="contained"
              size="small"
              startIcon={<PlusCircle size={15} />}
              onClick={() => {
                setCreateError(null);
                setCreateEmpresaModalOpen(true);
              }}
              sx={{
                height: 36,
                fontWeight: 600,
                fontSize: '0.8125rem',
                textTransform: 'none',
                borderRadius: '6px',
                px: 1.75,
                bgcolor: '#10b981',
                color: '#ffffff',
                boxShadow: 'none',
                whiteSpace: 'nowrap',
                '&:hover': {
                  bgcolor: '#059669',
                  boxShadow: 'none',
                },
              }}
            >
              Nova Empresa & OWNER
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>EMPRESA</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>CNPJ</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>SEGMENTO</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>PROPRIETÁRIO (OWNER)</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }} align="center">
                    USUÁRIOS
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }} align="center">
                    STATUS
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }} align="right">
                    AÇÕES
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {empresasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      Nenhuma empresa encontrada com os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  empresasFiltradas.map((emp) => (
                    <TableRow key={emp.id} hover>
                      {/* Empresa */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="text.primary">
                          {emp.nome_fantasia}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {emp.nome_empresarial}
                        </Typography>
                      </TableCell>

                      {/* CNPJ */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                          {emp.cnpj}
                        </Typography>
                      </TableCell>

                      {/* Segmento */}
                      <TableCell>
                        <Chip
                          label={emp.segmento || 'GERAL'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.72rem', fontWeight: 600, borderRadius: '6px' }}
                        />
                      </TableCell>

                      {/* Proprietário */}
                      <TableCell>
                        {emp.owner ? (
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {emp.owner.nome}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {emp.owner.email}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="error.main" fontWeight={600}>
                            Sem OWNER vinculado
                          </Typography>
                        )}
                      </TableCell>

                      {/* Total Usuários */}
                      <TableCell align="center">
                        <Chip
                          label={emp.total_usuarios}
                          size="small"
                          sx={{ fontWeight: 700, minWidth: 32, borderRadius: '6px' }}
                        />
                      </TableCell>

                      {/* Status */}
                      <TableCell align="center">
                        {emp.ativo ? (
                          <Chip
                            label="Ativa"
                            size="small"
                            color="success"
                            sx={{ fontWeight: 700, fontSize: '0.72rem', borderRadius: '6px' }}
                          />
                        ) : (
                          <Tooltip title={emp.motivo_bloqueio ? `Motivo: ${emp.motivo_bloqueio}` : 'Suspenso pela administração'}>
                            <Chip
                              label="Bloqueada"
                              size="small"
                              color="error"
                              sx={{ fontWeight: 700, fontSize: '0.72rem', borderRadius: '6px' }}
                            />
                          </Tooltip>
                        )}
                      </TableCell>

                      {/* Ações */}
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          {/* Acessar Empresa */}
                          <Tooltip title="Entrar no contexto desta empresa (Modo Auditoria)">
                            <Button
                              variant="outlined"
                              size="small"
                              color="primary"
                              startIcon={<ExternalLink size={14} />}
                              onClick={() => handleAcessarEmpresa(emp.id)}
                              sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                borderRadius: '6px',
                              }}
                            >
                              Acessar
                            </Button>
                          </Tooltip>

                          {/* Bloquear / Desbloquear */}
                          <Tooltip title={emp.ativo ? 'Bloquear Empresa' : 'Desbloquear Empresa'}>
                            <IconButton
                              size="small"
                              color={emp.ativo ? 'error' : 'success'}
                              onClick={() => handleOpenStatusModal(emp)}
                            >
                              {emp.ativo ? <Lock size={16} /> : <Unlock size={16} />}
                            </IconButton>
                          </Tooltip>

                          {/* Transferir Titularidade */}
                          <Tooltip title="Transferir Titularidade (Novo OWNER)">
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={() => handleOpenTransferModal(emp)}
                            >
                              <UserCheck size={16} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Auditoria de Suporte LPTI Tech */}
      <Card
        elevation={0}
        sx={{
          mt: 4,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: 2.5,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <History size={18} color="#6366f1" />
              <Typography variant="subtitle1" fontWeight={700}>
                Auditoria de Acessos • Modo Suporte LPTI Tech
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Rastreamento em tempo real de acessos, sessões e ações de suporte executadas por usuários MASTER.
            </Typography>
          </Box>

          <Button
            size="small"
            variant="outlined"
            onClick={carregarAuditoria}
            startIcon={<RefreshCw size={14} />}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            disabled={loadingAuditoria}
          >
            Atualizar Auditoria
          </Button>
        </Box>

        {loadingAuditoria ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>DATA / HORA</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>MASTER</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>EMPRESA ACESSADA</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>AÇÃO</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>DETALHES</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>IP / AGENT</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditoriaLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      Nenhum registro de auditoria de suporte encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditoriaLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {new Date(log.data_hora).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.78rem' }}>
                          {log.master_nome || 'Master'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {log.master_email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.78rem' }}>
                          {log.empresa_nome || `Empresa #${log.empresa_id}`}
                        </Typography>
                        {log.empresa_cnpj && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>
                            {log.empresa_cnpj}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.acao}
                          size="small"
                          color={
                            log.acao === 'INICIOU_SESSAO_SUPORTE'
                              ? 'primary'
                              : log.acao === 'ENCERROU_SESSAO_SUPORTE'
                              ? 'default'
                              : 'info'
                          }
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', maxWidth: 300 }}>
                        {log.detalhes || '-'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.7rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                        {log.ip || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Modal de Bloqueio de Empresa */}
      <Dialog open={blockModalOpen} onClose={() => setBlockModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700} sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lock size={20} /> Bloquear Empresa
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Você está prestes a bloquear o acesso à empresa{' '}
            <strong>{targetEmpresa?.nome_fantasia}</strong>. Proprietários, operadores e consultores vinculados
            ficarão imediatamente impossibilitados de operar o sistema até o desbloqueio.
          </Typography>

          <TextField
            fullWidth
            label="Motivo do Bloqueio"
            placeholder="Ex: Inadimplência, Manutenção judicial, Solicitação..."
            value={motivoBloqueio}
            onChange={(e) => setMotivoBloqueio(e.target.value)}
            margin="normal"
            multiline
            rows={2}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBlockModalOpen(false)} color="inherit" disabled={blockingSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => targetEmpresa && executarToggleStatus(targetEmpresa, false, motivoBloqueio || 'Bloqueio administrativo')}
            disabled={blockingSubmitting}
          >
            {blockingSubmitting ? <CircularProgress size={20} /> : 'Confirmar Bloqueio'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Transferência de Titularidade (OWNER) */}
      <Dialog open={transferModalOpen} onClose={() => setTransferModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>
          Transferir Titularidade (OWNER)
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Selecione qual usuário da empresa <strong>{transferEmpresa?.nome_fantasia}</strong> passará a ser o novo
            Proprietário Titular (OWNER). O titular anterior será automaticamente convertido para operador.
          </Typography>

          {transferLoadingUsers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <FormControl fullWidth margin="normal">
              <InputLabel>Novo Titular (OWNER)</InputLabel>
              <Select
                value={novoOwnerId}
                label="Novo Titular (OWNER)"
                onChange={(e) => setNovoOwnerId(Number(e.target.value))}
              >
                {empresaUsers.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.nome} ({u.email}) - {u.role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTransferModalOpen(false)} color="inherit" disabled={transferSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={executarTransferencia}
            disabled={transferSubmitting || !novoOwnerId}
          >
            {transferSubmitting ? <CircularProgress size={20} /> : 'Efetivar Transferência'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Modal Cadastrar Nova Empresa & OWNER Titular */}
      <Dialog
        open={createEmpresaModalOpen}
        onClose={() => setCreateEmpresaModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Building2 size={22} color="#10b981" />
          <span>Cadastrar Nova Empresa & OWNER Titular</span>
        </DialogTitle>
        <Box component="form" onSubmit={handleCreateEmpresaWithOwner}>
          <DialogContent dividers>
            {createError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {createError}
              </Alert>
            )}

            <Typography variant="caption" fontWeight={700} color="primary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase' }}>
              1. Dados Cadastrais da Empresa MEI
            </Typography>

            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Nome Fantasia"
                  required
                  value={newNomeFantasia}
                  onChange={(e) => setNewNomeFantasia(e.target.value)}
                  placeholder="ex: Padaria do Bairro MEI"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Razao Social"
                  required
                  value={newNomeEmpresarial}
                  onChange={(e) => setNewNomeEmpresarial(e.target.value)}
                  placeholder="ex: Carlos Silva 12345678000"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="CNPJ"
                  required
                  value={newCnpj}
                  onChange={(e) => setNewCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Telefone / WhatsApp"
                  value={newTelefone}
                  onChange={(e) => setNewTelefone(e.target.value)}
                  placeholder="(31) 99999-9999"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="E-mail da Empresa"
                  type="email"
                  value={newEmailEmpresa}
                  onChange={(e) => setNewEmailEmpresa(e.target.value)}
                  placeholder="contato@empresa.com.br"
                />
              </Grid>
            </Grid>

            <Typography variant="caption" fontWeight={700} color="secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase' }}>
              2. Dados de Acesso do Proprietario (OWNER)
            </Typography>

            <Grid container spacing={1.5}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Nome Completo do Titular"
                  required
                  value={newNomeOwner}
                  onChange={(e) => setNewNomeOwner(e.target.value)}
                  placeholder="ex: Carlos Alberto Silva"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="E-mail de Login do OWNER"
                  type="email"
                  required
                  value={newEmailOwner}
                  onChange={(e) => setNewEmailOwner(e.target.value)}
                  placeholder="carlos@empresa.com.br"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Senha Inicial do OWNER"
                  type="password"
                  required
                  value={newSenhaOwner}
                  onChange={(e) => setNewSenhaOwner(e.target.value)}
                  placeholder="Minimo 4 caracteres"
                  helperText="O titular podera alterar no primeiro acesso"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setCreateEmpresaModalOpen(false)} color="inherit" disabled={createSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createSubmitting}
              sx={{
                fontWeight: 700,
                bgcolor: '#10b981',
                '&:hover': { bgcolor: '#059669' },
              }}
            >
              {createSubmitting ? <CircularProgress size={20} /> : 'Cadastrar Empresa & OWNER'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};
