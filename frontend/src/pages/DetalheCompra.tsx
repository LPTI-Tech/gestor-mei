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
  AddShoppingCart,
  AttachFile,
  Download,
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
import {
  SentinelCard,
  SentinelTableContainer,
  SentinelTable,
  SentinelTableHead,
  SentinelTableRow,
  SentinelTableCell,
  SentinelBadge,
  sentinelTokens,
} from '../design-system';

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

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddShoppingCart />}
            size="small"
            onClick={() => navigate('/compras/nova')}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            + Nova Compra Manual
          </Button>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<CloudUpload />}
            size="small"
            onClick={() => navigate('/nfe')}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            + Importar XML
          </Button>
        </Box>
      </Box>

      {/* Cabeçalho da Compra Sentinel */}
      <SentinelCard dense sx={{ p: 2.5, mb: 3 }}>
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
                {compra.origem === 'MANUAL' ? 'Documento / Recibo' : 'Nota Fiscal'} nº {compra.numero_nota}
              </Typography>
              <SentinelBadge
                sentinelVariant={compra.origem === 'MANUAL' ? 'warning' : 'info'}
                size="small"
                label={compra.origem === 'MANUAL' ? 'COMPRA MANUAL' : 'NF-E (XML)'}
              />
              <SentinelBadge sentinelVariant="active" size="small" label="ENTRADA EFETIVADA" />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Fornecedor: <strong>{compra.fornecedor_nome}</strong> (CNPJ: {compra.fornecedor_cnpj})
            </Typography>
          </Box>

          <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={700}>
              Valor Total Faturado
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: sentinelTokens.colors.owner.accent,
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'monospace',
              }}
            >
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

          {compra.forma_pagamento && (
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachMoney fontSize="small" color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Forma de Pagamento
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {compra.forma_pagamento}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}

          {compra.anexo_url && (
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachFile fontSize="small" color="success" />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Comprovante Anexado
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    color="primary"
                    component="a"
                    href={compra.anexo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ p: 0, minWidth: 0, textTransform: 'none', fontWeight: 700 }}
                  >
                    Ver {compra.anexo_tipo || 'Documento'}
                  </Button>
                </Box>
              </Box>
            </Grid>
          )}

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
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
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
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
            >
              {copiedKey ? 'Copiado' : 'Copiar'}
            </Button>
          </Tooltip>
        </Box>
      </SentinelCard>

      {/* ITENS DA NOTA FISCAL SENTINEL */}
      <SentinelCard dense sx={{ p: 2.5 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '0.9375rem' }}>
            Itens Comprados & Movimentação de Estoque
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Relação detalhada dos produtos faturados nesta compra com conversão de unidades e custos
          </Typography>
        </Box>

        <SentinelTableContainer>
          <SentinelTable size="small">
            <SentinelTableHead>
              <SentinelTableRow>
                <SentinelTableCell tabular={false}>Item / Fornecedor</SentinelTableCell>
                <SentinelTableCell tabular={false}>Produto Vinculado (Estoque)</SentinelTableCell>
                <SentinelTableCell align="center" tabular={false}>Qtd Nota</SentinelTableCell>
                <SentinelTableCell align="center" tabular={false}>Fator Conv.</SentinelTableCell>
                <SentinelTableCell align="center" tabular={false}>Entrada Estoque</SentinelTableCell>
                <SentinelTableCell align="right" tabular={true}>Valor Unit. Nota</SentinelTableCell>
                <SentinelTableCell align="right" tabular={true}>Custo Estoque</SentinelTableCell>
                <SentinelTableCell align="right" tabular={true}>Total</SentinelTableCell>
              </SentinelTableRow>
            </SentinelTableHead>
            <TableBody>
              {compra.itens.map((it) => (
                <SentinelTableRow key={it.id}>
                  {/* Item Fornecedor */}
                  <SentinelTableCell tabular={false}>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8125rem' }}>
                      {it.descricao_fornecedor || 'Item sem descrição'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                      Cód: <code style={{ fontFamily: 'monospace' }}>{it.codigo_fornecedor}</code> {it.unidade_comercial && `• Unid: ${it.unidade_comercial}`}
                    </Typography>
                  </SentinelTableCell>

                  {/* Produto Vinculado */}
                  <SentinelTableCell tabular={false}>
                    {it.produto_nome ? (
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem', color: sentinelTokens.colors.master.accent }}>
                        {it.produto_nome}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        ID #{it.produto_id}
                      </Typography>
                    )}
                  </SentinelTableCell>

                  {/* Qtd Comercial */}
                  <SentinelTableCell align="center" tabular={false}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                      {it.quantidade_comercial} {it.unidade_comercial || 'UN'}
                    </Typography>
                  </SentinelTableCell>

                  {/* Fator Conversão */}
                  <SentinelTableCell align="center" tabular={false}>
                    <SentinelBadge sentinelVariant="default" size="small" label={`x ${it.fator_conversao}`} />
                  </SentinelTableCell>

                  {/* Entrada Estoque */}
                  <SentinelTableCell align="center" tabular={false}>
                    <SentinelBadge sentinelVariant="active" size="small" label={`+${it.quantidade_entrada} UN`} />
                  </SentinelTableCell>

                  {/* Valor Unitário Nota */}
                  <SentinelTableCell align="right" tabular={true}>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                      {formatCurrency(it.valor_unitario_nota)}
                    </Typography>
                  </SentinelTableCell>

                  {/* Custo Estoque */}
                  <SentinelTableCell align="right" tabular={true}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: sentinelTokens.colors.owner.accent, fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                      {formatCurrency(it.custo_unitario_calculado)}
                    </Typography>
                  </SentinelTableCell>

                  {/* Valor Total */}
                  <SentinelTableCell align="right" tabular={true}>
                    <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                      {formatCurrency(it.valor_total)}
                    </Typography>
                  </SentinelTableCell>
                </SentinelTableRow>
              ))}
            </TableBody>
          </SentinelTable>
        </SentinelTableContainer>
      </SentinelCard>
    </Box>
  );
};

