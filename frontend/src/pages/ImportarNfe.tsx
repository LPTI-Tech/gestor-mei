import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  CircularProgress,
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
  Alert,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  UploadCloud,
  FileText,
  FileSearch,
  Layers,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Hash,
  Calendar,
  DollarSign,
  Copy,
  Check,
  Plus,
  Trash2,
  History,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  X,
  PackageCheck,
  Truck,
  ArrowRight,
  Info,
} from 'lucide-react';
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
import { StatusPill } from '../components/StatusPill';

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

export const ImportarNfe: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [tabValue, setTabValue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
      setCopiedKey(chave);
      setSuccessMsg('Chave de acesso copiada para a área de transferência!');
      setTimeout(() => setCopiedKey(null), 3000);
    }
  };

  // Estágio atual do Onboarding de Suprimentos
  const getStepperStatus = (stepIndex: number) => {
    if (!preview) {
      return stepIndex === 0 ? 'active' : 'pending';
    }
    // Quando temos preview carregado:
    // 0: Upload -> Concluído
    // 1: Leitura -> Concluído
    // 2: Validação -> Concluído
    if (stepIndex <= 2) return 'completed';
    // 3: De-Para -> Concluído se todos vinculados, senão ativo
    const todosVinculados = itensPreview.every((i) => i.produto_id_vinculado);
    if (stepIndex === 3) return todosVinculados ? 'completed' : 'active';
    // 4: Estoque -> Ativo se todos vinculados
    if (stepIndex === 4) return todosVinculados ? 'completed' : 'pending';
    // 5: Confirmação -> Pronto se todos vinculados e não importada antes
    if (stepIndex === 5) return (todosVinculados && !preview.ja_importada) ? 'active' : 'pending';
    return 'pending';
  };

  const stepsConfig = [
    { label: 'Upload', desc: 'Envio do arquivo XML', icon: UploadCloud },
    { label: 'Leitura', desc: 'SEFAZ v4.00 Decodificada', icon: FileSearch },
    { label: 'Validação', desc: 'Destinatário & Duplicidade', icon: ShieldCheck },
    { label: 'De-Para', desc: 'Vínculo do Catálogo', icon: Layers },
    { label: 'Estoque', desc: 'Fator de Conversão', icon: PackageCheck },
    { label: 'Confirmação', desc: 'Atualização & Custo', icon: CheckCircle2 },
  ];

  return (
    <Box>
      {/* =============================================================== */}
      {/* HEADER EXECUTIVO SENTINEL                                      */}
      {/* =============================================================== */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                bgcolor: 'rgba(37, 99, 235, 0.1)',
                border: '1px solid rgba(37, 99, 235, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
                flexShrink: 0,
              }}
            >
              <FileText size={26} strokeWidth={1.75} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
                  Entrada de Estoque via XML NF-e
                </Typography>
                <StatusPill label="SEFAZ v4.00" variant="info" size="small" />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                Fluxo de onboarding inteligente para importação de notas fiscais, abastecimento automático de estoque e apuração de custos.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* =============================================================== */}
      {/* TABS DE NAVEGAÇÃO SENTINEL                                     */}
      {/* =============================================================== */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: '14px',
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          p: 0.5,
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(_, val) => setTabValue(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              minHeight: 44,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.875rem',
              borderRadius: '10px',
              px: 2.5,
              transition: 'all 0.15s ease',
            },
          }}
        >
          <Tab
            icon={<UploadCloud size={18} strokeWidth={1.75} style={{ marginRight: 8 }} />}
            iconPosition="start"
            label="Importar XML da NF-e"
          />
          <Tab
            icon={<History size={18} strokeWidth={1.75} style={{ marginRight: 8 }} />}
            iconPosition="start"
            label="Histórico de Importações"
          />
          <Tab
            icon={<Layers size={18} strokeWidth={1.75} style={{ marginRight: 8 }} />}
            iconPosition="start"
            label="Vínculos Fornecedor (De-Para)"
          />
        </Tabs>
      </Paper>

      {/* =============================================================== */}
      {/* ABA 0: FLUXO DE ONBOARDING XML NF-E                            */}
      {/* =============================================================== */}
      {tabValue === 0 && (
        <Box>
          {/* STEPPER VISUAL PREMIUM DE 6 ETAPAS */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
            }}
          >
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 800, color: 'text.secondary', letterSpacing: '0.08em' }}>
                  Esteira de Processamento Fiscal
                </Typography>
                <Typography variant="subtitle1" fontWeight={800}>
                  Fluxo de Onboarding de Suprimentos
                </Typography>
              </Box>
              {preview && (
                <StatusPill
                  label={`${itensPreview.filter((i) => i.produto_id_vinculado).length} de ${itensPreview.length} Itens Vinculados`}
                  variant={itensPreview.every((i) => i.produto_id_vinculado) ? 'success' : 'warning'}
                />
              )}
            </Box>

            {/* Etapas Horizontais */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
                gap: 1.5,
              }}
            >
              {stepsConfig.map((st, idx) => {
                const status = getStepperStatus(idx);
                const StepIcon = st.icon;

                let borderC = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
                let bgC = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)';
                let iconColor = 'text.secondary';

                if (status === 'completed') {
                  borderC = 'rgba(16, 185, 129, 0.4)';
                  bgC = 'rgba(16, 185, 129, 0.08)';
                  iconColor = '#059669';
                } else if (status === 'active') {
                  borderC = 'rgba(37, 99, 235, 0.5)';
                  bgC = 'rgba(37, 99, 235, 0.08)';
                  iconColor = '#2563EB';
                }

                return (
                  <Box
                    key={st.label}
                    sx={{
                      p: 1.5,
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: borderC,
                      bgcolor: bgC,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                      position: 'relative',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: iconColor,
                        }}
                      >
                        {status === 'completed' ? (
                          <CheckCircle2 size={18} strokeWidth={2.2} />
                        ) : (
                          <StepIcon size={18} strokeWidth={1.75} />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.6 }}>
                        0{idx + 1}
                      </Typography>
                    </Box>

                    <Typography variant="body2" fontWeight={800} sx={{ color: status === 'pending' ? 'text.secondary' : 'text.primary' }}>
                      {st.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', lineHeight: 1.2 }}>
                      {st.desc}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>

          {/* =============================================================== */}
          {/* ETAPA 1: DROPZONE / ÁREA DE UPLOAD MODERNA                      */}
          {/* =============================================================== */}
          {!preview && (
            <Paper
              elevation={0}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                p: { xs: 4, sm: 6 },
                textAlign: 'center',
                borderRadius: '20px',
                border: '2px dashed',
                borderColor: isDragging ? '#2563EB' : isDark ? 'rgba(37, 99, 235, 0.4)' : 'rgba(37, 99, 235, 0.35)',
                bgcolor: isDragging
                  ? 'rgba(37, 99, 235, 0.12)'
                  : isDark
                  ? 'rgba(13, 21, 39, 0.6)'
                  : 'rgba(248, 250, 252, 0.8)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                mb: 3,
                '&:hover': {
                  borderColor: '#2563EB',
                  bgcolor: isDark ? 'rgba(37, 99, 235, 0.08)' : 'rgba(37, 99, 235, 0.04)',
                },
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: '20px',
                  bgcolor: 'rgba(37, 99, 235, 0.12)',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                  boxShadow: '0 8px 16px -4px rgba(37, 99, 235, 0.2)',
                }}
              >
                <UploadCloud size={38} strokeWidth={1.75} />
              </Box>

              <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.01em', mb: 0.5 }}>
                Arraste e solte o arquivo XML da NF-e aqui
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mb: 3 }}>
                Compatível com Notas Fiscais Eletrônicas de compra emitidas em todo o território nacional (Modelo 55 - SEFAZ).
              </Typography>

              <Button
                variant="contained"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                startIcon={<UploadCloud size={18} strokeWidth={1.75} />}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 3.5,
                  py: 1.2,
                  bgcolor: '#2563EB',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  '&:hover': { bgcolor: '#1D4ED8' },
                }}
              >
                Selecionar Arquivo .XML
              </Button>

              {/* 3 Garantias Sentinel */}
              <Grid container spacing={2} sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textAlign: 'left' }}>
                    <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                      <CheckCircle2 size={18} strokeWidth={1.75} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>De-Para Inteligente</Typography>
                      <Typography variant="caption" color="text.secondary">Memoriza códigos do fornecedor e EAN</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textAlign: 'left' }}>
                    <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'rgba(37, 99, 235, 0.1)', color: '#2563EB' }}>
                      <PackageCheck size={18} strokeWidth={1.75} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>Fator de Embalagem</Typography>
                      <Typography variant="caption" color="text.secondary">Converte caixas e fardos em unidades</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textAlign: 'left' }}>
                    <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'rgba(217, 119, 6, 0.1)', color: '#D97706' }}>
                      <ShieldCheck size={18} strokeWidth={1.75} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>Anti-Duplicidade</Typography>
                      <Typography variant="caption" color="text.secondary">Bloqueia notas já importadas antes</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* LOADING STATE */}
          {loading && (
            <Paper
              elevation={0}
              sx={{
                py: 8,
                textAlign: 'center',
                borderRadius: '16px',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                border: '1px solid',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                mb: 3,
              }}
            >
              <CircularProgress size={44} sx={{ color: '#2563EB', mb: 2 }} />
              <Typography variant="h6" fontWeight={800}>
                Decodificando XML e Consultando Catálogo...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Verificando regras de impostos, fornecedor e vinculações anteriores.
              </Typography>
            </Paper>
          )}

          {/* =============================================================== */}
          {/* PREVIEW CARREGADO: CABEÇALHO, FORNECEDOR E CHAVE FISCAL        */}
          {/* =============================================================== */}
          {preview && (
            <Box>
              {/* ALERTAS DE SEGURANÇA SENTINEL */}
              {preview.ja_importada && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 2.5,
                    borderRadius: '14px',
                    bgcolor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <AlertCircle size={24} strokeWidth={1.75} color="#DC2626" />
                  <Box>
                    <Typography variant="body2" fontWeight={800} color="#DC2626">
                      Atenção: Esta nota fiscal já foi importada anteriormente!
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {preview.data_importacao_previa
                        ? `Registrada em ${preview.data_importacao_previa}. `
                        : ''}
                      Para prevenir duplicidade de estoque e despesas, o envio será rejeitado pelo sistema.
                    </Typography>
                  </Box>
                </Paper>
              )}

              {!preview.destinatario_valido && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 2.5,
                    borderRadius: '14px',
                    bgcolor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <AlertTriangle size={24} strokeWidth={1.75} color="#D97706" />
                  <Box>
                    <Typography variant="body2" fontWeight={800} color="#D97706">
                      Aviso: Destinatário diferente do CNPJ da sua empresa
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      O CNPJ impresso nesta nota é {preview.destinatario_cnpj || 'divergente'}. Certifique-se de que a mercadoria é destinada ao seu negócio.
                    </Typography>
                  </Box>
                </Paper>
              )}

              {/* RESUMO EXECUTIVO DO FORNECEDOR E DA NOTA */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: '16px',
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                  {/* Fornecedor com Avatar */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {(() => {
                      const avColor = getAvatarColor(preview.fornecedor.nome);
                      return (
                        <Avatar
                          sx={{
                            width: 52,
                            height: 52,
                            bgcolor: avColor.bg,
                            color: avColor.text,
                            fontWeight: 800,
                            fontSize: '1.1rem',
                            border: `1px solid ${alpha(avColor.text, 0.3)}`,
                          }}
                        >
                          {getFornecedorInitials(preview.fornecedor.nome)}
                        </Avatar>
                      );
                    })()}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" fontWeight={800}>
                          {preview.fornecedor.nome}
                        </Typography>
                        {preview.fornecedor.uf && (
                          <StatusPill label={preview.fornecedor.uf} variant="info" size="small" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.2 }}>
                        CNPJ: <strong style={{ fontFamily: 'monospace' }}>{preview.fornecedor.cnpj}</strong>
                        {preview.fornecedor.ie ? ` • IE: ${preview.fornecedor.ie}` : ''}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Valor Total da Nota */}
                  <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' }}>
                      Valor Total da NF-e
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight={900}
                      sx={{
                        color: '#059669',
                        fontFeatureSettings: '"tnum"',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {formatCurrency(preview.valor_total)}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2.5, borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }} />

                {/* Metadados e Chave em Blocos de 4 dígitos */}
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'rgba(37, 99, 235, 0.08)', color: '#2563EB' }}>
                        <Hash size={18} strokeWidth={1.75} />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Número / Série</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          NF-e {preview.numero_nota} (Série {preview.serie})
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'rgba(16, 185, 129, 0.08)', color: '#059669' }}>
                        <Calendar size={18} strokeWidth={1.75} />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Emissão SEFAZ</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {preview.data_emissao ? new Date(preview.data_emissao).toLocaleDateString('pt-BR') : 'Não informada'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Chave Fiscal Formatada em Blocos */}
                  <Grid item xs={12} sm={6}>
                    <Box
                      sx={{
                        p: 1.2,
                        borderRadius: '12px',
                        bgcolor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(241, 245, 249, 0.7)',
                        border: '1px solid',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box sx={{ overflow: 'hidden', mr: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800 }}>
                          Chave de Acesso da NF-e (44 Dígitos)
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            fontSize: '0.78rem',
                            color: 'text.primary',
                            display: 'block',
                            wordBreak: 'break-all',
                          }}
                        >
                          {formatChaveFiscal(preview.chave_acesso)}
                        </Typography>
                      </Box>
                      <Tooltip title={copiedKey === preview.chave_acesso ? 'Copiado!' : 'Copiar Chave'}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopiarChave(preview.chave_acesso)}
                          sx={{
                            color: copiedKey === preview.chave_acesso ? '#059669' : 'text.secondary',
                            bgcolor: copiedKey === preview.chave_acesso ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                          }}
                        >
                          {copiedKey === preview.chave_acesso ? (
                            <Check size={16} strokeWidth={2.2} />
                          ) : (
                            <Copy size={16} strokeWidth={1.75} />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)', flexWrap: 'wrap', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusPill label={`${preview.total_itens} item(ns) na nota`} variant="neutral" />
                    <StatusPill
                      label={`${itensPreview.filter((i) => i.produto_id_vinculado).length} vinculado(s)`}
                      variant="success"
                    />
                    {itensPreview.some((i) => !i.produto_id_vinculado) && (
                      <StatusPill
                        label={`${itensPreview.filter((i) => !i.produto_id_vinculado).length} pendente(s)`}
                        variant="warning"
                        pulse
                      />
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
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                  >
                    Carregar Outro XML
                  </Button>
                </Box>
              </Paper>

              {/* =============================================================== */}
              {/* TABELA DE CONFERÊNCIA, DE-PARA, ESTOQUE E CUSTO               */}
              {/* =============================================================== */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: '16px',
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                }}
              >
                <Box sx={{ mb: 2.5 }}>
                  <Typography variant="h6" fontWeight={800}>
                    Conferência dos Produtos & Vinculação de Estoque
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Faça a correspondência de cada item faturado com seu catálogo, defina o fator de conversão de embalagem e aprove as alterações de custo.
                  </Typography>
                </Box>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 } }}>
                        <TableCell sx={{ width: 40 }}>#</TableCell>
                        <TableCell sx={{ minWidth: 240 }}>Item na Nota Fiscal (Fornecedor)</TableCell>
                        <TableCell align="center" sx={{ width: 110 }}>Qtd / Un</TableCell>
                        <TableCell align="right" sx={{ width: 110 }}>Valor Un.</TableCell>
                        <TableCell sx={{ minWidth: 280 }}>Produto no Gestor MEI</TableCell>
                        <TableCell align="center" sx={{ width: 100 }}>Fator</TableCell>
                        <TableCell align="center" sx={{ width: 120 }}>Entrada Estoque</TableCell>
                        <TableCell align="right" sx={{ width: 160 }}>Custo & Variação</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {itensPreview.map((item, index) => {
                        const isVinculado = Boolean(item.produto_id_vinculado);
                        const prodVinculado = produtos.find((p) => p.id === item.produto_id_vinculado);
                        
                        // Comparação de custos
                        const custoAnterior = prodVinculado?.custo_unitario || 0;
                        const custoNovo = item.custo_unitario_calculado;
                        const diff = custoNovo - custoAnterior;
                        const percentDiff = custoAnterior > 0 ? (diff / custoAnterior) * 100 : 0;

                        return (
                          <TableRow
                            key={item.numero_item}
                            hover
                            sx={{
                              bgcolor: !isVinculado ? (isDark ? 'rgba(245, 158, 11, 0.04)' : 'rgba(245, 158, 11, 0.03)') : 'inherit',
                              '& td': { py: 1.8 },
                            }}
                          >
                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>
                              {item.numero_item}
                            </TableCell>

                            {/* Item no Fornecedor com Badge de Novo Produto */}
                            <TableCell>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Typography variant="body2" fontWeight={700}>
                                  {item.descricao_fornecedor}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                    Cód: {item.codigo_fornecedor}
                                  </Typography>
                                  {item.ean && (
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                      • EAN: {item.ean}
                                    </Typography>
                                  )}
                                  {!isVinculado && (
                                    <StatusPill label="NOVO NO CATÁLOGO" variant="warning" size="small" />
                                  )}
                                </Box>
                              </Box>
                            </TableCell>

                            {/* Quantidade Comercial e Unidade */}
                            <TableCell align="center">
                              <Typography variant="body2" fontWeight={700} sx={{ fontFeatureSettings: '"tnum"' }}>
                                {item.quantidade_comercial} {item.unidade_comercial}
                              </Typography>
                            </TableCell>

                            {/* Valor Unitário na Nota */}
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600} sx={{ fontFeatureSettings: '"tnum"' }}>
                                {formatCurrency(item.valor_unitario)}
                              </Typography>
                            </TableCell>

                            {/* Seleção do Produto no Gestor MEI */}
                            <TableCell>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    value={item.produto_id_vinculado || ''}
                                    onChange={(e) => handleProdutoChange(index, Number(e.target.value))}
                                    SelectProps={{
                                      displayEmpty: true,
                                      IconComponent: () => (
                                        <ChevronDown size={18} strokeWidth={1.75} style={{ marginRight: 8, opacity: 0.6 }} />
                                      ),
                                    }}
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        borderRadius: '10px',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                      },
                                    }}
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

                                  <Tooltip title="Cadastrar como novo produto">
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => handleAbrirCriacaoRapida(item)}
                                      sx={{
                                        minWidth: 36,
                                        width: 36,
                                        height: 36,
                                        p: 0,
                                        borderRadius: '10px',
                                        borderColor: '#2563EB',
                                        color: '#2563EB',
                                      }}
                                    >
                                      <Plus size={16} strokeWidth={2.2} />
                                    </Button>
                                  </Tooltip>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        size="small"
                                        checked={item.atualizar_vinculo ?? true}
                                        onChange={(e) => handleFlagChange(index, 'atualizar_vinculo', e.target.checked)}
                                        sx={{ p: 0.5, '&.Mui-checked': { color: '#2563EB' } }}
                                      />
                                    }
                                    label={
                                      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                                        Lembrar vínculo para próximas notas
                                      </Typography>
                                    }
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
                                  inputProps={{ min: 0.001, step: 1, style: { textAlign: 'center', fontWeight: 800, fontFeatureSettings: '"tnum"' } }}
                                  sx={{
                                    width: 80,
                                    '& .MuiOutlinedInput-root': {
                                      borderRadius: '8px',
                                    },
                                  }}
                                />
                              </Tooltip>
                            </TableCell>

                            {/* Entrada em Estoque */}
                            <TableCell align="center">
                              <Box
                                sx={{
                                  px: 1.5,
                                  py: 0.6,
                                  borderRadius: '8px',
                                  bgcolor: 'rgba(37, 99, 235, 0.1)',
                                  border: '1px solid rgba(37, 99, 235, 0.25)',
                                  color: '#2563EB',
                                  fontWeight: 800,
                                  fontSize: '0.85rem',
                                  display: 'inline-flex',
                                  fontFeatureSettings: '"tnum"',
                                }}
                              >
                                +{item.quantidade_estoque_entrada} un
                              </Box>
                            </TableCell>

                            {/* Novo Custo & Variação */}
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.3 }}>
                                <Typography variant="body2" fontWeight={800} sx={{ fontFeatureSettings: '"tnum"', color: '#2563EB' }}>
                                  {formatCurrency(item.custo_unitario_calculado)}
                                </Typography>

                                {/* Indicador de Alteração de Custo */}
                                {custoAnterior > 0 ? (
                                  diff > 0.001 ? (
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, color: '#DC2626', fontSize: '0.7rem', fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                                      <TrendingUp size={12} strokeWidth={2.5} />
                                      +{percentDiff.toFixed(1)}% (ant: {formatCurrency(custoAnterior)})
                                    </Box>
                                  ) : diff < -0.001 ? (
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, color: '#059669', fontSize: '0.7rem', fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                                      <TrendingDown size={12} strokeWidth={2.5} />
                                      {percentDiff.toFixed(1)}% (ant: {formatCurrency(custoAnterior)})
                                    </Box>
                                  ) : (
                                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                                      Custo Inalterado
                                    </Typography>
                                  )
                                ) : (
                                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                                    Primeiro Custo
                                  </Typography>
                                )}

                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      size="small"
                                      checked={item.atualizar_custo ?? true}
                                      onChange={(e) => handleFlagChange(index, 'atualizar_custo', e.target.checked)}
                                      sx={{ p: 0.3, '&.Mui-checked': { color: '#059669' } }}
                                    />
                                  }
                                  label={<Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Atualizar</Typography>}
                                  sx={{ mr: 0 }}
                                />
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Rodapé da Conferência com Ação Final */}
                <Box
                  sx={{
                    mt: 3,
                    pt: 2.5,
                    borderTop: '1px solid',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      {itensPreview.filter((i) => i.produto_id_vinculado).length} de {itensPreview.length} produtos vinculados e prontos para entrada.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Ao confirmar, as quantidades serão incorporadas ao estoque e os custos atualizados.
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
                      sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '10px' }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="contained"
                      disabled={loading || preview.ja_importada || itensPreview.some((i) => !i.produto_id_vinculado)}
                      onClick={handleConfirmarImportacao}
                      startIcon={<CheckCircle2 size={18} strokeWidth={2.2} />}
                      sx={{
                        fontWeight: 800,
                        textTransform: 'none',
                        px: 3.5,
                        py: 1.2,
                        borderRadius: '12px',
                        bgcolor: '#059669',
                        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                        '&:hover': { bgcolor: '#047857' },
                      }}
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
      {/* ABA 1: HISTÓRICO DE IMPORTAÇÕES                                */}
      {/* =============================================================== */}
      {tabValue === 1 && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: '16px',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Histórico de Notas Fiscais Importadas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rastreabilidade de todas as notas fiscais de compra que abasteceram seu estoque com conferência SEFAZ.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={carregarHistorico}
              disabled={loadingHistorico}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
            >
              Atualizar Histórico
            </Button>
          </Box>

          {loadingHistorico ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <CircularProgress size={36} sx={{ color: '#2563EB' }} />
              <Typography variant="body2" sx={{ mt: 1 }}>Carregando histórico...</Typography>
            </Box>
          ) : historico.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '16px',
                  bgcolor: 'rgba(100, 116, 139, 0.1)',
                  color: 'text.secondary',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 1.5,
                }}
              >
                <FileText size={28} strokeWidth={1.75} />
              </Box>
              <Typography variant="body1" fontWeight={800}>
                Nenhuma nota fiscal importada ainda.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Faça o upload do seu primeiro arquivo XML na aba "Importar XML da NF-e".
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 } }}>
                    <TableCell>Data Importação</TableCell>
                    <TableCell>Nota / Série</TableCell>
                    <TableCell>Fornecedor</TableCell>
                    <TableCell align="center">Itens</TableCell>
                    <TableCell align="right">Valor Total</TableCell>
                    <TableCell>Chave de Acesso</TableCell>
                    <TableCell align="center">Ação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historico.map((nota) => (
                    <TableRow key={nota.id} hover sx={{ '& td': { py: 1.8 } }}>
                      <TableCell sx={{ fontWeight: 600, fontFeatureSettings: '"tnum"' }}>
                        {new Date(nota.data_importacao).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        NF-e {nota.numero_nota} (Série {nota.serie})
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {(() => {
                            const avColor = getAvatarColor(nota.fornecedor_nome);
                            return (
                              <Avatar
                                sx={{
                                  width: 32,
                                  height: 32,
                                  bgcolor: avColor.bg,
                                  color: avColor.text,
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                }}
                              >
                                {getFornecedorInitials(nota.fornecedor_nome)}
                              </Avatar>
                            );
                          })()}
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{nota.fornecedor_nome}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>CNPJ: {nota.fornecedor_cnpj}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <StatusPill label={`${nota.total_itens} item(ns)`} variant="neutral" size="small" />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#059669', fontFeatureSettings: '"tnum"' }}>
                        {formatCurrency(nota.valor_total)}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {formatChaveFiscal(nota.chave_acesso).substring(0, 19)}...
                          </Typography>
                          <Tooltip title={copiedKey === nota.chave_acesso ? 'Copiado!' : 'Copiar Chave Completa'}>
                            <IconButton size="small" onClick={() => handleCopiarChave(nota.chave_acesso)}>
                              {copiedKey === nota.chave_acesso ? (
                                <Check size={14} strokeWidth={2.2} color="#059669" />
                              ) : (
                                <Copy size={14} strokeWidth={1.75} />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleVerDetalhesNota(nota.id)}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', borderRadius: '8px' }}
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
      {/* ABA 2: VÍNCULOS FORNECEDOR (DE-PARA MEMORIZADO)                 */}
      {/* =============================================================== */}
      {tabValue === 2 && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: '16px',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Regras de Vínculos De-Para Memorizadas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                O Gestor MEI memoriza os códigos dos produtos de cada fornecedor e seus fatores de conversão para automatizar as próximas entradas.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={carregarVinculos}
              disabled={loadingVinculos}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
            >
              Atualizar Vínculos
            </Button>
          </Box>

          {loadingVinculos ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <CircularProgress size={36} sx={{ color: '#2563EB' }} />
              <Typography variant="body2" sx={{ mt: 1 }}>Carregando regras de vínculo...</Typography>
            </Box>
          ) : vinculos.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '16px',
                  bgcolor: 'rgba(100, 116, 139, 0.1)',
                  color: 'text.secondary',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 1.5,
                }}
              >
                <Layers size={28} strokeWidth={1.75} />
              </Box>
              <Typography variant="body1" fontWeight={800}>
                Nenhum vínculo gravado ainda.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Ao importar notas fiscais com a opção "Lembrar vínculo" marcada, as regras aparecerão aqui.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5 } }}>
                    <TableCell>Fornecedor (CNPJ)</TableCell>
                    <TableCell>Código Fornecedor</TableCell>
                    <TableCell>Descrição no Fornecedor</TableCell>
                    <TableCell>Produto no Gestor MEI</TableCell>
                    <TableCell align="center">Fator Conversão</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vinculos.map((v) => (
                    <TableRow key={v.id} hover sx={{ '& td': { py: 1.8 } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {(() => {
                            const avColor = getAvatarColor(v.fornecedor_nome || 'Fornecedor');
                            return (
                              <Avatar
                                sx={{
                                  width: 32,
                                  height: 32,
                                  bgcolor: avColor.bg,
                                  color: avColor.text,
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                }}
                              >
                                {getFornecedorInitials(v.fornecedor_nome || 'Fornecedor')}
                              </Avatar>
                            );
                          })()}
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{v.fornecedor_nome || 'Fornecedor'}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>CNPJ: {v.fornecedor_cnpj}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800 }}>
                        {v.codigo_fornecedor}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{v.descricao_fornecedor || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#2563EB' }}>
                        {v.produto_nome || `Produto #${v.produto_id}`}
                      </TableCell>
                      <TableCell align="center">
                        <StatusPill label={`Fator: ${v.fator_conversao}`} variant="info" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Excluir Vínculo">
                          <IconButton size="small" sx={{ color: '#DC2626' }} onClick={() => handleExcluirVinculo(v.id)}>
                            <Trash2 size={16} strokeWidth={1.75} />
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
      {/* MODAL: RESULTADO DA IMPORTAÇÃO CONCLUÍDA                       */}
      {/* =============================================================== */}
      <Dialog
        open={dialogResultadoOpen}
        onClose={() => setDialogResultadoOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: isDark ? '#0D1527' : '#FFFFFF',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'rgba(16, 185, 129, 0.1)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <CheckCircle2 size={24} strokeWidth={2.2} color="#059669" />
          <Typography variant="h6" fontWeight={800} color="#059669">
            Importação Concluída com Sucesso!
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2.5 }}>
          {resultadoImportacao && (
            <Box>
              <Typography variant="body1" fontWeight={700} sx={{ mb: 1 }}>
                {resultadoImportacao.mensagem}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Nota Fiscal: <strong>{resultadoImportacao.numero_nota}</strong> • Chave: <code style={{ fontFamily: 'monospace' }}>{formatChaveFiscal(resultadoImportacao.chave_acesso).substring(0, 24)}...</code>
              </Typography>

              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
                Produtos Atualizados no Estoque ({resultadoImportacao.produtos_atualizados.length}):
              </Typography>

              <TableContainer sx={{ maxHeight: 300, border: '1px solid', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)', borderRadius: '12px' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase' } }}>
                      <TableCell>Produto</TableCell>
                      <TableCell align="center">Saldo Anterior</TableCell>
                      <TableCell align="center">Entrada</TableCell>
                      <TableCell align="center">Novo Saldo</TableCell>
                      <TableCell align="right">Custo Atualizado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultadoImportacao.produtos_atualizados.map((p) => (
                      <TableRow key={p.produto_id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{p.nome}</TableCell>
                        <TableCell align="center" sx={{ fontFeatureSettings: '"tnum"' }}>{p.quantidade_anterior} un</TableCell>
                        <TableCell align="center">
                          <StatusPill label={`+${p.quantidade_adicionada} un`} variant="success" size="small" />
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, fontFeatureSettings: '"tnum"' }}>{p.quantidade_nova} un</TableCell>
                        <TableCell align="right">
                          {p.custo_atualizado ? (
                            <Typography variant="body2" fontWeight={800} sx={{ color: '#2563EB', fontFeatureSettings: '"tnum"' }}>
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
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            variant="contained"
            onClick={() => setDialogResultadoOpen(false)}
            sx={{ fontWeight: 800, textTransform: 'none', borderRadius: '10px', px: 3, bgcolor: '#2563EB' }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* =============================================================== */}
      {/* MODAL: DETALHES DA NOTA FISCAL IMPORTADA                       */}
      {/* =============================================================== */}
      <Dialog
        open={dialogDetalhesOpen}
        onClose={() => setDialogDetalhesOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: isDark ? '#0D1527' : '#FFFFFF',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'rgba(37, 99, 235, 0.1)', color: '#2563EB' }}>
              <FileText size={20} strokeWidth={1.75} />
            </Box>
            <Typography variant="h6" fontWeight={800}>
              Detalhes da NF-e {notaDetalhe?.numero_nota}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setDialogDetalhesOpen(false)}>
            <X size={18} strokeWidth={1.75} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }}>
          {notaDetalhe && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Fornecedor</Typography>
                  <Typography variant="body1" fontWeight={800}>{notaDetalhe.fornecedor_nome}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>CNPJ: {notaDetalhe.fornecedor_cnpj}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">Valor Total</Typography>
                  <Typography variant="h6" fontWeight={900} sx={{ color: '#059669', fontFeatureSettings: '"tnum"' }}>
                    {formatCurrency(notaDetalhe.valor_total)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">Data de Importação</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontFeatureSettings: '"tnum"' }}>
                    {new Date(notaDetalhe.data_importacao).toLocaleString('pt-BR')}
                  </Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
                Itens Faturados e Entradas de Estoque:
              </Typography>

              <TableContainer sx={{ maxHeight: 300, border: '1px solid', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)', borderRadius: '12px' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase' } }}>
                      <TableCell>Item Fornecedor</TableCell>
                      <TableCell>Produto Vinculado</TableCell>
                      <TableCell align="center">Qtd Faturada</TableCell>
                      <TableCell align="center">Fator</TableCell>
                      <TableCell align="center">Entrada Estoque</TableCell>
                      <TableCell align="right">Custo Un.</TableCell>
                      <TableCell align="right">Valor Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {notaDetalhe.itens?.map((it) => (
                      <TableRow key={it.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>{it.descricao_fornecedor}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>Cód: {it.codigo_fornecedor}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#2563EB' }}>
                          {it.produto_nome || `Produto #${it.produto_id}`}
                        </TableCell>
                        <TableCell align="center" sx={{ fontFeatureSettings: '"tnum"' }}>{it.quantidade_comercial} {it.unidade_comercial}</TableCell>
                        <TableCell align="center" sx={{ fontFeatureSettings: '"tnum"' }}>{it.fator_conversao}</TableCell>
                        <TableCell align="center">
                          <StatusPill label={`+${it.quantidade_entrada} un`} variant="info" size="small" />
                        </TableCell>
                        <TableCell align="right" sx={{ fontFeatureSettings: '"tnum"' }}>{formatCurrency(it.custo_unitario_calculado)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, fontFeatureSettings: '"tnum"' }}>{formatCurrency(it.valor_total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            variant="contained"
            onClick={() => setDialogDetalhesOpen(false)}
            sx={{ fontWeight: 800, textTransform: 'none', borderRadius: '10px', px: 3, bgcolor: '#2563EB' }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* =============================================================== */}
      {/* MODAL: CADASTRO RÁPIDO DE NOVO PRODUTO                         */}
      {/* =============================================================== */}
      <Dialog
        open={modalNovoProdutoOpen}
        onClose={() => setModalNovoProdutoOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: isDark ? '#0D1527' : '#FFFFFF',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'rgba(37, 99, 235, 0.1)', color: '#2563EB' }}>
            <Plus size={20} strokeWidth={2.2} />
          </Box>
          Cadastrar Novo Produto Rapidamente
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Cadastre este item no catálogo do Gestor MEI para que a entrada de estoque e os próximos pedidos sejam registrados com rastreabilidade total.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nome do Produto"
              fullWidth
              size="small"
              value={novoProdNome}
              onChange={(e) => setNovoProdNome(e.target.value)}
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Categoria"
                  fullWidth
                  size="small"
                  value={novoProdCategoria}
                  onChange={(e) => setNovoProdCategoria(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
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
                  inputProps={{ step: '0.01', style: { fontFeatureSettings: '"tnum"' } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
              </Grid>

              <Grid item xs={12} sm={12}>
                <TextField
                  label="Preço de Venda Sugerido (R$)"
                  type="number"
                  fullWidth
                  size="small"
                  value={novoProdPrecoVenda}
                  onChange={(e) => setNovoProdPrecoVenda(parseFloat(e.target.value) || 0)}
                  inputProps={{ step: '0.01', style: { fontFeatureSettings: '"tnum"' } }}
                  helperText="Margem estimada de 50% sobre o custo"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            variant="outlined"
            onClick={() => setModalNovoProdutoOpen(false)}
            disabled={savingNovoProd}
            sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 600 }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSalvarNovoProduto}
            disabled={savingNovoProd || !novoProdNome.trim()}
            sx={{ fontWeight: 800, textTransform: 'none', borderRadius: '10px', px: 3, bgcolor: '#2563EB' }}
          >
            {savingNovoProd ? 'Salvando...' : 'Salvar e Vincular'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBARS DE NOTIFICAÇÃO */}
      <Snackbar
        open={Boolean(errorMsg)}
        autoHideDuration={6000}
        onClose={() => setErrorMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ width: '100%', fontWeight: 600, borderRadius: '10px' }}>
          {errorMsg}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(successMsg)}
        autoHideDuration={4000}
        onClose={() => setSuccessMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ width: '100%', fontWeight: 600, borderRadius: '10px' }}>
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};
