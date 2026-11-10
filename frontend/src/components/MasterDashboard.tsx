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
} from 'lucide-react';
import api from '../services/api';
import { EmpresaMasterListItem, MetricasGlobais, User } from '../types';
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
      const [resMetricas, resEmpresas] = await Promise.all([
        api.get<MetricasGlobais>('/empresa/metricas-globais'),
        api.get<EmpresaMasterListItem[]>('/empresa/todas'),
      ]);
      setMetricas(resMetricas.data);
      setEmpresas(resEmpresas.data);
    } catch (err: any) {
      console.error('Erro ao carregar métricas globais MASTER:', err);
      setError('Não foi possível carregar as métricas do painel MASTER.');
    } finally {
      setLoading(false);
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

  // Handler para alternar contexto e abrir visão operacional da empresa
  const handleAcessarEmpresa = async (empresaId: number) => {
    try {
      await setContextEmpresaId(empresaId);
      navigate('/dashboard');
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
    <Box sx={{ pb: 6 }}>
      {/* Banner Principal Master Sentinel */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          mb: 3.5,
          borderRadius: 3,
          background: isDark
            ? 'linear-gradient(135deg, #071933 0%, #0d2847 100%)'
            : 'linear-gradient(135deg, #0a2540 0%, #08213b 100%)',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(14, 165, 233, 0.3)',
          boxShadow: '0 12px 32px rgba(10, 37, 64, 0.2)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2.5,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1 }}>
              <Chip
                icon={<Shield size={14} color="#38bdf8" />}
                label="LPTI Tech • Administrador Global"
                size="small"
                sx={{
                  bgcolor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              />
              <Chip
                label="Visão Global Multi-tenant"
                size="small"
                sx={{
                  bgcolor: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                }}
              />
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.8 }}>
              Dashboard Global MASTER
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, maxWidth: 640 }}>
              Visão macro consolidada de toda a plataforma Gestor MEI: métricas de empresas cadastradas,
              titulares (OWNER), operadores, consultores e status de operação em tempo real.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={carregarDados}
              startIcon={<RefreshCw size={15} />}
              sx={{
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.08)' },
              }}
            >
              Atualizar
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => navigate('/usuarios')}
              startIcon={<PlusCircle size={15} />}
              sx={{
                bgcolor: '#10b981',
                color: '#ffffff',
                borderRadius: 2,
                fontWeight: 700,
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                '&:hover': { bgcolor: '#059669' },
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
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {feedback.text}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Painel de Métricas Globais (6 Indicadores Oficiais) */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {/* 1. Total de Empresas */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                Total Empresas
              </Typography>
              <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                <Building2 size={18} strokeWidth={2} />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={800} color="text.primary">
              {loading ? <CircularProgress size={24} /> : metricas?.total_empresas ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Negócios registrados
            </Typography>
          </Card>
        </Grid>

        {/* 2. Empresas Ativas */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: alpha(theme.palette.success.main, 0.3),
              bgcolor: alpha(theme.palette.success.main, 0.04),
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="caption" fontWeight={700} color="success.main" textTransform="uppercase">
                Empresas Ativas
              </Typography>
              <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: alpha(theme.palette.success.main, 0.15), color: 'success.main' }}>
                <CheckCircle2 size={18} strokeWidth={2} />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={800} color="success.main">
              {loading ? <CircularProgress size={24} /> : metricas?.empresas_ativas ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Operando normalmente
            </Typography>
          </Card>
        </Grid>

        {/* 3. Empresas Bloqueadas */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: alpha(theme.palette.error.main, 0.3),
              bgcolor: alpha(theme.palette.error.main, 0.04),
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="caption" fontWeight={700} color="error.main" textTransform="uppercase">
                Bloqueadas
              </Typography>
              <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: alpha(theme.palette.error.main, 0.15), color: 'error.main' }}>
                <ShieldAlert size={18} strokeWidth={2} />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={800} color="error.main">
              {loading ? <CircularProgress size={24} /> : metricas?.empresas_bloqueadas ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Suspensas pela gestão
            </Typography>
          </Card>
        </Grid>

        {/* 4. Total de Proprietários (OWNERs) */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="caption" fontWeight={700} color="secondary.main" textTransform="uppercase">
                Proprietários
              </Typography>
              <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: alpha(theme.palette.secondary.main, 0.1), color: 'secondary.main' }}>
                <UserCheck size={18} strokeWidth={2} />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={800} color="text.primary">
              {loading ? <CircularProgress size={24} /> : metricas?.total_owners ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Titulares de negócio
            </Typography>
          </Card>
        </Grid>

        {/* 5. Total de Operadores */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                Operadores
              </Typography>
              <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main' }}>
                <Users size={18} strokeWidth={2} />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={800} color="text.primary">
              {loading ? <CircularProgress size={24} /> : metricas?.total_operadores ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Caixas e atendimento
            </Typography>
          </Card>
        </Grid>

        {/* 6. Total de Consultores */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                Consultores
              </Typography>
              <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main' }}>
                <Briefcase size={18} strokeWidth={2} />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={800} color="text.primary">
              {loading ? <CircularProgress size={24} /> : metricas?.total_consultores ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Consultores externos
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Gestão das Empresas da Plataforma */}
      <Card
        elevation={0}
        sx={{
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
            <Typography variant="subtitle1" fontWeight={700}>
              Empresas Cadastradas na Plataforma ({empresasFiltradas.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Gerencie a titularidade, status de operação e acesse qualquer empresa como auditor global.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<PlusCircle size={16} />}
              onClick={() => {
                setCreateError(null);
                setCreateEmpresaModalOpen(true);
              }}
              sx={{
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 2,
                py: 0.8,
                bgcolor: '#10b981',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                '&:hover': { bgcolor: '#059669' },
              }}
            >
              Nova Empresa & OWNER
            </Button>
            {/* Filtros de Status */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Chip
                label="Todas"
                size="small"
                onClick={() => setStatusFiltro('TODAS')}
                color={statusFiltro === 'TODAS' ? 'primary' : 'default'}
                variant={statusFiltro === 'TODAS' ? 'filled' : 'outlined'}
              />
              <Chip
                label="Ativas"
                size="small"
                onClick={() => setStatusFiltro('ATIVAS')}
                color={statusFiltro === 'ATIVAS' ? 'success' : 'default'}
                variant={statusFiltro === 'ATIVAS' ? 'filled' : 'outlined'}
              />
              <Chip
                label="Bloqueadas"
                size="small"
                onClick={() => setStatusFiltro('BLOQUEADAS')}
                color={statusFiltro === 'BLOQUEADAS' ? 'error' : 'default'}
                variant={statusFiltro === 'BLOQUEADAS' ? 'filled' : 'outlined'}
              />
            </Box>

            {/* Campo de Busca */}
            <TextField
              size="small"
              placeholder="Buscar por nome, CNPJ ou titular..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              sx={{ minWidth: 260 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} />
                  </InputAdornment>
                ),
              }}
            />
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
                          sx={{ fontSize: '0.72rem', fontWeight: 600 }}
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
                          sx={{ fontWeight: 700, minWidth: 32 }}
                        />
                      </TableCell>

                      {/* Status */}
                      <TableCell align="center">
                        {emp.ativo ? (
                          <Chip
                            label="Ativa"
                            size="small"
                            color="success"
                            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                          />
                        ) : (
                          <Tooltip title={emp.motivo_bloqueio ? `Motivo: ${emp.motivo_bloqueio}` : 'Suspenso pela administração'}>
                            <Chip
                              label="Bloqueada"
                              size="small"
                              color="error"
                              sx={{ fontWeight: 700, fontSize: '0.72rem' }}
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
                                borderRadius: 1.5,
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
