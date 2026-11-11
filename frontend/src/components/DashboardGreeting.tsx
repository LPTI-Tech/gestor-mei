import React from 'react';
import { Box, Typography, Button, Paper, useTheme, alpha, Chip } from '@mui/material';
import {
  CalendarDays,
  AlertTriangle,
  TriangleAlert,
  TrendingUp,
  Receipt,
  Store,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logoIcon from '../assets/branding/gestor-mei-icon.png';
import { SentinelBadge } from '../design-system';
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
          ? 'Olá! Notamos uma pendência na guia do DAS. Que tal quitar hoje para manter seu CNPJ regular e sem juros?'
          : `Olá! Notamos ${qtd} guias do DAS em atraso. Vamos regularizar para garantir seus benefícios previdenciários e manter seu negócio 100% seguro?`,
      severity: 'error',
      icon: <TriangleAlert size={18} strokeWidth={1.75} />,
      actionLink: '/das',
      actionLabel: 'Regularizar DAS',
    };
  }

  // 2. DAS próximo do vencimento (vence em até 7 dias)
  const dasPendente = metrics.das_status_mes_atual === 'Pendente';
  const diasRestantes = metrics.das_dias_restantes ?? (20 - day);

  if (dasPendente && diasRestantes >= 0 && diasRestantes <= 7) {
    let textoDas = '';
    if (diasRestantes === 0) {
      textoDas = 'Lembrete amigável: a guia do DAS vence hoje! É rapidinho pagar pelo app bancário e deixar tudo resolvido.';
    } else if (diasRestantes === 1) {
      textoDas = 'Lembrete do Gestor MEI: o seu DAS vence amanhã (dia 20). Não deixe para a última hora!';
    } else {
      textoDas = `Fique atento: seu DAS vence em ${diasRestantes} dias (dia 20). Já programou o pagamento para manter tudo em dia?`;
    }

    return {
      tipo: 'DAS',
      mensagem: textoDas,
      severity: 'warning',
      icon: <CalendarDays size={18} strokeWidth={1.75} />,
      actionLink: '/das',
      actionLabel: 'Ver Guia DAS',
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
          ? 'Aviso de vendas: identificamos 1 produto com estoque zerado. Hora de reabastecer para não perder pedidos!'
          : `Aviso de vendas: há ${qtdSemEstoque} produtos com estoque zerado no momento. Seus clientes podem procurar por eles hoje!`,
      severity: 'error',
      icon: <TriangleAlert size={18} strokeWidth={1.75} />,
      actionLink: '/estoque',
      actionLabel: 'Repor Estoque',
    };
  }

  // 4. Produtos com estoque baixo
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
          ? 'Dica de reposição: 1 produto está atingindo o nível mínimo. Vale a pena planejar a próxima compra!'
          : `Dica de reposição: ${qtdEstoqueBaixo} produtos estão próximos do mínimo. Antecipe os pedidos aos fornecedores!`,
      severity: 'warning',
      icon: <AlertTriangle size={18} strokeWidth={1.75} />,
      actionLink: '/estoque',
      actionLabel: 'Ver Estoque',
    };
  }

  // 5. DAS Quitado no mês (Sem atrasos)
  if (metrics.das_status_mes_atual === 'Pago' && !metrics.das_qtd_atrasados) {
    return {
      tipo: 'DAS',
      mensagem: 'Tudo certo com a Receita Federal! A guia do DAS deste mês já está quitada e sua empresa segue 100% regular.',
      severity: 'success',
      icon: <CalendarDays size={18} strokeWidth={1.75} />,
      actionLink: '/das',
      actionLabel: 'Ver Comprovantes',
    };
  }

  // 6. Crescimento de faturamento (mês atual vs mês anterior)
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
        mensagem: `Parabéns pela dedicação! Seu faturamento cresceu ${crescimento}% em relação ao mês anterior. Seu esforço está dando resultado!`,
        severity: 'success',
        icon: <TrendingUp size={18} strokeWidth={1.75} />,
        actionLink: '/relatorio-mei',
        actionLabel: 'Ver Desempenho',
      };
    }
  }

  // 7. Quantidade de vendas do dia
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
      mensagem: `O dia está rendendo! Você já realizou ${qtdVendasHoje} ${plural} hoje, somando ${formatCurrency(
        valorVendasHoje
      )}. Continue nesse ritmo!`,
      severity: 'info',
      icon: <Receipt size={18} strokeWidth={1.75} />,
      actionLink: '/vendas',
      actionLabel: 'Ver Vendas',
    };
  }

  // 8. Mensagem padrão acolhedora
  return {
    tipo: 'PADRAO',
    mensagem: 'Que seu dia de trabalho seja excelente, produtivo e cheio de clientes satisfeitos!',
    severity: 'info',
    icon: <Store size={18} strokeWidth={1.75} />,
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
        {/* Cabeçalho Institucional Oficial - Rebranding Gestor MEI */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1.2,
            mb: 1.5,
            px: 1.25,
            py: 0.5,
            borderRadius: 2,
            bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.12 : 0.05),
            border: '1px solid',
            borderColor: (t) => alpha(t.palette.primary.main, 0.15),
            flexWrap: 'wrap',
          }}
        >
          <Box
            component="img"
            src={logoIcon}
            alt="Gestor MEI"
            sx={{
              width: 22,
              height: 22,
              borderRadius: '5px',
              display: 'block',
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 900,
              letterSpacing: '0.04em',
              color: 'primary.main',
              fontSize: '0.78rem',
            }}
          >
            GESTOR MEI
          </Typography>
          {user?.role === 'MASTER' ? (
            <SentinelBadge sentinelVariant="master" size="small" withDot pulse label="PLATAFORMA MASTER" />
          ) : (
            <SentinelBadge sentinelVariant="owner" size="small" label="AMBIENTE EMPRESARIAL" />
          )}
          <Typography
            variant="caption"
            sx={{
              color: 'text.disabled',
              fontWeight: 500,
              fontSize: '0.7rem',
              ml: { xs: 0, md: 1 },
              display: { xs: 'none', md: 'inline' },
            }}
          >
            | Desenvolvido por LPTI Tech
          </Typography>
        </Box>

        {/* Saudação com emoji e nome do usuário com destaque visual Sentinel */}
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{
            color: 'text.primary',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
          }}
        >
          <Box component="span" sx={{ userSelect: 'none' }}>
            {emoji}
          </Box>
          {greeting},{' '}
          <Box
            component="span"
            sx={{
              color: user?.role === 'MASTER' ? '#1976D2' : 'primary.main',
              fontWeight: 900,
              display: 'inline-block',
            }}
          >
            {userName}
          </Box>
          !
        </Typography>

        {/* Subtítulo institucional */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, mb: 1.5, fontWeight: 500 }}
        >
          {user?.role === 'MASTER'
            ? 'Centro de Governança Multiempresa, Auditoria e Supervisão Geral da Rede MEI.'
            : (empresa?.nome_fantasia ? `${empresa.nome_fantasia} — ` : '') + 'Acompanhe seu desempenho e movimentações em tempo real.'}
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
              deleteIcon={<ArrowRight size={14} strokeWidth={1.75} />}
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
          startIcon={<Receipt size={18} strokeWidth={1.75} />}
          onClick={() => navigate('/vendas')}
          sx={{ fontWeight: 700, px: 3, height: 44, whiteSpace: 'nowrap' }}
        >
          Nova Venda (PDV)
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<BarChart3 size={18} strokeWidth={1.75} />}
          onClick={() => navigate('/relatorio-mei')}
          sx={{ fontWeight: 700, px: 2.5, height: 44, whiteSpace: 'nowrap' }}
        >
          Ver Limite MEI
        </Button>
      </Box>
    </Paper>
  );
};

