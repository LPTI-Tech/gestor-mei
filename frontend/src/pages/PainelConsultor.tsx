import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Divider,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ButtonGroup,
} from '@mui/material';
import {
  SupervisorAccount,
  Search,
  Refresh,
  WarningAmber,
  ReportProblem,
  CheckCircle,
  AccountBalanceWallet,
  TrendingUp,
  Inventory2,
  CalendarMonth,
  Store,
  FilterList,
  Visibility,
  InfoOutlined,
  Close,
} from '@mui/icons-material';
import api from '../services/api';
import { ClienteConsultorItem, ResumoConsultor, ScoreClienteTipo } from '../types';
import { formatCurrency, formatDate } from '../services/exportUtils';
import { useAuth } from '../contexts/AuthContext';
import {
  SentinelCard,
  SentinelTableContainer,
  SentinelTable,
  SentinelTableHead,
  SentinelTableRow,
  SentinelTableCell,
  SentinelBadge,
  SentinelInput,
} from '../design-system';

export const PainelConsultor: React.FC = () => {
  const { isMaster } = useAuth();
  const [resumo, setResumo] = useState<ResumoConsultor | null>(null);
  const [clientes, setClientes] = useState<ClienteConsultorItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filtroScore, setFiltroScore] = useState<string>('TODOS');
  const [filtroDasAtrasado, setFiltroDasAtrasado] = useState<boolean>(false);
  const [filtroEstoqueCritico, setFiltroEstoqueCritico] = useState<boolean>(false);
  const [filtroProximoLimite, setFiltroProximoLimite] = useState<boolean>(false);

  // Modal Diagnóstico
  const [selectedCliente, setSelectedCliente] = useState<ClienteConsultorItem | null>(null);
  const [openDiagModal, setOpenDiagModal] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [resumoRes, clientesRes] = await Promise.all([
        api.get<ResumoConsultor>('/consultor/resumo'),
        api.get<ClienteConsultorItem[]>('/consultor/clientes'),
      ]);

      setResumo(resumoRes.data);
      setClientes(clientesRes.data);
    } catch (err: any) {
      console.error('Erro ao carregar dados do consultor:', err);
      setErrorMsg(err.response?.data?.detail || 'Erro ao carregar Painel do Consultor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtragem local
  const clientesFiltrados = clientes.filter((c) => {
    // 1. Busca textual
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchText =
        c.nome_fantasia.toLowerCase().includes(term) ||
        c.nome_empresarial.toLowerCase().includes(term) ||
        c.cnpj.toLowerCase().includes(term);
      if (!matchText) return false;
    }

    // 2. Filtro por Score
    if (filtroScore !== 'TODOS' && c.score !== filtroScore) {
      return false;
    }

    // 3. Filtros Booleanos
    if (filtroDasAtrasado && c.qtd_das_atrasados === 0) return false;
    if (filtroEstoqueCritico && c.quantidade_produtos_criticos === 0) return false;
    if (filtroProximoLimite && !c.proximo_limite_mei) return false;

    return true;
  });

  const handleOpenDiagnostico = (cliente: ClienteConsultorItem) => {
    setSelectedCliente(cliente);
    setOpenDiagModal(true);
  };

  const renderScoreChip = (score: ScoreClienteTipo, motivo: string) => {
    let variant: 'active' | 'warning' | 'error' = 'active';
    let label = 'SAUDÁVEL';

    if (score === 'ATENCAO') {
      variant = 'warning';
      label = 'ATENÇÃO';
    } else if (score === 'CRITICO') {
      variant = 'error';
      label = 'CRÍTICO';
    }

    return (
      <Tooltip title={motivo} arrow>
        <Box component="span" sx={{ display: 'inline-flex' }}>
          <SentinelBadge
            sentinelVariant={variant}
            size="small"
            withDot
            label={label}
          />
        </Box>
      </Tooltip>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Cabeçalho */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <SupervisorAccount color="primary" fontSize="large" />
            <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
              {isMaster ? 'Governança Multiempresa & Carteira' : 'Painel do Consultor'}
            </Typography>
            {isMaster ? (
              <SentinelBadge
                sentinelVariant="master"
                size="small"
                withDot
                pulse
                label="CENTRO DE COMANDO MASTER"
              />
            ) : (
              <SentinelBadge
                sentinelVariant="consultor"
                size="small"
                label="CONSULTORIA LPTI"
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            Visão consolidada da carteira de empresas MEI: conformidade com o DAS, estoque crítico, teto de faturamento e scores de saúde.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchData}
            disabled={loading}
            size="small"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, height: 38 }}
          >
            Atualizar Carteira
          </Button>
        </Box>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* DASHBOARD DE TOPO (4 CARDS DE INDICADORES EXECUTIVOS SENTINEL) */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* 1. Clientes Ativos */}
        <Grid item xs={12} sm={6} md={3}>
          <SentinelCard sentinelVariant={isMaster ? 'master' : 'default'} dense>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                Clientes Ativos
              </Typography>
              <Store color="primary" fontSize="small" />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: 'primary.main',
                fontFeatureSettings: '"tnum"',
                letterSpacing: '-0.02em',
                mb: 0.3,
              }}
            >
              {resumo?.total_clientes_ativos ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
              Empresas MEI sob consultoria ativa
            </Typography>
          </SentinelCard>
        </Grid>

        {/* 2. DAS em Atraso */}
        <Grid item xs={12} sm={6} md={3}>
          <SentinelCard sentinelVariant={isMaster ? 'master' : 'default'} dense>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                DAS em Atraso
              </Typography>
              <ReportProblem color="error" fontSize="small" />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: 'error.main',
                fontFeatureSettings: '"tnum"',
                letterSpacing: '-0.02em',
                mb: 0.3,
              }}
            >
              {resumo?.total_das_atrasado ?? 0}
            </Typography>
            <Typography variant="caption" color="error.light" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
              {resumo?.total_das_atrasado ? 'Exigem regularização fiscal urgente' : 'Nenhuma empresa inadimplente'}
            </Typography>
          </SentinelCard>
        </Grid>

        {/* 3. Estoque Crítico */}
        <Grid item xs={12} sm={6} md={3}>
          <SentinelCard sentinelVariant={isMaster ? 'master' : 'default'} dense>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                Estoque Crítico
              </Typography>
              <Inventory2 color="warning" fontSize="small" />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: 'warning.main',
                fontFeatureSettings: '"tnum"',
                letterSpacing: '-0.02em',
                mb: 0.3,
              }}
            >
              {resumo?.total_estoque_critico ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
              Clientes com produtos zerados ou no mínimo
            </Typography>
          </SentinelCard>
        </Grid>

        {/* 4. Próximos do Limite MEI */}
        <Grid item xs={12} sm={6} md={3}>
          <SentinelCard sentinelVariant={isMaster ? 'master' : 'default'} dense>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                Próximos do Limite MEI
              </Typography>
              <TrendingUp color="secondary" fontSize="small" />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: 'secondary.main',
                fontFeatureSettings: '"tnum"',
                letterSpacing: '-0.02em',
                mb: 0.3,
              }}
            >
              {resumo?.total_proximo_limite ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
              Faturamento anual ≥ 80% (teto R$ 81k)
            </Typography>
          </SentinelCard>
        </Grid>
      </Grid>

      {/* BARRA DE FILTROS & PESQUISA COM SENTINELINPUT */}
      <SentinelCard dense sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Busca Textual */}
          <SentinelInput
            size="small"
            placeholder="Buscar por cliente, razão social ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', md: 340 } }}
          />

          {/* Filtros de Score */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mr: 0.5 }}>
              SCORE:
            </Typography>
            <Chip
              label="Todos"
              clickable
              color={filtroScore === 'TODOS' ? 'primary' : 'default'}
              variant={filtroScore === 'TODOS' ? 'filled' : 'outlined'}
              size="small"
              onClick={() => setFiltroScore('TODOS')}
            />
            <Chip
              label="🟢 Saudável"
              clickable
              color={filtroScore === 'SAUDAVEL' ? 'success' : 'default'}
              variant={filtroScore === 'SAUDAVEL' ? 'filled' : 'outlined'}
              size="small"
              onClick={() => setFiltroScore(filtroScore === 'SAUDAVEL' ? 'TODOS' : 'SAUDAVEL')}
            />
            <Chip
              label="🟡 Atenção"
              clickable
              color={filtroScore === 'ATENCAO' ? 'warning' : 'default'}
              variant={filtroScore === 'ATENCAO' ? 'filled' : 'outlined'}
              size="small"
              onClick={() => setFiltroScore(filtroScore === 'ATENCAO' ? 'TODOS' : 'ATENCAO')}
            />
            <Chip
              label="🔴 Crítico"
              clickable
              color={filtroScore === 'CRITICO' ? 'error' : 'default'}
              variant={filtroScore === 'CRITICO' ? 'filled' : 'outlined'}
              size="small"
              onClick={() => setFiltroScore(filtroScore === 'CRITICO' ? 'TODOS' : 'CRITICO')}
            />
          </Box>

          {/* Filtros Booleanos Rápidos */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="🚨 DAS Atrasado"
              clickable
              color={filtroDasAtrasado ? 'error' : 'default'}
              variant={filtroDasAtrasado ? 'filled' : 'outlined'}
              size="small"
              onClick={() => setFiltroDasAtrasado(!filtroDasAtrasado)}
            />
            <Chip
              label="⚠️ Estoque Crítico"
              clickable
              color={filtroEstoqueCritico ? 'warning' : 'default'}
              variant={filtroEstoqueCritico ? 'filled' : 'outlined'}
              size="small"
              onClick={() => setFiltroEstoqueCritico(!filtroEstoqueCritico)}
            />
            <Chip
              label="📈 Próximo Limite"
              clickable
              color={filtroProximoLimite ? 'secondary' : 'default'}
              variant={filtroProximoLimite ? 'filled' : 'outlined'}
              size="small"
              onClick={() => setFiltroProximoLimite(!filtroProximoLimite)}
            />
          </Box>
        </Box>
      </SentinelCard>

      {/* LISTAGEM DE CLIENTES COM SENTINELTABLE */}
      {loading ? (
        <Box sx={{ p: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Carregando indicadores dos clientes...
          </Typography>
        </Box>
      ) : clientesFiltrados.length === 0 ? (
        <SentinelCard dense sx={{ p: 6, textAlign: 'center' }}>
          <SupervisorAccount sx={{ fontSize: 60, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary" fontWeight={600}>
            Nenhum cliente atende aos filtros selecionados.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            sx={{ mt: 1.5 }}
            onClick={() => {
              setSearchTerm('');
              setFiltroScore('TODOS');
              setFiltroDasAtrasado(false);
              setFiltroEstoqueCritico(false);
              setFiltroProximoLimite(false);
            }}
          >
            Limpar Filtros
          </Button>
        </SentinelCard>
      ) : (
        <SentinelTableContainer>
          <SentinelTable>
            <SentinelTableHead>
              <TableRow>
                <TableCell>Cliente / Empresa</TableCell>
                <TableCell align="center">Score Saúde</TableCell>
                <TableCell align="center">Status DAS</TableCell>
                <TableCell>Faturamento Anual & Teto MEI</TableCell>
                <TableCell align="center">Estoque Crítico</TableCell>
                <TableCell>Última Compra</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </SentinelTableHead>
            <TableBody>
              {clientesFiltrados.map((c) => (
                <SentinelTableRow key={c.id}>
                  {/* Nome / Empresa */}
                  <SentinelTableCell tabular={false}>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8125rem' }}>
                      {c.nome_fantasia}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.72rem' }}>
                      {c.nome_empresarial}
                    </Typography>
                    <Typography variant="caption" color="primary" sx={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
                      CNPJ: {c.cnpj}
                    </Typography>
                  </SentinelTableCell>

                  {/* Score */}
                  <SentinelTableCell align="center" tabular={false}>
                    {renderScoreChip(c.score, c.score_motivo)}
                  </SentinelTableCell>

                  {/* Status DAS */}
                  <SentinelTableCell align="center" tabular={false}>
                    {c.status_das === 'Atrasado' ? (
                      <SentinelBadge
                        sentinelVariant="error"
                        size="small"
                        label={`${c.qtd_das_atrasados} EM ATRASO`}
                      />
                    ) : c.status_das === 'Pendente' ? (
                      <SentinelBadge
                        sentinelVariant="warning"
                        size="small"
                        label={c.das_vence_em_breve ? 'VENCE EM 7 DIAS' : 'PENDENTE'}
                      />
                    ) : (
                      <SentinelBadge
                        sentinelVariant="active"
                        size="small"
                        label="EM DIA"
                      />
                    )}
                  </SentinelTableCell>

                  {/* Faturamento Anual & % Limite MEI */}
                  <SentinelTableCell sx={{ minWidth: 200 }} tabular={true}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8125rem', fontFeatureSettings: '"tnum"' }}>
                        {formatCurrency(c.faturamento_anual)}
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={800}
                        sx={{ fontFeatureSettings: '"tnum"' }}
                        color={
                          c.estourou_limite_mei
                            ? 'error.main'
                            : c.proximo_limite_mei
                            ? 'warning.main'
                            : 'success.main'
                        }
                      >
                        {c.percentual_limite_mei}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(c.percentual_limite_mei, 100)}
                      color={
                        c.estourou_limite_mei
                          ? 'error'
                          : c.proximo_limite_mei
                          ? 'warning'
                          : 'success'
                      }
                      sx={{ height: 5, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.72rem', fontFeatureSettings: '"tnum"' }}>
                      Teto anual: {formatCurrency(c.limite_mei_anual)}
                    </Typography>
                  </SentinelTableCell>

                  {/* Quantidade de Produtos Críticos */}
                  <SentinelTableCell align="center" tabular={false}>
                    {c.quantidade_produtos_criticos > 0 ? (
                      <Tooltip title={c.produtos_criticos_nomes.join(', ')} arrow>
                        <Box component="span">
                          <SentinelBadge
                            sentinelVariant="warning"
                            size="small"
                            label={`${c.quantidade_produtos_criticos} ITENS`}
                          />
                        </Box>
                      </Tooltip>
                    ) : (
                      <SentinelBadge
                        sentinelVariant="default"
                        size="small"
                        label="REGULAR"
                      />
                    )}
                  </SentinelTableCell>

                  {/* Última Compra Registrada */}
                  <SentinelTableCell tabular={true}>
                    {c.ultima_compra ? (
                      <>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 160, fontSize: '0.8125rem' }}>
                          {c.ultima_compra.fornecedor_nome}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.72rem', fontFeatureSettings: '"tnum"' }}>
                          NF nº {c.ultima_compra.numero_nota} • {formatCurrency(c.ultima_compra.valor_total)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                          {formatDate(c.ultima_compra.data)}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Nenhuma compra NF-e
                      </Typography>
                    )}
                  </SentinelTableCell>

                  {/* Ações */}
                  <SentinelTableCell align="center" tabular={false}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => handleOpenDiagnostico(c)}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, height: 32, fontSize: '0.75rem' }}
                    >
                      Diagnóstico
                    </Button>
                  </SentinelTableCell>
                </SentinelTableRow>
              ))}
            </TableBody>
          </SentinelTable>
        </SentinelTableContainer>
      )}

      {/* MODAL DE DIAGNÓSTICO DO CLIENTE */}
      <Dialog
        open={openDiagModal}
        onClose={() => setOpenDiagModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Diagnóstico Consultivo — {selectedCliente?.nome_fantasia}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Relatório Executivo LPTI Tech • CNPJ: {selectedCliente?.cnpj}
            </Typography>
          </Box>
          <IconButton onClick={() => setOpenDiagModal(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {selectedCliente && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Alerta de Score */}
              <Alert
                severity={
                  selectedCliente.score === 'CRITICO'
                    ? 'error'
                    : selectedCliente.score === 'ATENCAO'
                    ? 'warning'
                    : 'success'
                }
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                <strong>Score: {selectedCliente.score}</strong> — {selectedCliente.score_motivo}
              </Alert>

              {/* Informações Gerais */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      DADOS DA EMPRESA
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Razão Social:</strong> {selectedCliente.nome_empresarial}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Segmento:</strong> {selectedCliente.segmento || 'Não informado'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Telefone:</strong> {selectedCliente.telefone || 'Não informado'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>E-mail:</strong> {selectedCliente.email || 'Não informado'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      SITUAÇÃO FISCAL & MEI
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Status DAS:</strong> {selectedCliente.status_das}
                      {selectedCliente.qtd_das_atrasados > 0 && ` (${selectedCliente.qtd_das_atrasados} guia(s) atrasada(s))`}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Faturamento Anual:</strong> {formatCurrency(selectedCliente.faturamento_anual)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>% do Teto MEI:</strong> {selectedCliente.percentual_limite_mei}%
                    </Typography>
                    <Typography variant="body2">
                      <strong>Margem Restante:</strong> {formatCurrency(Math.max(0, selectedCliente.limite_mei_anual - selectedCliente.faturamento_anual))}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Produtos Críticos */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  ESTOQUE CRÍTICO ({selectedCliente.quantidade_produtos_criticos} ITENS)
                </Typography>
                {selectedCliente.produtos_criticos_nomes.length > 0 ? (
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedCliente.produtos_criticos_nomes.map((nome, i) => (
                      <Chip key={i} label={nome} color="warning" size="small" variant="outlined" />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Nenhum produto crítico. O estoque encontra-se com margem de segurança adequada.
                  </Typography>
                )}
              </Paper>

              {/* Recomendações da Consultoria LPTI Tech */}
              <Paper sx={{ p: 2, borderRadius: 2, bgcolor: (th) => (th.palette.mode === 'dark' ? 'grey.900' : 'grey.100') }}>
                <Typography variant="caption" color="primary" fontWeight={700}>
                  RECOMENDAÇÕES DA CONSULTORIA LPTI TECH
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {selectedCliente.score === 'CRITICO' ? (
                    <>
                      • <strong>Regularização Imediata:</strong> Gerar as guias DAS pendentes no PGMEI para evitar multas e cobrança na Dívida Ativa da União.
                      <br />
                      • <strong>Desenquadramento Tributário:</strong> Se o faturamento ultrapassar 20% do teto (R$ 97.200,00), preparar a migração para Microempresa (ME) no Simples Nacional.
                    </>
                  ) : selectedCliente.score === 'ATENCAO' ? (
                    <>
                      • <strong>Monitoramento Semanal de Vendas:</strong> O faturamento está próximo de 80% do teto anual do MEI. Realizar projeção de encerramento do exercício fiscal.
                      <br />
                      • <strong>Reposição de Insumos:</strong> Entrar em contato com os fornecedores parceiros para recomposição do estoque antes de rupturas no PDV.
                    </>
                  ) : (
                    <>
                      • <strong>Saúde Operacional Plena:</strong> A empresa mantém conformidade com as exigências do MEI, margem confortável no teto de R$ 81k e estoque equilibrado.
                      <br />
                      • <strong>Estratégia:</strong> Focar em campanhas de fidelização e melhoria de margem de contribuição por item vendido.
                    </>
                  )}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDiagModal(false)} variant="contained" sx={{ borderRadius: 2 }}>
            Fechar Diagnóstico
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

