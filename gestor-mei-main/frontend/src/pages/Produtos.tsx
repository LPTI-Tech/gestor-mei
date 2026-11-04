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
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  RadioGroup,
  Radio,
  FormLabel,
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Delete,
  RestaurantMenu,
  CheckCircle,
  Cancel,
  Build,
  ShoppingBag,
} from '@mui/icons-material';
import api from '../services/api';
import { Produto, TipoItem } from '../types';
import { formatCurrency } from '../services/exportUtils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIAS_SUGERIDAS = [
  // Alimentação & Comércio
  'Refeições',
  'Bebidas',
  'Porções',
  'Lanches',
  'Mercearia',
  // Serviços & Beleza
  'Corte & Cabelo',
  'Barba & Estética',
  'Manicure & Pedicure',
  // Reparos & Oficinas
  'Mão de Obra / Reparo',
  'Peças & Componentes',
  'Manutenção & Revisão',
  'Outros',
];

export const Produtos: React.FC = () => {
  const { isAdmin } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTipo, setSelectedTipo] = useState<string>('Todos');

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [formData, setFormData] = useState<{
    nome: string;
    tipo: TipoItem;
    categoria: string;
    preco_venda: number | string;
    custo_unitario: number | string;
    quantidade_estoque: number | string;
    estoque_minimo: number | string;
    ativo: boolean;
  }>({
    nome: '',
    tipo: 'PRODUTO',
    categoria: 'Refeições',
    preco_venda: '',
    custo_unitario: '',
    quantidade_estoque: '',
    estoque_minimo: '',
    ativo: true,
  });

  // Delete Confirm Dialog
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const res = await api.get<Produto[]>('/produtos');
      setProdutos(res.data);
      setError(null);
    } catch (err: any) {
      setError('Erro ao carregar catálogo de itens.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  const handleOpenModal = (prod?: Produto) => {
    if (prod) {
      setEditingProduto(prod);
      setFormData({
        nome: prod.nome,
        tipo: prod.tipo || 'PRODUTO',
        categoria: prod.categoria,
        preco_venda: prod.preco_venda,
        custo_unitario: prod.custo_unitario !== undefined ? prod.custo_unitario : '',
        quantidade_estoque: prod.quantidade_estoque !== undefined ? prod.quantidade_estoque : '',
        estoque_minimo: prod.estoque_minimo !== undefined ? prod.estoque_minimo : '',
        ativo: prod.ativo,
      });
    } else {
      setEditingProduto(null);
      setFormData({
        nome: '',
        tipo: 'PRODUTO',
        categoria: 'Refeições',
        preco_venda: '',
        custo_unitario: '',
        quantidade_estoque: '0',
        estoque_minimo: '5',
        ativo: true,
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingProduto(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        nome: formData.nome,
        tipo: formData.tipo,
        categoria: formData.categoria,
        preco_venda: Number(formData.preco_venda),
        custo_unitario: formData.custo_unitario !== '' ? Number(formData.custo_unitario) : 0,
        quantidade_estoque: formData.quantidade_estoque !== '' ? Number(formData.quantidade_estoque) : 0,
        estoque_minimo: formData.estoque_minimo !== '' ? Number(formData.estoque_minimo) : 0,
        ativo: formData.ativo,
      };

      if (editingProduto) {
        await api.put(`/produtos/${editingProduto.id}`, payload);
      } else {
        await api.post('/produtos', payload);
      }

      handleCloseModal();
      fetchProdutos();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar item.');
    }
  };

  const handleToggleAtivo = async (prod: Produto) => {
    try {
      await api.put(`/produtos/${prod.id}`, { ativo: !prod.ativo });
      setProdutos((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, ativo: !p.ativo } : p))
      );
    } catch (err) {
      alert('Erro ao alterar status do item.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/produtos/${deleteId}`);
      setDeleteId(null);
      fetchProdutos();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao excluir item.');
    }
  };

  // Filtered List
  const filteredProdutos = produtos.filter((p) => {
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = selectedTipo === 'Todos' || p.tipo === selectedTipo;
    return matchesSearch && matchesTipo;
  });

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
          <Typography variant="h5" fontWeight={800}>
            Catálogo: Produtos & Serviços
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Itens, refeições ou serviços prestados comercializados no seu MEI
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={() => handleOpenModal()}
          sx={{ fontWeight: 700, height: 44 }}
        >
          Novo Produto / Serviço
        </Button>
      </Box>

      {/* Filter Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Type Filter Chips */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label="Todos os Itens"
                  clickable
                  color={selectedTipo === 'Todos' ? 'primary' : 'default'}
                  onClick={() => setSelectedTipo('Todos')}
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  icon={<ShoppingBag fontSize="small" />}
                  label="Apenas Produtos"
                  clickable
                  color={selectedTipo === 'PRODUTO' ? 'primary' : 'default'}
                  onClick={() => setSelectedTipo('PRODUTO')}
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  icon={<Build fontSize="small" />}
                  label="Apenas Serviços"
                  clickable
                  color={selectedTipo === 'SERVICO' ? 'primary' : 'default'}
                  onClick={() => setSelectedTipo('SERVICO')}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filteredProdutos.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <RestaurantMenu sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" fontWeight={600}>
            Nenhum item cadastrado
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cadastre os produtos vendidos ou serviços prestados para lançar vendas rápidas.
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenModal()}>
            Cadastrar Primeiro Item
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tipo Fiscal (DASN)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Categoria</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Preço de Venda</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Estoque</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProdutos.map((prod) => (
                <TableRow key={prod.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {prod.nome}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={prod.tipo === 'SERVICO' ? <Build fontSize="small" /> : <ShoppingBag fontSize="small" />}
                      label={prod.tipo === 'SERVICO' ? 'Serviço (ISS)' : 'Produto (Comércio)'}
                      size="small"
                      color={prod.tipo === 'SERVICO' ? 'secondary' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={prod.categoria} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="primary">
                      {formatCurrency(prod.preco_venda)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {prod.tipo === 'PRODUTO' ? (
                      <Chip
                        label={`${(prod.quantidade_estoque || 0).toFixed(0)} un`}
                        size="small"
                        color={prod.estoque_baixo ? 'error' : 'success'}
                        variant={prod.estoque_baixo ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 700 }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={prod.ativo ? <CheckCircle fontSize="small" /> : <Cancel fontSize="small" />}
                      label={prod.ativo ? 'Ativo' : 'Inativo'}
                      size="small"
                      color={prod.ativo ? 'success' : 'default'}
                      clickable
                      onClick={() => handleToggleAtivo(prod)}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary" onClick={() => handleOpenModal(prod)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    {isAdmin && (
                      <IconButton size="small" color="error" onClick={() => setDeleteId(prod.id)}>
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

      {/* Add / Edit Dialog */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle fontWeight={700}>
            {editingProduto ? 'Editar Item' : 'Novo Item no Catálogo'}
          </DialogTitle>
          <DialogContent>
            {/* Tipo: Produto ou Serviço */}
            <FormControl component="fieldset" margin="normal">
              <FormLabel component="legend" sx={{ fontSize: '0.85rem', fontWeight: 700 }}>
                Tipo do Item (Classificação DASN-SIMEI):
              </FormLabel>
              <RadioGroup
                row
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoItem })}
              >
                <FormControlLabel value="PRODUTO" control={<Radio size="small" />} label="Produto / Mercadoria" />
                <FormControlLabel value="SERVICO" control={<Radio size="small" />} label="Serviço / Mão de Obra" />
              </RadioGroup>
            </FormControl>

            <TextField
              fullWidth
              label="Nome do Item / Serviço"
              margin="normal"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder={formData.tipo === 'SERVICO' ? 'Ex: Corte Degradê ou Troca de Óleo' : 'Ex: Marmita M Feijoada'}
              autoFocus
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Categoria</InputLabel>
              <Select
                value={formData.categoria}
                label="Categoria"
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              >
                {CATEGORIAS_SUGERIDAS.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Preço de Venda / Cobrado (R$)"
              type="number"
              inputProps={{ step: '0.01', min: '0', style: { fontWeight: 700 } }}
              margin="normal"
              required
              value={formData.preco_venda}
              onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })}
              placeholder="0,00"
            />

            {formData.tipo === 'PRODUTO' && (
              <Box sx={{ mt: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 1 }}>
                  📦 Controle de Estoque & Custos (Sprint 4):
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Custo Unit. (R$)"
                      type="number"
                      inputProps={{ step: '0.01', min: '0' }}
                      value={formData.custo_unitario}
                      onChange={(e) => setFormData({ ...formData, custo_unitario: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Estoque Inicial"
                      type="number"
                      inputProps={{ step: 'any', min: '0' }}
                      value={formData.quantidade_estoque}
                      onChange={(e) => setFormData({ ...formData, quantidade_estoque: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Estoque Mínimo"
                      type="number"
                      inputProps={{ step: 'any', min: '0' }}
                      value={formData.estoque_minimo}
                      onChange={(e) => setFormData({ ...formData, estoque_minimo: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  color="primary"
                />
              }
              label={formData.ativo ? 'Disponível para venda' : 'Inativo'}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseModal} color="inherit">
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Salvar Item
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Excluir Item"
        message="Tem certeza que deseja remover este item do catálogo?"
        confirmText="Excluir"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
};
