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
} from '@mui/icons-material';
import api from '../services/api';
import { CaixaStatus, CaixaTurno } from '../types';
import { formatCurrency, formatDateTime } from '../services/exportUtils';
import { StatCard } from '../components/StatCard';

const CATEGORIAS_ENTRADA = ['Recebimentos diversos', 'Ajustes positivos', 'Outros'];
const CATEGORIAS_SAIDA = [
  'Compra de gás',
  'Compra de mercadorias',
  'Pagamento de ajudantes',
  'Pagamento de motoboys',
  'Água',
  'Energia',
  'Internet',
  'Manutenção',
  'Outros',
];

export const Caixa: React.FC = () => {
  const [caixaStatus, setCaixaStatus] = useState<CaixaStatus | null>(null);
  const [historico, setHistorico] = useState<CaixaTurno[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [openAbrirModal, setOpenAbrirModal] = useState<boolean>(false);
  const [valorInicial, setValorInicial] = useState<string>('100.00');
  const [obsAbertura, setObsAbertura] = useState<string>('');

  const [openLancamentoModal, setOpenLancamentoModal] = useState<boolean>(false);
  const [tipoLancamento, setTipoLancamento] = useState<'ENTRADA' | 'SAIDA'>('SAIDA');
  const [categoriaLancamento, setCategoriaLancamento] = useState<string>('Compra de mercadorias');
  const [descricaoLancamento, setDescricaoLancamento] = useState<string>('');
  const [valorLancamento, setValorLancamento] = useState<string>('');

  const [openFecharModal, setOpenFecharModal] = useState<boolean>(false);
  const [valorInformado, setValorInformado] = useState<string>('');
  const [obsFechamento, setObsFechamento] = useState<string>('');

  // Result of closing
  const [fechamentoResultado, setFechamentoResultado] = useState<CaixaTurno | null>(null);

  const fetchCaixa = async () => {
    try {
      setLoading(true);
      const [statusRes, histRes] = await Promise.all([
        api.get<CaixaStatus>('/caixa/status'),
        api.get<CaixaTurno[]>('/caixa/historico'),
      ]);
      setCaixaStatus(statusRes.data);
      setHistorico(histRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaixa();
  }, []);

  const handleAbrirCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/caixa/abrir', {
        valor_inicial: Number(valorInicial) || 0,
        observacoes: obsAbertura,
      });
      setOpenAbrirModal(false);
      fetchCaixa();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao abrir caixa.');
    }
  };

  const handleAddLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/caixa/lancamento', {
        tipo: tipoLancamento,
        categoria: categoriaLancamento,
        descricao: descricaoLancamento,
        valor: Number(valorLancamento) || 0,
      });
      setOpenLancamentoModal(false);
      setDescricaoLancamento('');
      setValorLancamento('');
      fetchCaixa();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao registrar lançamento.');
    }
  };

  const handleFecharCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post<CaixaTurno>('/caixa/fechar', {
        valor_informado: Number(valorInformado) || 0,
        observacoes: obsFechamento,
      });
      setOpenFecharModal(false);
      setFechamentoResultado(res.data);
      fetchCaixa();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao fechar caixa.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isAberto = caixaStatus?.is_aberto;
  const turno = caixaStatus?.turno_atual;

  return (
    <Box>
      {/* Title & Status */}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h5" fontWeight={800}>
              Controle de Caixa
            </Typography>
            <Chip
              icon={isAberto ? <LockOpen fontSize="small" /> : <Lock fontSize="small" />}
              label={isAberto ? 'Caixa Aberto' : 'Caixa Fechado'}
              color={isAberto ? 'success' : 'default'}
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Acompanhe o saldo físico em dinheiro, sangrias, suprimentos e conferência cega no fechamento.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {!isAberto ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<LockOpen />}
              onClick={() => setOpenAbrirModal(true)}
              sx={{ fontWeight: 700, height: 44 }}
            >
              Abrir Caixa
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<AddCircleOutline />}
                onClick={() => {
                  setTipoLancamento('ENTRADA');
                  setCategoriaLancamento('Recebimentos diversos');
                  setOpenLancamentoModal(true);
                }}
                sx={{ fontWeight: 700, height: 44 }}
              >
                + Entrada
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<RemoveCircleOutline />}
                onClick={() => {
                  setTipoLancamento('SAIDA');
                  setCategoriaLancamento('Compra de mercadorias');
                  setOpenLancamentoModal(true);
                }}
                sx={{ fontWeight: 700, height: 44 }}
              >
                - Saída (Gás / Despesa)
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Lock />}
                onClick={() => {
                  setValorInformado('');
                  setObsFechamento('');
                  setOpenFecharModal(true);
                }}
                sx={{ fontWeight: 700, height: 44 }}
              >
                Fechar Caixa
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Audit Result Banner after Closing */}
      {fechamentoResultado && (
        <Alert
          severity={
            (fechamentoResultado.diferenca || 0) === 0
              ? 'success'
              : (fechamentoResultado.diferenca || 0) > 0
              ? 'info'
              : 'warning'
          }
          onClose={() => setFechamentoResultado(null)}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2" fontWeight={700}>
            Turno de Caixa Fechado com Sucesso!
          </Typography>
          Valor Contado: <b>{formatCurrency(fechamentoResultado.valor_informado)}</b> | Valor Esperado:{' '}
          <b>{formatCurrency(fechamentoResultado.valor_esperado)}</b> | Diferença:{' '}
          <b>{formatCurrency(fechamentoResultado.diferenca)}</b>{' '}
          {fechamentoResultado.diferenca && fechamentoResultado.diferenca > 0
            ? '(Sobra de Caixa)'
            : fechamentoResultado.diferenca && fechamentoResultado.diferenca < 0
            ? '(Falta de Caixa)'
            : '(Caixa bateu 100%)'}
        </Alert>
      )}

      {/* Active Shift Dashboard */}
      {isAberto && turno && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Troco Inicial"
              value={formatCurrency(turno.valor_inicial)}
              subtitle={`Aberto às ${formatDateTime(turno.data_abertura)}`}
              icon={<AccountBalanceWallet />}
              color="#1976D2"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Vendas em Dinheiro"
              value={formatCurrency(caixaStatus.vendas_dinheiro_no_turno)}
              subtitle="Entradas de vendas físicas"
              icon={<TrendingUp />}
              color="#2E7D32"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Saídas / Despesas"
              value={formatCurrency(caixaStatus.total_saidas_dinheiro)}
              subtitle="Gás, ajudantes, insumos no turno"
              icon={<TrendingDown />}
              color="#D32F2F"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Saldo Esperado no Caixa"
              value={formatCurrency(caixaStatus.saldo_dinheiro_atual)}
              subtitle="Dinheiro que deve estar na gaveta"
              icon={<CheckCircle />}
              color="#0288D1"
            />
          </Grid>
        </Grid>
      )}

      {/* Active Shift Transactions */}
      {isAberto && turno && (
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              Movimentações do Turno Atual
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Lançamentos avulsos de suprimento (entradas) e sangrias (saídas)
            </Typography>

            {turno.lancamentos.length === 0 ? (
              <Typography variant="body2" color="text.secondary" py={2}>
                Nenhum lançamento avulso registrado neste turno até o momento.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'background.default' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Horário</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Categoria</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Descrição</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Valor</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {turno.lancamentos.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{formatDateTime(l.data_hora)}</TableCell>
                        <TableCell>
                          <Chip
                            label={l.tipo}
                            size="small"
                            color={l.tipo === 'ENTRADA' ? 'success' : 'error'}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell>{l.categoria}</TableCell>
                        <TableCell>{l.descricao}</TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                            color: l.tipo === 'ENTRADA' ? 'success.main' : 'error.main',
                          }}
                        >
                          {l.tipo === 'ENTRADA' ? '+' : '-'} {formatCurrency(l.valor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* History of Past Shifts */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Typography variant="h6" fontWeight={700} display="flex" alignItems="center" gap={1} mb={0.5}>
            <History /> Histórico de Fechamentos de Caixa
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            Relatório de turnos fechados e conferências anteriores
          </Typography>

          {historico.length === 0 ? (
            <Typography variant="body2" color="text.secondary" py={3} textAlign="center">
              Nenhum turno anterior registrado.
            </Typography>
          ) : (
            <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: 'background.default' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Abertura</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Fechamento</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Valor Inicial</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Valor Esperado</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Valor Contado</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Diferença</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historico.map((h) => {
                    const diff = h.diferenca || 0;
                    return (
                      <TableRow key={h.id} hover>
                        <TableCell>{formatDateTime(h.data_abertura)}</TableCell>
                        <TableCell>{h.data_fechamento ? formatDateTime(h.data_fechamento) : 'Em aberto'}</TableCell>
                        <TableCell>{formatCurrency(h.valor_inicial)}</TableCell>
                        <TableCell>{h.valor_esperado !== null ? formatCurrency(h.valor_esperado) : '-'}</TableCell>
                        <TableCell>{h.valor_informado !== null ? formatCurrency(h.valor_informado) : '-'}</TableCell>
                        <TableCell>
                          {h.diferenca !== null ? (
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              color={diff === 0 ? 'success.main' : diff > 0 ? 'info.main' : 'error.main'}
                            >
                              {diff > 0 ? `+${formatCurrency(diff)} (Sobra)` : diff < 0 ? `${formatCurrency(diff)} (Falta)` : 'R$ 0,00'}
                            </Typography>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={h.status}
                            size="small"
                            color={h.status === 'ABERTO' ? 'success' : 'default'}
                          />
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
      <Dialog open={openAbrirModal} onClose={() => setOpenAbrirModal(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleAbrirCaixa}>
          <DialogTitle fontWeight={700}>Abertura de Caixa</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Informe o valor em dinheiro com o qual você está iniciando o dia (troco inicial):
            </Typography>
            <TextField
              fullWidth
              label="Troco Inicial (R$)"
              type="number"
              inputProps={{ step: '0.01', min: '0', style: { fontSize: '1.2rem', fontWeight: 700 } }}
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
              placeholder="Ex: R$ 50 em moedas e notas de R$ 5 e R$ 10"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenAbrirModal(false)} color="inherit">
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Confirmar Abertura
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* DIALOG: LANÇAMENTO AVULSO */}
      <Dialog open={openLancamentoModal} onClose={() => setOpenLancamentoModal(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleAddLancamento}>
          <DialogTitle fontWeight={700}>
            {tipoLancamento === 'ENTRADA' ? '+ Entrada de Dinheiro' : '- Saída / Pagamento de Despesa'}
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
              label="Descrição do Lançamento"
              required
              margin="normal"
              value={descricaoLancamento}
              onChange={(e) => setDescricaoLancamento(e.target.value)}
              placeholder={tipoLancamento === 'SAIDA' ? 'Ex: Botijão de gás P13' : 'Ex: Troco reposto'}
            />

            <TextField
              fullWidth
              label="Valor (R$)"
              type="number"
              inputProps={{ step: '0.01', min: '0.01', style: { fontWeight: 700 } }}
              required
              margin="normal"
              value={valorLancamento}
              onChange={(e) => setValorLancamento(e.target.value)}
              placeholder="0,00"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenLancamentoModal(false)} color="inherit">
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              color={tipoLancamento === 'ENTRADA' ? 'success' : 'error'}
            >
              Registrar Lançamento
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* DIALOG: FECHAR CAIXA */}
      <Dialog open={openFecharModal} onClose={() => setOpenFecharModal(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleFecharCaixa}>
          <DialogTitle fontWeight={700}>Fechamento de Caixa</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Faça a contagem das cédulas e moedas físicas na sua gaveta e informe o valor total encontrado:
            </Typography>

            <TextField
              fullWidth
              label="Valor Encontrado em Caixa (R$)"
              type="number"
              inputProps={{ step: '0.01', min: '0', style: { fontSize: '1.3rem', fontWeight: 800 } }}
              required
              value={valorInformado}
              onChange={(e) => setValorInformado(e.target.value)}
              margin="normal"
              autoFocus
              placeholder="0,00"
            />

            <TextField
              fullWidth
              label="Observações do Fechamento"
              multiline
              rows={2}
              margin="normal"
              value={obsFechamento}
              onChange={(e) => setObsFechamento(e.target.value)}
              placeholder="Ex: Notas entregues ao motoboy, sem pendências"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenFecharModal(false)} color="inherit">
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="error">
              Fechar e Auditar Caixa
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};
