import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Receipt,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  ExternalLink,
  RefreshCw,
  Download,
  Search,
  FileText,
  CreditCard,
  Edit3,
  X,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import api from '../services/api';
import {
  DasMensal,
  DasResumo,
  DasVencimentosResponse,
  DasStatus,
  RegistrarPagamentoDasRequest,
  AlterarStatusDasRequest,
  RelatorioMei as RelatorioMeiData,
} from '../types';
import { formatCurrency, formatDate, exportToExcel, exportToCSV } from '../services/exportUtils';
import {
  ProtectiveCard,
  ClearSignalKPI,
  FiscalShieldCapsule,
} from '../components/sentinel';
import { StatusPill, StatusPillVariant } from '../components/StatusPill';

export const ControleDas: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [guias, setGuias] = useState<DasMensal[]>([]);
  const [vencimentosData, setVencimentosData] = useState<DasVencimentosResponse | null>(null);
  const [faturamentoAno, setFaturamentoAno] = useState<number>(0);
  const [limiteAno, setLimiteAno] = useState<number>(81000);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modais
  const [openPayModal, setOpenPayModal] = useState<boolean>(false);
  const [openEditModal, setOpenEditModal] = useState<boolean>(false);
  const [selectedGuia, setSelectedGuia] = useState<DasMensal | null>(null);

  // Form states para pagamento
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payValor, setPayValor] = useState<number>(75.60);
  const [payObs, setPayObs] = useState<string>('');

  // Form states para edição/alteração de status
  const [editStatus, setEditStatus] = useState<DasStatus>('Pendente');
  const [editValor, setEditValor] = useState<number>(75.60);
  const [editVencimento, setEditVencimento] = useState<string>('');
  const [editDataPagamento, setEditDataPagamento] = useState<string>('');
  const [editObs, setEditObs] = useState<string>('');

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);

  const fetchData = async (year: number = selectedYear) => {
    try {
      setLoading(true);
      const [resGuias, resVenc, resRelatorio] = await Promise.allSettled([
        api.get<DasMensal[]>(`/das?ano=${year}`),
        api.get<DasVencimentosResponse>(`/das/vencimentos?ano=${year}`),
        api.get<RelatorioMeiData>(`/relatorio-mei?ano=${year}`),
      ]);

      if (resGuias.status === 'fulfilled') {
        setGuias(resGuias.value.data);
      }
      if (resVenc.status === 'fulfilled') {
        setVencimentosData(resVenc.value.data);
      }
      if (resRelatorio.status === 'fulfilled') {
        setFaturamentoAno(resRelatorio.value.data.faturamento_acumulado_ano);
        setLimiteAno(resRelatorio.value.data.limite_mei_anual || 81000);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados do DAS:', err);
      setAlertError('Não foi possível carregar as guias do DAS.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedYear);
  }, [selectedYear]);

  // Handler para abrir modal de pagamento
  const handleOpenPayment = (guia: DasMensal) => {
    setSelectedGuia(guia);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayValor(guia.valor);
    setPayObs(guia.observacao || '');
    setOpenPayModal(true);
  };

  // Handler para salvar pagamento
  const handleConfirmPayment = async () => {
    if (!selectedGuia) return;
    try {
      setActionLoading(true);
      const payload: RegistrarPagamentoDasRequest = {
        data_pagamento: payDate,
        valor: payValor,
        observacao: payObs,
      };
      await api.post(`/das/${selectedGuia.id}/pagamento`, payload);
      setAlertSuccess(`Pagamento do DAS de ${selectedGuia.competencia_formatada} registrado com sucesso!`);
      setOpenPayModal(false);
      fetchData(selectedYear);
    } catch (err: any) {
      setAlertError(err.response?.data?.detail || 'Erro ao registrar pagamento.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handler para abrir modal de edição/status
  const handleOpenEdit = (guia: DasMensal) => {
    setSelectedGuia(guia);
    setEditStatus(guia.status);
    setEditValor(guia.valor);
    setEditVencimento(guia.vencimento);
    setEditDataPagamento(guia.data_pagamento || '');
    setEditObs(guia.observacao || '');
    setOpenEditModal(true);
  };

  // Handler para salvar alteração de status/guia
  const handleConfirmEdit = async () => {
    if (!selectedGuia) return;
    try {
      setActionLoading(true);
      const payload: AlterarStatusDasRequest = {
        status: editStatus,
        data_pagamento: editStatus === 'Pago' ? (editDataPagamento || new Date().toISOString().split('T')[0]) : undefined,
        observacao: editObs,
      };
      await api.patch(`/das/${selectedGuia.id}/status`, payload);
      if (editValor !== selectedGuia.valor || editVencimento !== selectedGuia.vencimento) {
        await api.put(`/das/${selectedGuia.id}`, {
          valor: editValor,
          vencimento: editVencimento,
          status: editStatus,
          data_pagamento: editStatus === 'Pago' ? (editDataPagamento || new Date().toISOString().split('T')[0]) : null,
          observacao: editObs,
        });
      }
      setAlertSuccess(`Guia DAS de ${selectedGuia.competencia_formatada} atualizada!`);
      setOpenEditModal(false);
      fetchData(selectedYear);
    } catch (err: any) {
      setAlertError(err.response?.data?.detail || 'Erro ao atualizar guia DAS.');
    } finally {
      setActionLoading(false);
    }
  };

  // Sincronizar / Gerar guias do ano
  const handleSincronizarAno = async () => {
    try {
      setActionLoading(true);
      await api.post('/das/gerar-ano', { ano: selectedYear, valor_mensal: 75.60 });
      setAlertSuccess(`Guias do ano ${selectedYear} sincronizadas com sucesso!`);
      fetchData(selectedYear);
    } catch (err: any) {
      setAlertError('Erro ao sincronizar guias.');
    } finally {
      setActionLoading(false);
    }
  };

  // Exportar dados
  const handleExport = (tipo: 'excel' | 'csv') => {
    const dataToExport = guias.map((g) => ({
      Mês: g.mes,
      Competência: g.competencia_formatada || `${g.mes}/${g.ano}`,
      Vencimento: formatDate(g.vencimento),
      Valor: g.valor,
      Status: g.status,
      'Data Pagamento': g.data_pagamento ? formatDate(g.data_pagamento) : '-',
      Observação: g.observacao || '',
    }));
    if (tipo === 'excel') {
      exportToExcel(dataToExport, `Controle_DAS_${selectedYear}`);
    } else {
      exportToCSV(dataToExport, `Controle_DAS_${selectedYear}`);
    }
  };

  // Filtros de tabela
  const filteredGuias = guias.filter((g) => {
    if (filterStatus !== 'TODOS' && g.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchComp = (g.competencia_formatada || '').toLowerCase().includes(term);
      const matchObs = (g.observacao || '').toLowerCase().includes(term);
      if (!matchComp && !matchObs) return false;
    }
    return true;
  });

  const resumo = vencimentosData?.resumo;
  const dasVencidos = vencimentosData?.das_vencidos || [];
  const dasVenceEm7Dias = vencimentosData?.das_vence_em_7_dias || [];
  const dasMesAtual = resumo?.das_mes_atual;

  // Situação fiscal consolidada para o FiscalShieldCapsule
  const statusFiscalGeral: 'pago' | 'pendente' | 'atrasado' =
    dasVencidos.length > 0
      ? 'atrasado'
      : dasMesAtual?.status === 'Pendente'
      ? 'pendente'
      : 'pago';

  return (
    <Box sx={{ pb: 6, maxWidth: 1400, mx: 'auto' }}>
      {/* Feedback Alerts */}
      {alertSuccess && (
        <Alert severity="success" onClose={() => setAlertSuccess(null)} sx={{ mb: 2.5, borderRadius: 2 }}>
          {alertSuccess}
        </Alert>
      )}
      {alertError && (
        <Alert severity="error" onClose={() => setAlertError(null)} sx={{ mb: 2.5, borderRadius: 2 }}>
          {alertError}
        </Alert>
      )}

      {/* CABEÇALHO — CENTRAL DE CONFORMIDADE FISCAL DO MEI */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          mb: 3.5,
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
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
              <Receipt size={24} />
            </Box>
            <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.02em' }}>
              Central de Conformidade DAS
            </Typography>
            <StatusPill
              label={`Exercício ${selectedYear}`}
              variant={dasVencidos.length > 0 ? 'error' : 'success'}
              pulse={dasVencidos.length > 0}
              size="medium"
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 800 }}>
            Gerencie e comprove os pagamentos mensais do DAS (Documento de Arrecadação do Simples Nacional).
            Mantenha sua empresa em dia com a Receita Federal e proteja seus benefícios do INSS.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', alignSelf: { xs: 'stretch', sm: 'flex-start' } }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Ano-Base</InputLabel>
            <Select
              value={selectedYear}
              label="Ano-Base"
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              sx={{ borderRadius: '10px' }}
            >
              <MenuItem value={currentYear - 1}>{currentYear - 1}</MenuItem>
              <MenuItem value={currentYear}>{currentYear}</MenuItem>
              <MenuItem value={currentYear + 1}>{currentYear + 1}</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} className={actionLoading ? 'spin' : ''} />}
            onClick={handleSincronizarAno}
            disabled={actionLoading}
            size="small"
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 700,
              height: 38,
              px: 2,
            }}
          >
            Sincronizar Guias
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<ExternalLink size={16} />}
            href="https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao"
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 800,
              height: 38,
              px: 2.2,
              boxShadow: '0 4px 12px rgba(2, 136, 209, 0.3)',
            }}
          >
            Emitir no PGMEI
          </Button>
        </Box>
      </Box>

      {/* FISCAL SHIELD CAPSULE — BLINDAGEM TRIBUTÁRIA DO EXERCÍCIO */}
      <Box sx={{ mb: 3.5 }}>
        <FiscalShieldCapsule
          faturamentoAcumulado={faturamentoAno}
          limiteAnual={limiteAno}
          anoReferencia={selectedYear}
          statusDas={statusFiscalGeral}
          variant="full"
        />
      </Box>

      {/* ALERTAS INTELIGENTES SENTINEL EM DESTAQUE */}
      {/* 1. Alerta: Guia Vencida (Crítico) */}
      {dasVencidos.length > 0 && (
        <ProtectiveCard
          variant="accent"
          accentColor="error"
          padding={2.5}
          sx={{ mb: 3 }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: 'rgba(239, 68, 68, 0.1)',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldAlert size={24} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.2 }}>
                  <Typography variant="body1" fontWeight={800} color="error.main">
                    Inadimplência Fiscal: {dasVencidos.length} guia(s) DAS em atraso
                  </Typography>
                  <StatusPill label="Ação Urgente" variant="error" pulse={true} size="small" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Competências: <strong>{dasVencidos.map((d) => d.nome_mes).join(', ')}</strong>.
                  Regularize para evitar multas de mora, perda dos benefícios previdenciários e suspensão do CNPJ.
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={() => handleOpenPayment(dasVencidos[0])}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 800,
                px: 2.5,
                height: 38,
                flexShrink: 0,
              }}
            >
              Pagar Guia em Atraso
            </Button>
          </Box>
        </ProtectiveCard>
      )}

      {/* 2. Alerta: Guia Vence em breve (Atenção) */}
      {dasVenceEm7Dias.length > 0 && (
        <ProtectiveCard
          variant="accent"
          accentColor="warning"
          padding={2.5}
          sx={{ mb: 3 }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: 'rgba(245, 158, 11, 0.1)',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock size={24} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.2 }}>
                  <Typography variant="body1" fontWeight={800} color="warning.main">
                    Vencimento Próximo da Guia DAS
                  </Typography>
                  <StatusPill label="7 Dias" variant="warning" size="small" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {dasVenceEm7Dias[0].dias_para_vencimento === 0
                    ? `O DAS de ${dasVenceEm7Dias[0].nome_mes} vence HOJE (dia 20)! Valor: ${formatCurrency(dasVenceEm7Dias[0].valor)}.`
                    : dasVenceEm7Dias[0].dias_para_vencimento === 1
                    ? `O DAS de ${dasVenceEm7Dias[0].nome_mes} vence AMANHÃ! Valor: ${formatCurrency(dasVenceEm7Dias[0].valor)}.`
                    : `O DAS de ${dasVenceEm7Dias[0].nome_mes} vence em ${dasVenceEm7Dias[0].dias_para_vencimento} dias (${formatDate(dasVenceEm7Dias[0].vencimento)}).`}
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              color="warning"
              size="small"
              onClick={() => handleOpenPayment(dasVenceEm7Dias[0])}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 800,
                px: 2.5,
                height: 38,
                flexShrink: 0,
              }}
            >
              Registrar Quitação
            </Button>
          </Box>
        </ProtectiveCard>
      )}

      {/* 4 CARDS DE INDICADORES DE CONFORMIDADE COM CLEARSIGNALKPI */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* 1. Total Pago */}
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="DAS Pago no Ano"
            value={formatCurrency(resumo?.total_pago || 0)}
            icon={<CheckCircle2 size={20} />}
            colorScheme="success"
            humanExplanation={`${resumo?.qtd_pago || 0} de ${resumo?.total_guias || 12} competências quitadas`}
            statusPill={{
              label: 'Em Dia',
              variant: 'success',
            }}
          />
        </Grid>

        {/* 2. Total Pendente */}
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="DAS Pendente"
            value={formatCurrency(resumo?.total_pendente || 0)}
            icon={<Clock size={20} />}
            colorScheme="warning"
            humanExplanation={`${resumo?.qtd_pendente || 0} guia(s) a vencer até o fim do exercício`}
            statusPill={{
              label: 'A Vencer',
              variant: 'warning',
            }}
          />
        </Grid>

        {/* 3. Total Atrasado */}
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="DAS em Atraso"
            value={formatCurrency(resumo?.total_atrasado || 0)}
            icon={<AlertTriangle size={20} />}
            colorScheme={(resumo?.total_atrasado || 0) > 0 ? 'error' : 'success'}
            humanExplanation={
              (resumo?.total_atrasado || 0) > 0
                ? `${resumo?.qtd_atrasado || 0} guia(s) vencidas aguardando regularização`
                : 'Nenhuma guia em atraso no exercício'
            }
            statusPill={
              (resumo?.total_atrasado || 0) > 0
                ? { label: 'Inadimplência', variant: 'error', pulse: true }
                : { label: 'Sem Débitos', variant: 'success' }
            }
          />
        </Grid>

        {/* 4. Situação do Mês Atual */}
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="Competência Atual"
            value={dasMesAtual?.nome_mes || 'Mês Atual'}
            icon={<Calendar size={20} />}
            colorScheme="primary"
            humanExplanation={`Vencimento em ${
              dasMesAtual ? formatDate(dasMesAtual.vencimento) : 'Dia 20'
            } • ${formatCurrency(dasMesAtual?.valor || 75.60)}`}
            statusPill={
              dasMesAtual?.status === 'Pago'
                ? { label: 'Quitado', variant: 'success' }
                : dasMesAtual?.status === 'Atrasado'
                ? { label: 'Vencido', variant: 'error', pulse: true }
                : { label: 'Pendente', variant: 'warning' }
            }
          />
        </Grid>
      </Grid>

      {/* LINHA DO TEMPO ANUAL DAS — 12 MESES EM COCKPIT VISUAL */}
      <ProtectiveCard
        variant="default"
        title="Linha do Tempo Anual DAS (Jan — Dez)"
        subtitle={`Visão panorâmica de conformidade fiscal para o exercício de ${selectedYear}`}
        icon={<Calendar size={20} />}
        statusPill={
          <StatusPill
            label={`${resumo?.qtd_pago || 0}/12 Pagos`}
            variant={resumo?.qtd_pago === 12 ? 'success' : 'neutral'}
            size="small"
          />
        }
        padding={{ xs: 2, sm: 2.5 }}
        sx={{ mb: 3.5 }}
      >
        <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((mesNum) => {
            const guiaMes = guias.find((g) => g.mes === mesNum);
            const isPago = guiaMes?.status === 'Pago';
            const isAtrasado = guiaMes?.status === 'Atrasado';
            const isPendente = guiaMes?.status === 'Pendente';

            const mesesNomes = [
              'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
              'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
            ];
            const nomeMes = mesesNomes[mesNum - 1];

            return (
              <Grid item xs={4} sm={3} md={2} lg={1} key={mesNum}>
                <Box
                  onClick={() => guiaMes && (isPago ? handleOpenEdit(guiaMes) : handleOpenPayment(guiaMes))}
                  sx={{
                    p: 1.5,
                    borderRadius: '12px',
                    textAlign: 'center',
                    cursor: guiaMes ? 'pointer' : 'default',
                    border: '1px solid',
                    borderColor: isPago
                      ? 'rgba(16, 185, 129, 0.3)'
                      : isAtrasado
                      ? 'rgba(239, 68, 68, 0.3)'
                      : isPendente
                      ? 'rgba(245, 158, 11, 0.3)'
                      : 'divider',
                    bgcolor: isPago
                      ? 'rgba(16, 185, 129, 0.06)'
                      : isAtrasado
                      ? 'rgba(239, 68, 68, 0.06)'
                      : isPendente
                      ? 'rgba(245, 158, 11, 0.06)'
                      : 'background.paper',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: guiaMes ? 'translateY(-2px)' : 'none',
                      boxShadow: guiaMes ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                    },
                  }}
                >
                  <Typography variant="caption" fontWeight={800} color="text.secondary">
                    {nomeMes}
                  </Typography>

                  <Box sx={{ my: 0.7, display: 'flex', justifyContent: 'center' }}>
                    {isPago ? (
                      <CheckCircle2 size={20} color="#059669" />
                    ) : isAtrasado ? (
                      <AlertTriangle size={20} color="#DC2626" />
                    ) : isPendente ? (
                      <Clock size={20} color="#D97706" />
                    ) : (
                      <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'action.disabledBackground' }} />
                    )}
                  </Box>

                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{
                      display: 'block',
                      fontSize: '0.72rem',
                      color: isPago
                        ? 'success.main'
                        : isAtrasado
                        ? 'error.main'
                        : isPendente
                        ? 'warning.main'
                        : 'text.disabled',
                    }}
                  >
                    {isPago ? 'Pago' : isAtrasado ? 'Atrasado' : isPendente ? 'Pendente' : '-'}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </ProtectiveCard>

      {/* TABELA DE GUIAS MENSAIS COM PROTECTIVECARD & STATUSPILL */}
      <ProtectiveCard
        variant="default"
        title="Demonstrativo de Guias Mensais DAS"
        subtitle={`Exibindo ${filteredGuias.length} guia(s) no exercício de ${selectedYear}`}
        icon={<FileText size={20} />}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download size={15} />}
              onClick={() => handleExport('excel')}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
            >
              Excel
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download size={15} />}
              onClick={() => handleExport('csv')}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
            >
              CSV
            </Button>
          </Box>
        }
        padding={0}
        sx={{ overflow: 'hidden' }}
      >
        {/* Barra de Filtros Interna */}
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            gap: 2,
            alignItems: { xs: 'stretch', sm: 'center' },
          }}
        >
          <TextField
            size="small"
            placeholder="Buscar por mês ou observação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <Search size={16} color="#64748B" style={{ marginRight: 8 }} />
              ),
            }}
            sx={{
              minWidth: { xs: '100%', sm: 280 },
              '& .MuiOutlinedInput-root': { borderRadius: '10px' },
            }}
          />

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Status da Guia</InputLabel>
            <Select
              value={filterStatus}
              label="Status da Guia"
              onChange={(e) => setFilterStatus(e.target.value)}
              sx={{ borderRadius: '10px' }}
            >
              <MenuItem value="TODOS">Todos os Status</MenuItem>
              <MenuItem value="Pago">Pago</MenuItem>
              <MenuItem value="Pendente">Pendente</MenuItem>
              <MenuItem value="Atrasado">Atrasado</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : filteredGuias.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Receipt size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
            <Typography variant="body1" color="text.secondary" fontWeight={700}>
              Nenhuma guia encontrada com os filtros selecionados.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 750 }}>
              <TableHead sx={{ bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }}>COMPETÊNCIA</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }}>VENCIMENTO</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }}>VALOR</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }}>STATUS FISCAL</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }}>DATA PAGAMENTO</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }}>OBSERVAÇÕES / COMPROVANTE</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }}>AÇÕES</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredGuias.map((guia) => {
                  const isAtrasado = guia.status === 'Atrasado';
                  const isPago = guia.status === 'Pago';
                  const isPendente = guia.status === 'Pendente';

                  return (
                    <TableRow
                      key={guia.id}
                      hover
                      sx={{
                        transition: 'background-color 0.15s ease',
                        bgcolor: isAtrasado
                          ? 'rgba(239, 68, 68, 0.03)'
                          : isPago
                          ? 'rgba(16, 185, 129, 0.02)'
                          : 'inherit',
                      }}
                    >
                      <TableCell sx={{ fontWeight: 800 }}>
                        {guia.competencia_formatada || `${guia.nome_mes} / ${guia.ano}`}
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {formatDate(guia.vencimento)}
                          </Typography>
                          {guia.alerta_vencimento === 'vence_hoje' && (
                            <StatusPill label="Vence Hoje" variant="error" pulse={true} size="small" />
                          )}
                          {guia.alerta_vencimento === 'vence_7_dias' && (
                            <StatusPill label={`Em ${guia.dias_para_vencimento}d`} variant="warning" size="small" />
                          )}
                        </Box>
                      </TableCell>

                      <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>
                        {formatCurrency(guia.valor)}
                      </TableCell>

                      <TableCell>
                        <StatusPill
                          label={guia.status}
                          variant={isPago ? 'success' : isAtrasado ? 'error' : 'warning'}
                          pulse={isAtrasado}
                          size="small"
                        />
                      </TableCell>

                      <TableCell>
                        {guia.data_pagamento ? (
                          <Typography variant="body2" fontWeight={700} color="success.main">
                            {formatDate(guia.data_pagamento)}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography variant="body2" color="text.secondary" noWrap title={guia.observacao || ''}>
                          {guia.observacao || '—'}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          {!isPago ? (
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              startIcon={<CreditCard size={15} />}
                              onClick={() => handleOpenPayment(guia)}
                              sx={{
                                fontWeight: 800,
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontSize: '0.78rem',
                                px: 1.8,
                              }}
                            >
                              Pagar
                            </Button>
                          ) : (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleOpenEdit(guia)}
                              sx={{
                                fontWeight: 700,
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontSize: '0.78rem',
                                px: 1.5,
                              }}
                            >
                              Detalhes
                            </Button>
                          )}

                          <Tooltip title="Editar ou alterar status">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEdit(guia)}
                              sx={{ borderRadius: '8px' }}
                            >
                              <Edit3 size={16} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </ProtectiveCard>

      {/* MODAL: REGISTRAR PAGAMENTO DO DAS */}
      <Dialog
        open={openPayModal}
        onClose={() => setOpenPayModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          Registrar Pagamento do DAS
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedGuia && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
              <ProtectiveCard variant="subtle" padding={2}>
                <Typography variant="body2" color="text.secondary">
                  Confirmando a quitação da competência{' '}
                  <strong style={{ color: 'var(--mui-palette-text-primary)' }}>
                    {selectedGuia.competencia_formatada}
                  </strong>{' '}
                  com vencimento em <strong>{formatDate(selectedGuia.vencimento)}</strong>.
                </Typography>
              </ProtectiveCard>

              <TextField
                label="Data do Pagamento"
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />

              <TextField
                label="Valor Pago (R$)"
                type="number"
                value={payValor}
                onChange={(e) => setPayValor(Number(e.target.value))}
                fullWidth
                required
                inputProps={{ step: '0.01' }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />

              <TextField
                label="Observações / Código do Comprovante"
                placeholder="Ex: Pago pelo app Nubank via PIX / Autenticação 987654"
                multiline
                rows={2}
                value={payObs}
                onChange={(e) => setPayObs(e.target.value)}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setOpenPayModal(false)} color="inherit" sx={{ borderRadius: '8px' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmPayment}
            variant="contained"
            color="success"
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <CheckCircle2 size={16} />}
            sx={{ fontWeight: 800, borderRadius: '10px', textTransform: 'none', px: 2.5 }}
          >
            Confirmar Pagamento
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: GERENCIAR GUIA DAS */}
      <Dialog
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          Gerenciar Guia DAS — {selectedGuia?.competencia_formatada}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedGuia && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Status da Guia</InputLabel>
                <Select
                  value={editStatus}
                  label="Status da Guia"
                  onChange={(e) => setEditStatus(e.target.value as DasStatus)}
                  sx={{ borderRadius: '10px' }}
                >
                  <MenuItem value="Pago">Pago</MenuItem>
                  <MenuItem value="Pendente">Pendente</MenuItem>
                  <MenuItem value="Atrasado">Atrasado</MenuItem>
                </Select>
              </FormControl>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Valor da Guia (R$)"
                    type="number"
                    value={editValor}
                    onChange={(e) => setEditValor(Number(e.target.value))}
                    fullWidth
                    inputProps={{ step: '0.01' }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Data de Vencimento"
                    type="date"
                    value={editVencimento}
                    onChange={(e) => setEditVencimento(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                  />
                </Grid>
              </Grid>

              {editStatus === 'Pago' && (
                <TextField
                  label="Data de Pagamento"
                  type="date"
                  value={editDataPagamento}
                  onChange={(e) => setEditDataPagamento(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
              )}

              <TextField
                label="Observações"
                multiline
                rows={3}
                value={editObs}
                onChange={(e) => setEditObs(e.target.value)}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setOpenEditModal(false)} color="inherit" sx={{ borderRadius: '8px' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmEdit}
            variant="contained"
            color="primary"
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <CheckCircle2 size={16} />}
            sx={{ fontWeight: 800, borderRadius: '10px', textTransform: 'none', px: 2.5 }}
          >
            Salvar Alterações
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ControleDas;
