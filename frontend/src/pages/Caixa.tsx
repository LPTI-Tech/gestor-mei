import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Alert,
  CircularProgress,
  Snackbar,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AccountBalanceWallet,
  LockOpen,
  Lock,
  AddCircleOutline,
  RemoveCircleOutline,
  History,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  SwapVert,
  Receipt,
  PointOfSale,
  InfoOutlined,
  Refresh,
  WarningAmber,
  WhatsApp,
  ContentCopy,
  Close,
} from '@mui/icons-material';
import api from '../services/api';
import { CaixaStatus, CaixaTurno, CaixaLancamento } from '../types';
import { formatCurrency, formatDateTime } from '../services/exportUtils';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIAS_ENTRADA = ['Recebimentos diversos', 'Ajustes positivos', 'Suprimento de troco', 'Outros'];
const CATEGORIAS_SAIDA = [
  'Compra de gás',
  'Compra de mercadorias',
  'Pagamento de ajudantes',
  'Pagamento de motoboys',
  'Água',
  'Energia',
  'Internet',
  'Manutenção',
  'Sangria de segurança',
  'Outros',
];

export const Caixa: React.FC = () => {
  const { user, isOperator, empresa } = useAuth();
  const [caixaStatus, setCaixaStatus] = useState<CaixaStatus | null>(null);
  const [historico, setHistorico] = useState<CaixaTurno[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'ENTRADA' | 'SAIDA'>('TODOS');

  // Feedback Snackbar (substitui todo alert nativo)
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Modals
  const [openAbrirModal, setOpenAbrirModal] = useState<boolean>(false);
  const [valorInicial, setValorInicial] = useState<string>('100.00');
  const [obsAbertura, setObsAbertura] = useState<string>('');
  const [submittingAbertura, setSubmittingAbertura] = useState<boolean>(false);

  const [openLancamentoModal, setOpenLancamentoModal] = useState<boolean>(false);
  const [tipoLancamento, setTipoLancamento] = useState<'ENTRADA' | 'SAIDA'>('SAIDA');
  const [categoriaLancamento, setCategoriaLancamento] = useState<string>('Compra de mercadorias');
  const [descricaoLancamento, setDescricaoLancamento] = useState<string>('');
  const [valorLancamento, setValorLancamento] = useState<string>('');
  const [submittingLancamento, setSubmittingLancamento] = useState<boolean>(false);

  const [openFecharModal, setOpenFecharModal] = useState<boolean>(false);
  const [valorInformado, setValorInformado] = useState<string>('');
  const [obsFechamento, setObsFechamento] = useState<string>('');
  const [submittingFechamento, setSubmittingFechamento] = useState<boolean>(false);

  // Resultado de fechamento e auditoria
  const [fechamentoResultado, setFechamentoResultado] = useState<CaixaTurno | null>(null);
  const [openWhatsAppDialog, setOpenWhatsAppDialog] = useState<boolean>(false);

  const fetchCaixa = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [statusRes, histRes] = await Promise.all([
        api.get<CaixaStatus>('/caixa/status'),
        api.get<CaixaTurno[]>('/caixa/historico'),
      ]);
      setCaixaStatus(statusRes.data);
      setHistorico(histRes.data);
    } catch (err: any) {
      console.error(err);
      showNotification('Não foi possível sincronizar o estado do caixa.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaixa();
  }, []);

  // Detector de Turno aberto em dias anteriores
  const isTurnoDiaAnterior = React.useMemo(() => {
    if (!caixaStatus?.is_aberto || !caixaStatus?.turno_atual?.data_abertura) return false;
    const abertura = new Date(caixaStatus.turno_atual.data_abertura);
    const hoje = new Date();
    const dtAbertura = new Date(abertura.getFullYear(), abertura.getMonth(), abertura.getDate());
    const dtHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    return dtAbertura.getTime() < dtHoje.getTime();
  }, [caixaStatus?.is_aberto, caixaStatus?.turno_atual?.data_abertura]);

  // Formatador de texto limpo para WhatsApp
  const gerarTextoWhatsApp = (resumo: CaixaTurno) => {
    const diff = resumo.diferenca || 0;
    const statusDiff =
      diff === 0
        ? '✅ Caixa Batido (100% Exato)'
        : diff > 0
        ? `⚠️ Sobra de Caixa (+${formatCurrency(diff)})`
        : `❌ Quebra de Caixa (${formatCurrency(diff)})`;

    const dataAberturaStr = formatDateTime(resumo.data_abertura);
    const dataFechamentoStr = resumo.data_fechamento ? formatDateTime(resumo.data_fechamento) : 'Agora';
    const empresaNome = empresa?.nome_fantasia || empresa?.nome_empresarial || 'Gestor MEI';
    const opNome = resumo.user_fechamento_nome || resumo.user_abertura_nome || user?.nome || 'Operador';

    return `*📊 COMPROVANTE DE FECHAMENTO DE CAIXA*
🏪 *Empresa:* ${empresaNome}
👤 *Operador:* ${opNome}
🕐 *Período:* ${dataAberturaStr} até ${dataFechamentoStr}
────────────────────────────
💵 *Troco Inicial:* ${formatCurrency(resumo.valor_inicial)}
📈 *Vendas em Dinheiro:* ${formatCurrency(resumo.vendas_dinheiro || 0)}
📥 *Suprimentos (Entradas):* ${formatCurrency(resumo.total_entradas || 0)}
📤 *Sangrias (Saídas):* ${formatCurrency(resumo.total_saidas || 0)}
────────────────────────────
🎯 *Saldo Esperado:* ${formatCurrency(resumo.valor_esperado || 0)}
💰 *Valor Contado:* ${formatCurrency(resumo.valor_informado || 0)}
⚖️ *Diferença:* ${statusDiff}
────────────────────────────${resumo.observacoes ? `\n📝 *Observações:* ${resumo.observacoes}\n────────────────────────────` : ''}
_Gestor MEI - Sistema de Gestão Financeira_`;
  };

  const handleEnviarWhatsApp = (resumo: CaixaTurno) => {
    const text = gerarTextoWhatsApp(resumo);
    const phone = empresa?.telefone ? empresa.telefone.replace(/\D/g, '') : '';
    const url = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopiarResumo = (resumo: CaixaTurno) => {
    const text = gerarTextoWhatsApp(resumo);
    navigator.clipboard.writeText(text);
    showNotification('Comprovante copiado para a área de transferência!', 'success');
  };

  const handleAbrirCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingAbertura(true);
      await api.post('/caixa/abrir', {
        valor_inicial: Number(valorInicial) || 0,
        observacoes: obsAbertura,
      });
      setOpenAbrirModal(false);
      showNotification('Turno de caixa aberto com sucesso!', 'success');
      fetchCaixa(true);
    } catch (err: any) {
      showNotification(err.response?.data?.detail || 'Erro ao abrir turno de caixa.', 'error');
    } finally {
      setSubmittingAbertura(false);
    }
  };

  const handleAddLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricaoLancamento || descricaoLancamento.trim().length < 5) {
      showNotification('O motivo do lançamento é obrigatório e deve ter no mínimo 5 caracteres.', 'warning');
      return;
    }
    try {
      setSubmittingLancamento(true);
      await api.post('/caixa/lancamento', {
        tipo: tipoLancamento,
        categoria: categoriaLancamento,
        descricao: descricaoLancamento.trim(),
        valor: Number(valorLancamento) || 0,
      });
      setOpenLancamentoModal(false);
      setDescricaoLancamento('');
      setValorLancamento('');
      showNotification(
        `${tipoLancamento === 'ENTRADA' ? 'Suprimento' : 'Sangria'} registrado com sucesso!`,
        'success'
      );
      fetchCaixa(true);
    } catch (err: any) {
      showNotification(err.response?.data?.detail || 'Erro ao registrar movimentação.', 'error');
    } finally {
      setSubmittingLancamento(false);
    }
  };

  const handleFecharCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingFechamento(true);
      const res = await api.post<CaixaTurno>('/caixa/fechar', {
        valor_informado: Number(valorInformado) || 0,
        observacoes: obsFechamento,
      });
      setOpenFecharModal(false);
      setFechamentoResultado(res.data);
      setOpenWhatsAppDialog(true);
      showNotification('Caixa encerrado e auditado com sucesso.', 'success');
      fetchCaixa(true);
    } catch (err: any) {
      showNotification(err.response?.data?.detail || 'Erro ao fechar caixa.', 'error');
    } finally {
      setSubmittingFechamento(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={44} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontWeight: 500 }}>
          Sincronizando livro caixa...
        </Typography>
      </Box>
    );
  }

  const isAberto = Boolean(caixaStatus?.is_aberto);
  const turno = caixaStatus?.turno_atual;

  // Filtragem dos lançamentos do turno para o extrato estilo Stripe Balance
  const lancamentosFiltrados = (turno?.lancamentos || []).filter((l) => {
    if (filtroTipo === 'ENTRADA') return l.tipo === 'ENTRADA';
    if (filtroTipo === 'SAIDA') return l.tipo === 'SAIDA';
    return true;
  });

  return (
    <Box>
      {/* 0. Alerta de Turno de Dia Anterior em Aberto */}
      {isTurnoDiaAnterior && (
        <Alert
          severity="warning"
          variant="filled"
          icon={<WarningAmber sx={{ fontSize: 26 }} />}
          sx={{
            mb: 3,
            borderRadius: 2.5,
            fontWeight: 700,
            fontSize: '0.92rem',
            boxShadow: '0 4px 14px rgba(217, 119, 6, 0.25)',
            display: 'flex',
            alignItems: 'center',
            '& .MuiAlert-message': {
              flex: 1,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 1.5,
            },
          }}
        >
          <Box>
            <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#fff' }}>
              Turno de dia anterior em aberto!
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.92)', fontWeight: 500 }}>
              Encerre este caixa e faça a conferência antes de iniciar as operações de hoje.
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setValorInformado('');
              setObsFechamento('');
              setOpenFecharModal(true);
            }}
            sx={{
              fontWeight: 800,
              borderColor: '#fff',
              color: '#fff',
              bgcolor: 'rgba(0,0,0,0.12)',
              '&:hover': { borderColor: '#fff', bgcolor: 'rgba(0,0,0,0.25)' },
              whiteSpace: 'nowrap',
            }}
          >
            Encerrar Caixa Agora
          </Button>
        </Alert>
      )}

      {/* 1. Header Executivo de Turno (Design System SaaS) */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: isAberto ? 'success.light' : 'divider',
          bgcolor: isAberto
            ? 'background.paper'
            : 'background.paper',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2.5,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.8, flexWrap: 'wrap' }}>
            <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
              Caixa do Dia
            </Typography>

            {/* Badge de Status Tátil com Pulso */}
            <Chip
              icon={isAberto ? <LockOpen fontSize="small" /> : <Lock fontSize="small" />}
              label={isAberto ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
              color={isAberto ? 'success' : 'default'}
              sx={{
                fontWeight: 800,
                fontSize: '0.72rem',
                letterSpacing: '0.04em',
                px: 0.5,
                height: 26,
                boxShadow: isAberto ? '0 0 12px rgba(46, 125, 50, 0.25)' : 'none',
              }}
            />

            <Tooltip title="Atualizar dados do caixa">
              <IconButton size="small" onClick={() => fetchCaixa(true)} sx={{ color: 'text.secondary' }}>
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640 }}>
            {isAberto && turno ? (
              <>
                Turno iniciado em <strong>{formatDateTime(turno.data_abertura)}</strong> com troco inicial de{' '}
                <strong>{formatCurrency(turno.valor_inicial)}</strong>. As vendas em dinheiro do PDV entram automaticamente neste saldo.
              </>
            ) : (
              'Nenhum turno em andamento no momento. Abra o caixa informando o fundo de troco para autorizar vendas em dinheiro.'
            )}
          </Typography>
        </Box>

        {/* Barra de Ações Rápidas do Caixa */}
        <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          {!isAberto ? (
            <Button
              variant="contained"
              color="primary"
              size="medium"
              startIcon={<LockOpen />}
              onClick={() => {
                setValorInicial('100.00');
                setObsAbertura('');
                setOpenAbrirModal(true);
              }}
              sx={{
                fontWeight: 700,
                px: 2.5,
                py: 1,
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              }}
            >
              Abrir Caixa
            </Button>
          ) : (
            <>
              {/* + Suprimento */}
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<AddCircleOutline />}
                onClick={() => {
                  setTipoLancamento('ENTRADA');
                  setCategoriaLancamento('Suprimento de troco');
                  setDescricaoLancamento('');
                  setValorLancamento('');
                  setOpenLancamentoModal(true);
                }}
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 1.8,
                  py: 0.8,
                  textTransform: 'none',
                }}
              >
                + Suprimento
              </Button>

              {/* - Sangria / Saída */}
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<RemoveCircleOutline />}
                onClick={() => {
                  setTipoLancamento('SAIDA');
                  setCategoriaLancamento('Compra de gás');
                  setDescricaoLancamento('');
                  setValorLancamento('');
                  setOpenLancamentoModal(true);
                }}
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 1.8,
                  py: 0.8,
                  textTransform: 'none',
                }}
              >
                - Sangria / Saída
              </Button>

              {/* Fechar e Auditar Caixa */}
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<Lock />}
                onClick={() => {
                  setValorInformado('');
                  setObsFechamento('');
                  setOpenFecharModal(true);
                }}
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 2,
                  py: 0.8,
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: 'error.dark' },
                }}
              >
                Fechar Caixa
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {/* 2. Banner de Auditoria e Conferência Cega Pós-Fechamento */}
      {fechamentoResultado && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 2.5,
            border: '1px solid',
            borderColor:
              (fechamentoResultado.diferenca || 0) === 0
                ? 'success.main'
                : (fechamentoResultado.diferenca || 0) > 0
                ? 'warning.main'
                : 'error.main',
            bgcolor:
              (fechamentoResultado.diferenca || 0) === 0
                ? 'rgba(46, 125, 50, 0.06)'
                : (fechamentoResultado.diferenca || 0) > 0
                ? 'rgba(217, 119, 6, 0.08)'
                : 'rgba(211, 47, 47, 0.06)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <CheckCircle color="success" />
              <Typography variant="subtitle2" fontWeight={800}>
                Conferência de Fechamento Auditada com Sucesso!
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Valor Contado: <strong>{formatCurrency(fechamentoResultado.valor_informado)}</strong> • Valor Esperado pelo Sistema:{' '}
              <strong>{formatCurrency(fechamentoResultado.valor_esperado)}</strong> • Diferença:{' '}
              <strong
                style={{
                  color:
                    (fechamentoResultado.diferenca || 0) === 0
                      ? '#2E7D32'
                      : (fechamentoResultado.diferenca || 0) > 0
                      ? '#D97706'
                      : '#D32F2F',
                }}
              >
                {formatCurrency(fechamentoResultado.diferenca)}{' '}
                {(fechamentoResultado.diferenca || 0) === 0
                  ? '(Caixa Bateu 100%)'
                  : (fechamentoResultado.diferenca || 0) > 0
                  ? '(Sobra de Caixa)'
                  : '(Falta / Quebra de Caixa)'}
              </strong>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<WhatsApp />}
              onClick={() => handleEnviarWhatsApp(fechamentoResultado)}
              sx={{
                bgcolor: '#25D366',
                '&:hover': { bgcolor: '#1EBE5D' },
                color: '#fff',
                fontWeight: 700,
                textTransform: 'none',
              }}
            >
              Enviar no WhatsApp
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => setOpenWhatsAppDialog(true)}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Ver Detalhes
            </Button>
            <Button size="small" variant="text" onClick={() => setFechamentoResultado(null)}>
              Dispensar
            </Button>
          </Box>
        </Paper>
      )}

      {/* 3. Cards KPI do Turno Ativo (Design System Executivo) */}
      {isAberto && turno && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Card Principal: Saldo Físico Esperado (Oculto para Operador em Fechamento Cego) */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Saldo em Dinheiro na Gaveta"
              value={
                isOperator || caixaStatus?.saldo_dinheiro_atual === null
                  ? 'R$ •••••'
                  : formatCurrency(caixaStatus?.saldo_dinheiro_atual || 0)
              }
              subtitle={
                isOperator || caixaStatus?.saldo_dinheiro_atual === null
                  ? 'Oculto até o fechamento cego'
                  : 'Valor físico total conferível agora'
              }
              icon={<AccountBalanceWallet />}
              color="#0284C7"
            />
          </Grid>

          {/* Troco Inicial */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Troco Inicial (Abertura)"
              value={formatCurrency(turno.valor_inicial)}
              subtitle={`Aberto às ${formatDateTime(turno.data_abertura)}`}
              icon={<CheckCircle />}
              color="#64748B"
            />
          </Grid>

          {/* Vendas em Dinheiro (Oculto para Operador em Fechamento Cego) */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Vendas em Dinheiro (PDV)"
              value={
                isOperator || caixaStatus?.vendas_dinheiro_no_turno === null
                  ? 'R$ •••••'
                  : formatCurrency(caixaStatus?.vendas_dinheiro_no_turno || 0)
              }
              subtitle={
                isOperator || caixaStatus?.vendas_dinheiro_no_turno === null
                  ? 'Oculto até o fechamento cego'
                  : 'Entradas acumuladas de vendas'
              }
              icon={<TrendingUp />}
              color="#10B981"
            />
          </Grid>

          {/* Saídas / Sangrias do Turno */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Saídas & Sangrias"
              value={formatCurrency(caixaStatus?.total_saidas_dinheiro || 0)}
              subtitle="Retiradas, despesas e insumos pagos"
              icon={<TrendingDown />}
              color="#EF4444"
            />
          </Grid>
        </Grid>
      )}

      {/* 4. Extrato e Timeline de Movimentações (Estilo Stripe Balance) */}
      {isAberto && turno && (
        <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 1.5,
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
                  Extrato de Movimentações do Turno
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Lançamentos manuais de suprimento e sangria registrados durante o turno corrente
                </Typography>
              </Box>

              {/* Filtro de Extrato (Todas, Entradas, Saídas) */}
              <Tabs
                value={filtroTipo}
                onChange={(_, val) => setFiltroTipo(val)}
                sx={{
                  minHeight: 34,
                  '& .MuiTab-root': {
                    minHeight: 34,
                    py: 0.5,
                    px: 1.5,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: 1.5,
                  },
                }}
              >
                <Tab label={`Todas (${turno.lancamentos.length})`} value="TODOS" />
                <Tab
                  label={`Suprimentos (${turno.lancamentos.filter((l) => l.tipo === 'ENTRADA').length})`}
                  value="ENTRADA"
                />
                <Tab
                  label={`Sangrias (${turno.lancamentos.filter((l) => l.tipo === 'SAIDA').length})`}
                  value="SAIDA"
                />
              </Tabs>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {lancamentosFiltrados.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <SwapVert sx={{ fontSize: 44, color: 'text.disabled', mb: 1, opacity: 0.6 }} />
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Nenhuma movimentação manual encontrada para o filtro selecionado.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Utilize os botões "+ Suprimento" ou "- Sangria" no topo para lançar despesas ou aportes.
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Horário</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Operador</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Categoria</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Descrição / Motivo</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>
                        Valor
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lancamentosFiltrados.map((l) => {
                      const isEntrada = l.tipo === 'ENTRADA';
                      return (
                        <TableRow key={l.id} hover>
                          <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary', width: 140 }}>
                            {formatDateTime(l.data_hora)}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600, width: 130 }}>
                            {l.user_nome || (user?.id === l.user_id ? user?.nome : 'Operador')}
                          </TableCell>
                          <TableCell sx={{ width: 130 }}>
                            <Chip
                              icon={isEntrada ? <TrendingUp sx={{ fontSize: '14px !important' }} /> : <TrendingDown sx={{ fontSize: '14px !important' }} />}
                              label={isEntrada ? 'Suprimento' : 'Sangria'}
                              size="small"
                              color={isEntrada ? 'success' : 'error'}
                              variant="outlined"
                              sx={{
                                height: 22,
                                fontSize: '0.68rem',
                                fontWeight: 700,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{l.categoria}</TableCell>
                          <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                            {l.descricao || '-'}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              color: isEntrada ? 'success.main' : 'error.main',
                              width: 140,
                            }}
                          >
                            {isEntrada ? '+' : '-'} {formatCurrency(l.valor)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. Histórico e Relatório de Fechamentos Anteriores */}
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={700} display="flex" alignItems="center" gap={1} sx={{ letterSpacing: '-0.01em' }}>
              <History fontSize="small" color="primary" /> Histórico de Turnos Fechados
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Relatório de auditoria de turnos encerrados e conciliação cega de gaveta
            </Typography>
          </Box>

          {historico.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Receipt sx={{ fontSize: 44, color: 'text.disabled', mb: 1, opacity: 0.6 }} />
              <Typography variant="body2" color="text.secondary">
                Nenhum turno anterior registrado nesta empresa.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Abertura</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Fechamento</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Operador</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Fundo Inicial</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Valor Esperado</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Valor Contado</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Diferença</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Comprovante</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historico.map((h) => {
                    const diff = h.diferenca || 0;
                    const isFechado = h.status === 'FECHADO';
                    return (
                      <TableRow key={h.id} hover>
                        <TableCell sx={{ fontSize: '0.82rem' }}>{formatDateTime(h.data_abertura)}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>
                          {h.data_fechamento ? formatDateTime(h.data_fechamento) : 'Em aberto'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 700 }}>
                            {h.user_fechamento_nome || h.user_abertura_nome || 'Operador'}
                          </Typography>
                          {h.user_abertura_nome && h.user_fechamento_nome && h.user_abertura_nome !== h.user_fechamento_nome && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                              Aberto por: {h.user_abertura_nome}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>{formatCurrency(h.valor_inicial)}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>
                          {h.valor_esperado !== null && h.valor_esperado !== undefined ? formatCurrency(h.valor_esperado) : '-'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
                          {h.valor_informado !== null && h.valor_informado !== undefined ? formatCurrency(h.valor_informado) : '-'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>
                          {h.diferenca !== null && h.diferenca !== undefined ? (
                            <Chip
                              size="small"
                              label={
                                diff === 0
                                  ? 'R$ 0,00 (Batido)'
                                  : diff > 0
                                  ? `+${formatCurrency(diff)} (Sobra)`
                                  : `${formatCurrency(diff)} (Quebra)`
                              }
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.74rem',
                                bgcolor:
                                  diff === 0
                                    ? 'rgba(5, 150, 105, 0.12)'
                                    : diff > 0
                                    ? 'rgba(217, 119, 6, 0.12)'
                                    : 'rgba(220, 38, 38, 0.12)',
                                color:
                                  diff === 0
                                    ? '#059669'
                                    : diff > 0
                                    ? '#D97706'
                                    : '#DC2626',
                                border: '1px solid',
                                borderColor:
                                  diff === 0
                                    ? 'rgba(5, 150, 105, 0.3)'
                                    : diff > 0
                                    ? 'rgba(217, 119, 6, 0.3)'
                                    : 'rgba(220, 38, 38, 0.3)',
                              }}
                            />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={h.status}
                            size="small"
                            color={isFechado ? 'default' : 'success'}
                            sx={{ height: 22, fontSize: '0.66rem', fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {isFechado ? (
                            <Tooltip title="Ver Comprovante / WhatsApp">
                              <IconButton
                                size="small"
                                sx={{ color: '#25D366', '&:hover': { bgcolor: 'rgba(37, 211, 102, 0.1)' } }}
                                onClick={() => {
                                  setFechamentoResultado(h);
                                  setOpenWhatsAppDialog(true);
                                }}
                              >
                                <WhatsApp fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* DIALOG: ABRIR CAIXA */}
      <Dialog open={openAbrirModal} onClose={() => !submittingAbertura && setOpenAbrirModal(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleAbrirCaixa}>
          <DialogTitle fontWeight={800} sx={{ pb: 1 }}>
            Abertura de Caixa
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Informe o valor em dinheiro físico (fundo de troco) com o qual o operador iniciará o turno:
            </Typography>
            <TextField
              fullWidth
              label="Troco Inicial (R$)"
              type="number"
              inputProps={{ step: '0.01', min: '0', style: { fontSize: '1.25rem', fontWeight: 800 } }}
              required
              value={valorInicial}
              onChange={(e) => setValorInicial(e.target.value)}
              margin="normal"
              autoFocus
            />
            <TextField
              fullWidth
              label="Observações da Abertura"
              margin="normal"
              value={obsAbertura}
              onChange={(e) => setObsAbertura(e.target.value)}
              placeholder="Ex: R$ 50 em notas de 5 e moedas"
              helperText="Opcional. Registrado no livro de auditoria."
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 0 }}>
            <Button onClick={() => setOpenAbrirModal(false)} color="inherit" disabled={submittingAbertura}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submittingAbertura}
              sx={{ fontWeight: 700 }}
            >
              {submittingAbertura ? <CircularProgress size={20} color="inherit" /> : 'Confirmar Abertura'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* DIALOG: LANÇAMENTO AVULSO (SUPRIMENTO OU SANGRIA) */}
      <Dialog open={openLancamentoModal} onClose={() => !submittingLancamento && setOpenLancamentoModal(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleAddLancamento}>
          <DialogTitle fontWeight={800} sx={{ pb: 1 }}>
            {tipoLancamento === 'ENTRADA' ? '+ Suprimento de Dinheiro' : '- Sangria / Saída de Caixa'}
          </DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>Categoria</InputLabel>
              <Select
                value={categoriaLancamento}
                label="Categoria"
                onChange={(e) => setCategoriaLancamento(e.target.value)}
              >
                {(tipoLancamento === 'ENTRADA' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA).map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Motivo do Lançamento *"
              required
              margin="normal"
              value={descricaoLancamento}
              onChange={(e) => setDescricaoLancamento(e.target.value)}
              placeholder={tipoLancamento === 'SAIDA' ? 'Ex: Compra de botijão P13 de emergência' : 'Ex: Suprimento para troco em moedas'}
              inputProps={{ minLength: 5 }}
              error={descricaoLancamento.length > 0 && descricaoLancamento.trim().length < 5}
              helperText={
                descricaoLancamento.length > 0 && descricaoLancamento.trim().length < 5
                  ? 'Obrigatório mínimo de 5 caracteres para auditoria.'
                  : 'Descreva detalhadamente o motivo para auditoria de balcão (mín. 5 caracteres).'
              }
            />

            <TextField
              fullWidth
              label="Valor (R$)"
              type="number"
              inputProps={{ step: '0.01', min: '0.01', style: { fontWeight: 800, fontSize: '1.2rem' } }}
              required
              margin="normal"
              value={valorLancamento}
              onChange={(e) => setValorLancamento(e.target.value)}
              placeholder="0,00"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 0 }}>
            <Button onClick={() => setOpenLancamentoModal(false)} color="inherit" disabled={submittingLancamento}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              color={tipoLancamento === 'ENTRADA' ? 'success' : 'error'}
              disabled={submittingLancamento}
              sx={{ fontWeight: 700 }}
            >
              {submittingLancamento ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                `Registrar ${tipoLancamento === 'ENTRADA' ? 'Suprimento' : 'Sangria'}`
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* DIALOG: FECHAR CAIXA */}
      <Dialog open={openFecharModal} onClose={() => !submittingFechamento && setOpenFecharModal(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleFecharCaixa}>
          <DialogTitle fontWeight={800} sx={{ pb: 1 }}>
            Fechamento de Caixa
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Faça a contagem cega de todas as cédulas e moedas físicas na gaveta e informe o valor apurado:
            </Typography>

            <TextField
              fullWidth
              label="Valor Físico Apurado (R$)"
              type="number"
              inputProps={{ step: '0.01', min: '0', style: { fontSize: '1.35rem', fontWeight: 800 } }}
              required
              value={valorInformado}
              onChange={(e) => setValorInformado(e.target.value)}
              margin="normal"
              autoFocus
              placeholder="0,00"
              helperText="O sistema comparará com as vendas e calculará sobras ou faltas."
            />

            <TextField
              fullWidth
              label="Observações do Fechamento"
              multiline
              rows={2}
              margin="normal"
              value={obsFechamento}
              onChange={(e) => setObsFechamento(e.target.value)}
              placeholder="Ex: Sem ocorrências, dinheiro guardado no cofre"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 0 }}>
            <Button onClick={() => setOpenFecharModal(false)} color="inherit" disabled={submittingFechamento}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="error"
              disabled={submittingFechamento}
              sx={{ fontWeight: 700 }}
            >
              {submittingFechamento ? <CircularProgress size={20} color="inherit" /> : 'Fechar e Auditar Caixa'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* DIALOG: COMPROVANTE DE CONCILIAÇÃO & WHATSAPP DO PROPRIETÁRIO */}
      <Dialog
        open={openWhatsAppDialog && Boolean(fechamentoResultado)}
        onClose={() => setOpenWhatsAppDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        {fechamentoResultado && (
          <Box>
            <DialogTitle
              sx={{
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pb: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle color="success" />
                <span>Comprovante de Fechamento de Caixa</span>
              </Box>
              <IconButton size="small" onClick={() => setOpenWhatsAppDialog(false)}>
                <Close fontSize="small" />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ pt: 2 }}>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Turno encerrado e auditado com sucesso. Confira o balanço físico de conciliação cega da gaveta:
              </Typography>

              {/* Informações de Cabeçalho do Fechamento */}
              <Paper
                elevation={0}
                variant="outlined"
                sx={{ p: 2, mb: 2.5, borderRadius: 2, bgcolor: 'background.default' }}
              >
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Operador Responsável
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {fechamentoResultado.user_fechamento_nome ||
                        fechamentoResultado.user_abertura_nome ||
                        user?.nome ||
                        'Operador'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Data e Hora do Fechamento
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {fechamentoResultado.data_fechamento
                        ? formatDateTime(fechamentoResultado.data_fechamento)
                        : formatDateTime(new Date().toISOString())}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Tabela de Conciliação Financeira */}
              <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2, mb: 2.5 }}>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Troco Inicial (Abertura)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(fechamentoResultado.valor_inicial)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Entradas em Dinheiro (PDV)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                        + {formatCurrency(fechamentoResultado.vendas_dinheiro || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Suprimentos Avulsos (+)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                        + {formatCurrency(fechamentoResultado.total_entradas || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Sangrias / Retiradas (-)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>
                        - {formatCurrency(fechamentoResultado.total_saidas || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem' }}>Saldo Esperado pelo Sistema</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.95rem' }}>
                        {formatCurrency(fechamentoResultado.valor_esperado || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem' }}>Valor Físico Contado</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.95rem' }}>
                        {formatCurrency(fechamentoResultado.valor_informado || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow
                      sx={{
                        bgcolor:
                          (fechamentoResultado.diferenca || 0) === 0
                            ? 'rgba(5, 150, 105, 0.08)'
                            : (fechamentoResultado.diferenca || 0) > 0
                            ? 'rgba(217, 119, 6, 0.08)'
                            : 'rgba(220, 38, 38, 0.08)',
                      }}
                    >
                      <TableCell sx={{ fontWeight: 900, fontSize: '0.95rem' }}>Diferença de Caixa</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 900,
                          fontSize: '1rem',
                          color:
                            (fechamentoResultado.diferenca || 0) === 0
                              ? '#059669'
                              : (fechamentoResultado.diferenca || 0) > 0
                              ? '#D97706'
                              : '#DC2626',
                        }}
                      >
                        {formatCurrency(fechamentoResultado.diferenca || 0)}{' '}
                        {(fechamentoResultado.diferenca || 0) === 0
                          ? '(Caixa Batido)'
                          : (fechamentoResultado.diferenca || 0) > 0
                          ? '(Sobra)'
                          : '(Quebra)'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {fechamentoResultado.observacoes && (
                <Paper
                  elevation={0}
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                    Observações:
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {fechamentoResultado.observacoes}
                  </Typography>
                </Paper>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2.5, gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<ContentCopy />}
                onClick={() => handleCopiarResumo(fechamentoResultado)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Copiar Texto
              </Button>
              <Button
                variant="contained"
                startIcon={<WhatsApp />}
                onClick={() => handleEnviarWhatsApp(fechamentoResultado)}
                sx={{
                  bgcolor: '#25D366',
                  '&:hover': { bgcolor: '#1EBE5D' },
                  color: '#fff',
                  fontWeight: 800,
                  textTransform: 'none',
                  px: 2.5,
                }}
              >
                Enviar Resumo no WhatsApp
              </Button>
              <Button onClick={() => setOpenWhatsAppDialog(false)} color="inherit">
                Fechar
              </Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>

      {/* Feedback Toast / Snackbar Global */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', fontWeight: 600, borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
