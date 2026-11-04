import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  LocalShipping,
  TwoWheeler,
  Receipt,
  CheckCircle,
  WhatsApp,
  Print,
  ArrowForward,
  Fastfood,
  Schedule,
  Cancel,
  LocationOn,
  Phone,
  Add,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Venda, StatusPedido, Motoboy, ComandaImpressao } from '../types';
import { formatCurrency, formatDateTime } from '../services/exportUtils';
import { ConfirmDialog } from '../components/ConfirmDialog';

const STATUS_TABS: { label: string; value: string; color: string }[] = [
  { label: 'Todos', value: 'Todos', color: '#1976D2' },
  { label: 'Recebido', value: 'Recebido', color: '#ED6C02' },
  { label: 'Em Preparo', value: 'Em Preparo', color: '#9C27B0' },
  { label: 'Saiu para Entrega', value: 'Saiu para Entrega', color: '#0288D1' },
  { label: 'Entregue', value: 'Entregue', color: '#2E7D32' },
];

export const PedidosEntrega: React.FC = () => {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Venda[]>([]);
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('Todos');

  // Detalhes & Comanda
  const [comandaModal, setComandaModal] = useState<ComandaImpressao | null>(null);
  const [loadingComanda, setLoadingComanda] = useState<boolean>(false);

  // Vincular Motoboy Modal
  const [motoboyModalVenda, setMotoboyModalVenda] = useState<Venda | null>(null);
  const [selectedMotoboyId, setSelectedMotoboyId] = useState<number | ''>('');
  const [submittingMotoboy, setSubmittingMotoboy] = useState<boolean>(false);

  // Cancel Dialog
  const [cancelVendaId, setCancelVendaId] = useState<number | null>(null);

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      const [pedRes, motRes] = await Promise.all([
        api.get<Venda[]>('/vendas', {
          params: {
            tipo_pedido: 'ENTREGA',
            status_pedido: selectedStatusTab !== 'Todos' ? selectedStatusTab : undefined,
            limit: 50,
          },
        }),
        api.get<Motoboy[]>('/motoboys', { params: { apenas_ativos: true } }),
      ]);
      setPedidos(pedRes.data);
      setMotoboys(motRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, [selectedStatusTab]);

  const handleUpdateStatus = async (vendaId: number, nextStatus: StatusPedido) => {
    try {
      const res = await api.put<Venda>(`/vendas/${vendaId}/status-pedido`, {
        status_pedido: nextStatus,
      });
      setPedidos((prev) => prev.map((p) => (p.id === vendaId ? res.data : p)));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao atualizar status do pedido.');
    }
  };

  const handleOpenMotoboyModal = (v: Venda) => {
    setMotoboyModalVenda(v);
    setSelectedMotoboyId(v.motoboy_id || (motoboys.length > 0 ? motoboys[0].id : ''));
  };

  const handleSaveMotoboy = async () => {
    if (!motoboyModalVenda || !selectedMotoboyId) return;
    try {
      setSubmittingMotoboy(true);
      const res = await api.put<Venda>(`/vendas/${motoboyModalVenda.id}/vincular-motoboy`, {
        motoboy_id: Number(selectedMotoboyId),
      });

      // Advance to 'Saiu para Entrega' automatically if in 'Em Preparo' or 'Recebido'
      if (motoboyModalVenda.status_pedido !== 'Saiu para Entrega' && motoboyModalVenda.status_pedido !== 'Entregue') {
        const resStatus = await api.put<Venda>(`/vendas/${motoboyModalVenda.id}/status-pedido`, {
          status_pedido: 'Saiu para Entrega',
        });
        setPedidos((prev) => prev.map((p) => (p.id === motoboyModalVenda.id ? resStatus.data : p)));
      } else {
        setPedidos((prev) => prev.map((p) => (p.id === motoboyModalVenda.id ? res.data : p)));
      }

      setMotoboyModalVenda(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao despachar motoboy.');
    } finally {
      setSubmittingMotoboy(false);
    }
  };

  const handleCancelPedido = async () => {
    if (!cancelVendaId) return;
    try {
      const res = await api.put<Venda>(`/vendas/${cancelVendaId}/cancelar`);
      setPedidos((prev) => prev.map((p) => (p.id === cancelVendaId ? res.data : p)));
      setCancelVendaId(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao cancelar pedido.');
    }
  };

  const handlePrintComanda = async (vendaId: number) => {
    try {
      setLoadingComanda(true);
      const res = await api.get<ComandaImpressao>(`/vendas/${vendaId}/comanda-texto`);
      setComandaModal(res.data);
    } catch (err: any) {
      alert('Erro ao carregar comanda para impressão.');
    } finally {
      setLoadingComanda(false);
    }
  };

  const executeThermalPrint = () => {
    window.print();
  };

  const formatWhatsAppMessage = (p: Venda) => {
    if (!p.cliente_telefone) return null;
    const cleanDigits = p.cliente_telefone.replace(/\D/g, '');
    if (cleanDigits.length < 10) return null;
    const phone = cleanDigits.length === 11 || cleanDigits.length === 10 ? `55${cleanDigits}` : cleanDigits;

    let msg = `Olá ${p.cliente_nome || ''}! Seu pedido #${p.numero_pedido} `;
    if (p.status_pedido === 'Saiu para Entrega') {
      msg += `já saiu para entrega com o motoboy ${p.motoboy_nome || ''}! Em breve chegará até você.`;
    } else if (p.status_pedido === 'Em Preparo') {
      msg += `já está sendo preparado com muito carinho!`;
    } else {
      msg += `foi recebido e confirmado com sucesso!`;
    }

    return `https://wa.me/${phone}?text=${encodeURI(msg)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Recebido':
        return 'warning';
      case 'Em Preparo':
        return 'secondary';
      case 'Saiu para Entrega':
        return 'info';
      case 'Entregue':
        return 'success';
      case 'Cancelado':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      {/* Top Header */}
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
            <LocalShipping color="primary" /> Gestão de Pedidos & Delivery
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Acompanhe o fluxo de produção e entrega dos pedidos: Recebido ➔ Em Preparo ➔ Saiu para Entrega ➔ Entregue.
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={() => navigate('/vendas')}
          sx={{ fontWeight: 700, height: 44, px: 3, borderRadius: 2 }}
        >
          Novo Pedido
        </Button>
      </Box>

      {/* Status Pipeline Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 3 }}>
        <Tabs
          value={selectedStatusTab}
          onChange={(_, val) => setSelectedStatusTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { fontWeight: 700, fontSize: '0.95rem', minHeight: 48 },
          }}
        >
          {STATUS_TABS.map((tab) => (
            <Tab key={tab.value} label={tab.label} value={tab.value} />
          ))}
        </Tabs>
      </Paper>

      {/* Orders List / Cards */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : pedidos.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <LocalShipping color="disabled" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            Nenhum pedido de entrega encontrado neste status.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Registre pedidos com a opção "Entrega Delivery" no PDV para gerenciá-los por aqui.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/vendas')}>
            Abrir PDV de Vendas
          </Button>
        </Card>
      ) : (
        <Grid container spacing={2.5}>
          {pedidos.map((p) => {
            const waUrl = formatWhatsAppMessage(p);
            return (
              <Grid item xs={12} md={6} lg={4} key={p.id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    border: 2,
                    borderColor:
                      p.status_pedido === 'Saiu para Entrega'
                        ? 'info.main'
                        : p.status_pedido === 'Em Preparo'
                        ? 'secondary.main'
                        : p.status_pedido === 'Entregue'
                        ? 'success.main'
                        : 'warning.main',
                    boxShadow: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    {/* Header: Order Number & Status */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Receipt color="primary" fontSize="small" />
                        <Typography variant="h6" fontWeight={800}>
                          {p.numero_pedido}
                        </Typography>
                      </Box>
                      <Chip
                        label={p.status_pedido}
                        color={getStatusColor(p.status_pedido) as any}
                        size="small"
                        sx={{ fontWeight: 800 }}
                      />
                    </Box>

                    {/* Time & Channel */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                        <Schedule fontSize="inherit" /> {formatDateTime(p.data_hora)}
                      </Typography>
                      <Chip label={p.origem} size="small" variant="outlined" sx={{ fontWeight: 600, height: 20 }} />
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Client & Address */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="body2" fontWeight={800}>
                        {p.cliente_nome || 'Cliente Balcão'}
                      </Typography>
                      {p.cliente_telefone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          <Phone fontSize="inherit" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {p.cliente_telefone}
                          </Typography>
                          {waUrl && (
                            <Tooltip title="Avisar cliente pelo WhatsApp">
                              <IconButton
                                size="small"
                                color="success"
                                component="a"
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ p: 0.2 }}
                              >
                                <WhatsApp fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      )}
                      {p.endereco_entrega && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mt: 0.5 }}>
                          <LocationOn fontSize="small" color="primary" sx={{ mt: 0.1 }} />
                          <Typography variant="caption" fontWeight={600} color="text.primary">
                            {p.endereco_entrega}
                          </Typography>
                        </Box>
                      )}
                      {p.regiao_entrega_nome && (
                        <Chip
                          label={`Região: ${p.regiao_entrega_nome} (+${formatCurrency(p.taxa_entrega)})`}
                          size="small"
                          color="default"
                          sx={{ mt: 0.8, fontSize: '0.7rem', fontWeight: 600 }}
                        />
                      )}
                    </Box>

                    {/* Motoboy */}
                    {p.motoboy_nome ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'action.hover', p: 1, borderRadius: 2, mb: 1.5 }}>
                        <TwoWheeler color="primary" fontSize="small" />
                        <Box>
                          <Typography variant="caption" fontWeight={700}>
                            Motoboy: {p.motoboy_nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Taxa devida: {formatCurrency(p.taxa_motoboy)}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ mb: 1.5 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          startIcon={<TwoWheeler />}
                          onClick={() => handleOpenMotoboyModal(p)}
                          sx={{ fontWeight: 700, fontSize: '0.75rem', width: '100%' }}
                        >
                          Vincular Motoboy
                        </Button>
                      </Box>
                    )}

                    {/* Items Summary */}
                    <Box sx={{ mb: 1.5, p: 1, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        ITENS ({p.itens?.length || 1}):
                      </Typography>
                      {p.itens && p.itens.length > 0 ? (
                        p.itens.map((it) => (
                          <Box key={it.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                            <Typography variant="caption" fontWeight={600}>
                              {it.quantidade}x {it.descricao}
                            </Typography>
                            <Typography variant="caption" fontWeight={700}>
                              {formatCurrency(it.subtotal)}
                            </Typography>
                          </Box>
                        ))
                      ) : (
                        <Typography variant="caption">{p.descricao_produto}</Typography>
                      )}
                    </Box>

                    {/* Total & Payment */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Pagamento: <strong>{p.forma_pagamento}</strong>
                        </Typography>
                        {p.taxa_entrega > 0 && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Taxa de Entrega: {formatCurrency(p.taxa_entrega)}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="h6" fontWeight={900} color="primary.main">
                        {formatCurrency(p.valor_total)}
                      </Typography>
                    </Box>
                  </CardContent>

                  {/* Action Buttons Footer */}
                  <Box sx={{ p: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {/* Status Advancement Buttons */}
                    {p.status_pedido === 'Recebido' && (
                      <Button
                        fullWidth
                        variant="contained"
                        color="secondary"
                        onClick={() => handleUpdateStatus(p.id, 'Em Preparo')}
                        startIcon={<Fastfood />}
                        sx={{ fontWeight: 800 }}
                      >
                        Iniciar Preparo ➔
                      </Button>
                    )}

                    {p.status_pedido === 'Em Preparo' && (
                      <Button
                        fullWidth
                        variant="contained"
                        color="info"
                        onClick={() => handleOpenMotoboyModal(p)}
                        startIcon={<TwoWheeler />}
                        sx={{ fontWeight: 800 }}
                      >
                        Despachar p/ Entrega ➔
                      </Button>
                    )}

                    {p.status_pedido === 'Saiu para Entrega' && (
                      <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        onClick={() => handleUpdateStatus(p.id, 'Entregue')}
                        startIcon={<CheckCircle />}
                        sx={{ fontWeight: 800 }}
                      >
                        Confirmar Entregue ✓
                      </Button>
                    )}

                    {/* Secondary Actions (Print & Cancel) */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="inherit"
                        size="small"
                        startIcon={<Print />}
                        onClick={() => handlePrintComanda(p.id)}
                        sx={{ fontWeight: 700 }}
                      >
                        Comanda
                      </Button>
                      {p.status_pedido !== 'Cancelado' && p.status_pedido !== 'Entregue' && (
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => setCancelVendaId(p.id)}
                          sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
                        >
                          <Cancel fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Modal Vincular / Despachar Motoboy */}
      <Dialog open={Boolean(motoboyModalVenda)} onClose={() => setMotoboyModalVenda(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Despachar com Motoboy</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selecione o entregador responsável pelo pedido <strong>{motoboyModalVenda?.numero_pedido}</strong>:
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel>Selecione o Motoboy</InputLabel>
            <Select
              value={selectedMotoboyId}
              label="Selecione o Motoboy"
              onChange={(e) => setSelectedMotoboyId(Number(e.target.value))}
            >
              {motoboys.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.nome} (Taxa: {formatCurrency(m.valor_por_entrega)})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setMotoboyModalVenda(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color="info"
            disabled={!selectedMotoboyId || submittingMotoboy}
            onClick={handleSaveMotoboy}
            sx={{ fontWeight: 800 }}
          >
            {submittingMotoboy ? <CircularProgress size={20} color="inherit" /> : 'Confirmar e Despachar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Visualização e Impressão de Comanda Térmica ESC/POS */}
      <Dialog open={Boolean(comandaModal)} onClose={() => setComandaModal(null)} maxWidth="xs" fullWidth>
        {comandaModal && (
          <>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Comanda de Impressão Térmica</span>
              <Chip label="ESC/POS 80mm" size="small" color="primary" />
            </DialogTitle>
            <DialogContent dividers>
              <Box
                sx={{
                  bgcolor: '#ffffff',
                  color: '#000000',
                  p: 2,
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  whiteSpace: 'pre-wrap',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'grey.300',
                  boxShadow: 1,
                }}
              >
                {comandaModal.comanda_texto}
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
              <Button onClick={() => setComandaModal(null)} color="inherit">
                Fechar
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Print />}
                onClick={executeThermalPrint}
                sx={{ fontWeight: 800 }}
              >
                Imprimir Comanda
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Cancel Confirm */}
      <ConfirmDialog
        open={Boolean(cancelVendaId)}
        title="Cancelar Pedido de Entrega"
        message="Tem certeza que deseja cancelar este pedido? O valor será estornado do caixa e dos relatórios."
        confirmText="Confirmar Cancelamento"
        confirmColor="error"
        onConfirm={handleCancelPedido}
        onCancel={() => setCancelVendaId(null)}
      />
    </Box>
  );
};
