import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Chip,
  IconButton,
  Divider,
  Alert,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Tooltip,
  Avatar,
} from '@mui/material';
import {
  Add,
  Remove,
  Delete,
  ShoppingCart,
  PointOfSale,
  CheckCircle,
  Receipt,
  Search,
  PersonAdd,
  Visibility,
  LocalShipping,
  Cancel,
  Build,
  Print,
  Storefront,
  Warning,
  QrCode2,
  CreditCard,
  AttachMoney,
  Payments,
  Close,
  Inventory2,
  ShoppingBag,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api, { resolveImageUrl } from '../services/api';
import {
  Produto,
  Venda,
  Cliente,
  RegiaoEntrega,
  Motoboy,
  ItemVendaCreate,
  FormaPagamento,
  OrigemVenda,
  TipoPedido,
  ComandaImpressao,
} from '../types';
import { formatCurrency, formatDateTime } from '../services/exportUtils';
import { ConfirmDialog } from '../components/ConfirmDialog';

const FORMAS_PAGTO: { label: FormaPagamento; icon: React.ReactNode }[] = [
  { label: 'Dinheiro', icon: <AttachMoney sx={{ fontSize: 18 }} /> },
  { label: 'PIX', icon: <QrCode2 sx={{ fontSize: 18 }} /> },
  { label: 'Débito', icon: <Payments sx={{ fontSize: 18 }} /> },
  { label: 'Crédito', icon: <CreditCard sx={{ fontSize: 18 }} /> },
];

const ORIGENS: OrigemVenda[] = ['Balcão', 'WhatsApp', 'Delivery Próprio', 'iFood', 'Telefone', 'Outros'];

interface CartItem extends ItemVendaCreate {
  tempId: string;
}

export const Vendas: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [regioes, setRegioes] = useState<RegiaoEntrega[]>([]);
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [recentVendas, setRecentVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter Catalog
  const [categoriaFilter, setCategoriaFilter] = useState<string>('Todas');
  const [searchProduto, setSearchProduto] = useState<string>('');

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [tipoPedido, setTipoPedido] = useState<TipoPedido>('BALCAO');
  const [selectedClienteId, setSelectedClienteId] = useState<number | ''>('');
  const [selectedRegiaoId, setSelectedRegiaoId] = useState<number | ''>('');
  const [taxaEntrega, setTaxaEntrega] = useState<string>('0');
  const [enderecoEntrega, setEnderecoEntrega] = useState<string>('');
  const [selectedMotoboyId, setSelectedMotoboyId] = useState<number | ''>('');
  const [desconto, setDesconto] = useState<string>('0');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('Dinheiro');
  const [origem, setOrigem] = useState<OrigemVenda>('Balcão');
  const [observacoes, setObservacoes] = useState<string>('');

  // Custom Item Modal
  const [customItemModal, setCustomItemModal] = useState<boolean>(false);
  const [customDesc, setCustomDesc] = useState<string>('');
  const [customPreco, setCustomPreco] = useState<string>('');
  const [customQtd, setCustomQtd] = useState<string>('1');

  // Quick Client Modal
  const [quickClientModal, setQuickClientModal] = useState<boolean>(false);
  const [quickClientNome, setQuickClientNome] = useState<string>('');
  const [quickClientTelefone, setQuickClientTelefone] = useState<string>('');
  const [quickClientEndereco, setQuickClientEndereco] = useState<string>('');
  const [quickClientRegiaoId, setQuickClientRegiaoId] = useState<number | ''>('');

  // Details & Thermal Print Modal
  const [detailsVenda, setDetailsVenda] = useState<Venda | null>(null);
  const [comandaModal, setComandaModal] = useState<ComandaImpressao | null>(null);

  // Cancel Dialog
  const [cancelVendaId, setCancelVendaId] = useState<number | null>(null);

  // Alerta de Estoque Negativo / Insuficiente (BUG-001)
  const { empresa } = useAuth();
  const [estoqueModalOpen, setEstoqueModalOpen] = useState<boolean>(false);
  const [itensSemSaldo, setItensSemSaldo] = useState<{
    produto_id: number;
    nome: string;
    saldo_disponivel: number;
    quantidade_solicitada: number;
    saldo_resultante: number;
  }[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, cliRes, regRes, motRes, vendRes] = await Promise.all([
        api.get<Produto[]>('/produtos', { params: { apenas_ativos: true } }),
        api.get<Cliente[]>('/clientes', { params: { apenas_ativos: true } }),
        api.get<RegiaoEntrega[]>('/regioes-entrega', { params: { apenas_ativas: true } }),
        api.get<Motoboy[]>('/motoboys', { params: { apenas_ativos: true } }),
        api.get<Venda[]>('/vendas', { params: { limit: 25 } }),
      ]);
      setProdutos(prodRes.data);
      setClientes(cliRes.data);
      setRegioes(regRes.data);
      setMotoboys(motRes.data);
      setRecentVendas(vendRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When Client changes, autofill region and delivery address if delivery order
  const handleClientChange = (cliId: number | '') => {
    setSelectedClienteId(cliId);
    if (!cliId) return;

    const cli = clientes.find((c) => c.id === cliId);
    if (cli) {
      if (cli.endereco && !enderecoEntrega) {
        setEnderecoEntrega(cli.endereco);
      }
      if (cli.regiao_id) {
        setSelectedRegiaoId(cli.regiao_id);
        const reg = regioes.find((r) => r.id === cli.regiao_id);
        if (reg) {
          setTaxaEntrega(reg.taxa_entrega.toString());
        }
      }
    }
  };

  // When Region changes, update delivery fee
  const handleRegiaoChange = (rId: number | '') => {
    setSelectedRegiaoId(rId);
    if (!rId) {
      setTaxaEntrega('0');
      return;
    }
    const reg = regioes.find((r) => r.id === rId);
    if (reg) {
      setTaxaEntrega(reg.taxa_entrega.toString());
    }
  };

  // Switch between Balcão and Delivery
  const handleToggleTipoPedido = (tipo: TipoPedido) => {
    setTipoPedido(tipo);
    if (tipo === 'ENTREGA') {
      if (origem === 'Balcão') setOrigem('WhatsApp');
      if (selectedRegiaoId) {
        const reg = regioes.find((r) => r.id === selectedRegiaoId);
        if (reg) setTaxaEntrega(reg.taxa_entrega.toString());
      }
    } else {
      setTaxaEntrega('0');
    }
  };

  // Cart operations
  const handleAddToCart = (prod: Produto) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.produto_id === prod.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const item = updated[existingIndex];
        const newQtd = item.quantidade + 1;
        updated[existingIndex] = {
          ...item,
          quantidade: newQtd,
          subtotal: Math.round(newQtd * item.preco_unitario * 100) / 100,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          tempId: `prod_${prod.id}_${Date.now()}`,
          produto_id: prod.id,
          descricao: prod.nome,
          tipo_item: prod.tipo,
          quantidade: 1,
          preco_unitario: prod.preco_venda,
          subtotal: prod.preco_venda,
        };
        return [...prev, newItem];
      }
    });
  };

  const handleUpdateQuantity = (tempId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.tempId === tempId) {
            const newQtd = item.quantidade + delta;
            if (newQtd <= 0) return null;
            return {
              ...item,
              quantidade: newQtd,
              subtotal: Math.round(newQtd * item.preco_unitario * 100) / 100,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (tempId: string) => {
    setCartItems((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setDesconto('0');
    setTaxaEntrega('0');
    setEnderecoEntrega('');
    setSelectedRegiaoId('');
    setSelectedMotoboyId('');
    setObservacoes('');
    setSelectedClienteId('');
  };

  const handleAddCustomItem = () => {
    if (!customDesc.trim()) return;
    const preco = Number(customPreco.replace(',', '.')) || 0;
    const qtd = Number(customQtd) || 1;
    const subtotal = Math.round(preco * qtd * 100) / 100;

    const newItem: CartItem = {
      tempId: `custom_${Date.now()}`,
      produto_id: null,
      descricao: customDesc.trim(),
      tipo_item: 'PRODUTO',
      quantidade: qtd,
      preco_unitario: preco,
      subtotal: subtotal,
    };

    setCartItems((prev) => [...prev, newItem]);
    setCustomDesc('');
    setCustomPreco('');
    setCustomQtd('1');
    setCustomItemModal(false);
  };

  const handleQuickCreateClient = async () => {
    if (!quickClientNome.trim()) return;
    try {
      const res = await api.post<Cliente>('/clientes', {
        nome: quickClientNome.trim(),
        telefone: quickClientTelefone.trim() || undefined,
        endereco: quickClientEndereco.trim() || undefined,
        regiao_id: quickClientRegiaoId ? Number(quickClientRegiaoId) : undefined,
        ativo: true,
      });
      setClientes((prev) => [res.data, ...prev]);
      handleClientChange(res.data.id);
      setQuickClientModal(false);
      setQuickClientNome('');
      setQuickClientTelefone('');
      setQuickClientEndereco('');
      setQuickClientRegiaoId('');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao cadastrar cliente rápido.');
    }
  };

  // Calculations
  const subtotalCart = cartItems.reduce((acc, cur) => acc + (cur.subtotal || 0), 0);
  const numTaxa = tipoPedido === 'ENTREGA' ? Math.max(0, Number(taxaEntrega.replace(',', '.')) || 0) : 0;
  const numDesconto = Math.max(0, Number(desconto.replace(',', '.')) || 0);
  const totalPagar = Math.max(0, Math.round((subtotalCart + numTaxa - numDesconto) * 100) / 100);

  const handleSubmitVenda = async (autorizarEstoqueNegativo: boolean = false) => {
    if (cartItems.length === 0) {
      alert('Adicione pelo menos um produto ao carrinho antes de finalizar.');
      return;
    }

    // Validação preventiva de saldo insuficiente no carrinho
    if (!autorizarEstoqueNegativo) {
      const insuficientes: {
        produto_id: number;
        nome: string;
        saldo_disponivel: number;
        quantidade_solicitada: number;
        saldo_resultante: number;
      }[] = [];

      cartItems.forEach((it) => {
        if (it.produto_id && it.tipo_item === 'PRODUTO') {
          const prod = produtos.find((p) => p.id === it.produto_id);
          const saldo = prod?.quantidade_estoque ?? 0;
          if (saldo < it.quantidade) {
            insuficientes.push({
              produto_id: it.produto_id,
              nome: it.descricao,
              saldo_disponivel: saldo,
              quantidade_solicitada: it.quantidade,
              saldo_resultante: Math.round((saldo - it.quantidade) * 100) / 100,
            });
          }
        }
      });

      if (insuficientes.length > 0) {
        setItensSemSaldo(insuficientes);
        setEstoqueModalOpen(true);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        cliente_id: selectedClienteId ? Number(selectedClienteId) : null,
        tipo_pedido: tipoPedido,
        regiao_entrega_id: tipoPedido === 'ENTREGA' && selectedRegiaoId ? Number(selectedRegiaoId) : null,
        taxa_entrega: numTaxa,
        motoboy_id: tipoPedido === 'ENTREGA' && selectedMotoboyId ? Number(selectedMotoboyId) : null,
        endereco_entrega: tipoPedido === 'ENTREGA' ? enderecoEntrega.trim() || null : null,
        origem,
        forma_pagamento: formaPagamento,
        desconto: numDesconto,
        observacoes: observacoes.trim() || null,
        autorizar_estoque_negativo: autorizarEstoqueNegativo,
        itens: cartItems.map((it) => ({
          produto_id: it.produto_id,
          descricao: it.descricao,
          tipo_item: it.tipo_item,
          quantidade: it.quantidade,
          preco_unitario: it.preco_unitario,
          subtotal: it.subtotal,
        })),
      };

      const res = await api.post<Venda>('/vendas', payload);
      setRecentVendas((prev) => [res.data, ...prev]);
      handleClearCart();
      setEstoqueModalOpen(false);
      fetchData(); // Atualiza catálogo de produtos e saldos

      if (autorizarEstoqueNegativo) {
        setSuccessToast(`Pedido #${res.data.numero_pedido || res.data.id} registrado com sucesso! (Autorizado sob alerta de estoque crítico)`);
      } else {
        setSuccessToast(`Pedido #${res.data.numero_pedido || res.data.id} registrado com sucesso! (${formatCurrency(res.data.valor_total)})`);
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string' && detail.includes('Estoque insuficiente')) {
        const insuficientes = cartItems
          .filter((i) => i.produto_id && i.tipo_item === 'PRODUTO')
          .map((i) => {
            const prod = produtos.find((p) => p.id === i.produto_id);
            const saldo = prod?.quantidade_estoque ?? 0;
            return {
              produto_id: i.produto_id!,
              nome: i.descricao,
              saldo_disponivel: saldo,
              quantidade_solicitada: i.quantidade,
              saldo_resultante: Math.round((saldo - i.quantidade) * 100) / 100,
            };
          });
        setItensSemSaldo(insuficientes);
        setEstoqueModalOpen(true);
      } else {
        alert(detail || 'Erro ao registrar pedido.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelVenda = async () => {
    if (!cancelVendaId) return;
    try {
      await api.put<Venda>(`/vendas/${cancelVendaId}/cancelar`);
      setRecentVendas((prev) =>
        prev.map((v) => (v.id === cancelVendaId ? { ...v, status: 'Cancelada', status_pedido: 'Cancelado' } : v))
      );
      setCancelVendaId(null);
      setSuccessToast(`Pedido cancelado com sucesso.`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao cancelar pedido.');
    }
  };

  const handlePrintComanda = async (vendaId: number) => {
    try {
      const res = await api.get<ComandaImpressao>(`/vendas/${vendaId}/comanda-texto`);
      setComandaModal(res.data);
    } catch (err) {
      alert('Erro ao carregar comanda térmica.');
    }
  };

  // Categories list
  const categorias = ['Todas', ...Array.from(new Set(produtos.map((p) => p.categoria)))];
  const filteredProdutos = produtos.filter((p) => {
    const matchCat = categoriaFilter === 'Todas' || p.categoria === categoriaFilter;
    const matchSearch =
      searchProduto === '' ||
      p.nome.toLowerCase().includes(searchProduto.toLowerCase()) ||
      p.categoria.toLowerCase().includes(searchProduto.toLowerCase());
    return matchCat && matchSearch;
  });

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
          mb: 3,
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
              <PointOfSale sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.025em' }}>
              PDV — Terminal de Vendas
            </Typography>
            <Chip
              label="Caixa Rápido • Balcão & Delivery"
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: '0.72rem',
                bgcolor: 'rgba(46, 125, 50, 0.08)',
                color: '#2E7D32',
                border: '1px solid rgba(46, 125, 50, 0.2)',
                height: 22,
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Lançamento ágil de pedidos, cálculo automático de regiões de entrega, controle de itens e despacho.
          </Typography>
        </Box>

        {/* Quick status or action */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Chip
            icon={<CheckCircle sx={{ '&&': { fontSize: 14, color: '#2E7D32' } }} />}
            label="Terminal Pronto"
            size="small"
            sx={{
              bgcolor: 'rgba(46, 125, 50, 0.08)',
              color: '#2E7D32',
              fontWeight: 700,
              fontSize: '0.75rem',
              border: '1px solid rgba(46, 125, 50, 0.22)',
            }}
          />
        </Box>
      </Box>

      {/* Main Grid: Catalog (Left) + Cart & Checkout (Right) */}
      <Grid container spacing={3}>
        {/* Left Column: Product Catalog (Shopify POS Standard) */}
        <Grid item xs={12} lg={7}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF'),
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            {/* Search & Custom Item bar */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'center' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar produto por nome ou categoria..."
                value={searchProduto}
                onChange={(e) => setSearchProduto(e.target.value)}
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
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setCustomItemModal(true)}
                sx={{
                  whiteSpace: 'nowrap',
                  fontWeight: 700,
                  height: 40,
                  borderRadius: 2,
                  textTransform: 'none',
                  px: 2,
                  fontSize: '0.85rem',
                }}
              >
                + Item Avulso
              </Button>
            </Box>

            {/* Category Pills (Horizontal Scroll) */}
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                overflowX: 'auto',
                pb: 1.5,
                mb: 2,
                '&::-webkit-scrollbar': { height: 4 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 2 },
              }}
            >
              {categorias.map((cat) => {
                const isSelected = categoriaFilter === cat;
                return (
                  <Chip
                    key={cat}
                    label={cat}
                    clickable
                    onClick={() => setCategoriaFilter(cat)}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      borderRadius: 2,
                      px: 0.5,
                      bgcolor: isSelected
                        ? 'primary.main'
                        : (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F1F5F9'),
                      color: isSelected ? '#FFFFFF' : 'text.primary',
                      border: '1px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      '&:hover': {
                        bgcolor: isSelected ? 'primary.dark' : 'rgba(0,0,0,0.06)',
                      },
                    }}
                  />
                );
              })}
            </Box>

            {/* Product Grid Cards (Shopify POS Standard) */}
            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={32} thickness={4} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  Carregando catálogo de produtos...
                </Typography>
              </Box>
            ) : filteredProdutos.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, bgcolor: '#FBFCFE', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                <Inventory2 sx={{ fontSize: 40, color: 'text.secondary', mb: 1, opacity: 0.6 }} />
                <Typography variant="body2" fontWeight={700} color="text.secondary">
                  Nenhum produto cadastrado nesta categoria ou busca.
                </Typography>
              </Box>
            ) : (
              <Grid
                container
                spacing={1.5}
                sx={{
                  maxHeight: 560,
                  overflowY: 'auto',
                  pr: 0.5,
                  '&::-webkit-scrollbar': { width: 6 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.12)', borderRadius: 3 },
                }}
              >
                {filteredProdutos.map((prod) => {
                  const isServico = prod.tipo === 'SERVICO';
                  return (
                    <Grid item xs={6} sm={4} key={prod.id}>
                      <Card
                        elevation={0}
                        onClick={() => handleAddToCart(prod)}
                        sx={{
                          cursor: 'pointer',
                          p: 1.75,
                          borderRadius: 2.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#FFFFFF'),
                          transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: '0 6px 18px rgba(25, 118, 210, 0.12)',
                            transform: 'translateY(-2px)',
                          },
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          position: 'relative',
                        }}
                      >
                        <Box>
                          {/* Imagem do Produto / Placeholder Visual Sentinel */}
                          <Box
                            sx={{
                              width: '100%',
                              height: 110,
                              borderRadius: 2,
                              mb: 1.25,
                              overflow: 'hidden',
                              position: 'relative',
                              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#F1F5F9'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {prod.imagem_url ? (
                              <Box
                                component="img"
                                src={resolveImageUrl(prod.imagem_url)}
                                alt={prod.nome}
                                loading="lazy"
                                sx={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  transition: 'transform 0.25s ease',
                                  '&:hover': { transform: 'scale(1.05)' },
                                }}
                                onError={(e: any) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 0.5,
                                  color: isServico ? '#7B1FA2' : 'primary.main',
                                  opacity: 0.75,
                                }}
                              >
                                {isServico ? <Build sx={{ fontSize: 32 }} /> : <ShoppingBag sx={{ fontSize: 32 }} />}
                                <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                  {prod.categoria}
                                </Typography>
                              </Box>
                            )}
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.68rem',
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {prod.categoria}
                            </Typography>
                            {!isServico && (
                              <Chip
                                label={`${(prod.quantidade_estoque || 0).toFixed(0)} un`}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  bgcolor: prod.estoque_baixo ? 'rgba(211, 47, 47, 0.08)' : 'rgba(46, 125, 50, 0.08)',
                                  color: prod.estoque_baixo ? '#D32F2F' : '#2E7D32',
                                  border: '1px solid',
                                  borderColor: prod.estoque_baixo ? 'rgba(211, 47, 47, 0.2)' : 'rgba(46, 125, 50, 0.2)',
                                }}
                              />
                            )}
                          </Box>

                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: 1.3,
                              color: 'text.primary',
                              minHeight: 36,
                            }}
                          >
                            {prod.nome}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'rgba(0,0,0,0.04)' }}>
                          <Typography
                            variant="body1"
                            fontWeight={800}
                            sx={{ fontFeatureSettings: '"tnum"', color: '#1B5E20', fontSize: '0.95rem' }}
                          >
                            {formatCurrency(prod.preco_venda)}
                          </Typography>
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              bgcolor: 'rgba(25, 118, 210, 0.08)',
                              color: 'primary.main',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                              '&:hover': { bgcolor: 'primary.main', color: '#fff' },
                            }}
                          >
                            <Add sx={{ fontSize: 16 }} />
                          </Box>
                        </Box>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Paper>
        </Grid>

        {/* Right Column: Shopping Cart & Checkout (Stripe & Shopify POS) */}
        <Grid item xs={12} lg={5}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF'),
              boxShadow: '0 4px 20px rgba(7, 25, 51, 0.06)',
            }}
          >
            {/* Segmented Control Balcão vs Delivery (Asaas Standard) */}
            <Box
              sx={{
                display: 'flex',
                p: 0.6,
                borderRadius: 2.5,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#F1F5F9'),
                border: '1px solid',
                borderColor: 'divider',
                mb: 2.5,
              }}
            >
              <Button
                fullWidth
                size="small"
                startIcon={<Storefront sx={{ fontSize: 18 }} />}
                onClick={() => handleToggleTipoPedido('BALCAO')}
                sx={{
                  py: 1,
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  borderRadius: 2,
                  textTransform: 'none',
                  bgcolor: tipoPedido === 'BALCAO'
                    ? (theme) => (theme.palette.mode === 'dark' ? 'primary.main' : '#FFFFFF')
                    : 'transparent',
                  color: tipoPedido === 'BALCAO'
                    ? (theme) => (theme.palette.mode === 'dark' ? '#fff' : 'primary.main')
                    : 'text.secondary',
                  boxShadow: tipoPedido === 'BALCAO' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Balcão / Retirada
              </Button>
              <Button
                fullWidth
                size="small"
                startIcon={<LocalShipping sx={{ fontSize: 18 }} />}
                onClick={() => handleToggleTipoPedido('ENTREGA')}
                sx={{
                  py: 1,
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  borderRadius: 2,
                  textTransform: 'none',
                  bgcolor: tipoPedido === 'ENTREGA'
                    ? (theme) => (theme.palette.mode === 'dark' ? 'primary.main' : '#FFFFFF')
                    : 'transparent',
                  color: tipoPedido === 'ENTREGA'
                    ? (theme) => (theme.palette.mode === 'dark' ? '#fff' : 'primary.main')
                    : 'text.secondary',
                  boxShadow: tipoPedido === 'ENTREGA' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Entrega Delivery
              </Button>
            </Box>

            {/* Cart Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShoppingCart sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight={800}>
                  Carrinho do Pedido
                </Typography>
                <Chip
                  label={`${cartItems.length} ${cartItems.length === 1 ? 'item' : 'itens'}`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    fontFeatureSettings: '"tnum"',
                    height: 20,
                    bgcolor: 'rgba(25, 118, 210, 0.08)',
                    color: 'primary.main',
                  }}
                />
              </Box>
              {cartItems.length > 0 && (
                <Button
                  size="small"
                  color="error"
                  onClick={handleClearCart}
                  sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', p: 0.5 }}
                >
                  Limpar Carrinho
                </Button>
              )}
            </Box>

            {/* Client Selection (Optional) */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: '0.85rem' }}>Vincular Cliente (Opcional)</InputLabel>
                <Select
                  value={selectedClienteId}
                  label="Vincular Cliente (Opcional)"
                  onChange={(e) => handleClientChange(e.target.value as number | '')}
                  sx={{ borderRadius: 2, fontSize: '0.85rem' }}
                >
                  <MenuItem value="">
                    <em>Cliente Balcão / Não Identificado</em>
                  </MenuItem>
                  {clientes.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.nome} {c.regiao_nome ? `[${c.regiao_nome}]` : ''} {c.telefone ? `(${c.telefone})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip title="Cadastrar cliente rápido">
                <IconButton
                  color="primary"
                  onClick={() => setQuickClientModal(true)}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 0.9,
                    '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.08)' },
                  }}
                >
                  <PersonAdd sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Delivery Logistics Fields (Shown when tipoPedido === 'ENTREGA') */}
            {tipoPedido === 'ENTREGA' && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC'),
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  mb: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                <Typography variant="caption" fontWeight={800} color="primary.main" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Logística & Despacho
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ fontSize: '0.85rem' }}>Região de Entrega</InputLabel>
                    <Select
                      value={selectedRegiaoId}
                      label="Região de Entrega"
                      onChange={(e) => handleRegiaoChange(e.target.value as number | '')}
                      sx={{ borderRadius: 2, fontSize: '0.85rem' }}
                    >
                      <MenuItem value="">
                        <em>Sem Região / Taxa Manual</em>
                      </MenuItem>
                      {regioes.map((r) => (
                        <MenuItem key={r.id} value={r.id}>
                          {r.nome} ({formatCurrency(r.taxa_entrega)})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Taxa (R$)"
                    size="small"
                    value={taxaEntrega}
                    onChange={(e) => setTaxaEntrega(e.target.value)}
                    sx={{ width: 110 }}
                    InputProps={{ sx: { borderRadius: 2 } }}
                    inputProps={{ style: { textAlign: 'right', fontWeight: 700 } }}
                  />
                </Box>

                <TextField
                  fullWidth
                  size="small"
                  label="Endereço de Entrega Completo"
                  placeholder="Rua, número, complemento, bairro"
                  value={enderecoEntrega}
                  onChange={(e) => setEnderecoEntrega(e.target.value)}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />

                <FormControl size="small" fullWidth>
                  <InputLabel sx={{ fontSize: '0.85rem' }}>Motoboy (Opcional)</InputLabel>
                  <Select
                    value={selectedMotoboyId}
                    label="Motoboy (Opcional)"
                    onChange={(e) => setSelectedMotoboyId(e.target.value as number | '')}
                    sx={{ borderRadius: 2, fontSize: '0.85rem' }}
                  >
                    <MenuItem value="">
                      <em>Atribuir depois / Aguardando</em>
                    </MenuItem>
                    {motoboys.map((m) => (
                      <MenuItem key={m.id} value={m.id}>
                        {m.nome} (Taxa: {formatCurrency(m.valor_por_entrega)})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Cart Items List (Shopify POS Standard) */}
            <Box
              sx={{
                maxHeight: 200,
                overflowY: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2.5,
                p: 1,
                mb: 2.5,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.01)' : '#FBFCFE'),
                '&::-webkit-scrollbar': { width: 5 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.12)', borderRadius: 3 },
              }}
            >
              {cartItems.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3.5 }}>
                  <ShoppingCart sx={{ color: 'text.secondary', fontSize: 36, mb: 0.5, opacity: 0.5 }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Carrinho vazio
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Clique nos produtos do catálogo ao lado para adicionar.
                  </Typography>
                </Box>
              ) : (
                cartItems.map((item) => {
                  const cartProd = produtos.find((p) => p.id === item.produto_id);
                  const isCartServico = item.tipo_item === 'SERVICO';
                  return (
                    <Box
                      key={item.tempId}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1.25,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 0 },
                        borderRadius: 1.5,
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexGrow: 1, pr: 1.5 }}>
                        <Avatar
                          src={resolveImageUrl(cartProd?.imagem_url)}
                          variant="rounded"
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: isCartServico ? 'rgba(123, 31, 162, 0.08)' : 'rgba(25, 118, 210, 0.08)',
                            color: isCartServico ? '#7B1FA2' : 'primary.main',
                            flexShrink: 0,
                          }}
                        >
                          {isCartServico ? <Build sx={{ fontSize: 16 }} /> : <ShoppingBag sx={{ fontSize: 16 }} />}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary', lineHeight: 1.2 }}>
                            {item.descricao}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontFeatureSettings: '"tnum"' }}
                          >
                            {formatCurrency(item.preco_unitario)} cada
                          </Typography>
                        </Box>
                      </Box>

                    {/* Quantity Stepper Pill */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F1F5F9'),
                        borderRadius: 2,
                        p: 0.3,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => handleUpdateQuantity(item.tempId, -1)}
                        sx={{ p: 0.4 }}
                      >
                        <Remove sx={{ fontSize: 14 }} />
                      </IconButton>
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        sx={{ minWidth: 24, textAlign: 'center', fontFeatureSettings: '"tnum"', fontSize: '0.85rem' }}
                      >
                        {item.quantidade}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleUpdateQuantity(item.tempId, 1)}
                        sx={{ p: 0.4 }}
                      >
                        <Add sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>

                    {/* Subtotal & Delete */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 80, justifyContent: 'flex-end' }}>
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        sx={{ fontFeatureSettings: '"tnum"', color: '#1B5E20' }}
                      >
                        {formatCurrency(item.subtotal || 0)}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveItem(item.tempId)}
                        sx={{ p: 0.5, '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.08)' } }}
                      >
                        <Delete sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </Box>
                  );
                })
              )}
            </Box>

            {/* Subtotals & Taxes Breakdown */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography variant="body2" color="text.secondary">
                  Subtotal dos Itens:
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ fontFeatureSettings: '"tnum"' }}>
                  {formatCurrency(subtotalCart)}
                </Typography>
              </Box>

              {tipoPedido === 'ENTREGA' && numTaxa > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography variant="body2" color="text.secondary">
                    Taxa de Entrega:
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontFeatureSettings: '"tnum"', color: 'primary.main' }}>
                    +{formatCurrency(numTaxa)}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Desconto no Pedido:
                </Typography>
                <TextField
                  size="small"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                  sx={{ width: 100 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                    sx: { borderRadius: 1.5 },
                  }}
                  inputProps={{ style: { textAlign: 'right', padding: '3px 6px', fontWeight: 700 } }}
                />
              </Box>

              {/* Totalizador Executivo (Stripe / Shopify Standard) */}
              <Box
                sx={{
                  mt: 1.5,
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.12)' : '#F0FDF4'),
                  border: '1px solid',
                  borderColor: 'rgba(46, 125, 50, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}
                  >
                    Total a Pagar
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'} no pedido
                  </Typography>
                </Box>
                <Typography
                  variant="h4"
                  fontWeight={900}
                  sx={{
                    fontFeatureSettings: '"tnum"',
                    color: '#15803D',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatCurrency(totalPagar)}
                </Typography>
              </Box>
            </Box>

            {/* Formas de Pagamento (Stripe Terminal Standard) */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                fontWeight={800}
                color="text.secondary"
                sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Forma de Pagamento
              </Typography>
              <Grid container spacing={1}>
                {FORMAS_PAGTO.map(({ label, icon }) => {
                  const isSelected = formaPagamento === label;
                  return (
                    <Grid item xs={3} key={label}>
                      <Box
                        onClick={() => setFormaPagamento(label)}
                        sx={{
                          cursor: 'pointer',
                          p: 1.25,
                          borderRadius: 2,
                          textAlign: 'center',
                          border: '1.5px solid',
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          bgcolor: isSelected
                            ? (theme) => (theme.palette.mode === 'dark' ? 'primary.main' : '#071933')
                            : (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#FFFFFF'),
                          color: isSelected ? '#FFFFFF' : 'text.primary',
                          boxShadow: isSelected ? '0 4px 12px rgba(7, 25, 51, 0.25)' : 'none',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 0.5,
                          '&:hover': {
                            borderColor: isSelected ? 'primary.main' : 'text.secondary',
                          },
                        }}
                      >
                        <Box sx={{ color: isSelected ? '#FFFFFF' : 'primary.main' }}>
                          {icon}
                        </Box>
                        <Typography variant="caption" fontWeight={700} sx={{ lineHeight: 1 }}>
                          {label}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>

            {/* Canal de Origem */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                fontWeight={800}
                color="text.secondary"
                sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Canal de Venda
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {ORIGENS.map((orig) => {
                  const isSelected = origem === orig;
                  return (
                    <Chip
                      key={orig}
                      label={orig}
                      clickable
                      onClick={() => setOrigem(orig)}
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        borderRadius: 1.5,
                        bgcolor: isSelected
                          ? 'rgba(25, 118, 210, 0.12)'
                          : (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F1F5F9'),
                        color: isSelected ? 'primary.main' : 'text.secondary',
                        border: '1px solid',
                        borderColor: isSelected ? 'rgba(25, 118, 210, 0.3)' : 'divider',
                      }}
                    />
                  );
                })}
              </Box>
            </Box>

            {/* Observações */}
            <TextField
              fullWidth
              size="small"
              label="Observações do Pedido"
              placeholder="Ex: Troco para R$ 50, sem cebola, entregar na portaria"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              InputProps={{ sx: { borderRadius: 2 } }}
              sx={{ mb: 2.5 }}
            />

            {/* Checkout Button (Shopify POS / Stripe Standard) */}
            <Button
              fullWidth
              variant="contained"
              color="success"
              size="large"
              disabled={cartItems.length === 0 || submitting}
              onClick={() => handleSubmitVenda(false)}
              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
              sx={{
                py: 1.6,
                fontWeight: 900,
                fontSize: '1.02rem',
                borderRadius: 2.5,
                textTransform: 'none',
                boxShadow: '0 6px 20px rgba(46, 125, 50, 0.3)',
                letterSpacing: '0.02em',
                '&:hover': {
                  boxShadow: '0 8px 25px rgba(46, 125, 50, 0.4)',
                },
              }}
            >
              Finalizar Pedido ({formatCurrency(totalPagar)})
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Sales History Table (Stripe Dashboard Standard) */}
      <Box sx={{ mt: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 2,
                bgcolor: 'rgba(25, 118, 210, 0.1)',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Receipt sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800}>
              Histórico de Vendas Recentes
            </Typography>
            <Chip
              label={`${recentVendas.length} pedidos`}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: '0.72rem',
                fontFeatureSettings: '"tnum"',
                bgcolor: 'rgba(0,0,0,0.05)',
                height: 22,
              }}
            />
          </Box>
        </Box>

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
                  Nº Pedido
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
                  Data / Hora
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
                  Canal & Pagamento
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
                  Cliente / Endereço
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
                  Itens
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
                  Total
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
              {recentVendas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    Nenhuma venda registrada hoje ainda.
                  </TableCell>
                </TableRow>
              ) : (
                recentVendas.map((v) => (
                  <TableRow
                    key={v.id}
                    hover
                    sx={{
                      '&:hover': {
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#FBFDFF',
                      },
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <TableCell sx={{ py: 1.5, fontWeight: 800, color: 'primary.main' }}>
                      {v.numero_pedido || `#${v.id}`}
                    </TableCell>

                    <TableCell sx={{ py: 1.5, fontFeatureSettings: '"tnum"', fontSize: '0.85rem' }}>
                      {formatDateTime(v.data_hora)}
                    </TableCell>

                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        label={v.tipo_pedido}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          height: 20,
                          mb: 0.5,
                          bgcolor: v.tipo_pedido === 'ENTREGA' ? 'rgba(123, 31, 162, 0.08)' : 'rgba(25, 118, 210, 0.08)',
                          color: v.tipo_pedido === 'ENTREGA' ? '#7B1FA2' : '#1976D2',
                          border: '1px solid',
                          borderColor: v.tipo_pedido === 'ENTREGA' ? 'rgba(123, 31, 162, 0.2)' : 'rgba(25, 118, 210, 0.2)',
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" display="block">
                        {v.origem} • {v.forma_pagamento}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" fontWeight={700}>
                        {v.cliente_nome || 'Balcão'}
                      </Typography>
                      {v.endereco_entrega && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: 'block',
                            maxWidth: 220,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {v.endereco_entrega}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {v.descricao_produto}
                      </Typography>
                      {v.itens && v.itens.length > 0 && (
                        <Typography variant="caption" color="primary.main">
                          {v.itens.length} {v.itens.length === 1 ? 'item discriminado' : 'itens discriminados'}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        sx={{ fontFeatureSettings: '"tnum"', color: '#1B5E20' }}
                      >
                        {formatCurrency(v.valor_total)}
                      </Typography>
                      {v.taxa_entrega > 0 && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Taxa {formatCurrency(v.taxa_entrega)}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Chip
                        label={v.status_pedido || v.status}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          bgcolor: v.status === 'Cancelada' ? 'rgba(211, 47, 47, 0.08)' : 'rgba(46, 125, 50, 0.08)',
                          color: v.status === 'Cancelada' ? '#D32F2F' : '#2E7D32',
                          border: '1px solid',
                          borderColor: v.status === 'Cancelada' ? 'rgba(211, 47, 47, 0.22)' : 'rgba(46, 125, 50, 0.22)',
                          height: 24,
                        }}
                      />
                    </TableCell>

                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="Imprimir Comanda Térmica">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handlePrintComanda(v.id)}
                            sx={{ p: 0.7, '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.08)' } }}
                          >
                            <Print sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Ver Detalhes do Pedido">
                          <IconButton
                            size="small"
                            onClick={() => setDetailsVenda(v)}
                            sx={{ p: 0.7, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                          >
                            <Visibility sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        {v.status === 'Concluída' && (
                          <Tooltip title="Cancelar Pedido">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setCancelVendaId(v.id)}
                              sx={{ p: 0.7, '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.08)' } }}
                            >
                              <Cancel sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Modal Add Custom Item */}
      <Dialog
        open={customItemModal}
        onClose={() => setCustomItemModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            boxShadow: '0 24px 60px rgba(7, 25, 51, 0.22)',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2.5,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: 'rgba(25, 118, 210, 0.1)',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingBag sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800}>
              Adicionar Item Avulso
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setCustomItemModal(false)}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Descrição do Item / Prato *"
              fullWidth
              size="small"
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              placeholder="Ex: Marmita Personalizada ou Bebida Especial"
              InputProps={{ sx: { borderRadius: 2 } }}
            />
            <TextField
              label="Preço Unitário (R$) *"
              fullWidth
              size="small"
              value={customPreco}
              onChange={(e) => setCustomPreco(e.target.value)}
              placeholder="0,00"
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                sx: { borderRadius: 2 },
              }}
            />
            <TextField
              label="Quantidade *"
              type="number"
              fullWidth
              size="small"
              value={customQtd}
              onChange={(e) => setCustomQtd(e.target.value)}
              InputProps={{ sx: { borderRadius: 2 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setCustomItemModal(false)} color="inherit" sx={{ fontWeight: 600, textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddCustomItem}
            sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, px: 2.5 }}
          >
            Adicionar ao Carrinho
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Quick Create Client */}
      <Dialog
        open={quickClientModal}
        onClose={() => setQuickClientModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            boxShadow: '0 24px 60px rgba(7, 25, 51, 0.22)',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2.5,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: 'rgba(25, 118, 210, 0.1)',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PersonAdd sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800}>
              Cadastrar Cliente Rápido
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setQuickClientModal(false)}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Nome do Cliente *"
              fullWidth
              size="small"
              value={quickClientNome}
              onChange={(e) => setQuickClientNome(e.target.value)}
              placeholder="Ex: João da Silva"
              InputProps={{ sx: { borderRadius: 2 } }}
            />
            <TextField
              label="Telefone / WhatsApp"
              fullWidth
              size="small"
              value={quickClientTelefone}
              onChange={(e) => setQuickClientTelefone(e.target.value)}
              placeholder="(11) 98765-4321"
              InputProps={{ sx: { borderRadius: 2 } }}
            />
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: '0.85rem' }}>Região de Entrega</InputLabel>
              <Select
                value={quickClientRegiaoId}
                label="Região de Entrega"
                onChange={(e) => setQuickClientRegiaoId(e.target.value as number | '')}
                sx={{ borderRadius: 2, fontSize: '0.85rem' }}
              >
                <MenuItem value="">
                  <em>Sem região pré-definida</em>
                </MenuItem>
                {regioes.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.nome} ({formatCurrency(r.taxa_entrega)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Endereço de Entrega"
              fullWidth
              size="small"
              value={quickClientEndereco}
              onChange={(e) => setQuickClientEndereco(e.target.value)}
              placeholder="Rua, número, complemento"
              InputProps={{ sx: { borderRadius: 2 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setQuickClientModal(false)} color="inherit" sx={{ fontWeight: 600, textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleQuickCreateClient}
            sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, px: 2.5 }}
          >
            Salvar e Vincular
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Detalhes da Venda */}
      <Dialog
        open={Boolean(detailsVenda)}
        onClose={() => setDetailsVenda(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            boxShadow: '0 24px 60px rgba(7, 25, 51, 0.22)',
            overflow: 'hidden',
          },
        }}
      >
        {detailsVenda && (
          <>
            <DialogTitle
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2.5,
                pb: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  Detalhes do Pedido #{detailsVenda.numero_pedido || detailsVenda.id}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDateTime(detailsVenda.data_hora)}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setDetailsVenda(null)}>
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
              <Grid container spacing={2} sx={{ mb: 2.5 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Cliente
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {detailsVenda.cliente_nome || 'Balcão (Não identificado)'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Tipo & Canal
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {detailsVenda.tipo_pedido} • {detailsVenda.origem}
                  </Typography>
                </Grid>
                {detailsVenda.endereco_entrega && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Endereço de Entrega
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {detailsVenda.endereco_entrega}
                    </Typography>
                  </Grid>
                )}
                {detailsVenda.motoboy_nome && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Motoboy Designado
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {detailsVenda.motoboy_nome}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Pagamento
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {detailsVenda.forma_pagamento}
                  </Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
                Itens do Pedido:
              </Typography>
              <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Qtd</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Unitário</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailsVenda.itens && detailsVenda.itens.length > 0 ? (
                      detailsVenda.itens.map((it) => (
                        <TableRow key={it.id}>
                          <TableCell sx={{ fontWeight: 600 }}>{it.descricao}</TableCell>
                          <TableCell align="center">{it.quantidade}</TableCell>
                          <TableCell align="right">{formatCurrency(it.preco_unitario)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {formatCurrency(it.subtotal)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>{detailsVenda.descricao_produto}</TableCell>
                        <TableCell align="center">{detailsVenda.quantidade}</TableCell>
                        <TableCell align="right">{formatCurrency(detailsVenda.preco_unitario)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatCurrency(detailsVenda.valor_total)}
                        </TableCell>
                      </TableRow>
                    )}

                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell colSpan={3} sx={{ fontWeight: 700 }}>
                        SUBTOTAL
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(detailsVenda.valor_subtotal || detailsVenda.valor_total)}
                      </TableCell>
                    </TableRow>
                    {detailsVenda.taxa_entrega > 0 && (
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell colSpan={3} sx={{ fontWeight: 700, color: 'primary.main' }}>
                          TAXA DE ENTREGA
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          +{formatCurrency(detailsVenda.taxa_entrega)}
                        </TableCell>
                      </TableRow>
                    )}
                    {detailsVenda.desconto > 0 && (
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell colSpan={3} sx={{ fontWeight: 700, color: 'error.main' }}>
                          DESCONTO
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>
                          -{formatCurrency(detailsVenda.desconto)}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow sx={{ bgcolor: 'action.selected' }}>
                      <TableCell colSpan={3} sx={{ fontWeight: 900, fontSize: '0.95rem' }}>
                        TOTAL GERAL
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, color: '#1B5E20', fontSize: '1rem' }}>
                        {formatCurrency(detailsVenda.valor_total)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button onClick={() => setDetailsVenda(null)} sx={{ fontWeight: 700, textTransform: 'none' }}>
                Fechar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Modal Visualização e Impressão de Comanda Térmica ESC/POS */}
      <Dialog
        open={Boolean(comandaModal)}
        onClose={() => setComandaModal(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            boxShadow: '0 24px 60px rgba(7, 25, 51, 0.22)',
            overflow: 'hidden',
          },
        }}
      >
        {comandaModal && (
          <>
            <DialogTitle
              sx={{
                p: 2.5,
                pb: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="h6" fontWeight={800}>
                Comanda Térmica
              </Typography>
              <Chip label="ESC/POS 80mm" size="small" color="primary" sx={{ fontWeight: 700 }} />
            </DialogTitle>
            <DialogContent sx={{ p: 2.5 }}>
              <Box
                sx={{
                  bgcolor: '#ffffff',
                  color: '#000000',
                  p: 2.5,
                  fontFamily: 'monospace',
                  fontSize: '0.82rem',
                  lineHeight: 1.4,
                  whiteSpace: 'pre-wrap',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                {comandaModal.comanda_texto}
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
              <Button onClick={() => setComandaModal(null)} color="inherit" sx={{ fontWeight: 600, textTransform: 'none' }}>
                Fechar
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Print />}
                onClick={() => window.print()}
                sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2, px: 2.5 }}
              >
                Imprimir Comanda
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Cancel Sale Confirm */}
      <ConfirmDialog
        open={Boolean(cancelVendaId)}
        title="Cancelar Pedido"
        message="Tem certeza que deseja cancelar este pedido? O valor será estornado dos relatórios financeiros e do caixa diário."
        confirmText="Sim, Cancelar Pedido"
        confirmColor="error"
        onConfirm={handleCancelVenda}
        onCancel={() => setCancelVendaId(null)}
      />

      {/* DIÁLOGO INTELIGENTE DE ESTOQUE INSUFICIENTE (BUG-001) */}
      <Dialog
        open={estoqueModalOpen}
        onClose={() => setEstoqueModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            boxShadow: '0 24px 60px rgba(7, 25, 51, 0.22)',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle sx={{ p: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Warning color="warning" sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h6" fontWeight={800} color="warning.dark">
              Estoque insuficiente para concluir a venda
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Um ou mais itens do pedido excedem o saldo atual disponível.
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5 }}>
          <Alert
            severity={empresa?.permitir_estoque_negativo !== false ? 'warning' : 'error'}
            sx={{ mb: 2, borderRadius: 2 }}
          >
            {empresa?.permitir_estoque_negativo !== false ? (
              <span>
                Você pode optar por <b>Cancelar Venda</b> para ajustar os produtos ou <b>Vender Mesmo Assim</b> (o saldo de estoque ficará negativo, um alerta crítico será gerado e a ocorrência será registrada na auditoria).
              </span>
            ) : (
              <span>
                <b>Atenção:</b> O estabelecimento está configurado para <b>Bloquear estoque negativo</b>. É necessário cancelar a venda e repor o estoque ou ajustar o carrinho.
              </span>
            )}
          </Alert>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 1 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Produto</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Saldo Atual</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Qtd. Pedido</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Saldo Resultante</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {itensSemSaldo.map((item) => (
                  <TableRow key={item.produto_id}>
                    <TableCell sx={{ fontWeight: 600 }}>{item.nome}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${item.saldo_disponivel} un`}
                        size="small"
                        color={item.saldo_disponivel <= 0 ? 'error' : 'default'}
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {item.quantidade_solicitada} un
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'error.main' }}>
                      {item.saldo_resultante} un
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setEstoqueModalOpen(false)}
            sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
          >
            Cancelar Venda
          </Button>

          {empresa?.permitir_estoque_negativo !== false && (
            <Button
              variant="contained"
              color="warning"
              disabled={submitting}
              onClick={() => handleSubmitVenda(true)}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <Warning />}
              sx={{ fontWeight: 800, px: 2.5, textTransform: 'none', borderRadius: 2 }}
            >
              Vender Mesmo Assim
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Feedback Toast */}
      <Snackbar
        open={Boolean(successToast)}
        autoHideDuration={4000}
        onClose={() => setSuccessToast(null)}
        message={successToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};
