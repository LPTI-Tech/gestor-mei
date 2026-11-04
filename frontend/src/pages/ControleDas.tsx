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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  WarningAmber,
  ReportProblem,
  CalendarMonth,
  Payment,
  Edit,
  Refresh,
  OpenInNew,
  Download,
  FilterList,
  AccountBalanceWallet,
  ReceiptLong,
  InfoOutlined,
} from '@mui/icons-material';
import api from '../services/api';
import {
  DasMensal,
  DasResumo,
  DasVencimentosResponse,
  DasStatus,
  RegistrarPagamentoDasRequest,
  AlterarStatusDasRequest,
} from '../types';
import { formatCurrency, formatDate, exportToExcel, exportToCSV } from '../services/exportUtils';

export const ControleDas: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [guias, setGuias] = useState<DasMensal[]>([]);
  const [vencimentosData, setVencimentosData] = useState<DasVencimentosResponse | null>(null);
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
      const [resGuias, resVenc] = await Promise.all([
        api.get<DasMensal[]>(`/das?ano=${year}`),
        api.get<DasVencimentosResponse>(`/das/vencimentos?ano=${year}`),
      ]);
      setGuias(resGuias.data);
      setVencimentosData(resVenc.data);
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
      // Primeiro atualiza status
      await api.patch(`/das/${selectedGuia.id}/status`, payload);
      // Se alterou valor ou vencimento, atualiza os campos gerais
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

  return (
    <Box sx={{ pb: 6 }}>
      {/* Feedback Alerts */}
      {alertSuccess && (
        <Alert severity="success" onClose={() => setAlertSuccess(null)} sx={{ mb: 2, borderRadius: 2 }}>
          {alertSuccess}
        </Alert>
      )}
      {alertError && (
        <Alert severity="error" onClose={() => setAlertError(null)} sx={{ mb: 2, borderRadius: 2 }}>
          {alertError}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLong fontSize="large" /> Controle DAS Mensal
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Acompanhe, gerencie e registre os pagamentos mensais do Documento de Arrecadação do Simples Nacional (MEI).
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Ano</InputLabel>
            <Select
              value={selectedYear}
              label="Ano"
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              <MenuItem value={currentYear - 1}>{currentYear - 1}</MenuItem>
              <MenuItem value={currentYear}>{currentYear}</MenuItem>
              <MenuItem value={currentYear + 1}>{currentYear + 1}</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleSincronizarAno}
            disabled={actionLoading}
            size="small"
            sx={{ borderRadius: 2 }}
          >
            Sincronizar Guias
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<OpenInNew />}
            href="https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao"
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Emitir no PGMEI
          </Button>
        </Box>
      </Box>

      {/* Seção de Alertas em Destaque (Requisitos: DAS vence em 7 dias, DAS venceu, DAS pago) */}
      {/* 1. Alerta: DAS Venceu (Crítico) */}
      {dasVencidos.length > 0 && (
        <Alert
          severity="error"
          icon={<ReportProblem />}
          sx={{ mb: 2.5, fontWeight: 600, borderRadius: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => handleOpenPayment(dasVencidos[0])}
              sx={{ fontWeight: 700 }}
            >
              Pagar Guia em Atraso
            </Button>
          }
        >
          DAS Venceu: Você possui {dasVencidos.length} guia(s) DAS em atraso ({dasVencidos.map(d => d.nome_mes).join(', ')}).
          Regularize o quanto antes no portal da Receita para evitar multas de mora e preservar os benefícios previdenciários do MEI!
        </Alert>
      )}

      {/* 2. Alerta: DAS Vence em 7 dias (Atenção) */}
      {dasVenceEm7Dias.length > 0 && (
        <Alert
          severity="warning"
          icon={<CalendarMonth />}
          sx={{ mb: 2.5, fontWeight: 600, borderRadius: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => handleOpenPayment(dasVenceEm7Dias[0])}
              sx={{ fontWeight: 700 }}
            >
              Registrar Pagamento
            </Button>
          }
        >
          {dasVenceEm7Dias[0].dias_para_vencimento === 0
            ? `O DAS de ${dasVenceEm7Dias[0].nome_mes} vence HOJE (dia 20)! Valor: ${formatCurrency(dasVenceEm7Dias[0].valor)}.`
            : dasVenceEm7Dias[0].dias_para_vencimento === 1
            ? `O DAS de ${dasVenceEm7Dias[0].nome_mes} vence AMANHÃ (dia 20)! Valor: ${formatCurrency(dasVenceEm7Dias[0].valor)}.`
            : `O DAS de ${dasVenceEm7Dias[0].nome_mes} vence em ${dasVenceEm7Dias[0].dias_para_vencimento} dias (${formatDate(dasVenceEm7Dias[0].vencimento)}). Valor: ${formatCurrency(dasVenceEm7Dias[0].valor)}.`}
        </Alert>
      )}

      {/* 3. Alerta: DAS Pago (Sucesso/Confirmação) */}
      {dasMesAtual && dasMesAtual.status === 'Pago' && dasVencidos.length === 0 && (
        <Alert
          severity="success"
          icon={<CheckCircle />}
          sx={{ mb: 2.5, fontWeight: 600, borderRadius: 2 }}
        >
          DAS Pago: A guia de {dasMesAtual.nome_mes} / {selectedYear} já está paga (liquidada em {dasMesAtual.data_pagamento ? formatDate(dasMesAtual.data_pagamento) : 'hoje'}). Parabéns, suas obrigações fiscais do MEI estão em dia!
        </Alert>
      )}

      {/* Cards de Resumo / Indicadores (Exibir: Pago, Pendente, Atrasado) */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Card: Total Pago */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, borderLeft: '6px solid #2E7D32', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" fontWeight={700} color="text.secondary">
                  DAS PAGO
                </Typography>
                <CheckCircle sx={{ color: '#2E7D32' }} />
              </Box>
              <Typography variant="h4" fontWeight={800} color="#2E7D32">
                {formatCurrency(resumo?.total_pago || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {resumo?.qtd_pago || 0} de {resumo?.total_guias || 12} guias quitadas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card: Total Pendente */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, borderLeft: '6px solid #ED6C02', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" fontWeight={700} color="text.secondary">
                  DAS PENDENTE
                </Typography>
                <CalendarMonth sx={{ color: '#ED6C02' }} />
              </Box>
              <Typography variant="h4" fontWeight={800} color="#ED6C02">
                {formatCurrency(resumo?.total_pendente || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {resumo?.qtd_pendente || 0} guias a vencer no ano
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card: Total Atrasado */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, borderLeft: '6px solid #D32F2F', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" fontWeight={700} color="text.secondary">
                  DAS ATRASADO
                </Typography>
                <ReportProblem sx={{ color: '#D32F2F' }} />
              </Box>
              <Typography variant="h4" fontWeight={800} color="#D32F2F">
                {formatCurrency(resumo?.total_atrasado || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {resumo?.qtd_atrasado || 0} guias vencidas sem quitação
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card: Situação do Mês Atual */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, borderLeft: '6px solid #1976D2', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" fontWeight={700} color="text.secondary">
                  COMPETÊNCIA ATUAL
                </Typography>
                <AccountBalanceWallet color="primary" />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}>
                <Typography variant="h5" fontWeight={800}>
                  {dasMesAtual?.nome_mes || 'Mês Atual'}
                </Typography>
                {dasMesAtual && (
                  <Chip
                    size="small"
                    label={dasMesAtual.status}
                    color={
                      dasMesAtual.status === 'Pago'
                        ? 'success'
                        : dasMesAtual.status === 'Atrasado'
                        ? 'error'
                        : 'warning'
                    }
                    sx={{ fontWeight: 800 }}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                Vencimento: {dasMesAtual ? formatDate(dasMesAtual.vencimento) : 'Dia 20'} • {formatCurrency(dasMesAtual?.valor || 75.60)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabela de Guias Mensais com Filtros e Ações */}
      <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Buscar por mês ou observação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 260 }}
            />

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="TODOS">Todos os Status</MenuItem>
                <MenuItem value="Pago">Pago</MenuItem>
                <MenuItem value="Pendente">Pendente</MenuItem>
                <MenuItem value="Atrasado">Atrasado</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download />}
              onClick={() => handleExport('excel')}
              sx={{ borderRadius: 2 }}
            >
              Exportar Excel
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download />}
              onClick={() => handleExport('csv')}
              sx={{ borderRadius: 2 }}
            >
              CSV
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : filteredGuias.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body1" color="text.secondary">
              Nenhuma guia encontrada com os filtros selecionados.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 750 }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Competência</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Vencimento</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Valor</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Data Pagamento</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Observações / Comprovante</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Ações</TableCell>
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
                        bgcolor: isAtrasado
                          ? 'rgba(211, 47, 47, 0.04)'
                          : isPago
                          ? 'rgba(46, 125, 50, 0.02)'
                          : 'inherit',
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700 }}>
                        {guia.competencia_formatada || `${guia.nome_mes} / ${guia.ano}`}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {formatDate(guia.vencimento)}
                          </Typography>
                          {guia.alerta_vencimento === 'vence_hoje' && (
                            <Chip size="small" label="Vence Hoje" color="error" sx={{ height: 20, fontSize: '0.7rem' }} />
                          )}
                          {guia.alerta_vencimento === 'vence_7_dias' && (
                            <Chip
                              size="small"
                              label={`Em ${guia.dias_para_vencimento}d`}
                              color="warning"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {formatCurrency(guia.valor)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={isPago ? <CheckCircle /> : isAtrasado ? <ReportProblem /> : <CalendarMonth />}
                          label={guia.status}
                          size="small"
                          color={isPago ? 'success' : isAtrasado ? 'error' : 'warning'}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        {guia.data_pagamento ? (
                          <Typography variant="body2" fontWeight={600} color="success.main">
                            {formatDate(guia.data_pagamento)}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography variant="body2" color="text.secondary" noWrap title={guia.observacao || ''}>
                          {guia.observacao || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          {!isPago ? (
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              startIcon={<Payment />}
                              onClick={() => handleOpenPayment(guia)}
                              sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
                            >
                              Pagar
                            </Button>
                          ) : (
                            <Button
                              variant="outlined"
                              color="primary"
                              size="small"
                              onClick={() => handleOpenEdit(guia)}
                              sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
                            >
                              Detalhes
                            </Button>
                          )}

                          <Tooltip title="Editar ou alterar status">
                            <IconButton size="small" onClick={() => handleOpenEdit(guia)}>
                              <Edit fontSize="small" />
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
      </Paper>

      {/* Modal: Registrar Pagamento */}
      <Dialog open={openPayModal} onClose={() => setOpenPayModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Registrar Pagamento do DAS
        </DialogTitle>
        <DialogContent dividers>
          {selectedGuia && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Confirmando a quitação da competência <strong>{selectedGuia.competencia_formatada}</strong> com vencimento em{' '}
                <strong>{formatDate(selectedGuia.vencimento)}</strong>.
              </Alert>

              <TextField
                label="Data do Pagamento"
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
              />

              <TextField
                label="Valor Pago (R$)"
                type="number"
                value={payValor}
                onChange={(e) => setPayValor(Number(e.target.value))}
                fullWidth
                required
                inputProps={{ step: '0.01' }}
              />

              <TextField
                label="Observações / Código do Comprovante"
                placeholder="Ex: Pago pelo app Nubank via PIX / Autenticação 987654"
                multiline
                rows={2}
                value={payObs}
                onChange={(e) => setPayObs(e.target.value)}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenPayModal(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmPayment}
            variant="contained"
            color="success"
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={18} /> : <CheckCircle />}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Confirmar Pagamento
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Editar Guia / Alterar Status */}
      <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Gerenciar Guia DAS — {selectedGuia?.competencia_formatada}
        </DialogTitle>
        <DialogContent dividers>
          {selectedGuia && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Status da Guia</InputLabel>
                <Select
                  value={editStatus}
                  label="Status da Guia"
                  onChange={(e) => setEditStatus(e.target.value as DasStatus)}
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
                />
              )}

              <TextField
                label="Observações"
                multiline
                rows={3}
                value={editObs}
                onChange={(e) => setEditObs(e.target.value)}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenEditModal(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmEdit}
            variant="contained"
            color="primary"
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={18} /> : <CheckCircle />}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Salvar Alterações
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ControleDas;

