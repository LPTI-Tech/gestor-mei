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
  ButtonGroup,
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
  Clear,
  Visibility,
  LocalShipping,
  Cancel,
  Print,
  TwoWheeler,
  Storefront,
  Map,
} from '@mui/icons-material';
import api from '../services/api';
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

const FORMAS_PAGTO: FormaPagamento[] = ['Dinheiro', 'PIX', 'Débito', 'Crédito'];
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

  const handleSubmitVenda = async () => {
    if (cartItems.length === 0) {
      alert('Adicione pelo menos um produto ao carrinho antes de finalizar.');
      return;
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
      setSuccessToast(`Pedido #${res.data.numero_pedido || res.data.id} registrado com sucesso! (${formatCurrency(res.data.valor_total)})`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao registrar pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelVenda = async () => {
    if (!cancelVendaId) return;
    try {
      const res = await api.put<Venda>(`/vendas/${cancelVendaId}/cancelar`);
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
      searchProduto === '' || p.nome.toLowerCase().includes(searchProduto.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h5" fontWeight={800} display="flex" alignItems="center" gap={1}>
          <PointOfSale color="primary" /> PDV — Balcão & Delivery Ágil
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monte pedidos com múltiplos itens, selecione balcão ou entrega com cálculo automático de taxa de região e despache motoboy.
        </Typography>
      </Box>

      {/* Main Grid: Catalog (Left) + Cart & Checkout (Right) */}
      <Grid container spacing={2.5}>
        {/* Left Column: Product Catalog */}
        <Grid item xs={12} lg={7}>
          <Card sx={{ height: '100%', borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
              {/* Search & Custom Item bar */}
              <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar produto por nome..."
                  value={searchProduto}
                  onChange={(e) => setSearchProduto(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => setCustomItemModal(true)}
                  sx={{ whiteSpace: 'nowrap', fontWeight: 700, height: 40 }}
                >
                  + Item Avulso
                </Button>
              </Box>

              {/* Category Pills */}
              <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 2 }}>
                {categorias.map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    clickable
                    color={categoriaFilter === cat ? 'primary' : 'default'}
                    onClick={() => setCategoriaFilter(cat)}
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Box>

              {/* Product Grid Cards */}
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : filteredProdutos.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhum produto cadastrado nesta categoria.
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={1.5} sx={{ maxHeight: 520, overflowY: 'auto', pr: 0.5 }}>
                  {filteredProdutos.map((prod) => (
                    <Grid item xs={6} sm={4} key={prod.id}>
                      <Card
                        variant="outlined"
                        onClick={() => handleAddToCart(prod)}
                        sx={{
                          cursor: 'pointer',
                          p: 1.5,
                          borderRadius: 2,
                          transition: 'all 0.15s ease-in-out',
                          '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: 2,
                            transform: 'translateY(-2px)',
                          },
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            {prod.categoria}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: 1.25,
                              mt: 0.5,
                            }}
                          >
                            {prod.nome}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                          <Typography variant="body1" fontWeight={800} color="primary.main">
                            {formatCurrency(prod.preco_venda)}
                          </Typography>
                          <IconButton size="small" color="primary" sx={{ bgcolor: 'action.hover' }}>
                            <Add fontSize="small" />
                          </IconButton>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Shopping Cart & Checkout */}
        <Grid item xs={12} lg={5}>
          <Card
            sx={{
              borderRadius: 3,
              border: 2,
              borderColor: 'primary.main',
              boxShadow: 3,
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              {/* Tipo de Pedido Switch */}
              <Box sx={{ mb: 2 }}>
                <ButtonGroup fullWidth sx={{ borderRadius: 2 }}>
                  <Button
                    variant={tipoPedido === 'BALCAO' ? 'contained' : 'outlined'}
                    color="primary"
                    startIcon={<Storefront />}
                    onClick={() => handleToggleTipoPedido('BALCAO')}
                    sx={{ fontWeight: 800, py: 1 }}
                  >
                    Balcão / Retirada
                  </Button>
                  <Button
                    variant={tipoPedido === 'ENTREGA' ? 'contained' : 'outlined'}
                    color="secondary"
                    startIcon={<LocalShipping />}
                    onClick={() => handleToggleTipoPedido('ENTREGA')}
                    sx={{ fontWeight: 800, py: 1 }}
                  >
                    Entrega Delivery
                  </Button>
                </ButtonGroup>
              </Box>

              {/* Cart Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h6" fontWeight={800} display="flex" alignItems="center" gap={1}>
                  <ShoppingCart color="primary" /> Carrinho ({cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'})
                </Typography>
                {cartItems.length > 0 && (
                  <Button size="small" color="error" onClick={handleClearCart}>
                    Limpar
                  </Button>
                )}
              </Box>

              {/* Client Selection (Optional) */}
              <Box sx={{ mb: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Cliente (Opcional)</InputLabel>
                  <Select
                    value={selectedClienteId}
                    label="Cliente (Opcional)"
                    onChange={(e) => handleClientChange(e.target.value as number | '')}
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
                    sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
                  >
                    <PersonAdd fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Delivery Logistics Fields (Shown when tipoPedido === 'ENTREGA') */}
              {tipoPedido === 'ENTREGA' && (
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, mb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Região de Entrega</InputLabel>
                      <Select
                        value={selectedRegiaoId}
                        label="Região de Entrega"
                        onChange={(e) => handleRegiaoChange(e.target.value as number | '')}
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
                      inputProps={{ style: { textAlign: 'right', fontWeight: 700 } }}
                    />
                  </Box>

                  <TextField
                    fullWidth
                    size="small"
                    label="Endereço de Entrega"
                    placeholder="Rua, número, complemento, bairro"
                    value={enderecoEntrega}
                    onChange={(e) => setEnderecoEntrega(e.target.value)}
                  />

                  <FormControl size="small" fullWidth>
                    <InputLabel>Motoboy (Opcional)</InputLabel>
                    <Select
                      value={selectedMotoboyId}
                      label="Motoboy (Opcional)"
                      onChange={(e) => setSelectedMotoboyId(e.target.value as number | '')}
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

              {/* Cart Items List */}
              <Box
                sx={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 1,
                  mb: 2,
                  bgcolor: 'background.default',
                }}
              >
                {cartItems.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <ShoppingCart color="disabled" sx={{ fontSize: 36, mb: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">
                      Carrinho vazio. Clique nos produtos à esquerda.
                    </Typography>
                  </Box>
                ) : (
                  cartItems.map((item) => (
                    <Box
                      key={item.tempId}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1,
                        borderBottom: 1,
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 0 },
                      }}
                    >
                      <Box sx={{ flexGrow: 1, pr: 1 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {item.descricao}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(item.preco_unitario)} un.
                        </Typography>
                      </Box>

                      {/* Quantity Control */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleUpdateQuantity(item.tempId, -1)}
                          sx={{ p: 0.5 }}
                        >
                          <Remove fontSize="small" />
                        </IconButton>
                        <Typography variant="body2" fontWeight={800} sx={{ minWidth: 20, textAlign: 'center' }}>
                          {item.quantidade}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleUpdateQuantity(item.tempId, 1)}
                          sx={{ p: 0.5 }}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Box>

                      {/* Subtotal & Delete */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 75, justifyContent: 'flex-end' }}>
                        <Typography variant="body2" fontWeight={800} color="primary.main">
                          {formatCurrency(item.subtotal || 0)}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveItem(item.tempId)}
                          sx={{ p: 0.5 }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  ))
                )}
              </Box>

              {/* Subtotals & Taxes */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal dos Itens:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatCurrency(subtotalCart)}
                  </Typography>
                </Box>

                {tipoPedido === 'ENTREGA' && numTaxa > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Taxa de Entrega:
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="secondary.main">
                      +{formatCurrency(numTaxa)}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Desconto (R$):
                  </Typography>
                  <TextField
                    size="small"
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value)}
                    sx={{ width: 100 }}
                    inputProps={{ style: { textAlign: 'right', padding: '4px 8px', fontWeight: 600 } }}
                  />
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight={800}>
                    Total a Pagar:
                  </Typography>
                  <Typography variant="h5" fontWeight={900} color="success.main">
                    {formatCurrency(totalPagar)}
                  </Typography>
                </Box>
              </Box>

              {/* Forma de Pagamento */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  FORMA DE PAGAMENTO:
                </Typography>
                <Grid container spacing={1}>
                  {FORMAS_PAGTO.map((f) => (
                    <Grid item xs={3} key={f}>
                      <Button
                        fullWidth
                        variant={formaPagamento === f ? 'contained' : 'outlined'}
                        color={formaPagamento === f ? 'primary' : 'inherit'}
                        onClick={() => setFormaPagamento(f)}
                        sx={{ fontWeight: 700, py: 1, fontSize: '0.8rem' }}
                      >
                        {f}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* Origem */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  CANAL DE ORIGEM:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {ORIGENS.map((orig) => (
                    <Chip
                      key={orig}
                      label={orig}
                      clickable
                      color={origem === orig ? 'secondary' : 'default'}
                      onClick={() => setOrigem(orig)}
                      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Observações */}
              <TextField
                fullWidth
                size="small"
                label="Observações do Pedido (Opcional)"
                placeholder="Ex: Sem salada, troco para 50"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                sx={{ mb: 2.5 }}
              />

              {/* Checkout Button */}
              <Button
                fullWidth
                variant="contained"
                color="success"
                size="large"
                disabled={cartItems.length === 0 || submitting}
                onClick={handleSubmitVenda}
                startIcon={submitting ? <CircularProgress size={24} color="inherit" /> : <CheckCircle />}
                sx={{
                  py: 1.5,
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  borderRadius: 2,
                  boxShadow: 3,
                }}
              >
                FINALIZAR PEDIDO ({formatCurrency(totalPagar)})
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Sales History */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" fontWeight={800} display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
          <Receipt color="primary" /> Histórico de Pedidos & Vendas Recentes
        </Typography>

        <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Nº Pedido</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Data / Hora</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tipo / Canal</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cliente / Endereço</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Itens do Pedido</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Taxa Entrega</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentVendas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    Nenhuma venda registrada ainda hoje.
                  </TableCell>
                </TableRow>
              ) : (
                recentVendas.map((v) => (
                  <TableRow key={v.id} hover>
                    <TableCell sx={{ fontWeight: 800 }}>{v.numero_pedido || `#${v.id}`}</TableCell>

                    <TableCell sx={{ fontWeight: 600 }}>{formatDateTime(v.data_hora)}</TableCell>

                    <TableCell>
                      <Chip
                        label={v.tipo_pedido}
                        color={v.tipo_pedido === 'ENTREGA' ? 'secondary' : 'default'}
                        size="small"
                        sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {v.origem} • {v.forma_pagamento}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {v.cliente_nome || 'Balcão (Não identificado)'}
                      </Typography>
                      {v.endereco_entrega && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {v.endereco_entrega}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {v.descricao_produto}
                      </Typography>
                      {v.itens && v.itens.length > 0 && (
                        <Typography variant="caption" color="primary.main">
                          {v.itens.length} {v.itens.length === 1 ? 'item discriminado' : 'itens discriminados'}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      {v.taxa_entrega > 0 ? (
                        <Typography variant="body2" fontWeight={700} color="secondary.main">
                          +{formatCurrency(v.taxa_entrega)}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Grátis / Balcão
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={800} color="primary.main">
                        {formatCurrency(v.valor_total)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={v.status_pedido || v.status}
                        size="small"
                        color={v.status === 'Cancelada' ? 'error' : 'success'}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell align="right">
                      <Tooltip title="Imprimir Comanda Térmica">
                        <IconButton size="small" color="primary" onClick={() => handlePrintComanda(v.id)}>
                          <Print fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Ver Detalhes do Pedido">
                        <IconButton size="small" onClick={() => setDetailsVenda(v)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {v.status === 'Concluída' && (
                        <Tooltip title="Cancelar Pedido">
                          <IconButton size="small" color="error" onClick={() => setCancelVendaId(v.id)}>
                            <Cancel fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Modal Add Custom Item */}
      <Dialog open={customItemModal} onClose={() => setCustomItemModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Adicionar Item Avulso</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Descrição do Item / Prato *"
              fullWidth
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              placeholder="Ex: Marmita Personalizada ou Bebida Especial"
            />
            <TextField
              label="Preço Unitário (R$) *"
              fullWidth
              value={customPreco}
              onChange={(e) => setCustomPreco(e.target.value)}
              placeholder="0,00"
            />
            <TextField
              label="Quantidade *"
              type="number"
              fullWidth
              value={customQtd}
              onChange={(e) => setCustomQtd(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomItemModal(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAddCustomItem} sx={{ fontWeight: 700 }}>
            Adicionar ao Carrinho
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Quick Create Client */}
      <Dialog open={quickClientModal} onClose={() => setQuickClientModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Cadastrar Cliente Rápido</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Nome do Cliente *"
              fullWidth
              value={quickClientNome}
              onChange={(e) => setQuickClientNome(e.target.value)}
              placeholder="Ex: João da Silva"
            />
            <TextField
              label="Telefone / WhatsApp"
              fullWidth
              value={quickClientTelefone}
              onChange={(e) => setQuickClientTelefone(e.target.value)}
              placeholder="(11) 98765-4321"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Região de Entrega</InputLabel>
              <Select
                value={quickClientRegiaoId}
                label="Região de Entrega"
                onChange={(e) => setQuickClientRegiaoId(e.target.value as number | '')}
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
              value={quickClientEndereco}
              onChange={(e) => setQuickClientEndereco(e.target.value)}
              placeholder="Rua, número, complemento"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickClientModal(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleQuickCreateClient} sx={{ fontWeight: 700 }}>
            Salvar e Vincular
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Detalhes da Venda */}
      <Dialog open={Boolean(detailsVenda)} onClose={() => setDetailsVenda(null)} maxWidth="sm" fullWidth>
        {detailsVenda && (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>
              Detalhes do Pedido #{detailsVenda.numero_pedido || detailsVenda.id}
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Data:</strong> {formatDateTime(detailsVenda.data_hora)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Cliente:</strong> {detailsVenda.cliente_nome || 'Balcão (Não identificado)'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Tipo:</strong> {detailsVenda.tipo_pedido} | <strong>Status:</strong> {detailsVenda.status_pedido}
                </Typography>
                {detailsVenda.endereco_entrega && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Endereço de Entrega:</strong> {detailsVenda.endereco_entrega}
                  </Typography>
                )}
                {detailsVenda.motoboy_nome && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Motoboy:</strong> {detailsVenda.motoboy_nome}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  <strong>Canal:</strong> {detailsVenda.origem} | <strong>Pagamento:</strong> {detailsVenda.forma_pagamento}
                </Typography>
              </Box>

              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                Itens do Pedido:
              </Typography>
              <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'background.default' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Qtd</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Unitário</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailsVenda.itens && detailsVenda.itens.length > 0 ? (
                      detailsVenda.itens.map((it) => (
                        <TableRow key={it.id}>
                          <TableCell>{it.descricao}</TableCell>
                          <TableCell>{it.quantidade}</TableCell>
                          <TableCell>{formatCurrency(it.preco_unitario)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {formatCurrency(it.subtotal)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell>{detailsVenda.descricao_produto}</TableCell>
                        <TableCell>{detailsVenda.quantidade}</TableCell>
                        <TableCell>{formatCurrency(detailsVenda.preco_unitario)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatCurrency(detailsVenda.valor_total)}
                        </TableCell>
                      </TableRow>
                    )}

                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell colSpan={3} sx={{ fontWeight: 800 }}>
                        SUBTOTAL DOS ITENS
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        {formatCurrency(detailsVenda.valor_subtotal || detailsVenda.valor_total)}
                      </TableCell>
                    </TableRow>
                    {detailsVenda.taxa_entrega > 0 && (
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell colSpan={3} sx={{ fontWeight: 700, color: 'secondary.main' }}>
                          TAXA DE ENTREGA
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'secondary.main' }}>
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
                      <TableCell colSpan={3} sx={{ fontWeight: 900, fontSize: '1rem' }}>
                        TOTAL GERAL
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, color: 'primary.main', fontSize: '1.05rem' }}>
                        {formatCurrency(detailsVenda.valor_total)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsVenda(null)}>Fechar</Button>
            </DialogActions>
          </>
        )}
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
                onClick={() => window.print()}
                sx={{ fontWeight: 800 }}
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
