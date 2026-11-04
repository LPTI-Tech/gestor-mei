import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Divider,
  Snackbar,
} from '@mui/material';
import {
  CloudUpload,
  ReceiptLong,
  History,
  Link as LinkIcon,
  CheckCircle,
  WarningAmber,
  ErrorOutline,
  ContentCopy,
  Delete,
  Add,
  ArrowForward,
  Inventory2,
  Business,
  Numbers,
  CalendarMonth,
  AttachMoney,
  Close,
} from '@mui/icons-material';
import api from '../services/api';
import {
  NfePreviewResponse,
  ItemNfePreview,
  NfeImportada,
  ProdutoVinculoXML,
  Produto,
  NfeImportarResultadoResponse,
} from '../types';
import { formatCurrency } from '../services/exportUtils';

export const ImportarNfe: React.FC = () => {
  const [tabValue, setTabValue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Produtos cadastrados para seleção no De-Para
  const [produtos, setProdutos] = useState<Produto[]>([]);

  // Preview State
  const [preview, setPreview] = useState<NfePreviewResponse | null>(null);
  const [itensPreview, setItensPreview] = useState<ItemNfePreview[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import Result Modal
  const [resultadoImportacao, setResultadoImportacao] = useState<NfeImportarResultadoResponse | null>(null);
  const [dialogResultadoOpen, setDialogResultadoOpen] = useState<boolean>(false);

  // Histórico State
  const [historico, setHistorico] = useState<NfeImportada[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState<boolean>(false);
  const [notaDetalhe, setNotaDetalhe] = useState<NfeImportada | null>(null);
  const [dialogDetalhesOpen, setDialogDetalhesOpen] = useState<boolean>(false);

  // Vínculos State
  const [vinculos, setVinculos] = useState<ProdutoVinculoXML[]>([]);
  const [loadingVinculos, setLoadingVinculos] = useState<boolean>(false);

  // Modal Cadastro Rápido de Produto
  const [modalNovoProdutoOpen, setModalNovoProdutoOpen] = useState<boolean>(false);
  const [itemParaNovoProduto, setItemParaNovoProduto] = useState<ItemNfePreview | null>(null);
  const [novoProdNome, setNovoProdNome] = useState<string>('');
  const [novoProdCategoria, setNovoProdCategoria] = useState<string>('Bebidas / Alimentos');
  const [novoProdPrecoVenda, setNovoProdPrecoVenda] = useState<number>(0);
  const [novoProdCusto, setNovoProdCusto] = useState<number>(0);
  const [savingNovoProd, setSavingNovoProd] = useState<boolean>(false);

  // Carrega produtos da empresa
  const carregarProdutos = async () => {
    try {
      const res = await api.get<Produto[]>('/produtos?apenas_ativos=true');
      setProdutos(res.data);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    }
  };

  // Carrega histórico de notas importadas
  const carregarHistorico = async () => {
    try {
      setLoadingHistorico(true);
      const res = await api.get<NfeImportada[]>('/nfe/historico');
      setHistorico(res.data);
    } catch (err: any) {
      setErrorMsg('Não foi possível carregar o histórico de notas fiscais.');
    } finally {
      setLoadingHistorico(false);
    }
  };

  // Carrega lista de vínculos salvos
  const carregarVinculos = async () => {
    try {
      setLoadingVinculos(true);
      const res = await api.get<ProdutoVinculoXML[]>('/nfe/vinculos');
      setVinculos(res.data);
    } catch (err: any) {
      setErrorMsg('Não foi possível carregar as regras de vinculação.');
    } finally {
      setLoadingVinculos(false);
    }
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

  useEffect(() => {
    if (tabValue === 1) {
      carregarHistorico();
    } else if (tabValue === 2) {
      carregarVinculos();
    }
  }, [tabValue]);

  // Upload e Parsing do Arquivo XML
  const processarArquivoXml = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xml')) {
      setErrorMsg('Por favor, selecione um arquivo com extensão .xml válido.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post<NfePreviewResponse>('/nfe/preview-xml', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPreview(res.data);
      // Inicializa flags locais de atualização para cada item
      const itensComFlags = res.data.itens.map((it) => ({
        ...it,
        atualizar_custo: true,
        atualizar_vinculo: true,
      }));
      setItensPreview(itensComFlags);
      setSuccessMsg(`XML da NF-e ${res.data.numero_nota} processado com sucesso!`);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Erro ao processar o arquivo XML da NF-e.';
      setErrorMsg(detail);
      setPreview(null);
      setItensPreview([]);
    } finally {
      setLoading(false);
    }
  };

  // Handlers de Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processarArquivoXml(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processarArquivoXml(e.target.files[0]);
    }
  };

  // Atualização em tempo real do item na tabela de conferência
  const handleProdutoChange = (index: number, produtoId: number) => {
    const updated = [...itensPreview];
    const item = updated[index];
    const prod = produtos.find((p) => p.id === produtoId);

    item.produto_id_vinculado = produtoId;
    item.produto_nome_vinculado = prod?.nome || null;
    item.status_vinculo = 'VINCULADO';

    setItensPreview(updated);
  };

  const handleFatorChange = (index: number, novoFator: number) => {
    const fator = novoFator > 0 ? novoFator : 1;
    const updated = [...itensPreview];
    const item = updated[index];

    item.fator_conversao = fator;
    item.quantidade_estoque_entrada = Number((item.quantidade_comercial * fator).toFixed(4));
    item.custo_unitario_calculado = Number((item.valor_unitario / fator).toFixed(4));

    setItensPreview(updated);
  };

  const handleFlagChange = (index: number, field: 'atualizar_custo' | 'atualizar_vinculo', value: boolean) => {
    const updated = [...itensPreview];
    updated[index][field] = value;
    setItensPreview(updated);
  };

  // Efetivar Importação
  const handleConfirmarImportacao = async () => {
    if (!preview) return;

    // Valida se todos os itens possuem produto vinculado
    const pendentes = itensPreview.filter((it) => !it.produto_id_vinculado);
    if (pendentes.length > 0) {
      setErrorMsg(`Existem ${pendentes.length} item(ns) sem produto correspondente selecionado. Vincule todos os itens para prosseguir.`);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const payload = {
        chave_acesso: preview.chave_acesso,
        numero_nota: preview.numero_nota,
        serie: preview.serie,
        data_emissao: preview.data_emissao,
        valor_total: preview.valor_total,
        fornecedor_cnpj: preview.fornecedor.cnpj,
        fornecedor_nome: preview.fornecedor.nome,
        fornecedor_uf: preview.fornecedor.uf,
        itens: itensPreview.map((it) => ({
          produto_id: it.produto_id_vinculado!,
          codigo_fornecedor: it.codigo_fornecedor,
          descricao_fornecedor: it.descricao_fornecedor,
          unidade_comercial: it.unidade_comercial,
          quantidade_comercial: it.quantidade_comercial,
          fator_conversao: it.fator_conversao,
          valor_unitario: it.valor_unitario,
          valor_total: it.valor_total,
          atualizar_custo: it.atualizar_custo ?? true,
          atualizar_vinculo: it.atualizar_vinculo ?? true,
        })),
        observacao: `Importação realizada via painel web Gestor MEI`,
      };

      const res = await api.post<NfeImportarResultadoResponse>('/nfe/importar', payload);
      setResultadoImportacao(res.data);
      setDialogResultadoOpen(true);
      setPreview(null);
      setItensPreview([]);
      // Atualiza lista de produtos com os novos saldos
      carregarProdutos();
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Erro ao importar NF-e.';
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  // Abertura do modal de criação rápida de produto
  const handleAbrirCriacaoRapida = (item: ItemNfePreview) => {
    setItemParaNovoProduto(item);
    setNovoProdNome(item.descricao_fornecedor);
    setNovoProdCategoria('Bebidas / Alimentos');
    const fator = item.fator_conversao || 1;
    const custoCalc = Number((item.valor_unitario / fator).toFixed(2));
    setNovoProdCusto(custoCalc);
    setNovoProdPrecoVenda(Number((custoCalc * 1.5).toFixed(2))); // Sugestão com 50% de margem
    setModalNovoProdutoOpen(true);
  };

  const handleSalvarNovoProduto = async () => {
    if (!novoProdNome.trim()) {
      setErrorMsg('Informe o nome do produto.');
      return;
    }

    try {
      setSavingNovoProd(true);
      const res = await api.post<Produto>('/produtos', {
        nome: novoProdNome.trim(),
        tipo: 'PRODUTO',
        categoria: novoProdCategoria,
        preco_venda: novoProdPrecoVenda,
        custo_unitario: novoProdCusto,
        quantidade_estoque: 0,
        estoque_minimo: 5,
        ativo: true,
      });

      const novoProduto = res.data;
      setProdutos((prev) => [...prev, novoProduto]);

      // Associa automaticamente ao item da nota
      if (itemParaNovoProduto) {
        const index = itensPreview.findIndex((it) => it.numero_item === itemParaNovoProduto.numero_item);
        if (index !== -1) {
          handleProdutoChange(index, novoProduto.id);
        }
      }

      setModalNovoProdutoOpen(false);
      setItemParaNovoProduto(null);
      setSuccessMsg(`Produto "${novoProduto.nome}" cadastrado e vinculado com sucesso!`);
    } catch (err: any) {
      setErrorMsg('Erro ao cadastrar novo produto.');
    } finally {
      setSavingNovoProd(false);
    }
  };

  // Detalhes da nota no histórico
  const handleVerDetalhesNota = async (nfeId: number) => {
    try {
      setLoading(true);
      const res = await api.get<NfeImportada>(`/nfe/historico/${nfeId}`);
      setNotaDetalhe(res.data);
      setDialogDetalhesOpen(true);
    } catch (err: any) {
      setErrorMsg('Não foi possível carregar os detalhes da nota.');
    } finally {
      setLoading(false);
    }
  };

  // Exclusão de vínculo
  const handleExcluirVinculo = async (vinculoId: number) => {
    if (!window.confirm('Tem certeza que deseja excluir esta regra de vínculo?')) return;
    try {
      await api.delete(`/nfe/vinculos/${vinculoId}`);
      setVinculos((prev) => prev.filter((v) => v.id !== vinculoId));
      setSuccessMsg('Vínculo removido com sucesso!');
    } catch (err: any) {
      setErrorMsg('Erro ao excluir vínculo.');
    }
  };

  const handleCopiarChave = (chave: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(chave);
      setSuccessMsg('Chave de acesso copiada para a área de transferência!');
    }
  };

  return (
    <Box>
      {/* Cabeçalho da Página */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <CloudUpload sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5" fontWeight={800}>
            Entrada de Estoque via XML NF-e
          </Typography>
          <Chip label="Sprint 6" color="primary" size="small" sx={{ fontWeight: 800 }} />
        </Box>
        <Typography variant="body2" color="text.secondary">
          Importe notas fiscais de compra (SEFAZ v4.00) de seus fornecedores para abastecer seu estoque e atualizar custos automaticamente.
        </Typography>
      </Box>

      {/* Tabs Principais */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, val) => setTabValue(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<CloudUpload />} iconPosition="start" label="Importar XML da NF-e" sx={{ fontWeight: 700, textTransform: 'none' }} />
          <Tab icon={<History />} iconPosition="start" label="Histórico de Importações" sx={{ fontWeight: 700, textTransform: 'none' }} />
          <Tab icon={<LinkIcon />} iconPosition="start" label="Vínculos Fornecedor (De-Para)" sx={{ fontWeight: 700, textTransform: 'none' }} />
        </Tabs>
      </Paper>

      {/* =============================================================== */}
      {/* ABA 0: IMPORTAR XML DE NF-E */}
      {/* =============================================================== */}
      {tabValue === 0 && (
        <Box>
          {/* Zona de Drag & Drop e Upload */}
          {!preview && (
            <Paper
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                p: 5,
                textAlign: 'center',
                borderRadius: 3,
                border: '2px dashed',
                borderColor: isDragging ? 'primary.main' : 'divider',
                bgcolor: isDragging ? 'rgba(25, 118, 210, 0.08)' : 'background.paper',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <CloudUpload sx={{ fontSize: 64, color: isDragging ? 'primary.main' : 'text.secondary', mb: 1.5 }} />
              <Typography variant="h6" fontWeight={700}>
                Arraste e solte o arquivo XML da NF-e aqui
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                Ou clique para selecionar o arquivo XML (Modelo 55 - SEFAZ) do seu computador
              </Typography>
              <Button
                variant="contained"
                startIcon={<CloudUpload />}
                sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 3 }}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Selecionar Arquivo .XML
              </Button>
            </Paper>
          )}

          {loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography variant="body1" fontWeight={700}>
                Processando arquivo XML e consultando produtos...
              </Typography>
            </Box>
          )}

          {/* Dados da Nota e Tabela de Itens (Quando o Preview está Carregado) */}
          {preview && (
            <Box>
              {/* Alerta de Nota Já Importada */}
              {preview.ja_importada && (
                <Alert
                  severity="error"
                  icon={<ErrorOutline />}
                  sx={{ mb: 2.5, fontWeight: 600, borderRadius: 2 }}
                >
                  Atenção: Esta nota fiscal já foi importada anteriormente no sistema {preview.data_importacao_previa ? `em ${preview.data_importacao_previa}` : ''}. O envio causará rejeição para evitar duplicidade de estoque!
                </Alert>
              )}

              {/* Alerta de Destinatário */}
              {!preview.destinatario_valido && (
                <Alert
                  severity="warning"
                  icon={<WarningAmber />}
                  sx={{ mb: 2.5, fontWeight: 600, borderRadius: 2 }}
                >
                  Aviso: O CNPJ do destinatário constante nesta nota fiscal é diferente do CNPJ cadastrado para sua empresa. Certifique-se de que a compra pertence ao seu estabelecimento.
                </Alert>
              )}

              {/* Card Resumo do Cabeçalho e Fornecedor */}
              <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, borderLeft: '6px solid #1976D2' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Business color="primary" />
                      <Typography variant="h6" fontWeight={800}>
                        {preview.fornecedor.nome}
                      </Typography>
                      {preview.fornecedor.uf && (
                        <Chip label={preview.fornecedor.uf} size="small" color="primary" sx={{ fontWeight: 700 }} />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      CNPJ: <strong>{preview.fornecedor.cnpj}</strong> {preview.fornecedor.ie ? `• IE: ${preview.fornecedor.ie}` : ''}
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      VALOR TOTAL DA NOTA
                    </Typography>
                    <Typography variant="h4" fontWeight={900} color="success.main">
                      {formatCurrency(preview.valor_total)}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Numbers fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Número / Série</Typography>
                        <Typography variant="body2" fontWeight={700}>NF-e {preview.numero_nota} (Série {preview.serie})</Typography>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarMonth fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Emissão</Typography>
                        <Typography variant="body2" fontWeight={700}>{preview.data_emissao ? new Date(preview.data_emissao).toLocaleDateString('pt-BR') : 'Não informada'}</Typography>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'action.hover', p: 1, borderRadius: 2 }}>
                      <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Typography variant="caption" color="text.secondary">Chave de Acesso (44 dígitos)</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {preview.chave_acesso}
                        </Typography>
                      </Box>
                      <Tooltip title="Copiar Chave">
                        <IconButton size="small" onClick={() => handleCopiarChave(preview.chave_acesso)}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip label={`${preview.total_itens} item(ns) na nota`} size="small" sx={{ fontWeight: 700 }} />
                    <Chip label={`${itensPreview.filter((i) => i.status_vinculo === 'VINCULADO').length} vinculado(s)`} color="success" size="small" sx={{ fontWeight: 700 }} />
                    {itensPreview.filter((i) => i.status_vinculo !== 'VINCULADO').length > 0 && (
                      <Chip label={`${itensPreview.filter((i) => i.status_vinculo !== 'VINCULADO').length} pendente(s)`} color="warning" size="small" sx={{ fontWeight: 700 }} />
                    )}
                  </Box>

                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={() => {
                      setPreview(null);
                      setItensPreview([]);
                    }}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Carregar Outro XML
                  </Button>
                </Box>
              </Paper>

              {/* Tabela de Conferência e De-Para de Produtos */}
              <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={700}>
                    Conferência dos Produtos & Vínculos de Estoque
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Vincule o produto faturado pelo fornecedor com seu cadastro local e confira o fator de conversão de embalagem para unidades.
                  </Typography>
                </Box>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, width: 40 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>Item na Nota Fiscal (Fornecedor)</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, width: 110 }}>Qtd / Un</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, width: 110 }}>Valor Un.</TableCell>
                        <TableCell sx={{ fontWeight: 700, minWidth: 260 }}>Produto no Gestor MEI</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, width: 110 }}>Fator Conversão</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, width: 120 }}>Entrada Estoque</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, width: 110 }}>Novo Custo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {itensPreview.map((item, index) => (
                        <TableRow key={item.numero_item} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{item.numero_item}</TableCell>
                          
                          {/* Item no Fornecedor */}
                          <TableCell>
                            <Typography variant="body2" fontWeight={700}>
                              {item.descricao_fornecedor}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Cód: <code>{item.codigo_fornecedor}</code> {item.ean ? `• EAN: ${item.ean}` : ''}
                            </Typography>
                          </TableCell>

                          {/* Quantidade Comercial e Unidade */}
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight={700}>
                              {item.quantidade_comercial} {item.unidade_comercial}
                            </Typography>
                          </TableCell>

                          {/* Valor Unitário na Nota */}
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {formatCurrency(item.valor_unitario)}
                            </Typography>
                          </TableCell>

                          {/* Seleção do Produto no Gestor MEI */}
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TextField
                                  select
                                  fullWidth
                                  size="small"
                                  value={item.produto_id_vinculado || ''}
                                  onChange={(e) => handleProdutoChange(index, Number(e.target.value))}
                                  SelectProps={{ displayEmpty: true }}
                                  sx={{ fontSize: '0.85rem' }}
                                >
                                  <MenuItem value="" disabled>
                                    <em>-- Selecionar Produto do Catálogo --</em>
                                  </MenuItem>
                                  {produtos.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>
                                      {p.nome} (Atual: {p.quantidade_estoque ?? 0} un)
                                    </MenuItem>
                                  ))}
                                </TextField>

                                <Tooltip title="Cadastrar este item como novo produto no catálogo">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    onClick={() => handleAbrirCriacaoRapida(item)}
                                    sx={{ minWidth: 40, px: 1, py: 0.8 }}
                                  >
                                    <Add fontSize="small" />
                                  </Button>
                                </Tooltip>
                              </Box>

                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  size="small"
                                  label={
                                    item.status_vinculo === 'VINCULADO'
                                      ? 'Vinculado'
                                      : item.status_vinculo === 'SUGESTAO'
                                      ? 'Sugestão'
                                      : 'Pendente'
                                  }
                                  color={
                                    item.status_vinculo === 'VINCULADO'
                                      ? 'success'
                                      : item.status_vinculo === 'SUGESTAO'
                                      ? 'info'
                                      : 'error'
                                  }
                                  sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }}
                                />
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      size="small"
                                      checked={item.atualizar_vinculo ?? true}
                                      onChange={(e) => handleFlagChange(index, 'atualizar_vinculo', e.target.checked)}
                                    />
                                  }
                                  label={<Typography variant="caption">Lembrar vínculo</Typography>}
                                />
                              </Box>
                            </Box>
                          </TableCell>

                          {/* Fator de Conversão */}
                          <TableCell align="center">
                            <Tooltip title="Ex: Se comprou 1 caixa com 12 unidades, digite 12">
                              <TextField
                                type="number"
                                size="small"
                                value={item.fator_conversao}
                                onChange={(e) => handleFatorChange(index, parseFloat(e.target.value))}
                                inputProps={{ min: 0.001, step: 1, style: { textAlign: 'center', fontWeight: 700 } }}
                                sx={{ width: 85 }}
                              />
                            </Tooltip>
                          </TableCell>

                          {/* Entrada em Estoque */}
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={`+${item.quantidade_estoque_entrada} un`}
                              color="primary"
                              sx={{ fontWeight: 800 }}
                            />
                          </TableCell>

                          {/* Novo Custo Unitário */}
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={800} color="primary.main">
                              {formatCurrency(item.custo_unitario_calculado)}
                            </Typography>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  size="small"
                                  checked={item.atualizar_custo ?? true}
                                  onChange={(e) => handleFlagChange(index, 'atualizar_custo', e.target.checked)}
                                />
                              }
                              label={<Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Atualizar</Typography>}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Rodapé com Botão Principal de Importação */}
                <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {itensPreview.filter((i) => i.produto_id_vinculado).length} de {itensPreview.length} produtos vinculados e prontos para entrada.
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={() => {
                        setPreview(null);
                        setItensPreview([]);
                      }}
                      sx={{ fontWeight: 600, textTransform: 'none' }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      size="large"
                      disabled={loading || preview.ja_importada || itensPreview.some((i) => !i.produto_id_vinculado)}
                      onClick={handleConfirmarImportacao}
                      startIcon={<CheckCircle />}
                      sx={{ fontWeight: 800, textTransform: 'none', px: 3, borderRadius: 2 }}
                    >
                      Confirmar e Importar Estoque
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </Box>
          )}
        </Box>
      )}

      {/* =============================================================== */}
      {/* ABA 1: HISTÓRICO DE IMPORTAÇÕES */}
      {/* =============================================================== */}
      {tabValue === 1 && (
        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Histórico de Notas Fiscais Importadas
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Rastreabilidade de todas as notas fiscais de compra que alimentaram o estoque da sua empresa.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={carregarHistorico}
              disabled={loadingHistorico}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Atualizar Histórico
            </Button>
          </Box>

          {loadingHistorico ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <CircularProgress size={36} />
              <Typography variant="body2" sx={{ mt: 1 }}>Carregando histórico...</Typography>
            </Box>
          ) : historico.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <ReceiptLong sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 1 }} />
              <Typography variant="body1" fontWeight={700}>
                Nenhuma nota fiscal importada ainda.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Faça o upload do seu primeiro arquivo XML na aba "Importar XML da NF-e".
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Data Importação</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Nota / Série</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Fornecedor</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Itens</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Valor Total</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Chave de Acesso</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Ação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historico.map((nota) => (
                    <TableRow key={nota.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {new Date(nota.data_importacao).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        NF-e {nota.numero_nota} (Série {nota.serie})
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{nota.fornecedor_nome}</Typography>
                        <Typography variant="caption" color="text.secondary">CNPJ: {nota.fornecedor_cnpj}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={`${nota.total_itens} item(ns)`} size="small" sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main' }}>
                        {formatCurrency(nota.valor_total)}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {nota.chave_acesso.substring(0, 15)}...
                          </Typography>
                          <Tooltip title="Copiar Chave Completa">
                            <IconButton size="small" onClick={() => handleCopiarChave(nota.chave_acesso)}>
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleVerDetalhesNota(nota.id)}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                        >
                          Ver Itens
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* =============================================================== */}
      {/* ABA 2: VÍNCULOS FORNECEDOR (DE-PARA) */}
      {/* =============================================================== */}
      {tabValue === 2 && (
        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Regras de Vínculos De-Para Memorizadas
              </Typography>
              <Typography variant="caption" color="text.secondary">
                O sistema memoriza o código do fornecedor para associar automaticamente nas próximas compras com o fator de conversão.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={carregarVinculos}
              disabled={loadingVinculos}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Atualizar Vínculos
            </Button>
          </Box>

          {loadingVinculos ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <CircularProgress size={36} />
              <Typography variant="body2" sx={{ mt: 1 }}>Carregando regras de vínculo...</Typography>
            </Box>
          ) : vinculos.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <LinkIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 1 }} />
              <Typography variant="body1" fontWeight={700}>
                Nenhum vínculo gravado ainda.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ao importar suas notas fiscais com a opção "Lembrar vínculo" marcada, as regras aparecerão aqui.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Fornecedor (CNPJ)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Código Fornecedor</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Descrição Fornecedor</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Produto no Gestor MEI</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Fator Conversão</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vinculos.map((v) => (
                    <TableRow key={v.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{v.fornecedor_nome || 'Fornecedor'}</Typography>
                        <Typography variant="caption" color="text.secondary">CNPJ: {v.fornecedor_cnpj}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {v.codigo_fornecedor}
                      </TableCell>
                      <TableCell>{v.descricao_fornecedor || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {v.produto_nome || `Produto #${v.produto_id}`}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={`Fator: ${v.fator_conversao}`} size="small" color="primary" sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Excluir Vínculo">
                          <IconButton size="small" color="error" onClick={() => handleExcluirVinculo(v.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* =============================================================== */}
      {/* MODAL: RESULTADO DA IMPORTAÇÃO */}
      {/* =============================================================== */}
      <Dialog
        open={dialogResultadoOpen}
        onClose={() => setDialogResultadoOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'success.light', color: 'success.contrastText' }}>
          <CheckCircle />
          <Typography variant="h6" fontWeight={800}>
            Importação Concluída com Sucesso!
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {resultadoImportacao && (
            <Box>
              <Typography variant="body1" fontWeight={700} sx={{ mb: 1 }}>
                {resultadoImportacao.mensagem}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Nota Fiscal: <strong>{resultadoImportacao.numero_nota}</strong> • Chave: <code>{resultadoImportacao.chave_acesso}</code>
              </Typography>

              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Produtos Atualizados no Estoque ({resultadoImportacao.produtos_atualizados.length}):
              </Typography>

              <TableContainer sx={{ maxHeight: 280 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Produto</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Saldo Anterior</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Entrada</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Novo Saldo</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Custo Atualizado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultadoImportacao.produtos_atualizados.map((p) => (
                      <TableRow key={p.produto_id}>
                        <TableCell sx={{ fontWeight: 600 }}>{p.nome}</TableCell>
                        <TableCell align="center">{p.quantidade_anterior} un</TableCell>
                        <TableCell align="center">
                          <Chip label={`+${p.quantidade_adicionada} un`} size="small" color="success" sx={{ fontWeight: 700 }} />
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>{p.quantidade_nova} un</TableCell>
                        <TableCell align="right">
                          {p.custo_atualizado ? (
                            <Typography variant="body2" fontWeight={700} color="primary.main">
                              {formatCurrency(p.custo_novo)}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">Mantido</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={() => setDialogResultadoOpen(false)}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* =============================================================== */}
      {/* MODAL: DETALHES DA NOTA FISCAL IMPORTADA */}
      {/* =============================================================== */}
      <Dialog
        open={dialogDetalhesOpen}
        onClose={() => setDialogDetalhesOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLong color="primary" />
            <Typography variant="h6" fontWeight={800}>
              Detalhes da NF-e {notaDetalhe?.numero_nota}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setDialogDetalhesOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {notaDetalhe && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Fornecedor</Typography>
                  <Typography variant="body1" fontWeight={700}>{notaDetalhe.fornecedor_nome}</Typography>
                  <Typography variant="body2" color="text.secondary">CNPJ: {notaDetalhe.fornecedor_cnpj}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">Valor Total</Typography>
                  <Typography variant="h6" fontWeight={800} color="success.main">{formatCurrency(notaDetalhe.valor_total)}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">Data de Importação</Typography>
                  <Typography variant="body2" fontWeight={700}>{new Date(notaDetalhe.data_importacao).toLocaleString('pt-BR')}</Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Itens Faturados e Entradas de Estoque:
              </Typography>

              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Item Fornecedor</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Produto Vinculado</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Qtd Faturada</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Fator</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Entrada Estoque</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Custo Un.</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Valor Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {notaDetalhe.itens?.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{it.descricao_fornecedor}</Typography>
                          <Typography variant="caption" color="text.secondary">Cód: {it.codigo_fornecedor}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {it.produto_nome || `Produto #${it.produto_id}`}
                        </TableCell>
                        <TableCell align="center">{it.quantidade_comercial} {it.unidade_comercial}</TableCell>
                        <TableCell align="center">{it.fator_conversao}</TableCell>
                        <TableCell align="center">
                          <Chip label={`+${it.quantidade_entrada} un`} size="small" color="primary" sx={{ fontWeight: 700 }} />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(it.custo_unitario_calculado)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(it.valor_total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={() => setDialogDetalhesOpen(false)}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* =============================================================== */}
      {/* MODAL: CADASTRO RÁPIDO DE NOVO PRODUTO */}
      {/* =============================================================== */}
      <Dialog
        open={modalNovoProdutoOpen}
        onClose={() => setModalNovoProdutoOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Cadastrar Novo Produto Rapidamente
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cadastre este item no catálogo do Gestor MEI para que a entrada de estoque e os próximos pedidos sejam registrados corretamente.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nome do Produto"
              fullWidth
              size="small"
              value={novoProdNome}
              onChange={(e) => setNovoProdNome(e.target.value)}
              required
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Categoria"
                  fullWidth
                  size="small"
                  value={novoProdCategoria}
                  onChange={(e) => setNovoProdCategoria(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Custo Unitário (R$)"
                  type="number"
                  fullWidth
                  size="small"
                  value={novoProdCusto}
                  onChange={(e) => setNovoProdCusto(parseFloat(e.target.value) || 0)}
                  inputProps={{ step: '0.01' }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Preço de Venda Sugerido (R$)"
                  type="number"
                  fullWidth
                  size="small"
                  value={novoProdPrecoVenda}
                  onChange={(e) => setNovoProdPrecoVenda(parseFloat(e.target.value) || 0)}
                  inputProps={{ step: '0.01' }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setModalNovoProdutoOpen(false)}
            disabled={savingNovoProd}
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSalvarNovoProduto}
            disabled={savingNovoProd || !novoProdNome.trim()}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          >
            {savingNovoProd ? 'Salvando...' : 'Salvar e Vincular'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbars de Notificação */}
      <Snackbar
        open={Boolean(errorMsg)}
        autoHideDuration={6000}
        onClose={() => setErrorMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ width: '100%', fontWeight: 600 }}>
          {errorMsg}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(successMsg)}
        autoHideDuration={4000}
        onClose={() => setSuccessMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ width: '100%', fontWeight: 600 }}>
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};
