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
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import {
  AddLocation,
  Edit,
  Delete,
  Search,
  LocalShipping,
  AccessTime,
  AttachMoney,
  Map,
} from '@mui/icons-material';
import api from '../services/api';
import { RegiaoEntrega, RegiaoEntregaCreate } from '../types';
import { formatCurrency } from '../services/exportUtils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatCard } from '../components/StatCard';

export const RegioesEntrega: React.FC = () => {
  const [regioes, setRegioes] = useState<RegiaoEntrega[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [apenasAtivas, setApenasAtivas] = useState<boolean>(true);

  // Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingRegiao, setEditingRegiao] = useState<RegiaoEntrega | null>(null);
  const [formData, setFormData] = useState<{
    nome: string;
    taxa_entrega: string;
    tempo_estimado_minutos: string;
    ativo: boolean;
  }>({
    nome: '',
    taxa_entrega: '',
    tempo_estimado_minutos: '30',
    ativo: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Delete Confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchRegioes = async () => {
    try {
      setLoading(true);
      const res = await api.get<RegiaoEntrega[]>('/regioes-entrega', {
        params: {
          q: search || undefined,
          apenas_ativas: apenasAtivas,
        },
      });
      setRegioes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRegioes();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, apenasAtivas]);

  const handleOpenModal = (r?: RegiaoEntrega) => {
    if (r) {
      setEditingRegiao(r);
      setFormData({
        nome: r.nome,
        taxa_entrega: r.taxa_entrega.toString(),
        tempo_estimado_minutos: (r.tempo_estimado_minutos || 30).toString(),
        ativo: r.ativo,
      });
    } else {
      setEditingRegiao(null);
      setFormData({
        nome: '',
        taxa_entrega: '5.00',
        tempo_estimado_minutos: '30',
        ativo: true,
      });
    }
    setFormError(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingRegiao(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      setFormError('O nome da região/bairro é obrigatório.');
      return;
    }

    const taxa = Number(formData.taxa_entrega.replace(',', '.')) || 0;
    const tempo = Number(formData.tempo_estimado_minutos) || 30;

    try {
      setSubmitting(true);
      setFormError(null);

      const payload: RegiaoEntregaCreate = {
        nome: formData.nome.trim(),
        taxa_entrega: taxa,
        tempo_estimado_minutos: tempo,
        ativo: formData.ativo,
      };

      if (editingRegiao) {
        await api.put(`/regioes-entrega/${editingRegiao.id}`, payload);
      } else {
        await api.post('/regioes-entrega', payload);
      }

      handleCloseModal();
      fetchRegioes();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Erro ao salvar região de entrega.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/regioes-entrega/${deleteId}`);
      setDeleteId(null);
      fetchRegioes();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao excluir/desativar região.');
    }
  };

  const taxaMedia =
    regioes.length > 0 ? regioes.reduce((acc, r) => acc + r.taxa_entrega, 0) / regioes.length : 0;
  const totalPedidosAtendidos = regioes.reduce((acc, r) => acc + (r.total_pedidos || 0), 0);

  return (
    <Box>
      {/* Header */}
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
            <Map color="primary" /> Regiões & Taxas de Entrega
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure os bairros e zonas atendidos pelo seu delivery e suas respectivas taxas de entrega.
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddLocation />}
          onClick={() => handleOpenModal()}
          sx={{ fontWeight: 700, height: 44, px: 3, borderRadius: 2 }}
        >
          Nova Região
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Total de Regiões"
            value={regioes.length.toString()}
            subtitle="Bairros e rotas cadastradas"
            icon={<Map />}
            color="#1976D2"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Taxa de Entrega Média"
            value={formatCurrency(taxaMedia)}
            subtitle="Média ponderada por rota"
            icon={<AttachMoney />}
            color="#2E7D32"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Total de Pedidos Entregues"
            value={totalPedidosAtendidos.toString()}
            subtitle="Entregas realizadas nestas rotas"
            icon={<LocalShipping />}
            color="#E65100"
          />
        </Grid>
      </Grid>

      {/* Search Toolbar */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar por nome do bairro ou região..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4} sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
              <Button
                variant={apenasAtivas ? 'contained' : 'outlined'}
                size="small"
                color="primary"
                onClick={() => setApenasAtivas(true)}
              >
                Apenas Ativas
              </Button>
              <Button
                variant={!apenasAtivas ? 'contained' : 'outlined'}
                size="small"
                color="inherit"
                onClick={() => setApenasAtivas(false)}
              >
                Todas
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : regioes.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            Nenhuma região de entrega encontrada.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cadastre os bairros da sua cidade para calcular automaticamente a taxa no pedido.
          </Typography>
          <Button variant="contained" startIcon={<AddLocation />} onClick={() => handleOpenModal()}>
            Cadastrar Região
          </Button>
        </Card>
      ) : (
        <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Nome da Região / Bairro</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Taxa de Entrega</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tempo Estimado</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Pedidos Entregues</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {regioes.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {r.nome}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" fontWeight={800} color="primary.main">
                      {formatCurrency(r.taxa_entrega)}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTime fontSize="small" color="action" />
                      <Typography variant="body2">{r.tempo_estimado_minutos || 30} min</Typography>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={`${r.total_pedidos || 0} pedido(s)`}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={r.ativo ? 'Ativa' : 'Inativa'}
                      color={r.ativo ? 'success' : 'default'}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>

                  <TableCell align="right">
                    <Tooltip title="Editar Região">
                      <IconButton size="small" onClick={() => handleOpenModal(r)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir ou Desativar">
                      <IconButton size="small" color="error" onClick={() => setDeleteId(r.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal Criar / Editar Região */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="xs" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {editingRegiao ? 'Editar Região de Entrega' : 'Nova Região de Entrega'}
          </DialogTitle>
          <DialogContent dividers>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Nome do Bairro / Região *"
                fullWidth
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Centro, Jardim América, Vila Mariana"
              />

              <TextField
                label="Taxa de Entrega (R$) *"
                fullWidth
                required
                value={formData.taxa_entrega}
                onChange={(e) => setFormData({ ...formData, taxa_entrega: e.target.value })}
                placeholder="Ex: 6.00"
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
              />

              <TextField
                label="Tempo Estimado de Entrega (minutos)"
                type="number"
                fullWidth
                value={formData.tempo_estimado_minutos}
                onChange={(e) => setFormData({ ...formData, tempo_estimado_minutos: e.target.value })}
                placeholder="Ex: 35"
                InputProps={{
                  endAdornment: <InputAdornment position="end">min</InputAdornment>,
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseModal} color="inherit">
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
              sx={{ fontWeight: 700 }}
            >
              {submitting ? <CircularProgress size={20} color="inherit" /> : 'Salvar Região'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Excluir / Desativar Região"
        message="Deseja remover esta região de entrega? Se já existirem pedidos ou clientes vinculados, ela será inativada para manter os relatórios íntegros."
        confirmText="Confirmar"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
};
