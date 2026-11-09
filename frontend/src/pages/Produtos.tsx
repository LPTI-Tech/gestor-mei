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
  Tooltip,
  Divider,
  Avatar,
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
  Inventory2,
  Category,
  Close,
  TrendingUp,
  WarningAmber,
  SellOutlined,
  WarehouseOutlined,
  LocalOfferOutlined,
  PhotoCamera,
} from '@mui/icons-material';
import { PackageSearch, Plus, Trash2, Edit3, Search as SearchLucide } from 'lucide-react';
import api, { resolveImageUrl } from '../services/api';
import { Produto, TipoItem } from '../types';
import { formatCurrency } from '../services/exportUtils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatCard } from '../components/StatCard';
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
  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todas');

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

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = async () => {
    if (editingProduto && editingProduto.imagem_url) {
      try {
        await api.delete(`/produtos/${editingProduto.id}/imagem`);
        setEditingProduto({ ...editingProduto, imagem_url: undefined, imagem_nome: undefined });
      } catch (err) {
        console.error('Erro ao excluir foto:', err);
      }
    }
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
  };

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
      setImagePreviewUrl(prod.imagem_url || null);
      setSelectedImageFile(null);
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
      setImagePreviewUrl(null);
      setSelectedImageFile(null);
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
      setImagePreviewUrl(null);
      setSelectedImageFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
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

      let savedProdId = editingProduto ? editingProduto.id : null;
      if (editingProduto) {
        await api.put(`/produtos/${editingProduto.id}`, payload);
      } else {
        const createRes = await api.post<Produto>('/produtos', payload);
        savedProdId = createRes.data.id;
      }

      if (savedProdId && selectedImageFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', selectedImageFile);
        await api.post(`/produtos/${savedProdId}/imagem`, formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      handleCloseModal();
      fetchProdutos();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar item.');
    } finally {
      setSubmitting(false);
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

  // KPIs
  const totalProdutos = produtos.filter((p) => p.tipo === 'PRODUTO');
  const totalServicos = produtos.filter((p) => p.tipo === 'SERVICO');
  const totalEstoqueBaixo = totalProdutos.filter((p) => p.estoque_baixo).length;
  const totalCategorias = new Set(produtos.map((p) => p.categoria)).size;

  // Filtered List
  const filteredProdutos = produtos.filter((p) => {
    const matchesSearch =
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = selectedTipo === 'Todos' || p.tipo === selectedTipo;
    const matchesCategoria = selectedCategoria === 'Todas' || p.categoria === selectedCategoria;
    return matchesSearch && matchesTipo && matchesCategoria;
  });

  // Calculate live margin in modal
  const precoNum = Number(formData.preco_venda) || 0;
  const custoNum = Number(formData.custo_unitario) || 0;
  const lucroEstimado = precoNum - custoNum;
  const margemEstimada = precoNum > 0 ? (lucroEstimado / precoNum) * 100 : 0;

  return (
    <Box>
      {/* Page Header (Shopify Admin Standard) */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3.5,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                bgcolor: 'rgba(25, 118, 210, 0.1)',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Inventory2 sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.025em' }}>
              Produtos & Serviços
            </Typography>
            <Chip
              label="DASN-SIMEI"
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: '0.72rem',
                bgcolor: 'rgba(25, 118, 210, 0.08)',
                color: 'primary.main',
                border: '1px solid rgba(25, 118, 210, 0.2)',
                height: 22,
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Catálogo unificado de itens comercializados, classificação tributária, controle de estoque e margens.
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={() => handleOpenModal()}
          sx={{
            fontWeight: 700,
            height: 42,
            px: 2.5,
            borderRadius: 2,
            boxShadow: '0 4px 14px rgba(25, 118, 210, 0.28)',
            textTransform: 'none',
            fontSize: '0.9rem',
          }}
        >
          Novo Produto / Serviço
        </Button>
      </Box>

      {/* KPI Cards (Stripe / Executive Standard) */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total no Catálogo"
            value={produtos.length.toString()}
            subtitle={`${produtos.filter((p) => p.ativo).length} ativos para venda`}
            icon={<Inventory2 />}
            color="#1976D2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Produtos & Mercadorias"
            value={totalProdutos.length.toString()}
            subtitle={
              totalEstoqueBaixo > 0
                ? `${totalEstoqueBaixo} item(ns) com estoque baixo`
                : 'Estoque regularizado'
            }
            icon={<ShoppingBag />}
            color="#2E7D32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Serviços Prestados"
            value={totalServicos.length.toString()}
            subtitle="Mão de obra / ISS"
            icon={<Build />}
            color="#7B1FA2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Categorias Ativas"
            value={totalCategorias.toString()}
            subtitle="Segmentos operacionais"
            icon={<Category />}
            color="#ED6C02"
          />
        </Grid>
      </Grid>

      {/* Toolbar & Filters (Asaas Standard) */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF'),
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar por nome ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 2,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC'),
                  '& fieldset': { borderColor: 'divider' },
                },
              }}
            />
          </Grid>

          {/* Segmented Type Filter (Asaas Standard) */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                display: 'inline-flex',
                p: 0.5,
                borderRadius: 2,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#F1F5F9'),
                border: '1px solid',
                borderColor: 'divider',
                width: '100%',
                justifyContent: 'space-between',
              }}
            >
              <Button
                size="small"
                onClick={() => setSelectedTipo('Todos')}
                sx={{
                  flex: 1,
                  px: 1.5,
                  py: 0.6,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  borderRadius: 1.5,
                  textTransform: 'none',
                  bgcolor: selectedTipo === 'Todos'
                    ? (theme) => (theme.palette.mode === 'dark' ? 'primary.main' : '#FFFFFF')
                    : 'transparent',
                  color: selectedTipo === 'Todos'
                    ? (theme) => (theme.palette.mode === 'dark' ? '#fff' : 'primary.main')
                    : 'text.secondary',
                  boxShadow: selectedTipo === 'Todos' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Todos ({produtos.length})
              </Button>
              <Button
                size="small"
                onClick={() => setSelectedTipo('PRODUTO')}
                sx={{
                  flex: 1,
                  px: 1.5,
                  py: 0.6,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  borderRadius: 1.5,
                  textTransform: 'none',
                  bgcolor: selectedTipo === 'PRODUTO'
                    ? (theme) => (theme.palette.mode === 'dark' ? 'primary.main' : '#FFFFFF')
                    : 'transparent',
                  color: selectedTipo === 'PRODUTO'
                    ? (theme) => (theme.palette.mode === 'dark' ? '#fff' : 'primary.main')
                    : 'text.secondary',
                  boxShadow: selectedTipo === 'PRODUTO' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Produtos ({totalProdutos.length})
              </Button>
              <Button
                size="small"
                onClick={() => setSelectedTipo('SERVICO')}
                sx={{
                  flex: 1,
                  px: 1.5,
                  py: 0.6,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  borderRadius: 1.5,
                  textTransform: 'none',
                  bgcolor: selectedTipo === 'SERVICO'
                    ? (theme) => (theme.palette.mode === 'dark' ? 'primary.main' : '#FFFFFF')
                    : 'transparent',
                  color: selectedTipo === 'SERVICO'
                    ? (theme) => (theme.palette.mode === 'dark' ? '#fff' : 'primary.main')
                    : 'text.secondary',
                  boxShadow: selectedTipo === 'SERVICO' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Serviços ({totalServicos.length})
              </Button>
            </Box>
          </Grid>

          {/* Category Dropdown Filter */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: '0.85rem' }}>Filtrar Categoria</InputLabel>
              <Select
                value={selectedCategoria}
                label="Filtrar Categoria"
                onChange={(e) => setSelectedCategoria(e.target.value)}
                sx={{
                  borderRadius: 2,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC'),
                  fontSize: '0.85rem',
                }}
              >
                <MenuItem value="Todas">Todas as Categorias</MenuItem>
                {Array.from(new Set(produtos.map((p) => p.categoria))).map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Table / Empty State */}
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={36} thickness={4} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Carregando catálogo de produtos e serviços...
          </Typography>
        </Box>
      ) : filteredProdutos.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px dashed',
            borderColor: 'divider',
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.01)' : '#FBFCFE'),
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: 'rgba(25, 118, 210, 0.08)',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <PackageSearch size={32} strokeWidth={1.75} />
          </Box>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            {searchTerm || selectedCategoria !== 'Todas' || selectedTipo !== 'Todos'
              ? 'Nenhum item encontrado nos filtros'
              : 'Nenhum item cadastrado no catálogo'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 460, mx: 'auto' }}>
            {searchTerm || selectedCategoria !== 'Todas' || selectedTipo !== 'Todos'
              ? 'Tente ajustar os filtros de busca ou categoria para localizar o produto ou serviço desejado.'
              : 'Cadastre os produtos vendidos ou serviços prestados para lançar vendas rápidas no PDV, balcão e delivery.'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => handleOpenModal()}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 3, height: 40 }}
          >
            Cadastrar Primeiro Item
          </Button>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
          }}
        >
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC'),
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'text.secondary',
                    py: 1.8,
                  }}
                >
                  Item / Mercadoria
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'text.secondary',
                    py: 1.8,
                  }}
                >
                  Classificação Fiscal
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'text.secondary',
                    py: 1.8,
                  }}
                >
                  Categoria
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'text.secondary',
                    py: 1.8,
                  }}
                >
                  Preço de Venda
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'text.secondary',
                    py: 1.8,
                  }}
                >
                  Estoque Atual
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'text.secondary',
                    py: 1.8,
                  }}
                >
                  Status
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'text.secondary',
                    py: 1.8,
                  }}
                >
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProdutos.map((prod) => {
                const isServico = prod.tipo === 'SERVICO';
                const hasCusto = prod.custo_unitario !== undefined && prod.custo_unitario > 0;
                const margem =
                  hasCusto && prod.preco_venda > 0
                    ? (((prod.preco_venda - (prod.custo_unitario || 0)) / prod.preco_venda) * 100).toFixed(0)
                    : null;

                return (
                  <TableRow
                    key={prod.id}
                    hover
                    sx={{
                      '&:hover': {
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#FBFDFF',
                      },
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Item / Mercadoria */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          src={resolveImageUrl(prod.imagem_url)}
                          variant="rounded"
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: isServico
                              ? 'rgba(123, 31, 162, 0.1)'
                              : 'rgba(25, 118, 210, 0.1)',
                            color: isServico ? '#7B1FA2' : 'primary.main',
                          }}
                        >
                          {isServico ? <Build sx={{ fontSize: 20 }} /> : <ShoppingBag sx={{ fontSize: 20 }} />}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>
                            {prod.nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Ref #{prod.id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Classificação Fiscal */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        icon={
                          isServico ? (
                            <Build sx={{ '&&': { fontSize: 13, color: '#7B1FA2' } }} />
                          ) : (
                            <ShoppingBag sx={{ '&&': { fontSize: 13, color: '#1976D2' } }} />
                          )
                        }
                        label={isServico ? 'Serviço (ISS)' : 'Produto (Comércio)'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          bgcolor: isServico ? 'rgba(123, 31, 162, 0.08)' : 'rgba(25, 118, 210, 0.08)',
                          color: isServico ? '#7B1FA2' : '#1976D2',
                          border: '1px solid',
                          borderColor: isServico ? 'rgba(123, 31, 162, 0.2)' : 'rgba(25, 118, 210, 0.2)',
                          height: 24,
                        }}
                      />
                    </TableCell>

                    {/* Categoria */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        label={prod.categoria}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                          color: 'text.primary',
                          border: '1px solid',
                          borderColor: 'divider',
                          height: 24,
                        }}
                      />
                    </TableCell>

                    {/* Preço de Venda */}
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ fontFeatureSettings: '"tnum"', color: '#1B5E20' }}
                      >
                        {formatCurrency(prod.preco_venda)}
                      </Typography>
                      {hasCusto && margem && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontFeatureSettings: '"tnum"',
                            color: 'text.secondary',
                            display: 'block',
                            fontSize: '0.7rem',
                          }}
                        >
                          Custo {formatCurrency(prod.custo_unitario || 0)} • Margem {margem}%
                        </Typography>
                      )}
                    </TableCell>

                    {/* Estoque */}
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      {!isServico ? (
                        <Chip
                          icon={
                            prod.estoque_baixo ? (
                              <WarningAmber sx={{ '&&': { fontSize: 13, color: '#D32F2F' } }} />
                            ) : undefined
                          }
                          label={`${(prod.quantidade_estoque || 0).toFixed(0)} un`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            fontFeatureSettings: '"tnum"',
                            bgcolor: prod.estoque_baixo
                              ? 'rgba(211, 47, 47, 0.08)'
                              : 'rgba(46, 125, 50, 0.08)',
                            color: prod.estoque_baixo ? '#D32F2F' : '#2E7D32',
                            border: '1px solid',
                            borderColor: prod.estoque_baixo
                              ? 'rgba(211, 47, 47, 0.22)'
                              : 'rgba(46, 125, 50, 0.22)',
                            height: 24,
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Ilimitado
                        </Typography>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Tooltip title="Clique para alternar status do item">
                        <Chip
                          icon={
                            prod.ativo ? (
                              <CheckCircle sx={{ '&&': { fontSize: 14, color: '#2E7D32' } }} />
                            ) : (
                              <Cancel sx={{ '&&': { fontSize: 14, color: '#64748B' } }} />
                            )
                          }
                          label={prod.ativo ? 'Disponível' : 'Inativo'}
                          size="small"
                          clickable
                          onClick={() => handleToggleAtivo(prod)}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            bgcolor: prod.ativo ? 'rgba(46, 125, 50, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                            color: prod.ativo ? '#2E7D32' : '#64748B',
                            border: '1px solid',
                            borderColor: prod.ativo
                              ? 'rgba(46, 125, 50, 0.22)'
                              : 'rgba(100, 116, 139, 0.22)',
                            height: 24,
                          }}
                        />
                      </Tooltip>
                    </TableCell>

                    {/* Ações */}
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="Editar Item">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenModal(prod)}
                            sx={{
                              p: 0.8,
                              color: 'text.secondary',
                              '&:hover': { color: 'primary.main', bgcolor: 'rgba(25, 118, 210, 0.08)' },
                            }}
                          >
                            <Edit sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        {isAdmin && (
                          <Tooltip title="Excluir Item">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteId(prod.id)}
                              sx={{
                                p: 0.8,
                                '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.08)' },
                              }}
                            >
                              <Delete sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal Add / Edit (Organizado em Seções Executivas) */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            boxShadow: '0 24px 60px rgba(7, 25, 51, 0.22)',
            maxHeight: { xs: 'calc(100dvh - 32px)', sm: 'calc(100dvh - 64px)' },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2.5,
              pb: 2,
              flexShrink: 0,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  bgcolor: 'rgba(25, 118, 210, 0.1)',
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Inventory2 sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                  {editingProduto ? 'Editar Item do Catálogo' : 'Novo Item no Catálogo'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {editingProduto
                    ? 'Atualize preços, estoque e dados cadastrais'
                    : 'Cadastre um novo produto ou serviço comercializado'}
                </Typography>
              </Box>
            </Box>
            <IconButton size="small" onClick={handleCloseModal} sx={{ color: 'text.secondary' }}>
              <Close sx={{ fontSize: 20 }} />
            </IconButton>
          </DialogTitle>

          <DialogContent
            dividers
            sx={{
              p: 3,
              flex: '1 1 auto',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
            }}
          >
            {/* SEÇÃO 1: Classificação Fiscal DASN-SIMEI */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle2" fontWeight={800} color="text.primary" sx={{ mb: 1 }}>
                Classificação Tributária (DASN-SIMEI)
              </Typography>
              <RadioGroup
                row
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoItem })}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                }}
              >
                <Box
                  onClick={() => setFormData({ ...formData, tipo: 'PRODUTO' })}
                  sx={{
                    flex: 1,
                    p: 1.5,
                    borderRadius: 2,
                    border: '1.5px solid',
                    borderColor: formData.tipo === 'PRODUTO' ? 'primary.main' : 'divider',
                    bgcolor: formData.tipo === 'PRODUTO' ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Radio checked={formData.tipo === 'PRODUTO'} size="small" sx={{ p: 0 }} />
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      Produto / Mercadoria
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Comércio (ICMS / DASN)
                    </Typography>
                  </Box>
                </Box>

                <Box
                  onClick={() => setFormData({ ...formData, tipo: 'SERVICO' })}
                  sx={{
                    flex: 1,
                    p: 1.5,
                    borderRadius: 2,
                    border: '1.5px solid',
                    borderColor: formData.tipo === 'SERVICO' ? 'primary.main' : 'divider',
                    bgcolor: formData.tipo === 'SERVICO' ? 'rgba(123, 31, 162, 0.04)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Radio checked={formData.tipo === 'SERVICO'} size="small" sx={{ p: 0 }} />
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      Serviço Prestado
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Mão de Obra (ISS)
                    </Typography>
                  </Box>
                </Box>
              </RadioGroup>
            </Box>

            <Divider sx={{ my: 2.5 }} />

                        {/* SEÇÃO FOTO: Foto Principal com Otimização WebP e R2 */}
            <Box sx={{ mb: 2.5, p: 2, borderRadius: 2.5, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC', border: '1px dashed', borderColor: 'divider' }}>
              <Typography variant="caption" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', color: 'text.secondary', display: 'block', mb: 1.5 }}>
                Foto Principal do Item (Cloudflare R2 • WebP)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={resolveImageUrl(imagePreviewUrl)}
                  variant="rounded"
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: formData.tipo === 'SERVICO' ? 'rgba(123, 31, 162, 0.08)' : 'rgba(25, 118, 210, 0.08)',
                    color: formData.tipo === 'SERVICO' ? '#7B1FA2' : 'primary.main',
                  }}
                >
                  {formData.tipo === 'SERVICO' ? <Build sx={{ fontSize: 32 }} /> : <ShoppingBag sx={{ fontSize: 32 }} />}
                </Avatar>

                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.75 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      component="label"
                      startIcon={<PhotoCamera sx={{ fontSize: 16 }} />}
                      sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, fontSize: '0.78rem' }}
                    >
                      {imagePreviewUrl ? 'Alterar Foto' : 'Adicionar Foto'}
                      <input
                        type="file"
                        hidden
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleImageSelect}
                      />
                    </Button>
                    {imagePreviewUrl && (
                      <Button
                        variant="text"
                        size="small"
                        color="error"
                        onClick={handleRemoveImage}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                      >
                        Remover
                      </Button>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label="WebP Otimizado"
                      size="small"
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'rgba(46, 125, 50, 0.08)', color: '#2E7D32' }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      PNG, JPG ou WEBP até 10 MB (redimensionamento e rotação automáticos)
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* SEÇÃO 2: Identificação do Item */}
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <LocalOfferOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                  Identificação do Item
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Nome do Item / Serviço *"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder={
                      formData.tipo === 'SERVICO'
                        ? 'Ex: Corte Degradê, Manutenção ou Troca de Óleo'
                        : 'Ex: Marmita M Feijoada ou Refrigerante Lata'
                    }
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                </Grid>

                <Grid item xs={12} sm={7}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Categoria</InputLabel>
                    <Select
                      value={formData.categoria}
                      label="Categoria"
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      sx={{ borderRadius: 2 }}
                    >
                      {CATEGORIAS_SUGERIDAS.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={5} sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.ativo}
                        onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                        color="primary"
                      />
                    }
                    label={
                      <Typography variant="body2" fontWeight={600}>
                        {formData.ativo ? 'Disponível' : 'Inativo'}
                      </Typography>
                    }
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 2.5 }} />

            {/* SEÇÃO 3: Precificação & Margem de Lucro */}
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <SellOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                  Precificação & Margens
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Preço de Venda (R$) *"
                    type="number"
                    inputProps={{ step: '0.01', min: '0', style: { fontWeight: 700 } }}
                    required
                    value={formData.preco_venda}
                    onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })}
                    placeholder="0,00"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                      sx: { borderRadius: 2 },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Custo Unitário (R$)"
                    type="number"
                    inputProps={{ step: '0.01', min: '0' }}
                    value={formData.custo_unitario}
                    onChange={(e) => setFormData({ ...formData, custo_unitario: e.target.value })}
                    placeholder="0,00"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                      sx: { borderRadius: 2 },
                    }}
                  />
                </Grid>

                {/* Live Profit Margin Card */}
                {precoNum > 0 && custoNum > 0 && (
                  <Grid item xs={12}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: lucroEstimado >= 0 ? 'rgba(46, 125, 50, 0.06)' : 'rgba(211, 47, 47, 0.06)',
                        border: '1px solid',
                        borderColor: lucroEstimado >= 0 ? 'rgba(46, 125, 50, 0.2)' : 'rgba(211, 47, 47, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUp sx={{ fontSize: 18, color: lucroEstimado >= 0 ? '#2E7D32' : '#D32F2F' }} />
                        <Typography variant="caption" fontWeight={700} color="text.primary">
                          Lucro Bruto Estimado:
                        </Typography>
                        <Typography
                          variant="caption"
                          fontWeight={800}
                          sx={{ fontFeatureSettings: '"tnum"', color: lucroEstimado >= 0 ? '#2E7D32' : '#D32F2F' }}
                        >
                          {formatCurrency(lucroEstimado)} / un
                        </Typography>
                      </Box>
                      <Chip
                        label={`${margemEstimada.toFixed(1)}% de Margem`}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          fontFeatureSettings: '"tnum"',
                          bgcolor: lucroEstimado >= 0 ? 'rgba(46, 125, 50, 0.12)' : 'rgba(211, 47, 47, 0.12)',
                          color: lucroEstimado >= 0 ? '#2E7D32' : '#D32F2F',
                          height: 22,
                        }}
                      />
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>

            {/* SEÇÃO 4: Controle de Estoque (Apenas Produto) */}
            {formData.tipo === 'PRODUTO' && (
              <>
                <Divider sx={{ my: 2.5 }} />
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <WarehouseOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
                    <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                      Controle de Estoque
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Estoque Atual / Inicial"
                        type="number"
                        inputProps={{ step: 'any', min: '0' }}
                        value={formData.quantidade_estoque}
                        onChange={(e) => setFormData({ ...formData, quantidade_estoque: e.target.value })}
                        InputProps={{ sx: { borderRadius: 2 } }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Estoque Mínimo (Alerta)"
                        type="number"
                        inputProps={{ step: 'any', min: '0' }}
                        value={formData.estoque_minimo}
                        onChange={(e) => setFormData({ ...formData, estoque_minimo: e.target.value })}
                        InputProps={{ sx: { borderRadius: 2 } }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </>
            )}
          </DialogContent>

          <DialogActions
            sx={{
              p: 2.5,
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'flex-end',
              flexShrink: 0,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFAFA',
              gap: 1.5,
            }}
          >
            <Button
              onClick={handleCloseModal}
              color="inherit"
              sx={{ fontWeight: 600, textTransform: 'none', borderRadius: 2 }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
              sx={{
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 3,
                boxShadow: '0 4px 14px rgba(25, 118, 210, 0.25)',
              }}
            >
              {submitting ? <CircularProgress size={20} color="inherit" /> : 'Salvar Item'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Excluir Item do Catálogo"
        message="Tem certeza que deseja remover este item? Se ele já possuir histórico de movimentação ou vendas, ele será desativado para garantir a integridade dos relatórios tributários."
        confirmText="Confirmar Exclusão"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
};
