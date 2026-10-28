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
  const [exportingBackup, setExportingBackup] = useState<boolean>(false);
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
