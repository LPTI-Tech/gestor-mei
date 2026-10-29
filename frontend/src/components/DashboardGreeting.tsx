import React from 'react';
import { Box, Typography, Button, Paper, useTheme, alpha, Chip } from '@mui/material';
import {
  CalendarMonth,
  WarningAmber,
  ReportProblem,
  TrendingUp,
  PointOfSale,
  Storefront,
  ArrowForward,
  Assessment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { DashboardMetrics, Produto, User, Empresa } from '../types';
import { formatCurrency } from '../services/exportUtils';

export interface GreetingData {
  greeting: string;
  emoji: string;
}

export interface DynamicInsight {
  tipo: 'DAS' | 'ESTOQUE_BAIXO' | 'SEM_ESTOQUE' | 'CRESCIMENTO' | 'VENDAS_DIA' | 'PADRAO';
  mensagem: string;
  severity: 'warning' | 'error' | 'success' | 'info';
  icon: React.ReactNode;
  actionLink?: string;
  actionLabel?: string;
}

/**
 * Retorna a saudação e o emoji baseados na faixa horária:
 * - 05:00 às 11:59 -> ☀️ Bom dia, {nome}
 * - 12:00 às 17:59 -> 👋 Boa tarde, {nome}
 * - 18:00 às 04:59 -> 🌙 Boa noite, {nome}
 */
export const getGreetingData = (date: Date = new Date()): GreetingData => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return { greeting: 'Bom dia', emoji: '☀️' };
  }
  if (hour >= 12 && hour < 18) {
    return { greeting: 'Boa tarde', emoji: '👋' };
  }
  return { greeting: 'Boa noite', emoji: '🌙' };
};

/**
 * Formata o nome do usuário autenticado para saudação (primeiro nome limpo).
 */
export const getCleanUserName = (rawName?: string | null): string => {
  if (!rawName || !rawName.trim()) return 'Empreendedor';
  const clean = rawName.replace(/\s*\(.*?\)\s*/g, '').trim();
  const firstName = clean.split(' ')[0];
  return firstName || clean || 'Empreendedor';
};

/**
 * Calcula a mensagem dinâmica de maior prioridade:
 * 1. DAS próximo do vencimento (vence dia 20, aviso nos 7 dias anteriores ou no dia)
 * 2. Produtos com estoque baixo
 * 3. Produtos sem estoque
 * 4. Crescimento de faturamento (vs mês anterior)
 * 5. Quantidade de vendas do dia
 * 6. Mensagem padrão de boas-vindas
 */
