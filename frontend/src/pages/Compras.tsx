import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Button,
  InputAdornment,
  TableBody,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ShoppingBag,
  Search,
  CloudUpload,
  AddShoppingCart,
  AttachFile,
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
import {
  SentinelCard,
  SentinelTableContainer,
  SentinelTable,
  SentinelTableHead,
  SentinelTableRow,
  SentinelTableCell,
  SentinelBadge,
  SentinelInput,
  sentinelTokens,
} from '../design-system';

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
            color="success"
            startIcon={<AddShoppingCart />}
            onClick={() => navigate('/compras/nova')}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            + Nova Compra Manual
          </Button>

          <Button
            variant="outlined"
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

      {/* DASHBOARD DE COMPRAS (4 CARDS DE INDICADORES SENTINEL) */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* 1. Total Comprado no Mês */}
        <Grid item xs={12} sm={6} md={3}>
          <SentinelCard dense sx={{ height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 700,
                  fontSize: '0.6875rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Total no Mês Corrente
              </Typography>
              <AttachMoney sx={{ fontSize: 18, color: sentinelTokens.colors.owner.accent }} />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: 'text.primary',
                fontVariantNumeric: 'tabular-nums',
                fontSize: '1.45rem',
                mb: 0.5,
              }}
            >
              {resumo ? formatCurrency(resumo.total_comprado_mes) : 'R$ 0,00'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
              {resumo ? `${resumo.numero_notas_mes} nota(s) faturada(s) este mês` : 'Nenhuma nota registrada'}
            </Typography>
          </SentinelCard>
        </Grid>

        {/* 2. Última Compra */}
        <Grid item xs={12} sm={6} md={3}>
          <SentinelCard dense sx={{ height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 700,
                  fontSize: '0.6875rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Última Compra
              </Typography>
              <CalendarToday sx={{ fontSize: 18, color: sentinelTokens.colors.master.accent }} />
            </Box>
            {resumo?.ultima_compra ? (
              <>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    color: 'text.primary',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '1.45rem',
                    mb: 0.5,
                  }}
                >
                  {formatCurrency(resumo.ultima_compra.valor_total)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', display: 'block' }} noWrap>
                  {resumo.ultima_compra.fornecedor_nome} • {formatDate(resumo.ultima_compra.data)}
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '1.25rem', mb: 0.5 }}>
                  R$ 0,00
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                  Nenhuma compra registrada
                </Typography>
              </>
            )}
          </SentinelCard>
        </Grid>

        {/* 3. Número de Notas */}
        <Grid item xs={12} sm={6} md={3}>
          <SentinelCard dense sx={{ height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 700,
                  fontSize: '0.6875rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Notas Fiscais
              </Typography>
              <ReceiptLong sx={{ fontSize: 18, color: sentinelTokens.colors.owner.warning }} />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: 'text.primary',
                fontVariantNumeric: 'tabular-nums',
                fontSize: '1.45rem',
                mb: 0.5,
              }}
            >
              {resumo?.numero_notas_total ?? 0}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
              {resumo ? `Total anual: ${formatCurrency(resumo.total_comprado_ano)}` : 'R$ 0,00'}
            </Typography>
          </SentinelCard>
        </Grid>

        {/* 4. Fornecedor Principal */}
        <Grid item xs={12} sm={6} md={3}>
          <SentinelCard dense sx={{ height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 700,
                  fontSize: '0.6875rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Fornecedor Principal
              </Typography>
              <Store sx={{ fontSize: 18, color: sentinelTokens.colors.master.accent }} />
            </Box>
            {resumo?.fornecedor_principal ? (
              <>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    color: 'text.primary',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '1.45rem',
                    mb: 0.5,
                  }}
                  noWrap
                >
                  {formatCurrency(resumo.fornecedor_principal.total_comprado)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', display: 'block' }} noWrap>
                  {resumo.fornecedor_principal.nome} ({resumo.fornecedor_principal.quantidade_notas} NFs)
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '1.25rem', mb: 0.5 }}>
                  R$ 0,00
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                  Sem dados acumulados
                </Typography>
              </>
            )}
          </SentinelCard>
        </Grid>
      </Grid>

      {/* BARRA DE FILTROS E PESQUISA SENTINEL */}
      <SentinelCard dense sx={{ mb: 2, p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '0.9375rem' }}>
              Histórico de Compras Faturadas
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Notas fiscais de entrada importadas ({filteredCompras.length} registros)
            </Typography>
          </Box>

          <SentinelInput
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
            sx={{ width: { xs: '100%', sm: 360 } }}
          />
        </Box>
      </SentinelCard>

      {loading ? (
        <SentinelCard dense sx={{ p: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2 }}>
          <CircularProgress size={36} />
          <Typography variant="body2" color="text.secondary">
            Carregando compras...
          </Typography>
        </SentinelCard>
      ) : filteredCompras.length === 0 ? (
        <SentinelCard dense sx={{ p: 6, textAlign: 'center' }}>
          <ReceiptLong sx={{ fontSize: 60, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary" fontWeight={600}>
            {searchTerm ? 'Nenhuma compra encontrada para os termos informados.' : 'Nenhuma compra registrada ainda.'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Importe seus arquivos XML de NF-e para alimentar automaticamente o estoque, custos e o histórico de compras.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<AddShoppingCart />}
              onClick={() => navigate('/compras/nova')}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              + Lançar Compra Manual
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<CloudUpload />}
              onClick={() => navigate('/nfe')}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Importar XML NF-e
            </Button>
          </Box>
        </SentinelCard>
      ) : (
        <SentinelTableContainer>
          <SentinelTable>
            <SentinelTableHead>
              <SentinelTableRow>
                <SentinelTableCell tabular={false}>Fornecedor</SentinelTableCell>
                <SentinelTableCell tabular={false}>Documento / NF</SentinelTableCell>
                <SentinelTableCell tabular={false}>Data</SentinelTableCell>
                <SentinelTableCell align="center" tabular={false}>Itens</SentinelTableCell>
                <SentinelTableCell align="right" tabular={false}>Valor Total</SentinelTableCell>
                <SentinelTableCell align="center" tabular={false}>Ações</SentinelTableCell>
              </SentinelTableRow>
            </SentinelTableHead>
            <TableBody>
              {filteredCompras.map((c) => (
                <SentinelTableRow key={c.id}>
                  {/* Fornecedor */}
                  <SentinelTableCell tabular={false}>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8125rem' }}>
                      {c.fornecedor_nome}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                      CNPJ: {c.fornecedor_cnpj} {c.fornecedor_uf && `(${c.fornecedor_uf})`}
                    </Typography>
                  </SentinelTableCell>

                  {/* Nota Fiscal */}
                  <SentinelTableCell tabular={false}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8125rem' }}>
                        {c.origem === 'MANUAL' ? 'Doc' : 'Nº'} {c.numero_nota}
                      </Typography>
                      <SentinelBadge
                        sentinelVariant={c.origem === 'MANUAL' ? 'warning' : 'info'}
                        size="small"
                        label={c.origem === 'MANUAL' ? 'MANUAL' : 'NF-E'}
                      />
                      {c.anexo_url && (
                        <Tooltip title={`Comprovante anexado (${c.anexo_nome || 'Arquivo'})`}>
                          <Box component="span">
                            <SentinelBadge
                              sentinelVariant="active"
                              size="small"
                              label="ANEXO"
                            />
                          </Box>
                        </Tooltip>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          maxWidth: 160,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontFamily: 'monospace',
                          fontSize: '0.7rem',
                          color: 'text.secondary',
                        }}
                      >
                        {c.chave_acesso}
                      </Typography>
                      <Tooltip title={copiedKey === c.chave_acesso ? 'Copiado!' : 'Copiar Chave'}>
                        <IconButton size="small" onClick={() => handleCopyChave(c.chave_acesso)} sx={{ p: 0.2 }}>
                          {copiedKey === c.chave_acesso ? <CheckCircle sx={{ fontSize: 14 }} color="success" /> : <ContentCopy sx={{ fontSize: 14 }} />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </SentinelTableCell>

                  {/* Data */}
                  <SentinelTableCell tabular={false}>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                      {formatDate(c.data_importacao)}
                    </Typography>
                    {c.data_emissao && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', display: 'block' }}>
                        Emissão: {c.data_emissao.split('T')[0]}
                      </Typography>
                    )}
                  </SentinelTableCell>

                  {/* Quantidade de Itens */}
                  <SentinelTableCell align="center" tabular={false}>
                    <SentinelBadge
                      sentinelVariant="default"
                      size="small"
                      label={`${c.total_itens} ITENS`}
                    />
                  </SentinelTableCell>

                  {/* Valor Total */}
                  <SentinelTableCell align="right" tabular={true}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 800,
                        color: sentinelTokens.colors.owner.accent,
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '0.875rem',
                      }}
                    >
                      {formatCurrency(c.valor_total)}
                    </Typography>
                  </SentinelTableCell>

                  {/* Ações */}
                  <SentinelTableCell align="center" tabular={false}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Visibility sx={{ fontSize: 14 }} />}
                      onClick={() => navigate(`/compras/${c.id}`)}
                      sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, height: 28, fontSize: '0.75rem' }}
                    >
                      Detalhes
                    </Button>
                  </SentinelTableCell>
                </SentinelTableRow>
              ))}
            </TableBody>
          </SentinelTable>
        </SentinelTableContainer>
      )}
    </Box>
  );
};

