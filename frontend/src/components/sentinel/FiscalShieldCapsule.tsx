import React from 'react';
import {
  Box,
  Typography,
  Tooltip,
  Button,
  useTheme,
  alpha,
  SxProps,
  Theme,
} from '@mui/material';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { StatusPill } from '../StatusPill';

export interface FiscalShieldCapsuleProps {
  /**
   * Valor total faturado no ano civil corrente (R$)
   */
  faturamentoAcumulado: number;
  /**
   * Limite fiscal do MEI (padrão oficial: R$ 81.000,00)
   */
  limiteAnual?: number;
  /**
   * Ano de referência fiscal (padrão: ano corrente)
   */
  anoReferencia?: number;
  /**
   * Situação da Guia DAS na competência atual
   */
  statusDas?: 'pago' | 'pendente' | 'atrasado';
  /**
   * Variação do estilo visual do componente
   */
  variant?: 'full' | 'compact' | 'hero';
  /**
   * Callback disparado quando o MEI clica para consultar suporte contábil/consultor
   */
  onConsultorClick?: () => void;
  /**
   * Estilizações customizadas adicionais
   */
  sx?: SxProps<Theme>;
}

export const FiscalShieldCapsule: React.FC<FiscalShieldCapsuleProps> = ({
  faturamentoAcumulado,
  limiteAnual = 81000,
  anoReferencia = new Date().getFullYear(),
  statusDas = 'pago',
  variant = 'full',
  onConsultorClick,
  sx,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Cálculos fiscais e percentuais
  const safeLimite = limiteAnual > 0 ? limiteAnual : 81000;
  const percentual = Math.min(Math.max((faturamentoAcumulado / safeLimite) * 100, 0), 100);
  const saldoRestante = Math.max(safeLimite - faturamentoAcumulado, 0);

  // Cálculo de dias restantes até o final do ano civil (31 de dezembro)
  const agora = new Date();
  const fimDoAno = new Date(anoReferencia, 11, 31, 23, 59, 59);
  const diffTime = fimDoAno.getTime() - agora.getTime();
  const diasRestantes = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 1);

  // Ritmo diário permitido sem risco de desenquadramento
  const ritmoDiarioPermitido = saldoRestante > 0 ? saldoRestante / diasRestantes : 0;

  // Determinação da zona de proteção Sentinel
  const getZonaFiscal = () => {
    if (percentual >= 100) {
      return {
        key: 'limite',
        label: 'Teto Excedido',
        pillVariant: 'error' as const,
        primaryColor: '#DC2626',
        bgLight: 'rgba(239, 68, 68, 0.08)',
        borderLight: 'rgba(239, 68, 68, 0.28)',
        icon: <ShieldAlert size={20} strokeWidth={1.75} />,
        headline: 'Atenção: Limite do MEI Excedido',
        orientacao:
          'Seu faturamento ultrapassou R$ 81.000,00. É necessária a transição segura para Microempresa (ME) para evitar autuações fiscais.',
      };
    }
    if (percentual >= 80) {
      return {
        key: 'prudencial',
        label: 'Faixa Prudencial (80%)',
        pillVariant: 'warning' as const,
        primaryColor: '#D97706',
        bgLight: 'rgba(245, 158, 11, 0.08)',
        borderLight: 'rgba(245, 158, 11, 0.28)',
        icon: <AlertTriangle size={20} strokeWidth={1.75} />,
        headline: 'Atenção Prudencial Ativada',
        orientacao:
          'Você já utilizou mais de 80% do teto anual do MEI. Recomendamos planejamento fiscal antecipado para migração programada.',
      };
    }
    return {
      key: 'segura',
      label: 'Escudo Fiscal Ativo',
      pillVariant: 'success' as const,
      primaryColor: '#059669',
      bgLight: 'rgba(16, 185, 129, 0.08)',
      borderLight: 'rgba(16, 185, 129, 0.25)',
      icon: <ShieldCheck size={20} strokeWidth={1.75} />,
      headline: 'Operação em Faixa Segura',
      orientacao:
        'Seu faturamento anual está em perfeita conformidade com as regras do Simples Nacional para o MEI.',
    };
  };

  const zona = getZonaFiscal();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(val);
  };

  // =========================================================================
  // VARIANTE COMPACTA (Para Topbars ou Cards Resumo)
  // =========================================================================
  if (variant === 'compact') {
    return (
      <Box
        sx={{
          p: 1.5,
          borderRadius: '12px',
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          ...sx,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: zona.bgLight,
            color: zona.primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {zona.icon}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'text.secondary' }}>
              Teto MEI {anoReferencia}: {percentual.toFixed(1)}%
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 800, color: zona.primaryColor, fontFeatureSettings: '"tnum"' }}>
              {formatCurrency(saldoRestante)} livres
            </Typography>
          </Box>

          <Box
            sx={{
              height: 6,
              width: '100%',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
              borderRadius: '9999px',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${percentual}%`,
                bgcolor: zona.primaryColor,
                borderRadius: '9999px',
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </Box>
        </Box>
      </Box>
    );
  }

  // =========================================================================
  // VARIANTE COMPLETA / HERO (Padrão Sentinel)
  // =========================================================================
  return (
    <Box
      sx={{
        p: { xs: 2.5, sm: 3 },
        borderRadius: variant === 'hero' ? '20px' : '16px',
        bgcolor: isDark ? '#131C31' : '#FFFFFF',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
        boxShadow: isDark
          ? '0 4px 20px rgba(0, 0, 0, 0.35)'
          : '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        ...sx,
      }}
    >
      {/* Halo de proteção sutil para modo hero */}
      {variant === 'hero' && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 200,
            height: 200,
            background: `radial-gradient(circle, ${alpha(zona.primaryColor, 0.12)} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Cabeçalho do Escudo Fiscal */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              bgcolor: zona.bgLight,
              color: zona.primaryColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${zona.borderLight}`,
              flexShrink: 0,
            }}
          >
            {zona.icon}
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
                Blindagem Fiscal do CNPJ
              </Typography>
              <StatusPill label={zona.label} variant={zona.pillVariant} size="small" pulse={zona.key !== 'segura'} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.01em', mt: 0.2 }}>
              Teto MEI {anoReferencia}: {formatCurrency(faturamentoAcumulado)} de {formatCurrency(safeLimite)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
            Uso do Teto
          </Typography>
          <Typography
            variant="h4"
            fontWeight={900}
            sx={{
              color: zona.primaryColor,
              fontFeatureSettings: '"tnum"',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            {percentual.toFixed(1)}%
          </Typography>
        </Box>
      </Box>

      {/* Régua Segmentada de Proteção Fiscal (3 Faixas) */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            height: 10,
            width: '100%',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
            borderRadius: '9999px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Marcador da Faixa Prudencial (80%) */}
          <Box
            sx={{
              position: 'absolute',
              left: '80%',
              top: 0,
              bottom: 0,
              width: '2px',
              bgcolor: isDark ? '#131C31' : '#FFFFFF',
              zIndex: 2,
            }}
          />

          {/* Barra de Progresso Real */}
          <Box
            sx={{
              height: '100%',
              width: `${percentual}%`,
              bgcolor: zona.primaryColor,
              borderRadius: '9999px',
              transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </Box>

        {/* Legenda das Faixas Sentinel */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: 0.5 }}>
          <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700, fontSize: '0.7rem' }}>
            Faixa Segura (Até R$ 64.800)
          </Typography>
          <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 700, fontSize: '0.7rem' }}>
            Prudencial (80%)
          </Typography>
          <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 700, fontSize: '0.7rem' }}>
            Limite (100%)
          </Typography>
        </Box>
      </Box>

      {/* 3 Métricas de Altitude Fiscal Sentinel */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 1.5,
          p: 1.8,
          borderRadius: '12px',
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(248, 250, 252, 0.8)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
        }}
      >
        {/* Métrica 1: Saldo Restante Seguro */}
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
            Margem Livre Disponível
          </Typography>
          <Typography variant="body1" fontWeight={800} sx={{ fontFeatureSettings: '"tnum"', color: saldoRestante > 0 ? '#059669' : '#DC2626' }}>
            {formatCurrency(saldoRestante)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', mt: 0.2 }}>
            Margem até 31/12/{anoReferencia}
          </Typography>
        </Box>

        {/* Métrica 2: Ritmo Diário Seguro Permitido */}
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
            Ritmo Permitido Diário
          </Typography>
          <Typography variant="body1" fontWeight={800} sx={{ fontFeatureSettings: '"tnum"', color: '#2563EB' }}>
            {formatCurrency(ritmoDiarioPermitido)} / dia
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', mt: 0.2 }}>
            Emissão segura sem desenquadrar
          </Typography>
        </Box>

        {/* Métrica 3: Guia DAS da Competência */}
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
            Guia DAS do Mês
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.2 }}>
            {statusDas === 'pago' ? (
              <>
                <CheckCircle2 size={16} strokeWidth={2.2} color="#059669" />
                <Typography variant="body2" fontWeight={800} color="#059669">
                  Quitada • CNPJ Regular
                </Typography>
              </>
            ) : statusDas === 'atrasado' ? (
              <>
                <AlertTriangle size={16} strokeWidth={2.2} color="#DC2626" />
                <Typography variant="body2" fontWeight={800} color="#DC2626">
                  Em Atraso • Regularizar
                </Typography>
              </>
            ) : (
              <>
                <Clock size={16} strokeWidth={2.2} color="#D97706" />
                <Typography variant="body2" fontWeight={800} color="#D97706">
                  A Vencer neste mês
                </Typography>
              </>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', mt: 0.2 }}>
            Tributo único mensal do MEI
          </Typography>
        </Box>
      </Box>

      {/* Orientação Protetiva Humana & Ação Consultor */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 260, lineHeight: 1.4 }}>
          {zona.orientacao}
        </Typography>

        {zona.key !== 'segura' && onConsultorClick && (
          <Button
            size="small"
            variant="outlined"
            onClick={onConsultorClick}
            endIcon={<ArrowRight size={14} strokeWidth={2} />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.75rem',
              color: zona.primaryColor,
              borderColor: zona.borderLight,
              '&:hover': {
                bgcolor: zona.bgLight,
                borderColor: zona.primaryColor,
              },
            }}
          >
            Falar com Consultor LPTI
          </Button>
        )}
      </Box>
    </Box>
  );
};
