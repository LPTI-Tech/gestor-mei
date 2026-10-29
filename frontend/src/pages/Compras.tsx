import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  ShoppingBag,
  Search,
  CloudUpload,
  Refresh,
  Visibility,
  ContentCopy,
  ReceiptLong,
  CalendarToday,
  Store,
  AttachMoney,
  CheckCircle,
} from '@mui/icons-material';
import api from '../services/api';
import { ResumoCompras, CompraItemResumo } from '../types';
import { formatCurrency, formatDate } from '../services/exportUtils';

export const Compras: React.FC = () => {
  const navigate = useNavigate();

  const [resumo, setResumo] = useState<ResumoCompras | null>(null);
  const [compras, setCompras] = useState<CompraItemResumo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [resumoRes, comprasRes] = await Promise.all([
        api.get<ResumoCompras>('/compras/resumo'),
        api.get<CompraItemResumo[]>('/compras'),
      ]);

      setResumo(resumoRes.data);
      setCompras(comprasRes.data);
    } catch (err: any) {
      console.error('Erro ao carregar dados de compras:', err);
      setErrorMsg(err.response?.data?.detail || 'Erro ao carregar histórico de compras.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyChave = (chave: string) => {
    navigator.clipboard.writeText(chave);
    setCopiedKey(chave);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const filteredCompras = compras.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.fornecedor_nome.toLowerCase().includes(term) ||
      c.fornecedor_cnpj.toLowerCase().includes(term) ||
      c.numero_nota.toLowerCase().includes(term) ||
      c.chave_acesso.toLowerCase().includes(term)
    );
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
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
          <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShoppingBag color="success" fontSize="large" /> Módulo de Compras
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestão inteligente de compras faturadas via NF-e, custos e histórico de aquisições de fornecedores.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchData}
            disabled={loading}
            size="small"
            sx={{ borderRadius: 2 }}
          >
            Atualizar
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<CloudUpload />}
            onClick={() => navigate('/nfe')}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            + Importar XML NF-e
          </Button>
        </Box>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* DASHBOARD DE COMPRAS (4 CARDS DE INDICADORES) */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {/* 1. Total Comprado no Mês */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={2}
            sx={{
              borderRadius: 3,
              p: 1,
              borderLeft: '5px solid #2e7d32',
              bgcolor: 'background.paper',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                  Total no Mês Corrente
                </Typography>
                <AttachMoney color="success" />
              </Box>
              <Typography variant="h5" fontWeight={800} color="success.main">
                {resumo ? formatCurrency(resumo.total_comprado_mes) : 'R$ 0,00'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {resumo ? `${resumo.numero_notas_mes} nota(s) faturada(s) este mês` : 'Nenhuma nota'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 2. Última Compra */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={2}
            sx={{
              borderRadius: 3,
              p: 1,
              borderLeft: '5px solid #0288d1',
              bgcolor: 'background.paper',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                  Última Compra
                </Typography>
                <CalendarToday color="primary" />
              </Box>
              {resumo?.ultima_compra ? (
                <>
                  <Typography variant="h6" fontWeight={800} noWrap title={resumo.ultima_compra.fornecedor_nome}>
                    {resumo.ultima_compra.fornecedor_nome}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    NF nº {resumo.ultima_compra.numero_nota} • {formatCurrency(resumo.ultima_compra.valor_total)}
                  </Typography>
                  <Typography variant="caption" color="primary.main" fontWeight={600}>
                    {formatDate(resumo.ultima_compra.data)}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma compra registrada
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 3. Número de Notas */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={2}
            sx={{
              borderRadius: 3,
              p: 1,
              borderLeft: '5px solid #ed6c02',
              bgcolor: 'background.paper',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                  Notas Fiscais
                </Typography>
                <ReceiptLong color="warning" />
              </Box>
              <Typography variant="h5" fontWeight={800} color="warning.main">
                {resumo?.numero_notas_total ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {resumo ? `Total anual: ${formatCurrency(resumo.total_comprado_ano)}` : 'R$ 0,00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 4. Fornecedor Principal */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={2}
            sx={{
              borderRadius: 3,
              p: 1,
              borderLeft: '5px solid #9c27b0',
              bgcolor: 'background.paper',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                  Fornecedor Principal
                </Typography>
                <Store color="secondary" />
              </Box>
              {resumo?.fornecedor_principal ? (
                <>
                  <Typography variant="h6" fontWeight={800} noWrap title={resumo.fornecedor_principal.nome}>
                    {resumo.fornecedor_principal.nome}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {resumo.fornecedor_principal.quantidade_notas} nota(s) • {formatCurrency(resumo.fornecedor_principal.total_comprado)}
                  </Typography>
                  <Typography variant="caption" color="secondary.main" fontWeight={600}>
                    Maior volume financeiro
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Sem dados acumulados
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* HISTÓRICO DE COMPRAS (TABELA & FILTROS) */}
      <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box
          sx={{
            p: 2.5,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Histórico de Compras Faturadas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Notas fiscais de entrada importadas ({filteredCompras.length} registro(s))
            </Typography>
          </Box>

          <TextField
            size="small"
            placeholder="Buscar por fornecedor, CNPJ, nota ou chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', sm: 340 } }}
          />
        </Box>

        {loading ? (
          <Box sx={{ p: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Carregando compras...
            </Typography>
          </Box>
        ) : filteredCompras.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <ReceiptLong sx={{ fontSize: 60, color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600}>
              {searchTerm ? 'Nenhuma compra encontrada para os termos informados.' : 'Nenhuma compra registrada ainda.'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Importe seus arquivos XML de NF-e para alimentar automaticamente o estoque, custos e o histórico de compras.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<CloudUpload />}
              onClick={() => navigate('/nfe')}
              sx={{ borderRadius: 2 }}
            >
              Importar Primeiro XML NF-e
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: (th) => th.palette.action.hover }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Fornecedor</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Nota Fiscal</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Itens</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Valor Total</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCompras.map((c) => (
                  <TableRow key={c.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    {/* Fornecedor */}
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {c.fornecedor_nome}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        CNPJ: {c.fornecedor_cnpj} {c.fornecedor_uf && `(${c.fornecedor_uf})`}
                      </Typography>
                    </TableCell>

                    {/* Nota Fiscal */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={700}>
                          Nº {c.numero_nota}
                        </Typography>
                        <Chip label={`Série ${c.serie}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            maxWidth: 160,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: 'monospace',
                          }}
                        >
                          {c.chave_acesso}
                        </Typography>
                        <Tooltip title={copiedKey === c.chave_acesso ? 'Copiado!' : 'Copiar Chave'}>
                          <IconButton size="small" onClick={() => handleCopyChave(c.chave_acesso)}>
                            {copiedKey === c.chave_acesso ? <CheckCircle fontSize="small" color="success" /> : <ContentCopy fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>

                    {/* Data */}
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(c.data_importacao)}
                      </Typography>
                      {c.data_emissao && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Emissão: {c.data_emissao.split('T')[0]}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Quantidade de Itens */}
                    <TableCell align="center">
                      <Chip
                        label={`${c.total_itens} item(ns)`}
                        size="small"
                        color="default"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>

                    {/* Valor Total */}
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight={800} color="success.main">
                        {formatCurrency(c.valor_total)}
                      </Typography>
                    </TableCell>

                    {/* Ações */}
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/compras/${c.id}`)}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                      >
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

