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
} from '@mui/material';
import { People, Add, Delete, Edit, Security, Person } from '@mui/icons-material';
import api from '../services/api';
import { User, UserRole } from '../types';
import { formatDateTime } from '../services/exportUtils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';

export const Usuarios: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    role: 'OPERADOR' as UserRole,
    ativo: true,
  });

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get<User[]>('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (u?: User) => {
    if (u) {
      setEditingUserId(u.id);
      setFormData({
        nome: u.nome,
        email: u.email,
        password: '',
        role: u.role,
        ativo: u.ativo,
      });
    } else {
      setEditingUserId(null);
      setFormData({
        nome: '',
        email: '',
        password: '',
        role: 'OPERADOR',
        ativo: true,
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        const payload: any = {
          nome: formData.nome,
          email: formData.email,
          role: formData.role,
          ativo: formData.ativo,
        };
        if (formData.password) payload.password = formData.password;
        await api.put(`/users/${editingUserId}`, payload);
      } else {
        await api.post('/users', formData);
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar usuário.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/users/${deleteId}`);
      setDeleteId(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao excluir usuário.');
    }
  };

  return (
    <Box>
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
            <People color="primary" /> Gestão de Usuários & Acessos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cadastre atendentes e operadores de caixa com acessos restritos para segurança do seu MEI.
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={() => handleOpenModal()}
          sx={{ fontWeight: 700, height: 44 }}
        >
          Novo Usuário
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>E-mail</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Perfil / Nível</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Data Criação</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {u.nome}
                    </Typography>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      icon={u.role === 'ADMIN' ? <Security fontSize="small" /> : <Person fontSize="small" />}
                      label={u.role === 'ADMIN' ? 'Administrador' : 'Operador de Caixa'}
                      size="small"
                      color={u.role === 'ADMIN' ? 'secondary' : 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={u.ativo ? 'Ativo' : 'Inativo'}
                      size="small"
                      color={u.ativo ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{formatDateTime(u.created_at)}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary" onClick={() => handleOpenModal(u)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    {u.id !== currentUser?.id && (
                      <IconButton size="small" color="error" onClick={() => setDeleteId(u.id)}>
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
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle fontWeight={700}>
            {editingUserId ? 'Editar Usuário' : 'Novo Usuário da Equipe'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Nome Completo"
              required
              margin="normal"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              autoFocus
            />

            <TextField
              fullWidth
              label="E-mail de Acesso"
              type="email"
              required
              margin="normal"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <TextField
              fullWidth
              label={editingUserId ? 'Nova Senha (deixe em branco para manter)' : 'Senha de Acesso'}
              type="password"
              required={!editingUserId}
              margin="normal"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Cargo / Permissão</InputLabel>
              <Select
                value={formData.role}
                label="Cargo / Permissão"
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              >
                <MenuItem value="OPERADOR">Operador (Abre/fecha caixa e registra vendas)</MenuItem>
                <MenuItem value="ADMIN">Administrador (Acesso total)</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  color="primary"
                />
              }
              label={formData.ativo ? 'Conta Ativa' : 'Conta Bloqueada'}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setModalOpen(false)} color="inherit">
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Salvar Usuário
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Excluir Usuário"
        message="Tem certeza que deseja excluir esta conta de usuário?"
        confirmText="Excluir"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
};
