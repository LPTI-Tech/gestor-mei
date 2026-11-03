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
} from '@mui/icons-material';
import api from '../services/api';
import { User, UserRole } from '../types';
import { formatDateTime } from '../services/exportUtils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';

export const Usuarios: React.FC = () => {
  const { user: currentUser, isMaster } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busca, setBusca] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Criar / Editar Usuário
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('OPERATOR');
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

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handlers Modal Criar / Editar
  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setFormNome('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('OPERATOR');
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
        await api.post('/users', {
          nome: formNome,
          email: formEmail,
          password: formPassword,
          role: formRole,
          ativo: formAtivo,
        });
        setFeedback({ type: 'success', text: `Usuário '${formNome}' cadastrado com sucesso!` });
      }
      setModalOpen(false);
      fetchUsers();
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
      setResetError('A nova senha deve possuir pelo menos 4 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setResetError('A confirmação da senha não coincide com a nova senha.');
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
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erro ao alterar perfil.';
      setRoleError(msg);
    } finally {
      setRoleSubmitting(false);
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
  const ownerUser = users.find((u) => u.role === 'OWNER' || u.role === 'ADMIN');
  const totalOperadores = users.filter((u) => u.role === 'OPERATOR' || u.role === 'OPERADOR').length;
  const totalConsultores = users.filter((u) => u.role === 'CONSULTOR').length;

  // Filtragem da tabela
  const usersFiltrados = users.filter((u) => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo);
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
            Controle os acessos internos da sua empresa com perfis de Proprietário (OWNER), Consultor e Operadores.
          </Typography>
        </Box>

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
                  EQUIPE TOTAL
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
              <Box sx={{ overflow: 'hidden' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  PROPRIETÁRIO (OWNER)
                </Typography>
                <Typography variant="body1" fontWeight={700} noWrap title={ownerUser?.nome || 'Não definido'}>
                  {ownerUser ? ownerUser.nome.split(' ')[0] : 'Nenhum'}
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
                  OPERADORES DE CAIXA
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
                  CONSULTORES
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {totalConsultores}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Barra de Filtro / Busca */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
        <TextField
          size="small"
          placeholder="Buscar por nome ou e-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          sx={{ width: { xs: '100%', sm: 340 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
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
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
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

                      {/* Perfil */}
                      <TableCell>
                        <Chip
                          icon={roleConfig.icon}
                          label={roleConfig.label}
                          size="small"
                          color={roleConfig.color}
                          sx={{ fontWeight: 600, px: 0.5 }}
                        />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Switch
                            size="small"
                            checked={u.ativo}
                            disabled={isOwnerUser || isSelf}
                            onChange={() => handleToggleStatus(u)}
                            color="success"
                          />
                          <Chip
                            label={u.ativo ? 'Ativo' : 'Bloqueado'}
                            size="small"
                            color={u.ativo ? 'success' : 'default'}
                            variant={u.ativo ? 'filled' : 'outlined'}
                            sx={{ height: 22, fontSize: '0.75rem' }}
                          />
                        </Box>
                      </TableCell>

                      {/* Último Acesso */}
                      <TableCell>
                        {u.ultimo_acesso ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <Schedule fontSize="inherit" color="action" />
                            <Typography variant="body2" fontSize="0.82rem">
                              {formatDateTime(u.ultimo_acesso)}
                            </Typography>
                          </Box>
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
                              isOwnerUser
                                ? 'O titular da empresa (OWNER) não pode ser excluído.'
                                : isSelf
                                ? 'Você não pode excluir sua própria conta em uso.'
                                : 'Excluir Usuário'
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={isOwnerUser || isSelf}
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
              </Select>
            </FormControl>

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
                  disabled={editingUserId !== null && (formRole === 'OWNER' || formRole === 'ADMIN')}
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
            <VpnKey color="warning" /> Redefinir Senha
          </DialogTitle>
          <DialogContent>
            {resetError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {resetError}
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Defina uma nova senha para <strong>{targetUser?.nome}</strong> ({targetUser?.email}).
            </Typography>

            <TextField
              fullWidth
              label="Nova Senha"
              type={showResetPassword ? 'text' : 'password'}
              required
              margin="normal"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              helperText="Mínimo de 4 caracteres"
              autoFocus
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
              {resetSubmitting ? <CircularProgress size={22} /> : 'Atualizar Senha'}
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
              </Select>
            </FormControl>

            <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }}>
              • <strong>Operador:</strong> Registra vendas, gerencia produtos e comanda caixa.<br />
              • <strong>Consultor:</strong> Visualiza indicadores financeiros, DAS e diagnósticos.<br />
              • <strong>Proprietário:</strong> Gestão administrativa completa da empresa.
            </Alert>
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
