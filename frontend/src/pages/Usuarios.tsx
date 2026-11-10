import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
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
  Switch,
  FormControlLabel,
  Avatar,
  Tooltip,
  Alert,
  Grid,
  InputAdornment,
} from '@mui/material';
import {
  People,
  Add,
  Delete,
  Edit,
  Person,
  AdminPanelSettings,
  BusinessCenter,
  VpnKey,
  BadgeOutlined,
  Visibility,
  VisibilityOff,
  Search,
  Schedule,
  PersonAdd,
  Business,
  SwapHoriz,
} from '@mui/icons-material';
import api from '../services/api';
import { User, UserRole, EmpresaMasterListItem } from '../types';
import { formatDateTime } from '../services/exportUtils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';

export const Usuarios: React.FC = () => {
  const { user: currentUser, isMaster } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaMasterListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busca, setBusca] = useState<string>('');
  const [empresaFiltro, setEmpresaFiltro] = useState<number | 'TODAS'>('TODAS');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Criar / Editar Usuário
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('OPERATOR');
  const [formEmpresaId, setFormEmpresaId] = useState<number | ''>('');
  const [formAtivo, setFormAtivo] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Redefinir Senha
  const [resetModalOpen, setResetModalOpen] = useState<boolean>(false);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Modal Alterar Perfil
  const [roleModalOpen, setRoleModalOpen] = useState<boolean>(false);
  const [roleTargetUser, setRoleTargetUser] = useState<User | null>(null);
  const [novoRole, setNovoRole] = useState<UserRole>('OPERATOR');
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Modal Transferir Propriedade (Exclusivo MASTER)
  const [transferModalOpen, setTransferModalOpen] = useState<boolean>(false);
  const [transferEmpresaId, setTransferEmpresaId] = useState<number | ''>('');
  const [transferNovoOwnerId, setTransferNovoOwnerId] = useState<number | ''>('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Diálogo Excluir
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteNome, setDeleteNome] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get<User[]>('/users');
      setUsers(res.data);
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err);
      setFeedback({ type: 'error', text: 'Não foi possível carregar a lista de usuários.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmpresas = async () => {
    if (!isMaster) return;
    try {
      const res = await api.get<EmpresaMasterListItem[]>('/empresa/todas');
      setEmpresas(res.data);
      if (res.data.length > 0 && formEmpresaId === '') {
        setFormEmpresaId(res.data[0].id);
      }
    } catch (err) {
      console.error('Erro ao listar empresas para MASTER:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    if (isMaster) {
      fetchEmpresas();
    }
  }, [isMaster]);

  // Handlers Modal Criar / Editar
  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setFormNome('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('OPERATOR');
    setFormEmpresaId(empresas.length > 0 ? empresas[0].id : (currentUser?.empresa_id || ''));
    setFormAtivo(true);
    setShowPassword(false);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUserId(u.id);
    setFormNome(u.nome);
    setFormEmail(u.email);
    setFormPassword('');
    setFormRole(u.role);
    setFormEmpresaId(u.empresa_id || '');
    setFormAtivo(u.ativo);
    setShowPassword(false);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (editingUserId) {
        const payload: any = {
          nome: formNome,
          email: formEmail,
          role: formRole,
          ativo: formAtivo,
        };
        if (formPassword) payload.password = formPassword;
        await api.put(`/users/${editingUserId}`, payload);
        setFeedback({ type: 'success', text: `Dados de '${formNome}' atualizados com sucesso!` });
      } else {
        const payload: any = {
          nome: formNome,
          email: formEmail,
          password: formPassword,
          role: formRole,
          ativo: formAtivo,
        };
        if (isMaster) {
          if (formRole === 'MASTER') {
            payload.empresa_id = null;
          } else if (formEmpresaId) {
            payload.empresa_id = formEmpresaId;
  
          } else {
            setFormError('Selecione a Empresa de Destino para este usuário.');
            setSubmitting(false);
            return;
          }
        }
        await api.post('/users', payload);
        setFeedback({ type: 'success', text: `Usuário '${formNome}' cadastrado com sucesso!` });
      }
      setModalOpen(false);
      fetchUsers();
      if (isMaster) fetchEmpresas();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erro ao salvar informações do usuário.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers Redefinir Senha
  const handleOpenResetModal = (u: User) => {
    setTargetUser(u);
    setNovaSenha('');
    setConfirmarSenha('');
    setShowResetPassword(false);
    setResetError(null);
    setResetModalOpen(true);
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    setResetError(null);

    if (novaSenha.length < 4) {
      setResetError('A nova senha deve possuir no mínimo 4 caracteres.');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setResetError('A confirmação de senha não coincide com a nova senha digitada.');
      return;
    }

    try {
      setResetSubmitting(true);
      await api.put(`/users/${targetUser.id}/redefinir-senha`, {
        nova_senha: novaSenha,
      });
      setResetModalOpen(false);
      setFeedback({ type: 'success', text: `Senha do usuário '${targetUser.nome}' redefinida com sucesso!` });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erro ao redefinir senha.';
      setResetError(msg);
    } finally {
      setResetSubmitting(false);
    }
  };

  // Handlers Alterar Perfil
  const handleOpenRoleModal = (u: User) => {
    setRoleTargetUser(u);
    setNovoRole(u.role);
    setRoleError(null);
    setRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleTargetUser) return;
    setRoleError(null);

    try {
      setRoleSubmitting(true);
      await api.put(`/users/${roleTargetUser.id}/alterar-perfil`, {
        novo_perfil: novoRole,
      });
      setRoleModalOpen(false);
      setFeedback({ type: 'success', text: `Perfil de '${roleTargetUser.nome}' alterado com sucesso!` });
      fetchUsers();
      if (isMaster) fetchEmpresas();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erro ao alterar perfil.';
      setRoleError(msg);
    } finally {
      setRoleSubmitting(false);
    }
  };

  // Handlers Transferir Propriedade MASTER
  const handleOpenTransferModal = () => {
    setTransferEmpresaId(empresas.length > 0 ? empresas[0].id : '');
    setTransferNovoOwnerId('');
    setTransferError(null);
    setTransferModalOpen(true);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferEmpresaId || !transferNovoOwnerId) {
      setTransferError('Selecione a empresa e o novo titular.');
      return;
    }
    setTransferError(null);

    try {
      setTransferSubmitting(true);
      const res = await api.post(`/empresa/${transferEmpresaId}/transferir-propriedade`, {
        novo_owner_user_id: Number(transferNovoOwnerId),
      });
      setTransferModalOpen(false);
      setFeedback({ type: 'success', text: res.data.message || 'Propriedade transferida com sucesso!' });
      fetchUsers();
      fetchEmpresas();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erro ao transferir propriedade.';
      setTransferError(msg);
    } finally {
      setTransferSubmitting(false);
    }
  };

  // Alternar Status Ativo/Inativo
  const handleToggleStatus = async (u: User) => {
    try {
      await api.put(`/users/${u.id}/toggle-status`);
      setFeedback({
        type: 'success',
        text: `Usuário '${u.nome}' foi ${u.ativo ? 'bloqueado' : 'ativado'} com sucesso!`,
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao alterar status do usuário.');
    }
  };

  // Excluir Usuário
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/users/${deleteId}`);
      setFeedback({ type: 'success', text: `Usuário '${deleteNome || ''}' excluído com sucesso.` });
      setDeleteId(null);
      setDeleteNome(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao excluir usuário.');
    }
  };

  // Helpers de visualização por Perfil
  const getRoleConfig = (role: UserRole) => {
    switch (role) {
      case 'MASTER':
        return {
          label: 'Administrador Global (MASTER)',
          color: 'error' as const,
          bgColor: '#b71c1c',
          icon: <AdminPanelSettings fontSize="small" />,
        };
      case 'OWNER':
      case 'ADMIN':
        return {
          label: 'Proprietário (OWNER)',
          color: 'secondary' as const,
          bgColor: '#7b1fa2',
          icon: <AdminPanelSettings fontSize="small" />,
        };
      case 'CONSULTOR':
        return {
          label: 'Consultor LPTI Tech',
          color: 'info' as const,
          bgColor: '#0288d1',
          icon: <BusinessCenter fontSize="small" />,
        };
      case 'OPERATOR':
      case 'OPERADOR':
      default:
        return {
          label: 'Operador de Caixa',
          color: 'default' as const,
          bgColor: '#455a64',
          icon: <Person fontSize="small" />,
        };
    }
  };

  // Métricas
  const totalUsuarios = users.length;
  const totalOwners = users.filter((u) => u.role === 'OWNER' || u.role === 'ADMIN').length;
  const totalOperadores = users.filter((u) => u.role === 'OPERATOR' || u.role === 'OPERADOR').length;
  const totalConsultores = users.filter((u) => u.role === 'CONSULTOR').length;
  const totalMasters = users.filter((u) => u.role === 'MASTER').length;

  // Filtragem da tabela
  const usersFiltrados = users.filter((u) => {
    if (empresaFiltro !== 'TODAS' && u.empresa_id !== empresaFiltro) {
      return false;
    }
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (
      u.nome.toLowerCase().includes(termo) ||
      u.email.toLowerCase().includes(termo) ||
      (u.empresa_nome && u.empresa_nome.toLowerCase().includes(termo))
    );
  });

  return (
    <Box sx={{ pb: 6 }}>
      {/* Cabeçalho */}
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
            <People color="primary" /> Gestão de Usuários & RBAC
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isMaster
              ? 'Painel MASTER LPTI Tech: Administração global de empresas clientes, titulares (OWNER) e equipe.'
              : 'Controle os acessos internos da sua empresa com perfis de Proprietário (OWNER), Consultor e Operadores.'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {isMaster && (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<SwapHoriz />}
              onClick={handleOpenTransferModal}
              sx={{ fontWeight: 700, height: 44, borderRadius: 2 }}
            >
              Transferir Titularidade
            </Button>
          )}

          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={handleOpenCreateModal}
            sx={{ fontWeight: 700, height: 44, borderRadius: 2 }}
          >
            Novo Usuário
          </Button>
        </Box>
      </Box>

      {/* Alerta de Feedback */}
      {feedback && (
        <Alert
          severity={feedback.type}
          onClose={() => setFeedback(null)}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {feedback.text}
        </Alert>
      )}

      {/* Cards de Resumo Executivo */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 48, height: 48 }}>
                <People />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  USUÁRIOS ATIVOS
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {totalUsuarios}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#ede7f6', color: '#7b1fa2', width: 48, height: 48 }}>
                <AdminPanelSettings />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  PROPRIETÁRIOS (OWNER)
                </Typography>
                <Typography variant="h5" fontWeight={800} color="#7b1fa2">
                  {totalOwners}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#eceff1', color: '#455a64', width: 48, height: 48 }}>
                <Person />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  OPERADORES
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {totalOperadores}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#e1f5fe', color: '#0288d1', width: 48, height: 48 }}>
                <BusinessCenter />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  CONSULTORES LPTI
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {totalConsultores}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {isMaster && (
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid rgba(183, 28, 28, 0.2)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#ffebee', color: '#b71c1c', width: 48, height: 48 }}>
                  <AdminPanelSettings />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    ADMINISTRADORES MASTER
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="#b71c1c">
                    {totalMasters}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Barra de Filtro / Busca */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Buscar por nome, e-mail ou empresa..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          sx={{ width: { xs: '100%', sm: 320 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />

        {isMaster && (
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Filtrar por Empresa</InputLabel>
            <Select
              value={empresaFiltro}
              label="Filtrar por Empresa"
              onChange={(e) => setEmpresaFiltro(e.target.value as any)}
            >
              <MenuItem value="TODAS">🏢 Todas as Empresas</MenuItem>
              {empresas.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.nome_fantasia}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Tabela de Usuários */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Usuário</TableCell>
                {isMaster && <TableCell sx={{ fontWeight: 700 }}>Empresa</TableCell>}
                <TableCell sx={{ fontWeight: 700 }}>Perfil / Nível</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Último Acesso</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Criado Por</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usersFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMaster ? 7 : 6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Nenhum usuário encontrado com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                usersFiltrados.map((u) => {
                  const roleConfig = getRoleConfig(u.role);
                  const isOwnerUser = u.role === 'OWNER' || u.role === 'ADMIN';
                  const isSelf = u.id === currentUser?.id;

                  return (
                    <TableRow key={u.id} hover>
                      {/* Usuário (Avatar + Nome + Email) */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 38,
                              height: 38,
                              bgcolor: roleConfig.bgColor,
                              fontWeight: 700,
                              fontSize: '0.9rem',
                            }}
                          >
                            {u.nome.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={700}>
                              {u.nome} {isSelf && <Typography component="span" variant="caption" color="primary">(Você)</Typography>}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {u.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Empresa (Exibido para MASTER) */}
                      {isMaster && (
                        <TableCell>
                          <Chip
                            icon={<Business fontSize="small" />}
                            label={u.empresa_nome || `Empresa #${u.empresa_id || '-'}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: '0.78rem' }}
                          />
                        </TableCell>
                      )}

                      {/* Perfil */}
                      <TableCell>
                        <Chip
                          icon={roleConfig.icon}
                          label={roleConfig.label}
                          size="small"
                          color={roleConfig.color}
                          sx={{ fontWeight: 600, fontSize: '0.78rem' }}
                        />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={u.ativo}
                              disabled={isOwnerUser && !isMaster}
                              onChange={() => handleToggleStatus(u)}
                              color="primary"
                            />
                          }
                          label={
                            <Typography variant="caption" fontWeight={600} color={u.ativo ? 'success.main' : 'text.disabled'}>
                              {u.ativo ? 'Ativo' : 'Bloqueado'}
                            </Typography>
                          }
                          sx={{ m: 0 }}
                        />
                      </TableCell>

                      {/* Último Acesso */}
                      <TableCell>
                        {u.ultimo_acesso ? (
                          <Typography variant="body2" fontSize="0.82rem">
                            {formatDateTime(u.ultimo_acesso)}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Nunca acessou
                          </Typography>
                        )}
                      </TableCell>

                      {/* Criado Por */}
                      <TableCell>
                        <Typography variant="body2" fontSize="0.82rem">
                          {u.criado_por_nome || 'Sistema (Inicial)'}
                        </Typography>
                      </TableCell>

                      {/* Ações */}
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          {/* Editar */}
                          <Tooltip title="Editar Dados">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEditModal(u)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {/* Redefinir Senha */}
                          <Tooltip title="Redefinir Senha">
                            <IconButton size="small" color="warning" onClick={() => handleOpenResetModal(u)}>
                              <VpnKey fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {/* Alterar Perfil */}
                          <Tooltip title="Alterar Perfil">
                            <IconButton size="small" color="info" onClick={() => handleOpenRoleModal(u)}>
                              <BadgeOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {/* Excluir */}
                          <Tooltip
                            title={
                              isOwnerUser && !isMaster
                                ? 'O titular da empresa (OWNER) só pode ser alterado ou transferido pelo MASTER.'
                                : isSelf
                                ? 'Você não pode excluir sua própria conta em uso.'
                                : 'Excluir Usuário'
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={(isOwnerUser && !isMaster) || isSelf}
                                onClick={() => {
                                  setDeleteId(u.id);
                                  setDeleteNome(u.nome);
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ==================================================================== */}
      {/* 1. Modal Criar / Editar Usuário */}
      {/* ==================================================================== */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleSubmitUser}>
          <DialogTitle fontWeight={700}>
            {editingUserId ? 'Editar Dados do Usuário' : 'Novo Membro da Equipe'}
          </DialogTitle>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}

            {isMaster && !editingUserId && (
              <FormControl fullWidth margin="normal" required={formRole !== 'MASTER'}>
                <InputLabel>Empresa de Destino</InputLabel>
                <Select
                  value={formRole === 'MASTER' ? '' : formEmpresaId}
                  disabled={formRole === 'MASTER'}
                  label="Empresa de Destino"
                  onChange={(e) => setFormEmpresaId(Number(e.target.value))}
                >
                  {empresas.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.nome_fantasia} (CNPJ: {emp.cnpj})
                    </MenuItem>
                  ))}
                </Select>
                {formRole === 'MASTER' && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    ℹ️ Perfil MASTER possui acesso global a todas as empresas. Não requer empresa de destino vinculada.
                  </Typography>
                )}
              </FormControl>
            )}

            <TextField
              fullWidth
              label="Nome Completo"
              required
              margin="normal"
              value={formNome}
              onChange={(e) => setFormNome(e.target.value)}
              autoFocus
            />

            <TextField
              fullWidth
              label="E-mail de Acesso"
              type="email"
              required
              margin="normal"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />

            {!editingUserId && (
              <TextField
                fullWidth
                label="Senha Inicial"
                type={showPassword ? 'text' : 'password'}
                required
                margin="normal"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                helperText="Mínimo de 4 caracteres"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}

            <FormControl fullWidth margin="normal">
              <InputLabel>Cargo / Permissão</InputLabel>
              <Select
                value={formRole}
                label="Cargo / Permissão"
                onChange={(e) => setFormRole(e.target.value as UserRole)}
              >
                <MenuItem value="OPERATOR">Operador de Caixa (Abre/fecha caixa e registra vendas)</MenuItem>
                <MenuItem value="CONSULTOR">Consultor LPTI Tech (Visão de relatórios e diagnósticos)</MenuItem>
                {isMaster && (
                  <MenuItem value="OWNER">Proprietário (OWNER - Acesso total à empresa)</MenuItem>
                )}
                {isMaster && (
                  <MenuItem value="MASTER">Administrador Global (MASTER - Plataforma LPTI Tech)</MenuItem>
                )}
              </Select>
            </FormControl>

            {formRole === 'OWNER' && (
              <Alert severity="warning" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                ⚠️ <strong>Titularidade de Empresa:</strong> Ao definir este usuário como <strong>Proprietário (OWNER)</strong>, qualquer titular anterior da empresa selecionada será automaticamente rebaixado para operador.
              </Alert>
            )}

            {!isMaster && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, px: 0.5 }}>
                ℹ️ Somente a administração MASTER da plataforma pode cadastrar novos proprietários titulares.
              </Typography>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={formAtivo}
                  onChange={(e) => setFormAtivo(e.target.checked)}
                  color="primary"
                  disabled={editingUserId !== null && (formRole === 'OWNER' || formRole === 'ADMIN') && !isMaster}
                />
              }
              label={formAtivo ? 'Conta Ativa' : 'Conta Bloqueada'}
              sx={{ mt: 1.5 }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setModalOpen(false)} color="inherit" disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={submitting}>
              {submitting ? <CircularProgress size={22} /> : 'Salvar Usuário'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* ==================================================================== */}
      {/* 2. Modal Redefinir Senha */}
      {/* ==================================================================== */}
      <Dialog open={resetModalOpen} onClose={() => setResetModalOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleSaveResetPassword}>
          <DialogTitle fontWeight={700} display="flex" alignItems="center" gap={1}>
            <VpnKey color="warning" /> Redefinir Senha de Acesso
          </DialogTitle>
          <DialogContent>
            {resetError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {resetError}
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Defina a nova senha para o usuário <strong>{targetUser?.nome}</strong> ({targetUser?.email}):
            </Typography>

            <TextField
              fullWidth
              label="Nova Senha"
              type={showResetPassword ? 'text' : 'password'}
              required
              margin="normal"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              autoFocus
              helperText="Mínimo de 4 caracteres"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowResetPassword(!showResetPassword)} edge="end" size="small">
                      {showResetPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Confirmar Nova Senha"
              type={showResetPassword ? 'text' : 'password'}
              required
              margin="normal"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setResetModalOpen(false)} color="inherit" disabled={resetSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="warning" disabled={resetSubmitting}>
              {resetSubmitting ? <CircularProgress size={22} /> : 'Salvar Nova Senha'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* ==================================================================== */}
      {/* 3. Modal Alterar Perfil */}
      {/* ==================================================================== */}
      <Dialog open={roleModalOpen} onClose={() => setRoleModalOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleSaveRole}>
          <DialogTitle fontWeight={700} display="flex" alignItems="center" gap={1}>
            <BadgeOutlined color="info" /> Alterar Perfil de Acesso
          </DialogTitle>
          <DialogContent>
            {roleError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {roleError}
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Selecione o novo nível de acesso para <strong>{roleTargetUser?.nome}</strong>:
            </Typography>

            <FormControl fullWidth margin="normal">
              <InputLabel>Novo Perfil</InputLabel>
              <Select
                value={novoRole}
                label="Novo Perfil"
                onChange={(e) => setNovoRole(e.target.value as UserRole)}
              >
                <MenuItem value="OPERATOR">Operador de Caixa</MenuItem>
                <MenuItem value="CONSULTOR">Consultor LPTI Tech</MenuItem>
                {isMaster && (
                  <MenuItem value="OWNER">Proprietário (OWNER)</MenuItem>
                )}
                {isMaster && (
                  <MenuItem value="MASTER">Administrador Global (MASTER)</MenuItem>
                )}
              </Select>
            </FormControl>

            {novoRole === 'OWNER' && (
              <Alert severity="warning" sx={{ mt: 2, fontSize: '0.8rem' }}>
                ⚠️ <strong>Transferência de Titularidade:</strong> Ao promover <strong>{roleTargetUser?.nome}</strong> para OWNER, ele se tornará o proprietário titular oficial da empresa.
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setRoleModalOpen(false)} color="inherit" disabled={roleSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="info" disabled={roleSubmitting}>
              {roleSubmitting ? <CircularProgress size={22} /> : 'Confirmar Perfil'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* ==================================================================== */}
      {/* 4. Modal Transferir Propriedade MASTER (ENTREGA 2) */}
      {/* ==================================================================== */}
      <Dialog open={transferModalOpen} onClose={() => setTransferModalOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleExecuteTransfer}>
          <DialogTitle fontWeight={700} display="flex" alignItems="center" gap={1}>
            <SwapHoriz color="secondary" /> Transferir Titularidade (OWNER)
          </DialogTitle>
          <DialogContent>
            {transferError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {transferError}
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Como administrador global MASTER, selecione a empresa cliente e o novo usuário que assumirá o perfil titular (OWNER).
            </Typography>

            <FormControl fullWidth margin="normal" required>
              <InputLabel>Empresa Cliente</InputLabel>
              <Select
                value={transferEmpresaId}
                label="Empresa Cliente"
                onChange={(e) => {
                  setTransferEmpresaId(Number(e.target.value));
                  setTransferNovoOwnerId('');
                }}
              >
                {empresas.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.nome_fantasia} (Atual: {emp.owner ? emp.owner.nome : 'Sem titular'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal" required disabled={!transferEmpresaId}>
              <InputLabel>Novo Titular (OWNER)</InputLabel>
              <Select
                value={transferNovoOwnerId}
                label="Novo Titular (OWNER)"
                onChange={(e) => setTransferNovoOwnerId(Number(e.target.value))}
              >
                {users
                  .filter((u) => u.empresa_id === transferEmpresaId)
                  .map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.nome} ({u.email}) - {u.role}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }}>
              ℹ️ O usuário selecionado será promovido a <strong>OWNER</strong> e o titular anterior será rebaixado para <strong>OPERATOR</strong>.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setTransferModalOpen(false)} color="inherit" disabled={transferSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="secondary" disabled={transferSubmitting || !transferNovoOwnerId}>
              {transferSubmitting ? <CircularProgress size={22} /> : 'Transferir Propriedade'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Excluir Usuário"
        message={`Tem certeza que deseja excluir permanentemente o usuário '${deleteNome || ''}'?`}
        confirmText="Excluir Usuário"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteId(null);
          setDeleteNome(null);
        }}
      />
    </Box>
  );
};
