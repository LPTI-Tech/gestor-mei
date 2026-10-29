import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
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
  ArrowBack,
  ShoppingBag,
  ReceiptLong,
  Store,
  CalendarToday,
  ContentCopy,
  CheckCircle,
  Inventory2,
  AttachMoney,
  CloudUpload,
} from '@mui/icons-material';
import api from '../services/api';
import { CompraDetalhe } from '../types';
import { formatCurrency, formatDate } from '../services/exportUtils';

export const DetalheCompra: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [compra, setCompra] = useState<CompraDetalhe | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;

    const fetchDetalhe = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await api.get<CompraDetalhe>(`/compras/${id}`);
        setCompra(res.data);
      } catch (err: any) {
        console.error('Erro ao buscar detalhes da compra:', err);
        setErrorMsg(err.response?.data?.detail || 'Erro ao carregar detalhes da compra.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetalhe();
  }, [id]);

  const handleCopyChave = () => {
    if (!compra) return;
    navigator.clipboard.writeText(compra.chave_acesso);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  if (loading) {
    return (
      <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Carregando dados da compra faturada...
        </Typography>
      </Box>
    );
  }

  if (errorMsg || !compra) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/compras')}
          sx={{ mb: 2, borderRadius: 2 }}
        >
          Voltar para Compras
        </Button>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {errorMsg || 'Compra / NF-e não encontrada.'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Navegação e Ações Rápidas */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/compras')}
          variant="outlined"
          size="small"
          sx={{ borderRadius: 2 }}
        >
          Voltar para Compras
        </Button>

        <Button
          variant="contained"
          color="primary"
          startIcon={<CloudUpload />}
          size="small"
          onClick={() => navigate('/nfe')}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          + Nova Importação XML
        </Button>
      </Box>

      {/* Cabeçalho da Compra */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
            mb: 2,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h5" fontWeight={800}>
                Nota Fiscal nº {compra.numero_nota}
              </Typography>
              <Chip label={`Série ${compra.serie}`} size="small" color="primary" variant="outlined" />
              <Chip label="Entrada Efetivada" size="small" color="success" />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Fornecedor: <strong>{compra.fornecedor_nome}</strong> (CNPJ: {compra.fornecedor_cnpj})
            </Typography>
          </Box>

          <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={700}>
              Valor Total Faturado
            </Typography>
            <Typography variant="h4" fontWeight={800} color="success.main">
              {formatCurrency(compra.valor_total)}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Metadados da NF-e */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday fontSize="small" color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Data de Importação
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatDate(compra.data_importacao)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptLong fontSize="small" color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Emissão da Nota
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {compra.data_emissao ? compra.data_emissao.split('T')[0] : 'Não informada'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Inventory2 fontSize="small" color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Total de Itens
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {compra.total_itens} produto(s) movimentado(s)
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Store fontSize="small" color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Estado (UF) do Fornecedor
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {compra.fornecedor_uf || 'Não informado'}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Chave de Acesso */}
        <Box
          sx={{
            mt: 2.5,
            p: 1.5,
            borderRadius: 2,
            bgcolor: (th) => (th.palette.mode === 'dark' ? 'grey.900' : 'grey.100'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              CHAVE DE ACESSO:
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontFamily: 'monospace', fontWeight: 600, wordBreak: 'break-all' }}
            >
              {compra.chave_acesso}
            </Typography>
          </Box>
          <Tooltip title={copiedKey ? 'Copiada!' : 'Copiar Chave Completa'}>
            <Button
              size="small"
              startIcon={copiedKey ? <CheckCircle color="success" /> : <ContentCopy />}
              onClick={handleCopyChave}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {copiedKey ? 'Copiado' : 'Copiar'}
            </Button>
          </Tooltip>
        </Box>
      </Paper>

      {/* ITENS DA NOTA FISCAL */}
      <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={700}>
            Itens Comprados & Movimentação de Estoque
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Relação detalhada dos produtos faturados nesta compra com conversão de unidades e custos
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: (th) => th.palette.action.hover }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Item / Fornecedor</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Produto Vinculado (Estoque)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Qtd Nota</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Fator Conv.</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Entrada Estoque</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Valor Unit. Nota</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Custo Estoque</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {compra.itens.map((it) => (
                <TableRow key={it.id} hover>
                  {/* Item Fornecedor */}
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {it.descricao_fornecedor || 'Item sem descrição'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cód: {it.codigo_fornecedor} {it.unidade_comercial && `• Unid: ${it.unidade_comercial}`}
                    </Typography>
                  </TableCell>

                  {/* Produto Vinculado */}
                  <TableCell>
                    {it.produto_nome ? (
                      <Chip
                        label={it.produto_nome}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        ID #{it.produto_id}
                      </Typography>
                    )}
                  </TableCell>

                  {/* Qtd Comercial */}
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={600}>
                      {it.quantidade_comercial} {it.unidade_comercial || 'UN'}
                    </Typography>
                  </TableCell>

                  {/* Fator Conversão */}
                  <TableCell align="center">
                    <Chip
                      label={`x ${it.fator_conversao}`}
                      size="small"
                      sx={{ fontWeight: 600, bgcolor: 'action.selected' }}
                    />
                  </TableCell>

                  {/* Entrada Estoque */}
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      +{it.quantidade_entrada} un
                    </Typography>
                  </TableCell>

                  {/* Valor Unitário Nota */}
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatCurrency(it.valor_unitario_nota)}
                    </Typography>
                  </TableCell>

                  {/* Custo Estoque */}
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={700} color="success.main">
                      {formatCurrency(it.custo_unitario_calculado)}
                    </Typography>
                  </TableCell>

                  {/* Valor Total */}
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={800}>
                      {formatCurrency(it.valor_total)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

