import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Alert,
  Divider,
  CircularProgress,
  Paper,
  Chip,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Settings,
  Save,
  CloudDownload,
  Security,
  Extension,
  TwoWheeler,
  DeliveryDining,
  Inventory,
  LocalShipping,
  PhotoCamera,
  Delete,
  Business,
  CloudQueue,
  CheckCircle,
} from '@mui/icons-material';
import api from '../services/api';
import { Empresa } from '../types';
import { formatCurrency } from '../services/exportUtils';
import { useAuth } from '../contexts/AuthContext';

export const Configuracoes: React.FC = () => {
  const { empresa, refreshUserData } = useAuth();
  const [formData, setFormData] = useState({
    nome_empresarial: '',
    nome_fantasia: '',
    cnpj: '',
    cpf_proprietario: '',
    endereco: '',
    telefone: '',
    email: '',
    limite_mei_anual: 81000.0,
    segmento: 'ALIMENTACAO',
    modulo_delivery: true,
    modulo_motoboy: true,
    modulo_ifood: true,
    modulo_estoque: false,
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [savingModulos, setSavingModulos] = useState<boolean>(false);
  const [permitirEstoqueNegativo, setPermitirEstoqueNegativo] = useState<boolean>(true);
  const [savingEstoque, setSavingEstoque] = useState<boolean>(false);
  const [exportingBackup, setExportingBackup] = useState<boolean>(false);

  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);



  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];

    const uploadData = new FormData();

    uploadData.append('file', file);



    setUploadingLogo(true);

    setSuccessMsg(null);

    try {

      await api.post('/empresa/logo', uploadData, {

        headers: { 'Content-Type': 'multipart/form-data' },

      });

      await refreshUserData();

      setSuccessMsg('Logotipo da empresa atualizado com sucesso e sincronizado no Cloudflare R2!');

    } catch (err: any) {

      alert(err.response?.data?.detail || 'Erro ao enviar logotipo.');

    } finally {

      setUploadingLogo(false);

    }

  };



  const handleLogoDelete = async () => {

    if (!window.confirm('Tem certeza que deseja remover o logotipo da sua empresa?')) return;

    setUploadingLogo(true);

    setSuccessMsg(null);

    try {

      await api.delete('/empresa/logo');

      await refreshUserData();

      setSuccessMsg('Logotipo da empresa removido com sucesso.');

    } catch (err: any) {

      alert(err.response?.data?.detail || 'Erro ao remover logotipo.');

    } finally {

      setUploadingLogo(false);

    }

  };
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (empresa) {
      setFormData({
        nome_empresarial: empresa.nome_empresarial || '',
        nome_fantasia: empresa.nome_fantasia || '',
        cnpj: empresa.cnpj || '',
        cpf_proprietario: empresa.cpf_proprietario || '',
        endereco: empresa.endereco || '',
        telefone: empresa.telefone || '',
        email: empresa.email || '',
        limite_mei_anual: empresa.limite_mei_anual || 81000.0,
        segmento: empresa.segmento || 'ALIMENTACAO',
        modulo_delivery: empresa.modulo_delivery ?? true,
        modulo_motoboy: empresa.modulo_motoboy ?? true,
        modulo_ifood: empresa.modulo_ifood ?? true,
        modulo_estoque: empresa.modulo_estoque ?? false,
      });
      setPermitirEstoqueNegativo(empresa.permitir_estoque_negativo ?? true);
    }
  }, [empresa]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      await api.put('/empresa', formData);
      await refreshUserData();
      setSuccessMsg('Dados da empresa atualizados com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao atualizar dados da empresa.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleModulo = async (key: 'modulo_motoboy' | 'modulo_ifood' | 'modulo_delivery' | 'modulo_estoque', value: boolean) => {
    const updated = {
      ...formData,
      [key]: value,
    };
    setFormData(updated);
    setSavingModulos(true);
    setSuccessMsg(null);

    try {
      await api.put('/empresa/modulos', {
        modulo_delivery: updated.modulo_delivery,
        modulo_motoboy: updated.modulo_motoboy,
        modulo_ifood: updated.modulo_ifood,
        modulo_estoque: updated.modulo_estoque,
      });
      await refreshUserData();
      setSuccessMsg('Configuração de módulos atualizada! O menu do sistema foi ajustado.');
    } catch (err) {
      alert('Erro ao alterar configuração dos módulos.');
    } finally {
      setSavingModulos(false);
    }
  };

  const handleChangePoliticaEstoque = async (permitir: boolean) => {
    setSavingEstoque(true);
    setSuccessMsg(null);
    try {
      await api.put('/empresa/estoque-config', {
        permitir_estoque_negativo: permitir,
      });
      setPermitirEstoqueNegativo(permitir);
      await refreshUserData();
      setSuccessMsg(
        permitir
          ? 'Política de estoque atualizada: Permitir estoque negativo com confirmação.'
          : 'Política de estoque atualizada: Bloquear estoque negativo em vendas e saídas.'
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao alterar política de estoque.');
    } finally {
      setSavingEstoque(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setExportingBackup(true);
      const res = await api.get('/backup/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Backup_GESTOR_MEI_${formData.cnpj.replace(/\D/g, '')}_${new Date().toISOString().split('T')[0]}.json`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Erro ao exportar arquivo de backup.');
    } finally {
      setExportingBackup(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} display="flex" alignItems="center" gap={1}>
          <Settings color="primary" /> Configurações & Módulos do Sistema
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ative ou desative módulos conforme seu ramo (Salão, Barbearia, Oficina, Comércio ou Alimentação).
        </Typography>
      </Box>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* MODULAR FEATURE TOGGLES CARD */}
      <Card sx={{ borderRadius: 3, mb: 3, border: 1, borderColor: 'primary.light' }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Extension color="primary" />
            <Typography variant="h6" fontWeight={800}>
              Módulos do Sistema (Ative apenas o que seu negócio usa)
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            O <b>Núcleo (Vendas, Caixa, Despesas, Relatórios e Faturamento MEI)</b> está sempre ativo. 
            Módulos desativados abaixo não poluíram o menu nem o aplicativo móvel da sua equipe.
          </Typography>

          <Grid container spacing={2}>
            {/* Módulo Motoboys */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: formData.modulo_motoboy ? 'background.paper' : 'action.hover',
                  borderColor: formData.modulo_motoboy ? 'primary.main' : 'divider',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TwoWheeler color={formData.modulo_motoboy ? 'primary' : 'disabled'} />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Motoboys
                    </Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={formData.modulo_motoboy}
                    onChange={(e) => handleToggleModulo('modulo_motoboy', e.target.checked)}
                    disabled={savingModulos}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  Controle de corridas, taxas e acerto de diárias.
                </Typography>
              </Paper>
            </Grid>

            {/* Módulo iFood */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: formData.modulo_ifood ? 'background.paper' : 'action.hover',
                  borderColor: formData.modulo_ifood ? '#EA1D2C' : 'divider',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DeliveryDining sx={{ color: formData.modulo_ifood ? '#EA1D2C' : 'text.disabled' }} />
                    <Typography variant="subtitle2" fontWeight={700}>
                      iFood
                    </Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={formData.modulo_ifood}
                    onChange={(e) => handleToggleModulo('modulo_ifood', e.target.checked)}
                    disabled={savingModulos}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  Lançamento de pedidos, taxas retidas e líquido.
                </Typography>
              </Paper>
            </Grid>

            {/* Módulo Delivery Próprio */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: formData.modulo_delivery ? 'background.paper' : 'action.hover',
                  borderColor: formData.modulo_delivery ? 'secondary.main' : 'divider',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalShipping color={formData.modulo_delivery ? 'secondary' : 'disabled'} />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Delivery Próprio
                    </Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={formData.modulo_delivery}
                    onChange={(e) => handleToggleModulo('modulo_delivery', e.target.checked)}
                    disabled={savingModulos}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  Origem WhatsApp e entregas em domicílio.
                </Typography>
              </Paper>
            </Grid>

            {/* Módulo Estoque (Futuro) */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: formData.modulo_estoque ? 'background.paper' : 'action.hover',
                  borderColor: formData.modulo_estoque ? 'info.main' : 'divider',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Inventory color={formData.modulo_estoque ? 'info' : 'disabled'} />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Estoque
                    </Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={formData.modulo_estoque}
                    onChange={(e) => handleToggleModulo('modulo_estoque', e.target.checked)}
                    disabled={savingModulos}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  Controle de saldo e inventário de mercadorias.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* CONFIGURAÇÃO DE ESTOQUE NEGATIVO (BUG-001) */}
      <Card sx={{ borderRadius: 3, mb: 3, border: 1, borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Inventory color="primary" />
              <Typography variant="h6" fontWeight={800}>
                Configurações de Estoque
              </Typography>
            </Box>
            <Chip
              label={permitirEstoqueNegativo ? "Permitir com Confirmação (Padrão)" : "Bloquear Estoque Negativo"}
              color={permitirEstoqueNegativo ? "success" : "error"}
              variant="outlined"
              size="small"
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Defina o comportamento do sistema ao registrar vendas (PDV, Delivery) ou saídas com saldo insuficiente:
          </Typography>

          <Grid container spacing={2}>
            {/* Opção 1: Permitir estoque negativo com confirmação */}
            <Grid item xs={12} md={6}>
              <Paper
                variant="outlined"
                onClick={() => !savingEstoque && handleChangePoliticaEstoque(true)}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  bgcolor: permitirEstoqueNegativo ? 'action.selected' : 'background.paper',
                  borderColor: permitirEstoqueNegativo ? 'primary.main' : 'divider',
                  borderWidth: permitirEstoqueNegativo ? 2 : 1,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Radio
                  checked={permitirEstoqueNegativo}
                  onChange={() => handleChangePoliticaEstoque(true)}
                  disabled={savingEstoque}
                  sx={{ p: 0, mt: 0.2 }}
                />
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Permitir estoque negativo
                    </Typography>
                    <Chip label="Padrão Recomendado" size="small" color="primary" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Caso o saldo seja insuficiente, o sistema exibe o alerta:
                    <b> "Estoque insuficiente para concluir a venda."</b> com as opções <b>[Cancelar Venda]</b> e <b>[Vender Mesmo Assim]</b>, registrando a ocorrência no histórico de auditoria e gerando alerta de estoque crítico.
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Opção 2: Bloquear estoque negativo */}
            <Grid item xs={12} md={6}>
              <Paper
                variant="outlined"
                onClick={() => !savingEstoque && handleChangePoliticaEstoque(false)}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  bgcolor: !permitirEstoqueNegativo ? 'action.selected' : 'background.paper',
                  borderColor: !permitirEstoqueNegativo ? 'error.main' : 'divider',
                  borderWidth: !permitirEstoqueNegativo ? 2 : 1,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  '&:hover': {
                    borderColor: 'error.main',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Radio
                  checked={!permitirEstoqueNegativo}
                  onChange={() => handleChangePoliticaEstoque(false)}
                  disabled={savingEstoque}
                  sx={{ p: 0, mt: 0.2 }}
                />
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Bloquear estoque negativo
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Bloqueia terminantemente a conclusão de vendas ou saídas caso a quantidade solicitada exceda o saldo em estoque. Impede o fechamento do pedido até que haja reposição física de mercadorias.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* IDENTIDADE VISUAL & LOGOTIPO OFICIAL (Sprint Operação Real 1) */}
      <Card sx={{ borderRadius: 3, mb: 3, border: 1, borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Business color="primary" />
              <Typography variant="h6" fontWeight={800}>
                Identidade Visual & Logotipo da Empresa
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                icon={<CloudQueue sx={{ '&&': { fontSize: 16 } }} />}
                label="Cloudflare R2"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
              <Chip
                label="WebP 90% Otimizado"
                size="small"
                sx={{ fontWeight: 700, bgcolor: 'rgba(46, 125, 50, 0.08)', color: '#2E7D32' }}
              />
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Personalize a marca da sua empresa nos menus do sistema e em futuros documentos fiscais (DANFE NFC-e e Relatórios Gerenciais).
          </Typography>

          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F8FAFC'),
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 3,
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={empresa?.logo_url || undefined}
                variant="rounded"
                sx={{
                  width: 90,
                  height: 90,
                  borderRadius: 2.5,
                  border: '1.5px solid',
                  borderColor: 'divider',
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF'),
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  objectFit: 'contain',
                }}
              >
                <Business sx={{ fontSize: 44, color: 'text.secondary', opacity: 0.5 }} />
              </Avatar>
            </Box>

            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                {empresa?.logo_url ? 'Logotipo Atual Ativo' : 'Nenhum logotipo personalizado configurado'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 520 }}>
                {empresa?.logo_url
                  ? 'Este logotipo é exibido no topo da barra de navegação e será inserido nas impressões de comandas e relatórios.'
                  : 'Envie uma imagem quadrada ou proporcional da sua marca nos formatos PNG, JPG ou WEBP (máx. 10 MB).'}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  component="label"
                  disabled={uploadingLogo}
                  startIcon={uploadingLogo ? <CircularProgress size={16} color="inherit" /> : <PhotoCamera />}
                  sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 2.5, height: 38 }}
                >
                  {uploadingLogo ? 'Enviando...' : empresa?.logo_url ? 'Substituir Logotipo' : 'Enviar Logotipo'}
                  <input
                    type="file"
                    hidden
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handleLogoUpload}
                  />
                </Button>

                {empresa?.logo_url && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    disabled={uploadingLogo}
                    onClick={handleLogoDelete}
                    startIcon={<Delete />}
                    sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', height: 38 }}
                  >
                    Remover
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Company Profile Edit */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Dados do Estabelecimento MEI
              </Typography>

              <Box component="form" onSubmit={handleSaveInfo}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Ramo / Segmento</InputLabel>
                      <Select
                        value={formData.segmento}
                        label="Ramo / Segmento"
                        onChange={(e) => setFormData({ ...formData, segmento: e.target.value })}
                      >
                        <MenuItem value="ALIMENTACAO">Alimentação (Marmitaria, Bar, Lanchonete)</MenuItem>
                        <MenuItem value="BELEZA">Beleza & Estética (Salão, Barbearia)</MenuItem>
                        <MenuItem value="OFICINA">Oficina & Manutenção (Auto, Moto, Reparos)</MenuItem>
                        <MenuItem value="SERVICOS">Prestador de Serviços em Geral</MenuItem>
                        <MenuItem value="COMERCIO">Pequeno Comércio / Mercearia</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Nome Fantasia"
                      value={formData.nome_fantasia}
                      onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                      required
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Razão Social (Nome Empresarial)"
                      value={formData.nome_empresarial}
                      onChange={(e) => setFormData({ ...formData, nome_empresarial: e.target.value })}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="CNPJ"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="CPF do Titular"
                      value={formData.cpf_proprietario}
                      onChange={(e) => setFormData({ ...formData, cpf_proprietario: e.target.value })}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Telefone Comercial"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="E-mail da Empresa"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Endereço Completo"
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Limite MEI Anual (R$)"
                      type="number"
                      inputProps={{ step: '1000' }}
                      value={formData.limite_mei_anual}
                      onChange={(e) => setFormData({ ...formData, limite_mei_anual: Number(e.target.value) })}
                      helperText="Padrão oficial: R$ 81.000,00"
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
                    disabled={saving}
                    sx={{ height: 44, fontWeight: 700 }}
                  >
                    Salvar Dados da Empresa
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Backup & Data Protection */}
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }} display="flex" alignItems="center" gap={1}>
                <Security color="primary" /> Segurança & Backup dos Dados
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Tenha cópia integral de todas as suas vendas, caixas, cardápio e despesas no seu computador.
              </Typography>

              {/* Local Backup */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={0.5}>
                  Backup Local (Arquivo JSON Completo)
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  Baixe um arquivo seguro com todos os registros cadastrados da sua empresa.
                </Typography>

                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  startIcon={exportingBackup ? <CircularProgress size={18} color="inherit" /> : <CloudDownload />}
                  onClick={handleExportBackup}
                  disabled={exportingBackup}
                  sx={{ height: 44, fontWeight: 700 }}
                >
                  Baixar Backup Completo
                </Button>
              </Paper>

              {/* Google Drive Architecture Ready */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Nuvem: Google Drive
                  </Typography>
                  <Chip label="Arquitetura Pronta" size="small" variant="outlined" color="info" />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Estrutura e endpoints de sincronização prontos para conexão via OAuth 2.0.
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
