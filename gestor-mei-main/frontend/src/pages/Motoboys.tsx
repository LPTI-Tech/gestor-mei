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
  Tabs,
  Tab,
} from '@mui/material';
import {
  TwoWheeler,
  Add,
  CheckCircle,
  Payment,
  Phone,
  AttachMoney,
  DoneAll,
} from '@mui/icons-material';
import api from '../services/api';
import { Motoboy, EntregaMotoboy, MotoboyRelatorio } from '../types';
import { formatCurrency, formatDateTime } from '../services/exportUtils';
import { StatCard } from '../components/StatCard';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const Motoboys: React.FC = () => {
  const [tabIndex, setTabIndex] = useState<number>(0); // 0 = Entregas / Diárias, 1 = Cadastro de Motoboys
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [entregas, setEntregas] = useState<EntregaMotoboy[]>([]);
  const [relatorio, setRelatorio] = useState<MotoboyRelatorio | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal New Entrega
  const [openEntregaModal, setOpenEntregaModal] = useState<boolean>(false);
  const [selectedMotoboyId, setSelectedMotoboyId] = useState<number | string>('');
  const [numeroPedido, setNumeroPedido] = useState<string>('');
  const [valorEntrega, setValorEntrega] = useState<string>('');
  const [statusPgto, setStatusPgto] = useState<'PENDENTE' | 'PAGO'>('PENDENTE');

  // Modal New Motoboy
  const [openMotoboyModal, setOpenMotoboyModal] = useState<boolean>(false);
  const [nomeMotoboy, setNomeMotoboy] = useState<string>('');
  const [telefoneMotoboy, setTelefoneMotoboy] = useState<string>('');
  const [taxaPadrao, setTaxaPadrao] = useState<string>('7.00');

  // Quitar Todas Confirm
  const [quitarTodasId, setQuitarTodasId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mbRes, entRes, relRes] = await Promise.all([
        api.get<Motoboy[]>('/motoboys'),
        api.get<EntregaMotoboy[]>('/motoboys/entregas'),
        api.get<MotoboyRelatorio>('/motoboys/relatorio'),
      ]);
      setMotoboys(mbRes.data);
      setEntregas(entRes.data);
      setRelatorio(relRes.data);

      if (mbRes.data.length > 0 && !selectedMotoboyId) {
        setSelectedMotoboyId(mbRes.data[0].id);
        setValorEntrega(String(mbRes.data[0].valor_por_entrega));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectMotoboyChange = (id: number) => {
    setSelectedMotoboyId(id);
    const mb = motoboys.find((m) => m.id === id);
    if (mb) {
      setValorEntrega(String(mb.valor_por_entrega));
    }
  };

  const handleAddEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/motoboys/entregas', {
        motoboy_id: Number(selectedMotoboyId),
        numero_pedido: numeroPedido,
        valor_entrega: Number(valorEntrega) || 0,
        status_pagamento: statusPgto,
      });
      setOpenEntregaModal(false);
      setNumeroPedido('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao lançar corrida.');
    }
  };

  const handleAddMotoboy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/motoboys', {
        nome: nomeMotoboy,
        telefone: telefoneMotoboy,
        valor_por_entrega: Number(taxaPadrao) || 0,
        ativo: true,
      });
      setOpenMotoboyModal(false);
      setNomeMotoboy('');
      setTelefoneMotoboy('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao cadastrar motoboy.');
    }
  };

  const handleQuitarEntrega = async (id: number) => {
    try {
      await api.put(`/motoboys/entregas/${id}/quitar`);
      fetchData();
    } catch (err) {
      alert('Erro ao quitar entrega.');
    }
  };

  const handleQuitarTodasConfirm = async () => {
    if (!quitarTodasId) return;
    try {
      await api.post(`/motoboys/quitar-todas/${quitarTodasId}`);
      setQuitarTodasId(null);
      fetchData();
    } catch (err) {
      alert('Erro ao quitar corridas do motoboy.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Title */}
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
          <Typography variant="h5" fontWeight={800} display="flex" alignItems="center" gap={1}>
            <TwoWheeler color="primary" /> Controle de Motoboys e Entregas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Acerto de diárias, corridas realizadas, taxas devidas e pagas
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Add />}
            onClick={() => setOpenMotoboyModal(true)}
            sx={{ fontWeight: 600, height: 44 }}
          >
            Cadastrar Motoboy
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            disabled={motoboys.length === 0}
            onClick={() => setOpenEntregaModal(true)}
            sx={{ fontWeight: 700, height: 44 }}
          >
            Lançar Corrida / Entrega
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      {relatorio && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <StatCard
              title="Total de Entregas"
              value={String(relatorio.total_entregas_geral)}
              subtitle="Corridas registradas"
              icon={<TwoWheeler />}
              color="#1976D2"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              title="Total Pago"
              value={formatCurrency(relatorio.total_geral_pago)}
              subtitle="Valores acertados com motoboys"
              icon={<CheckCircle />}
              color="#2E7D32"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              title="Saldo Pendente de Acerto"
              value={formatCurrency(relatorio.total_geral_pendente)}
              subtitle="Corridas ainda não pagas"
              icon={<AttachMoney />}
              color="#ED6C02"
              trend={relatorio.total_geral_pendente > 0 ? 'Pendente' : 'Zerado'}
              trendType={relatorio.total_geral_pendente > 0 ? 'negative' : 'positive'}
            />
          </Grid>
        </Grid>
      )}

      {/* Acerto Consolidado por Motoboy */}
      {relatorio && relatorio.resumos.length > 0 && (
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
              Acertos por Motoboy (Resumo das Diárias)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Visualize quem tem corridas pendentes e acerte todas em um só clique
            </Typography>

            <Grid container spacing={2}>
              {relatorio.resumos.map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.motoboy_id}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      bgcolor: item.saldo_pendente > 0 ? 'warning.light' : 'background.paper',
                      borderColor: item.saldo_pendente > 0 ? 'warning.main' : 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {item.nome}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.telefone || 'Sem telefone'} • {item.total_entregas} entregas
                        </Typography>
                      </Box>
                      <Chip
                        label={item.saldo_pendente > 0 ? `Pendente: ${formatCurrency(item.saldo_pendente)}` : 'Em Dia'}
                        size="small"
                        color={item.saldo_pendente > 0 ? 'warning' : 'success'}
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                      <Typography variant="body2" color="text.secondary">
                        Total devido: <b>{formatCurrency(item.total_devido)}</b>
                      </Typography>
                      {item.saldo_pendente > 0 && (
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          startIcon={<DoneAll fontSize="small" />}
                          onClick={() => setQuitarTodasId(item.motoboy_id)}
                          sx={{ fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          Quitar Todas
                        </Button>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Entregas Recentes / Cadastro de Motoboys */}
      <Card sx={{ borderRadius: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Corridas Realizadas" sx={{ fontWeight: 700 }} />
          <Tab label="Lista de Motoboys Cadastrados" sx={{ fontWeight: 700 }} />
        </Tabs>

        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          {tabIndex === 0 && (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'background.default' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Data / Hora</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Pedido</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Motoboy</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Taxa Corrida</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Ação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entregas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        Nenhuma entrega registrada ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    entregas.map((e) => (
                      <TableRow key={e.id} hover>
                        <TableCell>{formatDateTime(e.data_hora)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {e.numero_pedido}
                          </Typography>
                        </TableCell>
                        <TableCell>{e.motoboy_nome}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {formatCurrency(e.valor_entrega)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={e.status_pagamento}
                            size="small"
                            color={e.status_pagamento === 'PAGO' ? 'success' : 'warning'}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {e.status_pagamento === 'PENDENTE' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              onClick={() => handleQuitarEntrega(e.id)}
                              startIcon={<Payment fontSize="small" />}
                            >
                              Pagar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tabIndex === 1 && (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'background.default' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Nome do Motoboy</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Telefone</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Valor Padrão por Entrega</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {motoboys.map((mb) => (
                    <TableRow key={mb.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {mb.nome}
                        </Typography>
                      </TableCell>
                      <TableCell>{mb.telefone || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {formatCurrency(mb.valor_por_entrega)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={mb.ativo ? 'Ativo' : 'Inativo'}
                          size="small"
                          color={mb.ativo ? 'success' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* DIALOG: LANÇAR CORRIDA */}
      <Dialog open={openEntregaModal} onClose={() => setOpenEntregaModal(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleAddEntrega}>
          <DialogTitle fontWeight={700}>Lançar Entrega / Corrida</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Selecione o Motoboy</InputLabel>
              <Select
                value={selectedMotoboyId}
                label="Selecione o Motoboy"
                onChange={(e) => handleSelectMotoboyChange(Number(e.target.value))}
              >
                {motoboys.map((mb) => (
                  <MenuItem key={mb.id} value={mb.id}>
                    {mb.nome} ({formatCurrency(mb.valor_por_entrega)}/entrega)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Número do Pedido ou Nome do Cliente"
              required
              margin="normal"
              value={numeroPedido}
              onChange={(e) => setNumeroPedido(e.target.value)}
              placeholder="Ex: Pedido #125 ou Marmita João"
            />

            <TextField
              fullWidth
              label="Valor Pago ao Motoboy (R$)"
              type="number"
              inputProps={{ step: '0.01', min: '0', style: { fontWeight: 700 } }}
              required
              margin="normal"
              value={valorEntrega}
              onChange={(e) => setValorEntrega(e.target.value)}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Status do Pagamento</InputLabel>
              <Select
                value={statusPgto}
                label="Status do Pagamento"
                onChange={(e) => setStatusPgto(e.target.value as any)}
              >
                <MenuItem value="PENDENTE">Pendente (Acertar no final do turno)</MenuItem>
                <MenuItem value="PAGO">Pago Imediatamente</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenEntregaModal(false)} color="inherit">
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Registrar Corrida
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* DIALOG: CADASTRAR MOTOBOY */}
      <Dialog open={openMotoboyModal} onClose={() => setOpenMotoboyModal(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleAddMotoboy}>
          <DialogTitle fontWeight={700}>Novo Motoboy</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Nome do Motoboy"
              required
              margin="normal"
              value={nomeMotoboy}
              onChange={(e) => setNomeMotoboy(e.target.value)}
              placeholder="Ex: Lucas Entregador"
              autoFocus
            />

            <TextField
              fullWidth
              label="Telefone / WhatsApp"
              margin="normal"
              value={telefoneMotoboy}
              onChange={(e) => setTelefoneMotoboy(e.target.value)}
              placeholder="(11) 99999-9999"
            />

            <TextField
              fullWidth
              label="Taxa Padrão por Entrega (R$)"
              type="number"
              inputProps={{ step: '0.50', min: '0', style: { fontWeight: 700 } }}
              required
              margin="normal"
              value={taxaPadrao}
              onChange={(e) => setTaxaPadrao(e.target.value)}
              placeholder="Ex: 7.00"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenMotoboyModal(false)} color="inherit">
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Cadastrar Motoboy
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Confirm Quitar Todas */}
      <ConfirmDialog
        open={Boolean(quitarTodasId)}
        title="Quitar Todas as Corridas"
        message="Deseja confirmar o acerto total de todas as entregas pendentes deste motoboy?"
        confirmText="Confirmar Acerto"
        confirmColor="warning"
        onConfirm={handleQuitarTodasConfirm}
        onCancel={() => setQuitarTodasId(null)}
      />
    </Box>
  );
};
