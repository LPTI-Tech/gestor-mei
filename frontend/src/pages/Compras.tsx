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
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Truck,
  Building2,
  Search,
  UploadCloud,
  Plus,
  RefreshCw,
  Eye,
  Copy,
  Check,
  ReceiptText,
  Calendar,
  ShoppingBag,
  Paperclip,
  FileCode,
  FileText,
  DollarSign,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';
import { ResumoCompras, CompraItemResumo } from '../types';
import { formatCurrency, formatDate } from '../services/exportUtils';
import { StatusPill } from '../components/StatusPill';
import { StatCard } from '../components/StatCard';

// Formata chave de 44 dígitos em blocos legíveis de 4 caracteres
const formatChaveFiscal = (chave: string): string => {
  if (!chave) return '';
  const clean = chave.replace(/\D/g, '');
  if (clean.length !== 44) return chave;
  return clean.replace(/(\d{4})/g, '$1 ').trim();
};

// Gera iniciais para avatar do fornecedor
const getFornecedorInitials = (nome: string): string => {
  if (!nome) return 'FO';
  const clean = nome.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.substring(0, 2).toUpperCase() || 'FO';
};

// Gera uma cor consistente para o avatar baseada no nome
const getAvatarColor = (nome: string) => {
  const colors = [
    { bg: 'rgba(37, 99, 235, 0.12)', text: '#2563EB' },
    { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669' },
    { bg: 'rgba(217, 119, 6, 0.12)', text: '#D97706' },
    { bg: 'rgba(124, 58, 237, 0.12)', text: '#7C3AED' },
    { bg: 'rgba(13, 148, 136, 0.12)', text: '#0D9488' },
    { bg: 'rgba(225, 29, 72, 0.12)', text: '#E11D48' },
  ];
  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const Compras: React.FC = () => {
  const theme = useTheme();
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

      const [resumoRes, comprasRes] = await Promise.allSettled([
        api.get<ResumoCompras>('/compras/resumo'),
        api.get<CompraItemResumo[]>('/compras'),
      ]);

      if (resumoRes.status === 'fulfilled') {
        setResumo(resumoRes.value.data);
      }
      if (comprasRes.status === 'fulfilled') {
        setCompras(comprasRes.value.data);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados de compras:', err);
      setErrorMsg('Não foi possível carregar os dados de suprimentos e fornecedores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyChave = (chave: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(chave);
      setCopiedKey(chave);
      setTimeout(() => setCopiedKey(null), 2500);
    }
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
    <Box sx={{ pb: 4 }}>
      {/* 1. Header Executivo Sentinel (Hub de Suprimentos) */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                bgcolor: 'rgba(37, 99, 235, 0.1)',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={22} strokeWidth={1.75} />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'text.primary',
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
              }}
            >
              Hub de Suprimentos & Compras
            </Typography>
            <StatusPill
              label={`${compras.length} registro${compras.length === 1 ? '' : 's'}`}
              variant="neutral"
            />
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.6, fontWeight: 500 }}>
            Centro de gestão de fornecedores, abastecimento de estoque, notas fiscais de entrada e custos de aquisição.
          </Typography>
        </Box>

        {/* Toolbar de Ações Sentinel */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Tooltip title="Atualizar dados">
            <Button
              variant="outlined"
              onClick={fetchData}
              disabled={loading}
              sx={{
                minWidth: 42,
                width: 42,
                height: 42,
                p: 0,
                borderRadius: 2,
                borderColor: (t) =>
                  t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
                color: 'text.primary',
                bgcolor: 'background.paper',
              }}
            >
              <RefreshCw size={16} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
            </Button>
          </Tooltip>

          <Button
            variant="outlined"
            startIcon={<Plus size={16} strokeWidth={1.75} />}
            onClick={() => navigate('/compras/nova')}
            sx={{
              fontWeight: 600,
              height: 42,
              borderRadius: 2,
              borderColor: (t) =>
                t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
              color: 'text.primary',
              bgcolor: 'background.paper',
              textTransform: 'none',
              px: 2,
            }}
          >
            Nova Compra Manual
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<UploadCloud size={18} strokeWidth={1.75} />}
            onClick={() => navigate('/nfe')}
            sx={{
              fontWeight: 700,
              height: 42,
              borderRadius: 2,
              textTransform: 'none',
              px: 2.5,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            }}
          >
            Importar XML NF-e
          </Button>
        </Box>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2.5, fontWeight: 600 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* 2. KPI Cards (Metric Surfaces / Clear Signals) */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* Card 1: Comprado no Mês */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Comprado no Mês"
            value={formatCurrency(resumo?.total_comprado_mes ?? 0)}
            subtitle={resumo ? `${resumo.numero_notas_mes} nota(s) faturada(s) este mês` : 'Nenhuma nota'}
            icon={<ShoppingBag size={20} strokeWidth={1.75} />}
            color="#2563EB"
            trend={resumo && resumo.numero_notas_mes > 0 ? `${resumo.numero_notas_mes} notas` : 'Sem compras'}
            trendType="neutral"
          />
        </Grid>

        {/* Card 2: Comprado no Ano */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Comprado no Ano"
            value={formatCurrency(resumo?.total_comprado_ano ?? 0)}
            subtitle={`${resumo?.numero_notas_total ?? 0} notas no acumulado anual`}
            icon={<Calendar size={20} strokeWidth={1.75} />}
            color="#0D9488"
          />
        </Grid>

        {/* Card 3: Fornecedor Principal */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              borderRadius: 2.5,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: (t) =>
                t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: (t) =>
                t.palette.mode === 'dark'
                  ? '0 1px 3px rgba(0, 0, 0, 0.3)'
                  : '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'text.secondary',
                }}
              >
                FORNECEDOR PRINCIPAL
              </Typography>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(124, 58, 237, 0.1)',
                  color: '#7C3AED',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building2 size={18} strokeWidth={1.75} />
              </Box>
            </Box>

            {resumo?.fornecedor_principal ? (
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                    mb: 0.5,
                  }}
                  noWrap
                  title={resumo.fornecedor_principal.nome}
                >
                  {resumo.fornecedor_principal.nome}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', fontWeight: 500 }}>
                  <Box component="span" sx={{ fontWeight: 800, color: 'text.primary', fontFeatureSettings: '"tnum"' }}>
                    {formatCurrency(resumo.fornecedor_principal.total_comprado)}
                  </Box>{' '}
                  • {resumo.fornecedor_principal.quantidade_notas} compras
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Sem histórico acumulado
              </Typography>
            )}

            <Box sx={{ mt: 1 }}>
              <StatusPill label="Maior Volume Financeiro" variant="info" />
            </Box>
          </Paper>
        </Grid>

        {/* Card 4: Última Compra */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              borderRadius: 2.5,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: (t) =>
                t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: (t) =>
                t.palette.mode === 'dark'
                  ? '0 1px 3px rgba(0, 0, 0, 0.3)'
                  : '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'text.secondary',
                }}
              >
                ÚLTIMA COMPRA
              </Typography>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(16, 185, 129, 0.1)',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ReceiptText size={18} strokeWidth={1.75} />
              </Box>
            </Box>

            {resumo?.ultima_compra ? (
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                    mb: 0.5,
                  }}
                  noWrap
                  title={resumo.ultima_compra.fornecedor_nome}
                >
                  {resumo.ultima_compra.fornecedor_nome}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', fontWeight: 500 }}>
                  NF nº {resumo.ultima_compra.numero_nota} •{' '}
                  <Box component="span" sx={{ fontWeight: 800, color: 'text.primary', fontFeatureSettings: '"tnum"' }}>
                    {formatCurrency(resumo.ultima_compra.valor_total)}
                  </Box>
                </Typography>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, display: 'block', mt: 0.3 }}>
                  {formatDate(resumo.ultima_compra.data)}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhuma compra registrada
              </Typography>
            )}

            <Box sx={{ mt: 1 }}>
              <StatusPill label="Última Entrada" variant="success" />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. Tabela & Linha do Tempo de Fornecedores (Protective Ceramic Surface) */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
          overflow: 'hidden',
          boxShadow: (t) =>
            t.palette.mode === 'dark'
              ? '0 1px 3px rgba(0, 0, 0, 0.3)'
              : '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)',
        }}
      >
        {/* Barra de Filtro e Busca Superior */}
        <Box
          sx={{
            p: 2.5,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
            borderBottom: '1px solid',
            borderColor: (t) =>
              t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
              Histórico & Gestão de Fornecedores
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Notas fiscais de entrada importadas e compras manuais ({filteredCompras.length} registro(s))
            </Typography>
          </Box>

          <TextField
            size="small"
            placeholder="Buscar fornecedor, CNPJ, nota ou chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} strokeWidth={1.75} style={{ color: '#64748B' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: { xs: '100%', sm: 360 },
              '& .MuiOutlinedInput-root': { borderRadius: 2 },
            }}
          />
        </Box>

        {loading ? (
          <Box sx={{ p: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2 }}>
            <CircularProgress size={36} thickness={4} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Carregando histórico de fornecedores e compras...
            </Typography>
          </Box>
        ) : filteredCompras.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: 'rgba(37, 99, 235, 0.08)',
                color: '#2563EB',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <Truck size={28} strokeWidth={1.75} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
              {searchTerm ? 'Nenhuma compra encontrada para os termos informados' : 'Nenhuma compra registrada'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 440, mx: 'auto' }}>
              Importe seus arquivos XML de NF-e para alimentar automaticamente o estoque, custos unitários e o histórico de fornecedores.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<Plus size={16} strokeWidth={1.75} />}
                onClick={() => navigate('/compras/nova')}
                sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
              >
                Lançar Compra Manual
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<UploadCloud size={18} strokeWidth={1.75} />}
                onClick={() => navigate('/nfe')}
                sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 2.5 }}
              >
                Importar XML NF-e
              </Button>
            </Box>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead
                sx={{
                  bgcolor: (t) =>
                    t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                }}
              >
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', py: 1.8 }}>
                    Fornecedor
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', py: 1.8 }}>
                    Documento Fiscal & Chave
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', py: 1.8 }}>
                    Data & Emissão
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', py: 1.8 }}>
                    Itens
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', py: 1.8 }}>
                    Valor Total
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', py: 1.8 }}>
                    Ações
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCompras.map((c) => {
                  const avatarColor = getAvatarColor(c.fornecedor_nome);
                  const isXml = c.origem !== 'MANUAL';
                  return (
                    <TableRow
                      key={c.id}
                      hover
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Fornecedor com Avatar */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 38,
                              height: 38,
                              bgcolor: avatarColor.bg,
                              color: avatarColor.text,
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              borderRadius: 2,
                            }}
                          >
                            {getFornecedorInitials(c.fornecedor_nome)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.25 }}>
                              {c.fornecedor_nome}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                              CNPJ: {c.fornecedor_cnpj} {c.fornecedor_uf && `(${c.fornecedor_uf})`}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Documento Fiscal & Chave Formatada em Blocos */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {isXml ? 'NF-e' : 'Doc'} nº {c.numero_nota}
                          </Typography>
                          <StatusPill
                            label={isXml ? 'XML NF-e' : 'Manual'}
                            variant={isXml ? 'info' : 'neutral'}
                            icon={isXml ? <FileCode size={12} strokeWidth={1.75} /> : <FileText size={12} strokeWidth={1.75} />}
                          />
                          {c.anexo_url && (
                            <Tooltip title={`Comprovante anexado (${c.anexo_nome || 'Arquivo'})`}>
                              <Box
                                component="a"
                                href={c.anexo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.4,
                                  px: 1,
                                  py: 0.25,
                                  borderRadius: 1,
                                  bgcolor: 'rgba(16, 185, 129, 0.1)',
                                  color: '#059669',
                                  border: '1px solid rgba(16, 185, 129, 0.25)',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.2)' },
                                }}
                              >
                                <Paperclip size={11} strokeWidth={1.75} />
                                Anexo
                              </Box>
                            </Tooltip>
                          )}
                        </Box>

                        {/* Chave de Acesso formatada em blocos de 4 dígitos */}
                        {c.chave_acesso && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.6 }}>
                            <Box
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.72rem',
                                letterSpacing: '0.04em',
                                color: 'text.secondary',
                                bgcolor: (t) =>
                                  t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)',
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                maxWidth: 260,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={c.chave_acesso}
                            >
                              {formatChaveFiscal(c.chave_acesso)}
                            </Box>
                            <Tooltip title={copiedKey === c.chave_acesso ? 'Chave copiada!' : 'Copiar chave completa'}>
                              <IconButton
                                size="small"
                                onClick={() => handleCopyChave(c.chave_acesso)}
                                sx={{ p: 0.4, color: copiedKey === c.chave_acesso ? '#10B981' : 'text.secondary' }}
                              >
                                {copiedKey === c.chave_acesso ? (
                                  <Check size={14} strokeWidth={2} />
                                ) : (
                                  <Copy size={14} strokeWidth={1.75} />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>

                      {/* Data & Emissão */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFeatureSettings: '"tnum"' }}>
                          {formatDate(c.data_importacao)}
                        </Typography>
                        {c.data_emissao && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.2 }}>
                            Emissão: {c.data_emissao.split('T')[0]}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Total de Itens */}
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            px: 1.2,
                            py: 0.35,
                            borderRadius: 1.5,
                            bgcolor: (t) =>
                              t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            fontFeatureSettings: '"tnum"',
                          }}
                        >
                          {c.total_itens} item{c.total_itens === 1 ? '' : 's'}
                        </Box>
                      </TableCell>

                      {/* Valor Total Tabular */}
                      <TableCell align="right">
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 800,
                            color: 'primary.main',
                            fontFeatureSettings: '"tnum"',
                            letterSpacing: '-0.015em',
                            fontSize: '0.95rem',
                          }}
                        >
                          {formatCurrency(c.valor_total)}
                        </Typography>
                      </TableCell>

                      {/* Ações */}
                      <TableCell align="center">
                        <Button
                          variant="outlined"
                          size="small"
                          endIcon={<ArrowRight size={14} strokeWidth={1.75} />}
                          onClick={() => navigate(`/compras/${c.id}`)}
                          sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            py: 0.5,
                            px: 1.5,
                          }}
                        >
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};
