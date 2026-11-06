import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Users,
  Search,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Package,
  Calendar,
  Building2,
  Filter,
  Eye,
  Info,
  X,
  Store,
  Sparkles,
  ArrowUpRight,
  Clock,
  Briefcase,
} from 'lucide-react';
import api from '../services/api';
import { ClienteConsultorItem, ResumoConsultor, ScoreClienteTipo } from '../types';
import { formatCurrency, formatDate } from '../services/exportUtils';
import {
  ProtectiveCard,
  ClearSignalKPI,
  FiscalShieldCapsule,
} from '../components/sentinel';
import { StatusPill, StatusPillVariant } from '../components/StatusPill';

export const PainelConsultor: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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

  const renderScorePill = (score: ScoreClienteTipo, motivo: string) => {
    let variant: StatusPillVariant = 'success';
    let label = 'Saudável';
    let pulse = false;

    if (score === 'ATENCAO') {
      variant = 'warning';
      label = 'Atenção';
      pulse = true;
    } else if (score === 'CRITICO') {
      variant = 'error';
      label = 'Crítico';
      pulse = true;
    }

    return (
      <Tooltip title={motivo} arrow placement="top">
        <Box sx={{ display: 'inline-flex' }}>
          <StatusPill label={label} variant={variant} pulse={pulse} size="small" />
        </Box>
      </Tooltip>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* CABEÇALHO DO CONSULTOR — COCKPIT EXECUTIVO LPTI SENTINEL */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 3.5,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                bgcolor: 'primary.main',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(2, 136, 209, 0.3)',
              }}
            >
              <Briefcase size={24} />
            </Box>
            <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.02em' }}>
              Cockpit do Consultor
            </Typography>
            <StatusPill label="LPTI Tech • Assessoria Ativa" variant="info" size="medium" />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 760 }}>
            Painel executivo de governança e monitoramento preventivo da carteira MEI:
            blindagem tributária DAS, teto de faturamento R$ 81k e prevenção de rupturas operacionais.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignSelf: { xs: 'stretch', sm: 'flex-start' } }}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} className={loading ? 'spin' : ''} />}
            onClick={fetchData}
            disabled={loading}
            size="small"
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 700,
              px: 2,
              height: 38,
            }}
          >
            Atualizar Carteira
          </Button>
        </Box>
      </Box>

      {errorMsg && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setErrorMsg(null)}
        >
          {errorMsg}
        </Alert>
      )}

      {/* DASHBOARD DE TOPO — 4 CARDS DE INDICADORES EXECUTIVOS COM CLEARSIGNALKPI */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* 1. Clientes Ativos */}
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="Clientes Ativos"
            value={resumo?.total_clientes_ativos ?? 0}
            icon={<Building2 size={20} />}
            colorScheme="primary"
            humanExplanation="Empresas MEI com acompanhamento consultivo regular"
            statusPill={{
              label: 'Monitoramento Contínuo',
              variant: 'info',
            }}
          />
        </Grid>

        {/* 2. DAS em Atraso */}
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="DAS em Atraso"
            value={resumo?.total_das_atrasado ?? 0}
            icon={<ShieldAlert size={20} />}
            colorScheme={(resumo?.total_das_atrasado ?? 0) > 0 ? 'error' : 'success'}
            humanExplanation={
              (resumo?.total_das_atrasado ?? 0) > 0
                ? 'Empresas com guias vencidas exigindo regularização fiscal'
                : 'Conformidade plena! Todas as guias quitadas'
            }
            statusPill={
              (resumo?.total_das_atrasado ?? 0) > 0
                ? { label: 'Risco Fiscal Imediato', variant: 'error', pulse: true }
                : { label: 'Conformidade 100%', variant: 'success' }
            }
          />
        </Grid>

        {/* 3. Estoque Crítico */}
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="Estoque Crítico"
            value={resumo?.total_estoque_critico ?? 0}
            icon={<Package size={20} />}
            colorScheme={(resumo?.total_estoque_critico ?? 0) > 0 ? 'warning' : 'success'}
            humanExplanation={
              (resumo?.total_estoque_critico ?? 0) > 0
                ? 'Clientes com mercadorias zeradas ou abaixo do estoque mínimo'
                : 'Nenhuma ruptura detectada nas empresas'
            }
            statusPill={
              (resumo?.total_estoque_critico ?? 0) > 0
                ? { label: 'Atenção Suprimentos', variant: 'warning', pulse: true }
                : { label: 'Estoque Protegido', variant: 'success' }
            }
          />
        </Grid>

        {/* 4. Próximos do Limite MEI */}
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="Faixa Prudencial MEI"
            value={resumo?.total_proximo_limite ?? 0}
            icon={<TrendingUp size={20} />}
            colorScheme={(resumo?.total_proximo_limite ?? 0) > 0 ? 'warning' : 'neutral'}
            humanExplanation="Faturamento acumulado ≥ 80% do teto anual (R$ 81.000,00)"
            statusPill={
              (resumo?.total_proximo_limite ?? 0) > 0
                ? { label: 'Atenção ao Teto', variant: 'warning', pulse: true }
                : { label: 'Margem Segura', variant: 'success' }
            }
          />
        </Grid>
      </Grid>

      {/* BARRA DE FILTROS & PESQUISA COM PROTECTIVECARD */}
      <ProtectiveCard
        variant="default"
        padding={{ xs: 2, sm: 2 }}
        sx={{ mb: 3 }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: 2,
            alignItems: { xs: 'stretch', lg: 'center' },
            justifyContent: 'space-between',
          }}
        >
          {/* Busca Textual */}
          <TextField
            size="small"
            placeholder="Buscar por cliente, razão social ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color="#64748B" />
                </InputAdornment>
              ),
            }}
            sx={{
              minWidth: { xs: '100%', md: 340 },
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
              },
            }}
          />

          {/* Filtros Rápidos por Score */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography
              variant="caption"
              fontWeight={800}
              color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', mr: 0.5 }}
            >
              Diagnóstico:
            </Typography>
            <Button
              size="small"
              variant={filtroScore === 'TODOS' ? 'contained' : 'outlined'}
              onClick={() => setFiltroScore('TODOS')}
              sx={{
                borderRadius: '20px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.78rem',
                py: 0.3,
                px: 1.5,
              }}
            >
              Todos ({clientes.length})
            </Button>
            <Button
              size="small"
              variant={filtroScore === 'SAUDAVEL' ? 'contained' : 'outlined'}
              color="success"
              onClick={() => setFiltroScore(filtroScore === 'SAUDAVEL' ? 'TODOS' : 'SAUDAVEL')}
              sx={{
                borderRadius: '20px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.78rem',
                py: 0.3,
                px: 1.5,
              }}
            >
              🟢 Saudável
            </Button>
            <Button
              size="small"
              variant={filtroScore === 'ATENCAO' ? 'contained' : 'outlined'}
              color="warning"
              onClick={() => setFiltroScore(filtroScore === 'ATENCAO' ? 'TODOS' : 'ATENCAO')}
              sx={{
                borderRadius: '20px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.78rem',
                py: 0.3,
                px: 1.5,
              }}
            >
              🟡 Atenção
            </Button>
            <Button
              size="small"
              variant={filtroScore === 'CRITICO' ? 'contained' : 'outlined'}
              color="error"
              onClick={() => setFiltroScore(filtroScore === 'CRITICO' ? 'TODOS' : 'CRITICO')}
              sx={{
                borderRadius: '20px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.78rem',
                py: 0.3,
                px: 1.5,
              }}
            >
              🔴 Crítico
            </Button>
          </Box>

          {/* Filtros Booleanos Rápidos */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant={filtroDasAtrasado ? 'contained' : 'outlined'}
              color="error"
              onClick={() => setFiltroDasAtrasado(!filtroDasAtrasado)}
              sx={{
                borderRadius: '20px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.78rem',
                py: 0.3,
                px: 1.5,
              }}
            >
              🚨 DAS Atrasado
            </Button>
            <Button
              size="small"
              variant={filtroEstoqueCritico ? 'contained' : 'outlined'}
              color="warning"
              onClick={() => setFiltroEstoqueCritico(!filtroEstoqueCritico)}
              sx={{
                borderRadius: '20px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.78rem',
                py: 0.3,
                px: 1.5,
              }}
            >
              ⚠️ Estoque Crítico
            </Button>
            <Button
              size="small"
              variant={filtroProximoLimite ? 'contained' : 'outlined'}
              color="secondary"
              onClick={() => setFiltroProximoLimite(!filtroProximoLimite)}
              sx={{
                borderRadius: '20px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.78rem',
                py: 0.3,
                px: 1.5,
              }}
            >
              📈 Próximo do Limite
            </Button>
          </Box>
        </Box>
      </ProtectiveCard>

      {/* LISTAGEM DE CLIENTES — CARTEIRA DE ASSESSORIA PROTEGIDA */}
      <ProtectiveCard
        variant="default"
        title="Carteira de Empresas MEI sob Consultoria"
        subtitle={`Exibindo ${clientesFiltrados.length} cliente(s) sob supervisão ativa`}
        icon={<Building2 size={20} />}
        statusPill={<StatusPill label="Tempo Real" variant="neutral" size="small" />}
        padding={0}
        sx={{ overflow: 'hidden' }}
      >
        {loading ? (
          <Box
            sx={{
              p: 6,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">
              Carregando indicadores da carteira...
            </Typography>
          </Box>
        ) : clientesFiltrados.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Users size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={700}>
              Nenhum cliente atende aos filtros selecionados.
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5, mb: 2 }}>
              Tente alterar os termos de busca ou redefinir os filtros de score.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setSearchTerm('');
                setFiltroScore('TODOS');
                setFiltroDasAtrasado(false);
                setFiltroEstoqueCritico(false);
                setFiltroProximoLimite(false);
              }}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
            >
              Limpar Filtros
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }}>EMPRESA MEI</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }} align="center">SCORE SENTINEL</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }} align="center">STATUS DAS</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }}>BLINDAGEM FISCAL (TETO R$ 81K)</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }} align="center">SUPRIMENTOS</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }}>ÚLTIMA COMPRA NF-E</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }} align="center">AÇÕES</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clientesFiltrados.map((c) => (
                  <TableRow
                    key={c.id}
                    hover
                    sx={{
                      transition: 'background-color 0.15s ease',
                      '&:last-child td': { borderBottom: 0 },
                    }}
                  >
                    {/* Nome / Empresa */}
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body2" fontWeight={800} sx={{ color: 'text.primary' }}>
                        {c.nome_fantasia}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {c.nome_empresarial}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{ fontFamily: 'monospace', fontWeight: 700, mt: 0.3, display: 'inline-block' }}
                      >
                        CNPJ: {c.cnpj}
                      </Typography>
                    </TableCell>

                    {/* Score Sentinel */}
                    <TableCell align="center" sx={{ py: 2 }}>
                      {renderScorePill(c.score, c.score_motivo)}
                    </TableCell>

                    {/* Status DAS */}
                    <TableCell align="center" sx={{ py: 2 }}>
                      {c.status_das === 'Atrasado' ? (
                        <StatusPill
                          label={`${c.qtd_das_atrasados} em Atraso`}
                          variant="error"
                          pulse={true}
                          size="small"
                        />
                      ) : c.status_das === 'Pendente' ? (
                        <StatusPill
                          label={c.das_vence_em_breve ? 'Vence em 7 dias' : 'Pendente'}
                          variant="warning"
                          size="small"
                        />
                      ) : (
                        <StatusPill label="Em dia" variant="success" size="small" />
                      )}
                    </TableCell>

                    {/* Blindagem Fiscal: FiscalShieldCapsule Compacto */}
                    <TableCell sx={{ minWidth: 260, py: 2 }}>
                      <FiscalShieldCapsule
                        faturamentoAcumulado={c.faturamento_anual}
                        limiteAnual={c.limite_mei_anual || 81000}
                        variant="compact"
                        statusDas={
                          c.status_das === 'Atrasado'
                            ? 'atrasado'
                            : c.status_das === 'Pendente'
                            ? 'pendente'
                            : 'pago'
                        }
                        sx={{
                          py: 1,
                          px: 1.5,
                          bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)',
                        }}
                      />
                    </TableCell>

                    {/* Suprimentos / Estoque Crítico */}
                    <TableCell align="center" sx={{ py: 2 }}>
                      {c.quantidade_produtos_criticos > 0 ? (
                        <Tooltip title={c.produtos_criticos_nomes.join(', ')} arrow placement="top">
                          <Box sx={{ display: 'inline-flex' }}>
                            <StatusPill
                              label={`${c.quantidade_produtos_criticos} crítico(s)`}
                              variant="warning"
                              pulse={true}
                              size="small"
                            />
                          </Box>
                        </Tooltip>
                      ) : (
                        <StatusPill label="Regular" variant="neutral" size="small" />
                      )}
                    </TableCell>

                    {/* Última Compra Registrada */}
                    <TableCell sx={{ py: 2 }}>
                      {c.ultima_compra ? (
                        <>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            noWrap
                            sx={{ maxWidth: 170 }}
                            title={c.ultima_compra.fornecedor_nome}
                          >
                            {c.ultima_compra.fornecedor_nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            NF nº {c.ultima_compra.numero_nota} • {formatCurrency(c.ultima_compra.valor_total)}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {formatDate(c.ultima_compra.data)}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          Nenhuma compra NF-e
                        </Typography>
                      )}
                    </TableCell>

                    {/* Ações */}
                    <TableCell align="center" sx={{ py: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Eye size={15} />}
                        onClick={() => handleOpenDiagnostico(c)}
                        sx={{
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          px: 1.8,
                          py: 0.6,
                        }}
                      >
                        Diagnóstico
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </ProtectiveCard>

      {/* MODAL DE DIAGNÓSTICO DO CLIENTE — PARECER E RELATÓRIO EXECUTIVO */}
      <Dialog
        open={openDiagModal}
        onClose={() => setOpenDiagModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          },
        }}
      >
        <DialogTitle
          sx={{
            m: 0,
            p: 2.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                bgcolor: 'primary.main',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Briefcase size={20} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>
                Diagnóstico Consultivo — {selectedCliente?.nome_fantasia}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Relatório Executivo LPTI Tech • CNPJ: {selectedCliente?.cnpj}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setOpenDiagModal(false)} size="small" sx={{ borderRadius: '8px' }}>
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {selectedCliente && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Alerta de Score e Gravidade Fiscal */}
              <ProtectiveCard
                variant="accent"
                accentColor={
                  selectedCliente.score === 'CRITICO'
                    ? 'error'
                    : selectedCliente.score === 'ATENCAO'
                    ? 'warning'
                    : 'success'
                }
                padding={2}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ flexShrink: 0 }}>
                    {selectedCliente.score === 'CRITICO' ? (
                      <ShieldAlert size={28} color="#DC2626" />
                    ) : selectedCliente.score === 'ATENCAO' ? (
                      <AlertTriangle size={28} color="#D97706" />
                    ) : (
                      <ShieldCheck size={28} color="#059669" />
                    )}
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                      <Typography variant="body2" fontWeight={800}>
                        Classificação de Risco Sentinel:
                      </Typography>
                      {renderScorePill(selectedCliente.score, selectedCliente.score_motivo)}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {selectedCliente.score_motivo}
                    </Typography>
                  </Box>
                </Box>
              </ProtectiveCard>

              {/* FiscalShieldCapsule em destaque para o cliente selecionado */}
              <FiscalShieldCapsule
                faturamentoAcumulado={selectedCliente.faturamento_anual}
                limiteAnual={selectedCliente.limite_mei_anual || 81000}
                variant="full"
                statusDas={
                  selectedCliente.status_das === 'Atrasado'
                    ? 'atrasado'
                    : selectedCliente.status_das === 'Pendente'
                    ? 'pendente'
                    : 'pago'
                }
              />

              {/* Informações Gerais & Situação Fiscal em Cards Cerâmicos */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <ProtectiveCard
                    variant="subtle"
                    title="Dados Cadastrais"
                    icon={<Building2 size={18} />}
                    padding={2}
                  >
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Razão Social:</strong> {selectedCliente.nome_empresarial}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      <strong>Segmento:</strong> {selectedCliente.segmento || 'Não informado'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      <strong>Telefone:</strong> {selectedCliente.telefone || 'Não informado'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      <strong>E-mail:</strong> {selectedCliente.email || 'Não informado'}
                    </Typography>
                  </ProtectiveCard>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <ProtectiveCard
                    variant="subtle"
                    title="Situação Fiscal MEI"
                    icon={<ShieldCheck size={18} />}
                    padding={2}
                  >
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Status DAS:</strong> {selectedCliente.status_das}
                      {selectedCliente.qtd_das_atrasados > 0 &&
                        ` (${selectedCliente.qtd_das_atrasados} guia(s) atrasada(s))`}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      <strong>Faturamento Anual:</strong> {formatCurrency(selectedCliente.faturamento_anual)}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      <strong>Uso do Teto MEI:</strong> {selectedCliente.percentual_limite_mei}%
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      <strong>Margem Disponível:</strong>{' '}
                      {formatCurrency(
                        Math.max(0, (selectedCliente.limite_mei_anual || 81000) - selectedCliente.faturamento_anual)
                      )}
                    </Typography>
                  </ProtectiveCard>
                </Grid>
              </Grid>

              {/* Produtos Críticos */}
              <ProtectiveCard
                variant="subtle"
                title={`Estoque Crítico (${selectedCliente.quantidade_produtos_criticos} itens)`}
                icon={<Package size={18} />}
                padding={2}
              >
                {selectedCliente.produtos_criticos_nomes.length > 0 ? (
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedCliente.produtos_criticos_nomes.map((nome, i) => (
                      <Chip
                        key={i}
                        label={nome}
                        color="warning"
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Nenhum produto crítico. O estoque desta empresa encontra-se com margem de segurança adequada.
                  </Typography>
                )}
              </ProtectiveCard>

              {/* Recomendações e Parecer da Consultoria LPTI Tech */}
              <ProtectiveCard
                variant="accent"
                accentColor="primary"
                title="Parecer Consultivo LPTI Tech"
                subtitle="Recomendações técnicas baseadas na legislação do Simples Nacional"
                icon={<Sparkles size={18} />}
                padding={2.5}
              >
                <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.6 }}>
                  {selectedCliente.score === 'CRITICO' ? (
                    <>
                      • <strong>Regularização Imediata:</strong> Gerar as guias DAS pendentes no PGMEI para evitar multas, perda dos benefícios previdenciários e inscrição na Dívida Ativa da União.
                      <br />
                      • <strong>Desenquadramento Tributário:</strong> Se o faturamento ultrapassar 20% do teto oficial (R$ 97.200,00), preparar o processo de transição para Microempresa (ME) no Simples Nacional com efeitos retroativos.
                    </>
                  ) : selectedCliente.score === 'ATENCAO' ? (
                    <>
                      • <strong>Monitoramento Semanal de Vendas:</strong> O faturamento está na faixa prudencial (≥ 80% do teto). Acompanhar a curva de vendas para não ser surpreendido no fechamento do ano fiscal.
                      <br />
                      • <strong>Reposição de Insumos:</strong> Entrar em contato com os fornecedores parceiros para recomposição do estoque antes de rupturas no PDV.
                    </>
                  ) : (
                    <>
                      • <strong>Saúde Operacional Plena:</strong> A empresa mantém conformidade com as exigências fiscais do MEI, margem confortável no teto de R$ 81k e estoque equilibrado.
                      <br />
                      • <strong>Estratégia:</strong> Focar em campanhas de fidelização de clientes e otimização da margem de lucro por mercadoria comercializada.
                    </>
                  )}
                </Typography>
              </ProtectiveCard>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={() => setOpenDiagModal(false)}
            variant="contained"
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, px: 3 }}
          >
            Fechar Diagnóstico
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
