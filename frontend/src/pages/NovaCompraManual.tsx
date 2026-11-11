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
  Autocomplete,
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
  Divider,
  FormControlLabel,
  Switch,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  AddShoppingCart,
  Add,
  Delete,
  CloudUpload,
  AttachFile,
  Close,
  Store,
  ReceiptLong,
  Inventory2,
  CheckCircle,
} from '@mui/icons-material';
import api from '../services/api';
import { Produto, Fornecedor } from '../types';
import { formatCurrency } from '../services/exportUtils';
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

interface ItemCompraForm {
  produto_id: number | null;
  produto_nome: string;
  quantidade: number;
  unidade: string;
  fator_conversao: number;
  valor_unitario: number;
  valor_total: number;
  atualizar_custo: boolean;
}

export const NovaCompraManual: React.FC = () => {
  const navigate = useNavigate();

  // Dados mestres
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Campos gerais da compra
  const [fornecedorNome, setFornecedorNome] = useState<string>('');
  const [fornecedorCnpjCpf, setFornecedorCnpjCpf] = useState<string>('');
  const [fornecedorTelefone, setFornecedorTelefone] = useState<string>('');
  const [fornecedorUf, setFornecedorUf] = useState<string>('');
  const [fornecedorCidade, setFornecedorCidade] = useState<string>('');
  const [numeroDocumento, setNumeroDocumento] = useState<string>('');
  const [dataEmissao, setDataEmissao] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [formaPagamento, setFormaPagamento] = useState<string>('PIX');
  const [observacao, setObservacao] = useState<string>('');

  // Anexo de comprovante
  const [uploadingAnexo, setUploadingAnexo] = useState<boolean>(false);
  const [anexoUrl, setAnexoUrl] = useState<string | null>(null);
  const [anexoNome, setAnexoNome] = useState<string | null>(null);
  const [anexoTipo, setAnexoTipo] = useState<string | null>(null);

  // Itens da compra
  const [itens, setItens] = useState<ItemCompraForm[]>([
    {
      produto_id: null,
      produto_nome: '',
      quantidade: 1,
      unidade: 'UN',
      fator_conversao: 1,
      valor_unitario: 0,
      valor_total: 0,
      atualizar_custo: true,
    },
  ]);

  // Modal de criação rápida de produto
  const [modalProdutoAberto, setModalProdutoAberto] = useState<boolean>(false);
  const [itemIndexParaAssociar, setItemIndexParaAssociar] = useState<number | null>(null);
  const [novoProdNome, setNovoProdNome] = useState<string>('');
  const [novoProdCategoria, setNovoProdCategoria] = useState<string>('Insumos');
  const [novoProdPrecoVenda, setNovoProdPrecoVenda] = useState<number>(0);
  const [novoProdCustoUnitario, setNovoProdCustoUnitario] = useState<number>(0);
  const [novoProdEstoqueMinimo, setNovoProdEstoqueMinimo] = useState<number>(0);
  const [savingNovoProd, setSavingNovoProd] = useState<boolean>(false);

  // Carrega produtos e fornecedores
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoadingInitial(true);
        const [prodRes, fornRes] = await Promise.all([
          api.get<Produto[]>('/produtos?apenas_ativos=true'),
          api.get<Fornecedor[]>('/compras/fornecedores/sugestoes'),
        ]);
        setProdutos(prodRes.data);
        setFornecedores(fornRes.data);
      } catch (err: any) {
        console.error('Erro ao carregar dados para compra manual:', err);
        setErrorMsg('Erro ao carregar produtos e fornecedores.');
      } finally {
        setLoadingInitial(false);
      }
    };
    carregarDados();
  }, []);

  // Seleção de fornecedor existente no autocomplete
  const handleSelecionarFornecedor = (forn: Fornecedor | string | null) => {
    if (!forn) {
      setFornecedorNome('');
      return;
    }
    if (typeof forn === 'string') {
      setFornecedorNome(forn);
    } else {
      setFornecedorNome(forn.nome);
      if (forn.cnpj_cpf) setFornecedorCnpjCpf(forn.cnpj_cpf);
      if (forn.telefone) setFornecedorTelefone(forn.telefone);
      if (forn.uf) setFornecedorUf(forn.uf);
      if (forn.cidade) setFornecedorCidade(forn.cidade);
    }
  };

  // Upload do comprovante
  const handleUploadArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAnexo(true);
      setErrorMsg(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post<{ url: string; nome_original: string; tipo: string }>(
        '/compras/upload-comprovante',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setAnexoUrl(res.data.url);
      setAnexoNome(res.data.nome_original);
      setAnexoTipo(res.data.tipo);
    } catch (err: any) {
      console.error('Erro no upload de comprovante:', err);
      setErrorMsg(err.response?.data?.detail || 'Erro ao realizar upload do comprovante.');
    } finally {
      setUploadingAnexo(false);
      e.target.value = '';
    }
  };

  const handleRemoverAnexo = () => {
    setAnexoUrl(null);
    setAnexoNome(null);
    setAnexoTipo(null);
  };

  // Manipulação de itens da compra
  const handleAdicionarItem = () => {
    setItens((prev) => [
      ...prev,
      {
        produto_id: null,
        produto_nome: '',
        quantidade: 1,
        unidade: 'UN',
        fator_conversao: 1,
        valor_unitario: 0,
        valor_total: 0,
        atualizar_custo: true,
      },
    ]);
  };

  const handleRemoverItem = (index: number) => {
    if (itens.length <= 1) return;
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, campo: keyof ItemCompraForm, valor: any) => {
    setItens((prev) => {
      const novos = [...prev];
      const itemAtual = { ...novos[index], [campo]: valor };

      // Se mudou quantidade ou valor_unitario, recalcula o subtotal
      if (campo === 'quantidade' || campo === 'valor_unitario') {
        const qtd = campo === 'quantidade' ? Number(valor) : itemAtual.quantidade;
        const vUn = campo === 'valor_unitario' ? Number(valor) : itemAtual.valor_unitario;
        itemAtual.valor_total = Math.round(qtd * vUn * 100) / 100;
      }

      // Se mudou produto_id diretamente
      if (campo === 'produto_id') {
        const prod = produtos.find((p) => p.id === valor);
        if (prod) {
          itemAtual.produto_nome = prod.nome;
          if (itemAtual.valor_unitario === 0 && prod.custo_unitario) {
            itemAtual.valor_unitario = prod.custo_unitario;
            itemAtual.valor_total = Math.round(itemAtual.quantidade * prod.custo_unitario * 100) / 100;
          }
        }
      }

      novos[index] = itemAtual;
      return novos;
    });
  };

  // Abrir modal de criação rápida de produto
  const handleAbrirModalNovoProduto = (index: number) => {
    setItemIndexParaAssociar(index);
    setNovoProdNome('');
    setNovoProdCategoria('Insumos');
    setNovoProdPrecoVenda(0);
    setNovoProdCustoUnitario(itens[index].valor_unitario || 0);
    setNovoProdEstoqueMinimo(0);
    setModalProdutoAberto(true);
  };

  // Salvar novo produto criado rapidamente
  const handleSalvarNovoProduto = async () => {
    if (!novoProdNome.trim()) {
      alert('Informe o nome do produto.');
      return;
    }

    try {
      setSavingNovoProd(true);
      const res = await api.post<Produto>('/produtos', {
        nome: novoProdNome.trim(),
        tipo: 'PRODUTO',
        categoria: novoProdCategoria || 'Outros',
        preco_venda: Number(novoProdPrecoVenda) || 0,
        custo_unitario: Number(novoProdCustoUnitario) || 0,
        quantidade_estoque: 0,
        estoque_minimo: Number(novoProdEstoqueMinimo) || 0,
        ativo: true,
      });

      const novoProduto = res.data;
      setProdutos((prev) => [...prev, novoProduto].sort((a, b) => a.nome.localeCompare(b.nome)));

      // Associa imediatamente à linha do item que disparou o modal
      if (itemIndexParaAssociar !== null && itens[itemIndexParaAssociar]) {
        handleItemChange(itemIndexParaAssociar, 'produto_id', novoProduto.id);
        if (novoProdCustoUnitario > 0) {
          handleItemChange(itemIndexParaAssociar, 'valor_unitario', novoProdCustoUnitario);
        }
      }

      setModalProdutoAberto(false);
    } catch (err: any) {
      console.error('Erro ao cadastrar produto inline:', err);
      alert(err.response?.data?.detail || 'Erro ao cadastrar produto.');
    } finally {
      setSavingNovoProd(false);
    }
  };

  // Totais consolidados
  const totalGeralCompra = itens.reduce((acc, it) => acc + (Number(it.valor_total) || 0), 0);
  const totalUnidadesEstoque = itens.reduce((acc, it) => {
    const fator = it.fator_conversao > 0 ? it.fator_conversao : 1;
    return acc + (Number(it.quantidade) || 0) * fator;
  }, 0);

  // Efetivar Compra Manual
  const handleSalvarCompra = async () => {
    if (!fornecedorNome.trim()) {
      setErrorMsg('Informe o nome do fornecedor.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Valida itens
    for (let i = 0; i < itens.length; i++) {
      const it = itens[i];
      if (!it.produto_id) {
        setErrorMsg(`Selecione um produto para o item #${i + 1}.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (it.quantidade <= 0) {
        setErrorMsg(`A quantidade do item #${i + 1} deve ser maior que zero.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (it.fator_conversao <= 0) {
        setErrorMsg(`O fator de conversão do item #${i + 1} deve ser maior que zero.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      const payload = {
        fornecedor_nome: fornecedorNome.trim(),
        fornecedor_cnpj_cpf: fornecedorCnpjCpf.trim() || null,
        fornecedor_telefone: fornecedorTelefone.trim() || null,
        fornecedor_uf: fornecedorUf.trim() || null,
        fornecedor_cidade: fornecedorCidade.trim() || null,
        numero_documento: numeroDocumento.trim() || null,
        serie: 'MAN',
        data_emissao: dataEmissao || null,
        forma_pagamento: formaPagamento,
        observacao: observacao.trim() || null,
        anexo_url: anexoUrl,
        anexo_nome: anexoNome,
        anexo_tipo: anexoTipo,
        itens: itens.map((it) => ({
          produto_id: it.produto_id!,
          quantidade: Number(it.quantidade),
          unidade: it.unidade || 'UN',
          fator_conversao: Number(it.fator_conversao) || 1,
          valor_unitario: Number(it.valor_unitario) || 0,
          valor_total: Number(it.valor_total) || 0,
          atualizar_custo: it.atualizar_custo,
        })),
      };

      const res = await api.post<{ sucesso: boolean; mensagem: string; compra_id: number }>(
        '/compras/manual',
        payload
      );

      setSuccessMsg(res.data.mensagem || 'Compra manual registrada com sucesso!');
      setTimeout(() => {
        navigate(`/compras/${res.data.compra_id}`);
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao efetivar compra manual:', err);
      setErrorMsg(err.response?.data?.detail || 'Erro ao salvar compra manual.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Carregando dados da compra...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Barra de Navegação */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/compras')}
          variant="outlined"
          size="small"
          sx={{ borderRadius: 2 }}
        >
          Voltar para Compras
        </Button>

        <Typography variant="caption" color="text.secondary">
          Sprint 8B: Entrada de Estoque Manual Rastreável
        </Typography>
      </Box>

      {/* Título */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddShoppingCart color="primary" fontSize="large" /> Lançar Compra Manual
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Registre compras de fornecedores sem NF-e, dê entrada automática no estoque, atualize custos e anexe comprovantes.
        </Typography>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} icon={<CheckCircle />}>
          {successMsg}
        </Alert>
      )}

      {/* SEÇÃO 1: DADOS GERAIS DO FORNECEDOR E DOCUMENTO */}
      <SentinelCard dense sx={{ p: { xs: 2, md: 2.5 }, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.9375rem' }}>
          <Store sx={{ fontSize: 20, color: sentinelTokens.colors.master.accent }} /> Dados do Fornecedor e Documento
        </Typography>

        <Grid container spacing={2}>
          {/* Fornecedor com Autocomplete */}
          <Grid item xs={12} sm={6} md={4}>
            <Autocomplete
              freeSolo
              options={fornecedores}
              getOptionLabel={(option) => (typeof option === 'string' ? option : option.nome)}
              value={fornecedorNome}
              onInputChange={(_, newInputValue) => setFornecedorNome(newInputValue)}
              onChange={(_, newValue) => handleSelecionarFornecedor(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Nome do Fornecedor *"
                  placeholder="Selecione ou digite um novo..."
                  helperText="Se não existir, será cadastrado automaticamente"
                  fullWidth
                  size="small"
                />
              )}
            />
          </Grid>

          {/* CNPJ / CPF */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="CNPJ ou CPF (Opcional)"
              placeholder="00.000.000/0000-00"
              value={fornecedorCnpjCpf}
              onChange={(e) => setFornecedorCnpjCpf(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>

          {/* Telefone / Contato */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Telefone do Fornecedor"
              placeholder="(00) 00000-0000"
              value={fornecedorTelefone}
              onChange={(e) => setFornecedorTelefone(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>

          {/* UF */}
          <Grid item xs={6} sm={3} md={2}>
            <TextField
              label="UF"
              placeholder="SP"
              inputProps={{ maxLength: 2 }}
              value={fornecedorUf}
              onChange={(e) => setFornecedorUf(e.target.value.toUpperCase())}
              fullWidth
              size="small"
            />
          </Grid>

          {/* Nº do Documento / Cupom / Recibo */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Nº Recibo / Cupom (Opcional)"
              placeholder="Ex: REC-1029"
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              fullWidth
              size="small"
              helperText="Se vazio, será gerado automaticamente"
            />
          </Grid>

          {/* Data da Compra */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              type="date"
              label="Data da Compra *"
              value={dataEmissao}
              onChange={(e) => setDataEmissao(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
            />
          </Grid>

          {/* Forma de Pagamento */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label="Forma de Pagamento"
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="PIX">PIX</MenuItem>
              <MenuItem value="DINHEIRO">Dinheiro</MenuItem>
              <MenuItem value="BOLETO">Boleto Bancário</MenuItem>
              <MenuItem value="CARTAO_DEBITO">Cartão de Débito</MenuItem>
              <MenuItem value="CARTAO_CREDITO">Cartão de Crédito</MenuItem>
              <MenuItem value="OUTRO">Outro / A Prazo</MenuItem>
            </TextField>
          </Grid>

          {/* Upload de Comprovante */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ border: '1px dashed #bbb', borderRadius: 2, p: 1, textAlign: 'center' }}>
              {anexoUrl ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Chip
                    icon={<AttachFile />}
                    label={`${anexoNome || 'Comprovante'} (${anexoTipo || 'DOC'})`}
                    color="success"
                    size="small"
                    sx={{ maxWidth: '85%' }}
                  />
                  <IconButton size="small" color="error" onClick={handleRemoverAnexo}>
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={uploadingAnexo ? <CircularProgress size={16} /> : <CloudUpload />}
                  size="small"
                  fullWidth
                  disabled={uploadingAnexo}
                  sx={{ textTransform: 'none' }}
                >
                  {uploadingAnexo ? 'Enviando...' : 'Anexar Comprovante (PDF/Foto)'}
                  <input
                    type="file"
                    hidden
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleUploadArquivo}
                  />
                </Button>
              )}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontSize: '0.65rem' }}>
                Aceita JPG, PNG, WEBP e PDF (máx 10MB)
              </Typography>
            </Box>
          </Grid>

          {/* Observações */}
          <Grid item xs={12}>
            <TextField
              label="Observações Adicionais"
              placeholder="Ex: Insumos para estoque de fim de semana, pago à vista com desconto..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
          </Grid>
        </Grid>
      </SentinelCard>

      {/* SEÇÃO 2: ITENS DA COMPRA */}
      <SentinelCard dense sx={{ p: { xs: 2, md: 2.5 }, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.9375rem' }}>
              <Inventory2 sx={{ fontSize: 20, color: sentinelTokens.colors.owner.accent }} /> Itens e Entrada no Estoque
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Informe os produtos adquiridos, unidades e fator de conversão de estoque.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<Add sx={{ fontSize: 16 }} />}
            size="small"
            onClick={handleAdicionarItem}
            sx={{ borderRadius: 1.5, fontWeight: 700, textTransform: 'none', height: 32, fontSize: '0.75rem' }}
          >
            + Adicionar Item
          </Button>
        </Box>

        <SentinelTableContainer>
          <SentinelTable size="small">
            <SentinelTableHead>
              <SentinelTableRow>
                <SentinelTableCell tabular={false} sx={{ minWidth: 260 }}>Produto do Catálogo *</SentinelTableCell>
                <SentinelTableCell tabular={false} sx={{ minWidth: 100 }}>Qtd. Compra *</SentinelTableCell>
                <SentinelTableCell tabular={false} sx={{ minWidth: 80 }}>Unidade</SentinelTableCell>
                <SentinelTableCell tabular={false} sx={{ minWidth: 110 }}>
                  <Tooltip title="Ex: Se comprou 1 Caixa com 12 unidades, o fator é 12. O estoque receberá (Qtd x Fator).">
                    <span>Fator Conv. (?)</span>
                  </Tooltip>
                </SentinelTableCell>
                <SentinelTableCell tabular={false} sx={{ minWidth: 110 }}>Valor Un. (R$)</SentinelTableCell>
                <SentinelTableCell tabular={true} sx={{ minWidth: 110 }}>Subtotal (R$)</SentinelTableCell>
                <SentinelTableCell tabular={false} sx={{ minWidth: 130 }}>Entrada Estoque</SentinelTableCell>
                <SentinelTableCell align="center" tabular={false} sx={{ minWidth: 110 }}>Atualizar Custo?</SentinelTableCell>
                <SentinelTableCell align="center" tabular={false} sx={{ width: 45 }}>Ação</SentinelTableCell>
              </SentinelTableRow>
            </SentinelTableHead>
            <TableBody>
              {itens.map((item, idx) => {
                const fator = item.fator_conversao > 0 ? item.fator_conversao : 1;
                const entradaQtd = (Number(item.quantidade) || 0) * fator;
                const custoUnitConvertido = fator > 0 ? (Number(item.valor_unitario) || 0) / fator : (Number(item.valor_unitario) || 0);

                return (
                  <SentinelTableRow key={idx}>
                    {/* Seletor de Produto */}
                    <SentinelTableCell tabular={false}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Autocomplete
                          options={produtos}
                          getOptionLabel={(p) => `${p.nome} (Estoque: ${p.quantidade_estoque || 0})`}
                          value={produtos.find((p) => p.id === item.produto_id) || null}
                          onChange={(_, novo) => handleItemChange(idx, 'produto_id', novo ? novo.id : null)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              size="small"
                              placeholder="Selecione o produto..."
                              fullWidth
                            />
                          )}
                          sx={{ flexGrow: 1 }}
                        />
                        <Tooltip title="Cadastrar novo produto sem sair da compra">
                          <Button
                            variant="contained"
                            color="secondary"
                            size="small"
                            onClick={() => handleAbrirModalNovoProduto(idx)}
                            sx={{ minWidth: 32, px: 1, height: 36, fontWeight: 800, fontSize: '0.75rem' }}
                          >
                            + Novo
                          </Button>
                        </Tooltip>
                      </Box>
                    </SentinelTableCell>

                    {/* Quantidade */}
                    <SentinelTableCell tabular={false}>
                      <TextField
                        type="number"
                        size="small"
                        inputProps={{ min: 0.01, step: 'any' }}
                        value={item.quantidade}
                        onChange={(e) => handleItemChange(idx, 'quantidade', parseFloat(e.target.value) || 0)}
                        fullWidth
                      />
                    </SentinelTableCell>

                    {/* Unidade */}
                    <SentinelTableCell tabular={false}>
                      <TextField
                        size="small"
                        value={item.unidade}
                        onChange={(e) => handleItemChange(idx, 'unidade', e.target.value.toUpperCase())}
                        placeholder="UN"
                        fullWidth
                      />
                    </SentinelTableCell>

                    {/* Fator de Conversão */}
                    <SentinelTableCell tabular={false}>
                      <TextField
                        type="number"
                        size="small"
                        inputProps={{ min: 0.001, step: 'any' }}
                        value={item.fator_conversao}
                        onChange={(e) => handleItemChange(idx, 'fator_conversao', parseFloat(e.target.value) || 1)}
                        fullWidth
                      />
                    </SentinelTableCell>

                    {/* Valor Unitário */}
                    <SentinelTableCell tabular={false}>
                      <TextField
                        type="number"
                        size="small"
                        inputProps={{ min: 0, step: '0.01' }}
                        value={item.valor_unitario}
                        onChange={(e) => handleItemChange(idx, 'valor_unitario', parseFloat(e.target.value) || 0)}
                        fullWidth
                      />
                    </SentinelTableCell>

                    {/* Subtotal */}
                    <SentinelTableCell tabular={true}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          fontSize: '0.8125rem',
                          color: 'text.primary',
                        }}
                      >
                        {formatCurrency(item.valor_total)}
                      </Typography>
                    </SentinelTableCell>

                    {/* Previsão de Entrada no Estoque */}
                    <SentinelTableCell tabular={false}>
                      <SentinelBadge
                        sentinelVariant="active"
                        size="small"
                        label={`+${entradaQtd.toFixed(2)} UN`}
                      />
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.68rem', mt: 0.5 }}>
                        Custo: {formatCurrency(custoUnitConvertido)}/un
                      </Typography>
                    </SentinelTableCell>

                    {/* Atualizar Custo */}
                    <SentinelTableCell align="center" tabular={false}>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={item.atualizar_custo}
                            onChange={(e) => handleItemChange(idx, 'atualizar_custo', e.target.checked)}
                          />
                        }
                        label={<Typography variant="caption">{item.atualizar_custo ? 'Sim' : 'Não'}</Typography>}
                      />
                    </SentinelTableCell>

                    {/* Excluir Linha */}
                    <SentinelTableCell align="center" tabular={false}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoverItem(idx)}
                        disabled={itens.length <= 1}
                        sx={{ p: 0.5 }}
                      >
                        <Delete sx={{ fontSize: 16 }} />
                      </IconButton>
                    </SentinelTableCell>
                  </SentinelTableRow>
                );
              })}
            </TableBody>
          </SentinelTable>
        </SentinelTableContainer>

        {/* Resumo da Compra e Totais com Superfície Encastrada */}
        <Box
          sx={{
            mt: 2.5,
            p: 2,
            borderRadius: 2,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary">
              Total de Linhas: <strong>{itens.length}</strong> | Itens convertidos para estoque: <strong>+{totalUnidadesEstoque.toFixed(2)}</strong> unidades
            </Typography>
          </Box>

          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                textTransform: 'uppercase',
                fontWeight: 700,
                fontSize: '0.6875rem',
                letterSpacing: '0.05em',
                display: 'block',
              }}
            >
              Total Geral da Compra
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: sentinelTokens.colors.owner.accent,
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'monospace',
                fontSize: '1.75rem',
              }}
            >
              {formatCurrency(totalGeralCompra)}
            </Typography>
          </Box>
        </Box>
      </SentinelCard>

      {/* BOTÕES DE AÇÃO FINAL */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3, mb: 4 }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={() => navigate('/compras')}
          disabled={saving}
          sx={{ borderRadius: 2 }}
        >
          Cancelar
        </Button>

        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
          onClick={handleSalvarCompra}
          disabled={saving}
          sx={{ borderRadius: 2, fontWeight: 800, px: 4 }}
        >
          {saving ? 'Efetivando Compra...' : 'Salvar e Dar Entrada no Estoque'}
        </Button>
      </Box>

      {/* DIÁLOGO / MODAL: CADASTRAR NOVO PRODUTO RAPIDAMENTE */}
      <Dialog
        open={modalProdutoAberto}
        onClose={() => setModalProdutoAberto(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          ✨ Cadastrar Novo Produto Rapidamente
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cadastre o produto sem abandonar o lançamento da compra. Ele será selecionado automaticamente nesta linha.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Nome do Produto *"
                placeholder="Ex: Queijo Mussarela Peça 4kg"
                value={novoProdNome}
                onChange={(e) => setNovoProdNome(e.target.value)}
                fullWidth
                size="small"
                autoFocus
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Categoria"
                placeholder="Ex: Insumos, Bebidas, Embalagens..."
                value={novoProdCategoria}
                onChange={(e) => setNovoProdCategoria(e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label="Preço de Venda Sugerido (R$)"
                inputProps={{ min: 0, step: '0.01' }}
                value={novoProdPrecoVenda}
                onChange={(e) => setNovoProdPrecoVenda(parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label="Custo Unitário Base (R$)"
                inputProps={{ min: 0, step: '0.01' }}
                value={novoProdCustoUnitario}
                onChange={(e) => setNovoProdCustoUnitario(parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
                helperText="Será atualizado pelo valor da compra"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label="Estoque Mínimo (Alerta)"
                inputProps={{ min: 0, step: 'any' }}
                value={novoProdEstoqueMinimo}
                onChange={(e) => setNovoProdEstoqueMinimo(parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setModalProdutoAberto(false)}
            color="inherit"
            disabled={savingNovoProd}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSalvarNovoProduto}
            variant="contained"
            color="primary"
            disabled={savingNovoProd}
            sx={{ fontWeight: 700 }}
          >
            {savingNovoProd ? 'Salvando Produto...' : 'Salvar e Usar no Item'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
