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
  LinearProgress,
} from '@mui/material';
import { Add, Delete, ReceiptLong, Download } from '@mui/icons-material';
import api from '../services/api';
import { Despesa } from '../types';
import { formatCurrency, formatDate, exportToExcel, exportToCSV } from '../services/exportUtils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIAS_DESPESA = [
  'Mercadorias',
  'Insumos',
  'Gás',
  'Energia',
  'Água',
  'Transporte',
  'Internet',
  'Funcionários',
  'Motoboys',
  'Outros',
];

const FORMAS_PAGTO = ['PIX', 'Dinheiro', 'Débito', 'Crédito', 'Boleto'];

export const Despesas: React.FC = () => {
  const { isAdmin } = useAuth();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [resumoCategorias, setResumoCategorias] = useState<any[]>([]);
  const [totalGeral, setTotalGeral] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [filterCategoria, setFilterCategoria] = useState<string>('Todas');
  const [filterDataInicio, setFilterDataInicio] = useState<string>('');
  const [filterDataFim, setFilterDataFim] = useState<string>('');

  // New Expense Dialog
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    categoria: 'Mercadorias',
    descricao: '',
    valor: '',
    forma_pagamento: 'PIX',
  });

  // Delete
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchDespesas = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterCategoria && filterCategoria !== 'Todas') params.categoria = filterCategoria;
      if (filterDataInicio) params.data_inicio = filterDataInicio;
      if (filterDataFim) params.data_fim = filterDataFim;

      const [listRes, resResumo] = await Promise.all([
        api.get<Despesa[]>('/despesas', { params }),
        api.get('/despesas/resumo', { params }),
      ]);

      setDespesas(listRes.data);
      setResumoCategorias(resResumo.data.por_categoria || []);
      setTotalGeral(resResumo.data.total_geral || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDespesas();
  }, [filterCategoria, filterDataInicio, filterDataFim]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/despesas', {
        data: formData.data,
        categoria: formData.categoria,
        descricao: formData.descricao,
        valor: Number(formData.valor) || 0,
        forma_pagamento: formData.forma_pagamento,
      });
      setModalOpen(false);
      setFormData({
        data: new Date().toISOString().split('T')[0],
        categoria: 'Mercadorias',
        descricao: '',
        valor: '',
        forma_pagamento: 'PIX',
      });
      fetchDespesas();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao registrar despesa.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/despesas/${deleteId}`);
      setDeleteId(null);
      fetchDespesas();
    } catch (err) {
      alert('Erro ao excluir despesa.');
    }
  };

  const handleExport = () => {
    const exportData = despesas.map((d) => ({
      Data: formatDate(d.data),
      Categoria: d.categoria,
      Descrição: d.descricao,
      'Valor (R$)': d.valor,
      'Forma de Pagamento': d.forma_pagamento,
    }));
    exportToExcel(exportData, `Despesas_GestorMEI_${new Date().toISOString().split('T')[0]}`);
  };

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
            Controle de Despesas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Acompanhe para onde está indo o dinheiro: mercadorias, insumos, gás, contas e equipe.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={despesas.length === 0}
            sx={{ fontWeight: 600, height: 44 }}
          >
            Exportar Excel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => setModalOpen(true)}
            sx={{ fontWeight: 700, height: 44 }}
          >
            Nova Despesa
          </Button>
        </Box>
      </Box>

      {/* Summary Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 3, bgcolor: 'error.main', color: 'white' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 600 }}>
                TOTAL DE DESPESAS NO PERÍODO
              </Typography>
              <Typography variant="h4" fontWeight={900} sx={{ my: 1 }}>
                {formatCurrency(totalGeral)}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {despesas.length} lançamentos registrados
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                Maiores Despesas por Categoria
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 120, overflowY: 'auto' }}>
                {resumoCategorias.slice(0, 4).map((c) => (
                  <Box key={c.categoria}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {c.categoria}
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {formatCurrency(c.total)} ({c.percentual}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={c.percentual}
                      color="error"
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={filterCategoria}
                  label="Categoria"
                  onChange={(e) => setFilterCategoria(e.target.value)}
                >
                  <MenuItem value="Todas">Todas as Categorias</MenuItem>
                  {CATEGORIAS_DESPESA.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="De (Data)"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filterDataInicio}
                onChange={(e) => setFilterDataInicio(e.target.value)}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Até (Data)"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filterDataFim}
                onChange={(e) => setFilterDataFim(e.target.value)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : despesas.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <ReceiptLong sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" fontWeight={600}>
            Nenhuma despesa encontrada
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cadastre os gastos com ingredientes, gás e contas para saber o lucro real.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Categoria</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Descrição</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Pagamento</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Valor</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {despesas.map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell>{formatDate(d.data)}</TableCell>
                  <TableCell>
                    <Chip label={d.categoria} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {d.descricao}
                    </Typography>
                  </TableCell>
                  <TableCell>{d.forma_pagamento}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={800} color="error.main">
                      {formatCurrency(d.valor)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {isAdmin && (
                      <IconButton size="small" color="error" onClick={() => setDeleteId(d.id)}>
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

      {/* Add Dialog */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle fontWeight={700}>Nova Despesa</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Data do Gasto"
              type="date"
              required
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Categoria</InputLabel>
              <Select
                value={formData.categoria}
                label="Categoria"
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              >
                {CATEGORIAS_DESPESA.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Descrição do Gasto"
              required
              margin="normal"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Ex: 2 botijões de gás ou compra no Ceasa"
            />

            <TextField
              fullWidth
              label="Valor Pago (R$)"
              type="number"
              inputProps={{ step: '0.01', min: '0.01', style: { fontWeight: 700 } }}
              required
              margin="normal"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              placeholder="0,00"
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Forma de Pagamento</InputLabel>
              <Select
                value={formData.forma_pagamento}
                label="Forma de Pagamento"
                onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
              >
                {FORMAS_PAGTO.map((f) => (
                  <MenuItem key={f} value={f}>
                    {f}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setModalOpen(false)} color="inherit">
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Salvar Despesa
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Excluir Despesa"
        message="Tem certeza que deseja excluir o lançamento desta despesa?"
        confirmText="Excluir"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
};
