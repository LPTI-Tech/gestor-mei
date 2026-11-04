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
  PersonAdd,
  Search,
  WhatsApp,
  Phone,
  Edit,
  Delete,
  LocationOn,
  ReceiptLong,
  AttachMoney,
  PeopleAlt,
} from '@mui/icons-material';
import api from '../services/api';
import { Cliente, ClienteCreate } from '../types';
import { formatCurrency, formatDateTime } from '../services/exportUtils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatCard } from '../components/StatCard';

export const Clientes: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [apenasAtivos, setApenasAtivos] = useState<boolean>(true);

  // Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<ClienteCreate>({
    nome: '',
    telefone: '',
    cpf_cnpj: '',
    email: '',
    endereco: '',
    observacoes: '',
    ativo: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Delete Confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const res = await api.get<Cliente[]>('/clientes', {
        params: {
          q: search || undefined,
          apenas_ativos: apenasAtivos,
        },
      });
      setClientes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClientes();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, apenasAtivos]);

  const handleOpenModal = (cli?: Cliente) => {
    if (cli) {
      setEditingCliente(cli);
      setFormData({
        nome: cli.nome,
        telefone: cli.telefone || '',
        cpf_cnpj: cli.cpf_cnpj || '',
        email: cli.email || '',
        endereco: cli.endereco || '',
        observacoes: cli.observacoes || '',
        ativo: cli.ativo,
      });
    } else {
      setEditingCliente(null);
      setFormData({
        nome: '',
        telefone: '',
        cpf_cnpj: '',
        email: '',
        endereco: '',
        observacoes: '',
        ativo: true,
      });
    }
    setFormError(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingCliente(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      setFormError('O nome do cliente é obrigatório.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      if (editingCliente) {
        await api.put(`/clientes/${editingCliente.id}`, formData);
      } else {
        await api.post('/clientes', formData);
      }

      handleCloseModal();
      fetchClientes();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Erro ao salvar cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/clientes/${deleteId}`);
      setDeleteId(null);
      fetchClientes();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao excluir/desativar cliente.');
    }
  };

  const formatWhatsAppUrl = (phone?: string | null) => {
    if (!phone) return null;
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) return null;
    const countryCode = cleanDigits.length === 11 || cleanDigits.length === 10 ? `55${cleanDigits}` : cleanDigits;
    return `https://wa.me/${countryCode}?text=${encodeURI('Olá! Entramos em contato da Marmitaria / Comércio.')}`;
  };

  const totalGeralGasto = clientes.reduce((acc, c) => acc + (c.total_compras || 0), 0);
  const totalPedidos = clientes.reduce((acc, c) => acc + (c.qtd_pedidos || 0), 0);

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
            <PeopleAlt color="primary" /> Cadastro de Clientes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Mantenha o cadastro dos seus clientes fiéis, endereço de entrega e histórico de compras.
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<PersonAdd />}
          onClick={() => handleOpenModal()}
          sx={{ fontWeight: 700, height: 44, px: 3, borderRadius: 2 }}
        >
          Novo Cliente
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Total de Clientes"
            value={clientes.length.toString()}
            subtitle="Base cadastrada ativa"
            icon={<PeopleAlt />}
            color="#1976D2"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Total em Pedidos Realizados"
            value={formatCurrency(totalGeralGasto)}
            subtitle="Faturamento gerado por clientes"
            icon={<AttachMoney />}
            color="#2E7D32"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Qtd Total de Pedidos"
            value={totalPedidos.toString()}
            subtitle="Entregas e retiradas fidelizadas"
            icon={<ReceiptLong />}
            color="#7B1FA2"
          />
        </Grid>
      </Grid>

      {/* Search & Filter Toolbar */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar por nome, telefone, CPF/CNPJ..."
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
                variant={apenasAtivos ? 'contained' : 'outlined'}
                size="small"
                color="primary"
                onClick={() => setApenasAtivos(true)}
              >
                Apenas Ativos
              </Button>
              <Button
                variant={!apenasAtivos ? 'contained' : 'outlined'}
                size="small"
                color="inherit"
                onClick={() => setApenasAtivos(false)}
              >
                Todos
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Clientes Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : clientes.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            Nenhum cliente encontrado.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cadastre seu primeiro cliente para vinculá-lo facilmente às vendas no balcão e delivery.
          </Typography>
          <Button variant="contained" startIcon={<PersonAdd />} onClick={() => handleOpenModal()}>
            Cadastrar Cliente
          </Button>
        </Card>
      ) : (
        <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Nome / Razão Social</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Contato</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Endereço</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total Compras</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Qtd Pedidos</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clientes.map((c) => {
                const waUrl = formatWhatsAppUrl(c.telefone);
                return (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {c.nome}
                      </Typography>
                      {c.cpf_cnpj && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          CPF/CNPJ: {c.cpf_cnpj}
                        </Typography>
                      )}
                      {c.observacoes && (
                        <Typography variant="caption" color="primary.main" display="block">
                          Obs: {c.observacoes}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">{c.telefone || '-'}</Typography>
                        {waUrl && (
                          <Tooltip title="Abrir conversa no WhatsApp">
                            <IconButton
                              size="small"
                              color="success"
                              component="a"
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ p: 0.5 }}
                            >
                              <WhatsApp fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {c.telefone && (
                          <Tooltip title="Ligar">
                            <IconButton
                              size="small"
                              color="primary"
                              component="a"
                              href={`tel:${c.telefone}`}
                              sx={{ p: 0.5 }}
                            >
                              <Phone fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                      {c.email && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {c.email}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      {c.endereco ? (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                          <LocationOn fontSize="small" color="action" sx={{ mt: 0.2 }} />
                          <Typography variant="body2">{c.endereco}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Não informado
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {formatCurrency(c.total_compras || 0)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={`${c.qtd_pedidos || 0} pedido(s)`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={c.ativo ? 'Ativo' : 'Inativo'}
                        color={c.ativo ? 'success' : 'default'}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell align="right">
                      <Tooltip title="Editar Cliente">
                        <IconButton size="small" onClick={() => handleOpenModal(c)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir ou Desativar">
                        <IconButton size="small" color="error" onClick={() => setDeleteId(c.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal Cadastrar / Editar Cliente */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
          <DialogContent dividers>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Nome Completo / Empresa *"
                  fullWidth
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Dra. Juliana Mendes ou Marmitaria Central"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Telefone / WhatsApp"
                  fullWidth
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(11) 98765-4321"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="CPF ou CNPJ (Opcional)"
                  fullWidth
                  value={formData.cpf_cnpj}
                  onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="E-mail"
                  type="email"
                  fullWidth
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="cliente@email.com"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Endereço de Entrega Completo"
                  fullWidth
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, número, complemento, bairro, referência"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Observações / Preferências"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Ex: Marmita executiva sem salada de maionese; entrega na portaria 2."
                />
              </Grid>
            </Grid>
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
              {submitting ? <CircularProgress size={20} color="inherit" /> : 'Salvar Cliente'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Excluir / Desativar Cliente"
        message="Tem certeza que deseja remover este cliente? Se ele já possuir histórico de vendas vinculadas, ele será inativado para manter a integridade dos seus relatórios."
        confirmText="Confirmar"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
};
