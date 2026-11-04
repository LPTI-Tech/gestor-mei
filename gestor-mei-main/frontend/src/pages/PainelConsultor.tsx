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

export const PainelConsultor: React.FC = () => {
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
    let color: 'success' | 'warning' | 'error' = 'success';
    let icon = <CheckCircle fontSize="small" />;
    let label = '🟢 Saudável';

    if (score === 'ATENCAO') {
      color = 'warning';
      icon = <WarningAmber fontSize="small" />;
      label = '🟡 Atenção';
    } else if (score === 'CRITICO') {
      color = 'error';
      icon = <ReportProblem fontSize="small" />;
      label = '🔴 Crítico';
    }

    return (
      <Tooltip title={motivo} arrow>
        <Chip
          label={label}
          color={color}
          size="small"
          sx={{ fontWeight: 700, fontSize: '0.78rem' }}
        />
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SupervisorAccount color="primary" fontSize="large" />
            <Typography variant="h4" fontWeight={800}>
              Painel do Consultor
            </Typography>
            <Chip label="LPTI Tech" color="primary" size="small" sx={{ fontWeight: 700 }} />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Visão consolidada da carteira de clientes MEI: conformidade com o DAS, estoque crítico, teto de faturamento e scores de saúde.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchData}
            disabled={loading}
            size="small"
            sx={{ borderRadius: 2 }}
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

      {/* DASHBOARD DE TOPO (4 CARDS DE INDICADORES EXECUTIVOS) */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* 1. Clientes Ativos */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={2}
            sx={{
              borderRadius: 3,
              p: 1,
              borderLeft: '5px solid #0288d1',
              bgcolor: 'background.paper',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                  Clientes Ativos
                </Typography>
                <Store color="primary" />
              </Box>
              <Typography variant="h4" fontWeight={800} color="primary.main">
                {resumo?.total_clientes_ativos ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Empresas MEI sob consultoria ativa
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 2. DAS em Atraso */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={2}
            sx={{
              borderRadius: 3,
              p: 1,
              borderLeft: '5px solid #d32f2f',
              bgcolor: 'background.paper',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                  DAS em Atraso
                </Typography>
                <ReportProblem color="error" />
              </Box>
              <Typography variant="h4" fontWeight={800} color="error.main">
                {resumo?.total_das_atrasado ?? 0}
              </Typography>
              <Typography variant="caption" color="error.light" fontWeight={600}>
                {resumo?.total_das_atrasado ? 'Exigem regularização fiscal urgente' : 'Nenhuma empresa inadimplente'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 3. Estoque Crítico */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={2}
            sx={{
              borderRadius: 3,
              p: 1,
              borderLeft: '5px solid #ed6c02',
              bgcolor: 'background.paper',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                  Estoque Crítico
                </Typography>
                <Inventory2 color="warning" />
              </Box>
              <Typography variant="h4" fontWeight={800} color="warning.main">
                {resumo?.total_estoque_critico ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Clientes com produtos zerados ou no mínimo
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 4. Próximos do Limite MEI */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={2}
            sx={{
              borderRadius: 3,
              p: 1,
              borderLeft: '5px solid #9c27b0',
              bgcolor: 'background.paper',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                  Próximos do Limite MEI
                </Typography>
                <TrendingUp color="secondary" />
              </Box>
              <Typography variant="h4" fontWeight={800} color="secondary.main">
                {resumo?.total_proximo_limite ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Faturamento anual ≥ 80% (teto R$ 81k)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* BARRA DE FILTROS & PESQUISA */}
      <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Busca Textual */}
          <TextField
            size="small"
            placeholder="Buscar por cliente, razão social ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', md: 320 } }}
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
      </Paper>

      {/* LISTAGEM DE CLIENTES */}
      <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Clientes da Carteira LPTI Tech
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Exibindo {clientesFiltrados.length} cliente(s)
            </Typography>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ p: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Carregando indicadores dos clientes...
            </Typography>
          </Box>
        ) : clientesFiltrados.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
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
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: (th) => th.palette.action.hover }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Cliente / Empresa</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Score</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Status DAS</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Faturamento Anual & Teto MEI</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Estoque Crítico</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Última Compra</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clientesFiltrados.map((c) => (
                  <TableRow key={c.id} hover>
                    {/* Nome / Empresa */}
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {c.nome_fantasia}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {c.nome_empresarial}
                      </Typography>
                      <Typography variant="caption" color="primary" sx={{ fontFamily: 'monospace' }}>
                        CNPJ: {c.cnpj}
                      </Typography>
                    </TableCell>

                    {/* Score */}
                    <TableCell align="center">
                      {renderScoreChip(c.score, c.score_motivo)}
                    </TableCell>

                    {/* Status DAS */}
                    <TableCell align="center">
                      {c.status_das === 'Atrasado' ? (
                        <Chip
                          label={`${c.qtd_das_atrasados} em Atraso`}
                          color="error"
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      ) : c.status_das === 'Pendente' ? (
                        <Chip
                          label={c.das_vence_em_breve ? 'Vence em 7 dias' : 'Pendente'}
                          color="warning"
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      ) : (
                        <Chip
                          label="Em dia"
                          color="success"
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      )}
                    </TableCell>

                    {/* Faturamento Anual & % Limite MEI */}
                    <TableCell sx={{ minWidth: 200 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {formatCurrency(c.faturamento_anual)}
                        </Typography>
                        <Typography
                          variant="caption"
                          fontWeight={800}
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
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Teto anual: {formatCurrency(c.limite_mei_anual)}
                      </Typography>
                    </TableCell>

                    {/* Quantidade de Produtos Críticos */}
                    <TableCell align="center">
                      {c.quantidade_produtos_criticos > 0 ? (
                        <Tooltip title={c.produtos_criticos_nomes.join(', ')} arrow>
                          <Chip
                            label={`${c.quantidade_produtos_criticos} item(ns)`}
                            color="warning"
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </Tooltip>
                      ) : (
                        <Chip
                          label="Estoque Regular"
                          color="default"
                          variant="outlined"
                          size="small"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      )}
                    </TableCell>

                    {/* Última Compra Registrada */}
                    <TableCell>
                      {c.ultima_compra ? (
                        <>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 160 }}>
                            {c.ultima_compra.fornecedor_nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            NF nº {c.ultima_compra.numero_nota} • {formatCurrency(c.ultima_compra.valor_total)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(c.ultima_compra.data)}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Nenhuma compra NF-e
                        </Typography>
                      )}
                    </TableCell>

                    {/* Ações */}
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => handleOpenDiagnostico(c)}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
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
      </Paper>

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