export const getDynamicInsight = (
  metrics: DashboardMetrics,
  produtos: Produto[] = [],
  referenceDate: Date = new Date()
): DynamicInsight => {
  const day = referenceDate.getDate();

  // 1. DAS em Atraso (Maior Prioridade - Alerta Crítico)
  if (metrics.das_qtd_atrasados && metrics.das_qtd_atrasados > 0) {
    const qtd = metrics.das_qtd_atrasados;
    return {
      tipo: 'DAS',
      mensagem:
        qtd === 1
          ? 'Atenção: Você tem 1 guia DAS em atraso. Regularize para evitar multas!'
          : `Atenção: Você tem ${qtd} guias DAS em atraso. Regularize para evitar multas!`,
      severity: 'error',
      icon: <ReportProblem fontSize="small" />,
      actionLink: '/das',
      actionLabel: 'Pagar DAS',
    };
  }

  // 2. DAS próximo do vencimento (vence em até 7 dias)
  const dasPendente = metrics.das_status_mes_atual === 'Pendente';
  const diasRestantes = metrics.das_dias_restantes ?? (20 - day);

  if (dasPendente && diasRestantes >= 0 && diasRestantes <= 7) {
    let textoDas = '';
    if (diasRestantes === 0) {
      textoDas = 'Seu DAS vence hoje (dia 20)!';
    } else if (diasRestantes === 1) {
      textoDas = 'Seu DAS vence amanhã (dia 20).';
    } else {
      textoDas = `Seu DAS vence em ${diasRestantes} dias.`;
    }

    return {
      tipo: 'DAS',
      mensagem: textoDas,
      severity: 'warning',
      icon: <CalendarMonth fontSize="small" />,
      actionLink: '/das',
      actionLabel: 'Ver DAS',
    };
  }

  // 2. Produtos com estoque baixo
  const qtdEstoqueBaixo = produtos.length > 0
    ? produtos.filter(
        (p) =>
          p.tipo === 'PRODUTO' &&
          (p.quantidade_estoque ?? 0) > 0 &&
          (p.quantidade_estoque ?? 0) <= (p.estoque_minimo ?? 0)
      ).length
    : (metrics.itens_estoque_baixo ?? 0);

  if (qtdEstoqueBaixo > 0) {
    return {
      tipo: 'ESTOQUE_BAIXO',
      mensagem:
        qtdEstoqueBaixo === 1
          ? 'Existe 1 produto com estoque baixo.'
          : `Existem ${qtdEstoqueBaixo} produtos com estoque baixo.`,
      severity: 'warning',
      icon: <WarningAmber fontSize="small" />,
      actionLink: '/estoque',
      actionLabel: 'Ver Estoque',
    };
  }

  // 3. Produtos sem estoque
  const qtdSemEstoque = produtos.length > 0
    ? produtos.filter((p) => p.tipo === 'PRODUTO' && (p.quantidade_estoque ?? 0) <= 0).length
    : 0;

  if (qtdSemEstoque > 0) {
    return {
      tipo: 'SEM_ESTOQUE',
      mensagem:
        qtdSemEstoque === 1
          ? 'Existe 1 produto sem estoque.'
          : `Existem ${qtdSemEstoque} produtos sem estoque.`,
      severity: 'error',
      icon: <ReportProblem fontSize="small" />,
      actionLink: '/estoque',
      actionLabel: 'Repor Estoque',
    };
  }

  // 4. Crescimento de faturamento (mês atual vs mês anterior)
  const currentMonthIdx = referenceDate.getMonth();
  const currentMonthVal =
    metrics.vendas_por_mes?.[currentMonthIdx]?.valor ?? metrics.venda_mes ?? 0;
  const prevMonthVal =
    currentMonthIdx > 0 ? (metrics.vendas_por_mes?.[currentMonthIdx - 1]?.valor ?? 0) : 0;

  if (prevMonthVal > 0 && currentMonthVal > prevMonthVal) {
    const crescimento = Math.round(((currentMonthVal - prevMonthVal) / prevMonthVal) * 100);
    if (crescimento > 0) {
      return {
        tipo: 'CRESCIMENTO',
        mensagem: `Seu faturamento cresceu ${crescimento}% em relação ao mês anterior.`,
        severity: 'success',
        icon: <TrendingUp fontSize="small" />,
        actionLink: '/relatorio-mei',
        actionLabel: 'Ver Relatório',
      };
    }
  }

  // 5. Quantidade de vendas do dia
  const todayPoint =
    metrics.vendas_por_dia && metrics.vendas_por_dia.length > 0
      ? metrics.vendas_por_dia[metrics.vendas_por_dia.length - 1]
      : null;
  const qtdVendasHoje = todayPoint?.quantidade ?? 0;
  const valorVendasHoje = metrics.venda_dia ?? todayPoint?.valor ?? 0;

  if (qtdVendasHoje > 0) {
    const plural = qtdVendasHoje > 1 ? 'vendas' : 'venda';
    return {
      tipo: 'VENDAS_DIA',
      mensagem: `Hoje você realizou ${qtdVendasHoje} ${plural} e faturou ${formatCurrency(
        valorVendasHoje
      )}.`,
      severity: 'info',
      icon: <PointOfSale fontSize="small" />,
      actionLink: '/vendas',
      actionLabel: 'Ver Vendas',
    };
  }

  // 6. Mensagem padrão de boas-vindas
  return {
    tipo: 'PADRAO',
    mensagem: 'Tenha um excelente dia de trabalho e ótimas vendas!',
    severity: 'info',
    icon: <Storefront fontSize="small" />,
  };
};

interface DashboardGreetingProps {
  user: User | null;
  empresa: Empresa | null;
  metrics: DashboardMetrics;
  produtos?: Produto[];
}

