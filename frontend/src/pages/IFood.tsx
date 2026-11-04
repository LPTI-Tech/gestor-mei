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
} from '@mui/material';
import { DeliveryDining, Add, Delete, Assessment } from '@mui/icons-material';
import api from '../services/api';
import { IFoodSummary, LancamentoIFood } from '../types';
import { formatCurrency, formatDate } from '../services/exportUtils';
import { StatCard } from '../components/StatCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';

export const IFood: React.FC = () => {
  const { isAdmin } = useAuth();
  const [summary, setSummary] = useState<IFoodSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    numero_pedido: '',
    valor_bruto: '',
    taxa_ifood: '',
    observacoes: '',
  });

  // Delete
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchIFood = async () => {
    try {
      setLoading(true);
      const res = await api.get<IFoodSummary>('/ifood');
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIFood();
  }, []);

  const handleBrutoChange = (brutoVal: string) => {
    const b = Number(brutoVal) || 0;
    // Default estimated ifood fee ~ 12% - 14%
    const estTaxa = (b * 0.13).toFixed(2);
    setFormData((prev) => ({
      ...prev,
      valor_bruto: brutoVal,
      taxa_ifood: estTaxa,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bruto = Number(formData.valor_bruto) || 0;
    const taxa = Number(formData.taxa_ifood) || 0;
    const liquido = Math.max(0, bruto - taxa);

    try {
      await api.post('/ifood', {
        data: formData.data,
        numero_pedido: formData.numero_pedido,
        valor_bruto: bruto,
        taxa_ifood: taxa,
        valor_liquido: liquido,
        observacoes: formData.observacoes,
      });
      setModalOpen(false);
      setFormData({
        data: new Date().toISOString().split('T')[0],
        numero_pedido: '',
        valor_bruto: '',
        taxa_ifood: '',
        observacoes: '',
      });
      fetchIFood();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao registrar pedido iFood.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/ifood/${deleteId}`);
      setDeleteId(null);
      fetchIFood();
    } catch (err) {
      alert('Erro ao excluir registro iFood.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const brutoNum = Number(formData.valor_bruto) || 0;
  const taxaNum = Number(formData.taxa_ifood) || 0;
  const liquidoEstimado = Math.max(0, brutoNum - taxaNum);

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
            <DeliveryDining sx={{ color: '#EA1D2C' }} /> Controle iFood (Vendas & Taxas)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Lançamento manual para conferir o valor bruto vendido, comissões retidas e valor líquido a receber.
          </Typography>
        </Box>

        <Button
          variant="contained"
          sx={{ bgcolor: '#EA1D2C', '&:hover': { bgcolor: '#C41320' }, fontWeight: 700, height: 44 }}
          startIcon={<Add />}
          onClick={() => setModalOpen(true)}
        >
          Lançar Pedido iFood
        </Button>
      </Box>

      {/* Summary KPI Cards */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Vendido Bruto"
              value={formatCurrency(summary.total_bruto)}
              subtitle={`${summary.total_pedidos} pedidos iFood`}
              icon={<DeliveryDining />}
              color="#EA1D2C"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Taxas / Comissões Retidas"
              value={formatCurrency(summary.total_taxas)}
              subtitle={`Taxa média efetiva: ${summary.percentual_medio_taxa}%`}
              icon={<Assessment />}
              color="#D32F2F"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Valor Líquido a Receber"
              value={formatCurrency(summary.total_liquido)}
              subtitle="Dinheiro que cai na sua conta"
              icon={<DeliveryDining />}
              color="#2E7D32"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Comissão Média"
              value={`${summary.percentual_medio_taxa}%`}
              subtitle="Impacto no seu preço final"
              icon={<Assessment />}
              color="#ED6C02"
            />
          </Grid>
        </Grid>
      )}

      {/* Table of iFood Orders */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
            Histórico de Pedidos iFood Lançados
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            Conferência simples e direta sem complicação de integrações
          </Typography>

          {!summary || summary.lancamentos.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Nenhum pedido do iFood cadastrado. Clique no botão acima para lançar!
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: 'background.default' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Nº Pedido</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Valor Bruto</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Taxa Retida</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Valor Líquido</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Observações</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.lancamentos.map((l) => (
                    <TableRow key={l.id} hover>
                      <TableCell>{formatDate(l.data)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{l.numero_pedido}</TableCell>
                      <TableCell>{formatCurrency(l.valor_bruto)}</TableCell>
                      <TableCell sx={{ color: 'error.main', fontWeight: 600 }}>
                        -{formatCurrency(l.taxa_ifood)}
                      </TableCell>
                      <TableCell sx={{ color: 'success.main', fontWeight: 800 }}>
                        {formatCurrency(l.valor_liquido)}
                      </TableCell>
                      <TableCell>{l.observacoes || '-'}</TableCell>
                      <TableCell align="right">
                        {isAdmin && (
                          <IconButton size="small" color="error" onClick={() => setDeleteId(l.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* DIALOG: NOVO LANÇAMENTO IFOOD */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle fontWeight={700}>Lançamento de Pedido iFood</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Data do Pedido"
              type="date"
              required
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
            />

            <TextField
              fullWidth
              label="Número do Pedido (Ex: #8841)"
              required
              margin="normal"
              value={formData.numero_pedido}
              onChange={(e) => setFormData({ ...formData, numero_pedido: e.target.value })}
              placeholder="#1234"
              autoFocus
            />

            <TextField
              fullWidth
              label="Valor Bruto do Pedido (R$)"
              type="number"
              inputProps={{ step: '0.01', min: '0.01', style: { fontWeight: 700 } }}
              required
              margin="normal"
              value={formData.valor_bruto}
              onChange={(e) => handleBrutoChange(e.target.value)}
              placeholder="0,00"
            />

            <TextField
              fullWidth
              label="Taxa / Comissão do iFood (R$)"
              type="number"
              inputProps={{ step: '0.01', min: '0', style: { fontWeight: 700, color: '#D32F2F' } }}
              required
              margin="normal"
              value={formData.taxa_ifood}
              onChange={(e) => setFormData({ ...formData, taxa_ifood: e.target.value })}
              placeholder="0,00"
            />

            <Paper sx={{ p: 1.5, my: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">
                LÍQUIDO ESTIMADO NA SUA CONTA:
              </Typography>
              <Typography variant="h6" fontWeight={800} color="success.main">
                {formatCurrency(liquidoEstimado)}
              </Typography>
            </Paper>

            <TextField
              fullWidth
              label="Observações / Pratos (Opcional)"
              margin="normal"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Ex: 2 Marmitas Feijoada"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setModalOpen(false)} color="inherit">
              Cancelar
            </Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#EA1D2C', '&:hover': { bgcolor: '#C41320' } }}>
              Salvar Pedido iFood
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Excluir Lançamento iFood"
        message="Tem certeza que deseja excluir este pedido do iFood?"
        confirmText="Excluir"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
};
