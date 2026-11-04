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
  Avatar,
  Divider,
  Switch,
  FormControlLabel,
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
  Close,
  PersonOutline,
  ContactPhoneOutlined,
  HomeOutlined,
  NotesOutlined,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import api from '../services/api';
import { Cliente, ClienteCreate } from '../types';
import { formatCurrency } from '../services/exportUtils';
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

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'C';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const totalGeralGasto = clientes.reduce((acc, c) => acc + (c.total_compras || 0), 0);
  const totalPedidos = clientes.reduce((acc, c) => acc + (c.qtd_pedidos || 0), 0);

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
              <PeopleAlt sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.025em' }}>
              Clientes
            </Typography>
            <Chip
              label="CRM MEI"
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
            Gerenciamento de clientes fiéis, canais de contato, endereços e inteligência de compras.
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<PersonAdd />}
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
          Novo Cliente
        </Button>
      </Box>

      {/* KPI Cards (Stripe Standard) */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
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

      {/* Toolbar de Busca (Asaas Standard) */}
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
          <Grid item xs={12} md={7} lg={8}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar por nome, telefone, WhatsApp, CPF/CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          <Grid
            item
            xs={12}
            md={5}
            lg={4}
            sx={{
              display: 'flex',
              gap: 1,
              justifyContent: { xs: 'flex-start', md: 'flex-end' },
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                p: 0.5,
                borderRadius: 2,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#F1F5F9'),
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Button
                size="small"
                onClick={() => setApenasAtivos(true)}
                sx={{
                  px: 2,
                  py: 0.6,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: 1.5,
                  textTransform: 'none',
                  bgcolor: apenasAtivos
                    ? (theme) => (theme.palette.mode === 'dark' ? 'primary.main' : '#FFFFFF')
                    : 'transparent',
                  color: apenasAtivos
                    ? (theme) => (theme.palette.mode === 'dark' ? '#fff' : 'primary.main')
                    : 'text.secondary',
                  boxShadow: apenasAtivos ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  '&:hover': {
                    bgcolor: apenasAtivos
                      ? (theme) => (theme.palette.mode === 'dark' ? 'primary.dark' : '#FFFFFF')
                      : 'rgba(0,0,0,0.04)',
                  },
                }}
              >
                Apenas Ativos
              </Button>
              <Button
                size="small"
                onClick={() => setApenasAtivos(false)}
                sx={{
                  px: 2,
                  py: 0.6,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: 1.5,
                  textTransform: 'none',
                  bgcolor: !apenasAtivos
                    ? (theme) => (theme.palette.mode === 'dark' ? 'primary.main' : '#FFFFFF')
                    : 'transparent',
                  color: !apenasAtivos
                    ? (theme) => (theme.palette.mode === 'dark' ? '#fff' : 'primary.main')
                    : 'text.secondary',
                  boxShadow: !apenasAtivos ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  '&:hover': {
                    bgcolor: !apenasAtivos
                      ? (theme) => (theme.palette.mode === 'dark' ? 'primary.dark' : '#FFFFFF')
                      : 'rgba(0,0,0,0.04)',
                  },
                }}
              >
                Todos
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Clientes Table / Empty State */}
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={36} thickness={4} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Carregando base de clientes...
          </Typography>
        </Box>
      ) : clientes.length === 0 ? (
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
            <PeopleAlt sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 440, mx: 'auto' }}>
            {search
              ? `Não foram encontrados clientes correspondentes à busca "${search}". Tente buscar por outros termos ou limpe o filtro.`
              : 'Cadastre seus clientes fiéis para agilizar pedidos no balcão, entregas de delivery e acompanhar o histórico de compras e faturamento.'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAdd />}
            onClick={() => handleOpenModal()}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 3, height: 40 }}
          >
            Cadastrar Cliente
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
                  Cliente / Razão Social
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
                  Contato & Canais
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
                  Endereço de Entrega
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
                  Total Compras
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
                  Pedidos
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
              {clientes.map((c) => {
                const waUrl = formatWhatsAppUrl(c.telefone);
                return (
                  <TableRow
                    key={c.id}
                    hover
                    sx={{
                      '&:hover': {
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#FBFDFF',
                      },
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Nome & Documento com Avatar de Iniciais */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            bgcolor: c.ativo ? 'rgba(25, 118, 210, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                            color: c.ativo ? 'primary.main' : 'text.disabled',
                            border: '1px solid',
                            borderColor: c.ativo ? 'rgba(25, 118, 210, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                          }}
                        >
                          {getInitials(c.nome)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>
                            {c.nome}
                          </Typography>
                          {c.cpf_cnpj ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontFeatureSettings: '"tnum"', display: 'block' }}
                            >
                              Doc: {c.cpf_cnpj}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.disabled" display="block">
                              Doc. não informado
                            </Typography>
                          )}
                          {c.observacoes && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'primary.main',
                                display: 'block',
                                maxWidth: 220,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              Obs: {c.observacoes}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Contato & WhatsApp */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontFeatureSettings: '"tnum"', fontWeight: 500, color: 'text.primary' }}
                        >
                          {c.telefone || '-'}
                        </Typography>
                        {waUrl && (
                          <Tooltip title="Abrir conversa no WhatsApp">
                            <IconButton
                              size="small"
                              component="a"
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                p: 0.6,
                                bgcolor: 'rgba(37, 211, 102, 0.1)',
                                color: '#1EBE5D',
                                '&:hover': { bgcolor: 'rgba(37, 211, 102, 0.22)' },
                              }}
                            >
                              <WhatsApp sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {c.telefone && (
                          <Tooltip title="Ligar para o cliente">
                            <IconButton
                              size="small"
                              component="a"
                              href={`tel:${c.telefone}`}
                              sx={{
                                p: 0.6,
                                bgcolor: 'rgba(25, 118, 210, 0.08)',
                                color: 'primary.main',
                                '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.18)' },
                              }}
                            >
                              <Phone sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                      {c.email && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.3 }}>
                          {c.email}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Endereço */}
                    <TableCell sx={{ py: 1.5 }}>
                      {c.endereco ? (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, maxWidth: 260 }}>
                          <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mt: 0.2, flexShrink: 0 }} />
                          <Typography variant="body2" color="text.primary">
                            {c.endereco}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          Não informado
                        </Typography>
                      )}
                    </TableCell>

                    {/* Total Compras */}
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ fontFeatureSettings: '"tnum"', color: '#1B5E20' }}
                      >
                        {formatCurrency(c.total_compras || 0)}
                      </Typography>
                    </TableCell>

                    {/* Qtd Pedidos */}
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Chip
                        label={`${c.qtd_pedidos || 0} pedidos`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          fontFeatureSettings: '"tnum"',
                          bgcolor: 'rgba(123, 31, 162, 0.08)',
                          color: '#7B1FA2',
                          border: '1px solid rgba(123, 31, 162, 0.2)',
                          height: 24,
                        }}
                      />
                    </TableCell>

                    {/* Status */}
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Chip
                        icon={
                          c.ativo ? (
                            <CheckCircle sx={{ '&&': { fontSize: 14, color: '#2E7D32' } }} />
                          ) : (
                            <Cancel sx={{ '&&': { fontSize: 14, color: '#64748B' } }} />
                          )
                        }
                        label={c.ativo ? 'Ativo' : 'Inativo'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          bgcolor: c.ativo ? 'rgba(46, 125, 50, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                          color: c.ativo ? '#2E7D32' : '#64748B',
                          border: '1px solid',
                          borderColor: c.ativo ? 'rgba(46, 125, 50, 0.22)' : 'rgba(100, 116, 139, 0.22)',
                          height: 24,
                        }}
                      />
                    </TableCell>

                    {/* Ações */}
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="Editar Cliente">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenModal(c)}
                            sx={{
                              p: 0.8,
                              color: 'text.secondary',
                              '&:hover': { color: 'primary.main', bgcolor: 'rgba(25, 118, 210, 0.08)' },
                            }}
                          >
                            <Edit sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir ou Desativar">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteId(c.id)}
                            sx={{
                              p: 0.8,
                              '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.08)' },
                            }}
                          >
                            <Delete sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal Cadastrar / Editar Cliente (Seções Agrupadas) */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
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
        <form onSubmit={handleSubmit}>
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
                <PeopleAlt sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                  {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {editingCliente ? 'Atualize as informações do cliente' : 'Cadastre um novo cliente no sistema'}
                </Typography>
              </Box>
            </Box>
            <IconButton size="small" onClick={handleCloseModal} sx={{ color: 'text.secondary' }}>
              <Close sx={{ fontSize: 20 }} />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 3 }}>
            {formError && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                {formError}
              </Alert>
            )}

            {/* SEÇÃO 1: Dados Pessoais / Identificação */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <PersonOutline sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                  Identificação do Cliente
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Nome Completo / Razão Social *"
                    fullWidth
                    required
                    size="small"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Dra. Juliana Mendes ou Marmitaria Central"
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                </Grid>

                <Grid item xs={12} sm={7}>
                  <TextField
                    label="CPF ou CNPJ (Opcional)"
                    fullWidth
                    size="small"
                    value={formData.cpf_cnpj}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                    placeholder="000.000.000-00"
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
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
                        {formData.ativo ? 'Cliente Ativo' : 'Cliente Inativo'}
                      </Typography>
                    }
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 2.5 }} />

            {/* SEÇÃO 2: Contato */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <ContactPhoneOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                  Canais de Contato
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Telefone / WhatsApp"
                    fullWidth
                    size="small"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(11) 98765-4321"
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="E-mail"
                    type="email"
                    fullWidth
                    size="small"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cliente@email.com"
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 2.5 }} />

            {/* SEÇÃO 3: Endereço de Entrega */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <HomeOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                  Logística & Endereço de Entrega
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Endereço de Entrega Completo"
                    fullWidth
                    size="small"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua, número, complemento, bairro, referência para entregador"
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 2.5 }} />

            {/* SEÇÃO 4: Observações e Preferências */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <NotesOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                  Anotações & Preferências
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Observações / Preferências de Atendimento"
                    fullWidth
                    size="small"
                    multiline
                    rows={2.5}
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Ex: Marmita executiva sem salada de maionese; entrega na portaria 2 com interfone 104."
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>

          <DialogActions
            sx={{
              p: 2.5,
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'flex-end',
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