export const DashboardGreeting: React.FC<DashboardGreetingProps> = ({
  user,
  empresa,
  metrics,
  produtos = [],
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const { greeting, emoji } = getGreetingData();
  const userName = getCleanUserName(user?.nome);
  const insight = getDynamicInsight(metrics, produtos);

  // Paleta de cores dinâmica baseada no nível de severidade do insight
  const getSeverityStyle = () => {
    switch (insight.severity) {
      case 'warning':
        return {
          bg: alpha(theme.palette.warning.main, 0.08),
          border: alpha(theme.palette.warning.main, 0.35),
          color: theme.palette.warning.dark || '#E65100',
          iconColor: theme.palette.warning.main,
        };
      case 'error':
        return {
          bg: alpha(theme.palette.error.main, 0.08),
          border: alpha(theme.palette.error.main, 0.35),
          color: theme.palette.error.dark || '#C62828',
          iconColor: theme.palette.error.main,
        };
      case 'success':
        return {
          bg: alpha(theme.palette.success.main, 0.08),
          border: alpha(theme.palette.success.main, 0.35),
          color: theme.palette.success.dark || '#2E7D32',
          iconColor: theme.palette.success.main,
        };
      case 'info':
      default:
        return {
          bg: alpha(theme.palette.primary.main, 0.06),
          border: alpha(theme.palette.primary.main, 0.25),
          color: theme.palette.primary.dark || '#1565C0',
          iconColor: theme.palette.primary.main,
        };
    }
  };

  const style = getSeverityStyle();

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5, md: 3 },
        mb: 3,
        borderRadius: 3,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'center' },
        gap: 2.5,
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Saudação com emoji e nome do usuário */}
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{
            color: 'text.primary',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.65rem' },
          }}
        >
          <Box component="span" sx={{ userSelect: 'none' }}>
            {emoji}
          </Box>
          {greeting}, {userName}!
        </Typography>

        {/* Subtítulo institucional */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, mb: 1.5, fontWeight: 500 }}
        >
          {empresa?.nome_fantasia ? `${empresa.nome_fantasia} — ` : ''}
          Acompanhe seu desempenho e movimentações em tempo real.
        </Typography>

        {/* Card/Pill do insight inteligente com ícone e prioridade */}
        <Box
          onClick={() => {
            if (insight.actionLink) {
              navigate(insight.actionLink);
            }
          }}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.2,
            px: 1.8,
            py: 0.85,
            borderRadius: 2,
            bgcolor: style.bg,
            border: '1px solid',
            borderColor: style.border,
            color: style.color,
            cursor: insight.actionLink ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            '&:hover': insight.actionLink
              ? {
                  bgcolor: alpha(style.bg, 0.9),
                  transform: 'translateY(-1px)',
                }
              : {},
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: style.iconColor,
            }}
          >
            {insight.icon}
          </Box>

          <Typography
            variant="body2"
            fontWeight={600}
            sx={{
              color: style.color,
              lineHeight: 1.4,
            }}
          >
            {insight.mensagem}
          </Typography>

          {insight.actionLabel && (
            <Chip
              size="small"
              label={insight.actionLabel}
              deleteIcon={<ArrowForward style={{ fontSize: 14 }} />}
              onDelete={insight.actionLink ? () => navigate(insight.actionLink!) : undefined}
              sx={{
                height: 22,
                fontSize: '0.72rem',
                fontWeight: 700,
                bgcolor: style.color,
                color: '#fff',
                cursor: 'pointer',
                ml: 0.5,
                '& .MuiChip-deleteIcon': {
                  color: '#fff',
                  '&:hover': { color: '#fff' },
                },
              }}
            />
          )}
        </Box>
      </Box>

      {/* Botões de Ação Rápida */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
          width: { xs: '100%', md: 'auto' },
          flexShrink: 0,
        }}
      >
        <Button
          variant="contained"
          color="primary"
          startIcon={<PointOfSale />}
          onClick={() => navigate('/vendas')}
          sx={{ fontWeight: 700, px: 3, height: 44, whiteSpace: 'nowrap' }}
        >
          Nova Venda (PDV)
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<Assessment />}
          onClick={() => navigate('/relatorio-mei')}
          sx={{ fontWeight: 700, px: 2.5, height: 44, whiteSpace: 'nowrap' }}
        >
          Ver Limite MEI
        </Button>
      </Box>
    </Paper>
  );
};

