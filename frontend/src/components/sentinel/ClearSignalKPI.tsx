import React from 'react';
import {
  Box,
  Typography,
  Tooltip,
  useTheme,
  alpha,
  SxProps,
  Theme,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { StatusPill, StatusPillVariant } from '../StatusPill';
import { ProtectiveCard } from './ProtectiveCard';

export interface ClearSignalTrend {
  value: number | string;
  label?: string;
  direction?: 'up' | 'down' | 'neutral';
}

export interface ClearSignalKPIProps {
  /**
   * Nome claro e descomplicado do KPI (ex: "Total de Vendas no Mês")
   */
  label: string;
  /**
   * Valor principal do KPI (numérico ou string já formatada)
   */
  value: number | string;
  /**
   * Prefixo monetário ou textual (padrão: "R$")
   */
  prefix?: string;
  /**
   * Se true, formata o valor numérico como moeda BRL automaticamente
   */
  isCurrency?: boolean;
  /**
   * Ícone temático renderizado dentro do microcontainer Sentinel 36x36px
   */
  icon?: React.ReactNode;
  /**
   * Indicador de tendência comparativa (ex: +18% este mês)
   */
  trend?: ClearSignalTrend;
  /**
   * Frase de impacto humano explicando o que o número significa na vida real do MEI
   */
  humanExplanation?: string;
  /**
   * Pílula de status rápido no topo do card
   */
  statusPill?: {
    label: string;
    variant?: StatusPillVariant;
    pulse?: boolean;
  };
  /**
   * Esquema de cor semântica do microcontainer e destaques
   */
  colorScheme?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  /**
   * Variação do layout do card
   */
  variant?: 'default' | 'compact' | 'hero';
  /**
   * Ativa efeito hover tátil
   */
  interactive?: boolean;
  /**
   * Callback disparado ao clicar no KPI
   */
  onClick?: () => void;
  /**
   * Estilizações customizadas adicionais
   */
  sx?: SxProps<Theme>;
}

export const ClearSignalKPI: React.FC<ClearSignalKPIProps> = ({
  label,
  value,
  prefix = 'R$',
  isCurrency = true,
  icon,
  trend,
  humanExplanation,
  statusPill,
  colorScheme = 'primary',
  variant = 'default',
  interactive = false,
  onClick,
  sx,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Resolução de cores Sentinel
  const getColorHex = () => {
    switch (colorScheme) {
      case 'success':
        return '#059669';
      case 'warning':
        return '#D97706';
      case 'error':
        return '#DC2626';
      case 'neutral':
        return '#64748B';
      case 'primary':
      default:
        return '#2563EB';
    }
  };

  const primaryColor = getColorHex();

  // Formatação de valores numéricos
  const renderValue = () => {
    if (typeof value === 'number') {
      if (isCurrency) {
        const formatted = new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(Math.abs(value));

        const isNegative = value < 0;

        return (
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.6, flexWrap: 'wrap' }}>
            {isNegative && (
              <Typography
                component="span"
                sx={{
                  fontSize: variant === 'hero' ? '1.8rem' : '1.4rem',
                  fontWeight: 800,
                  color: '#DC2626',
                  fontFeatureSettings: '"tnum"',
                }}
              >
                -
              </Typography>
            )}
            {prefix && (
              <Typography
                component="span"
                sx={{
                  fontSize: variant === 'hero' ? '1.25rem' : '1rem',
                  fontWeight: 600,
                  color: 'text.secondary',
                  letterSpacing: '0.01em',
                }}
              >
                {prefix}
              </Typography>
            )}
            <Typography
              component="span"
              sx={{
                fontSize: variant === 'hero' ? '2.25rem' : '1.75rem',
                fontWeight: 900,
                letterSpacing: '-0.025em',
                fontFeatureSettings: '"tnum"',
                lineHeight: 1.1,
                color: isNegative ? '#DC2626' : 'text.primary',
              }}
            >
              {formatted}
            </Typography>
          </Box>
        );
      }

      return (
        <Typography
          sx={{
            fontSize: variant === 'hero' ? '2.25rem' : '1.75rem',
            fontWeight: 900,
            letterSpacing: '-0.025em',
            fontFeatureSettings: '"tnum"',
            lineHeight: 1.1,
            color: 'text.primary',
          }}
        >
          {value.toLocaleString('pt-BR')}
        </Typography>
      );
    }

    // Se já for string
    return (
      <Typography
        sx={{
          fontSize: variant === 'hero' ? '2.1rem' : '1.7rem',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          fontFeatureSettings: '"tnum"',
          lineHeight: 1.1,
          color: 'text.primary',
        }}
      >
        {value}
      </Typography>
    );
  };

  return (
    <ProtectiveCard
      interactive={interactive}
      onClick={onClick}
      variant={variant === 'hero' ? 'hero' : 'default'}
      padding={{ xs: 2, sm: 2.5 }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        ...sx,
      }}
    >
      {/* Topo do Card: Microcontainer de Ícone, Rótulo e StatusPill */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {icon && (
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                bgcolor: alpha(primaryColor, 0.1),
                color: primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          )}

          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'text.secondary',
              fontSize: '0.72rem',
              lineHeight: 1.25,
            }}
          >
            {label}
          </Typography>
        </Box>

        {statusPill && (
          <StatusPill
            label={statusPill.label}
            variant={statusPill.variant || 'neutral'}
            pulse={statusPill.pulse}
            size="small"
          />
        )}
      </Box>

      {/* Meio: Valor Destaque Tabular */}
      <Box sx={{ my: 0.5 }}>
        {renderValue()}
      </Box>

      {/* Tendência e Frase de Impacto Humano */}
      <Box sx={{ mt: 1.2, pt: 1, borderTop: '1px solid', borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)' }}>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: humanExplanation ? 0.4 : 0 }}>
            {trend.direction === 'up' ? (
              <TrendingUp size={14} strokeWidth={2.5} color="#059669" />
            ) : trend.direction === 'down' ? (
              <TrendingDown size={14} strokeWidth={2.5} color="#DC2626" />
            ) : (
              <Minus size={14} strokeWidth={2.5} color="#64748B" />
            )}
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                fontFeatureSettings: '"tnum"',
                color: trend.direction === 'up' ? '#059669' : trend.direction === 'down' ? '#DC2626' : 'text.secondary',
                fontSize: '0.75rem',
              }}
            >
              {trend.value}
            </Typography>
            {trend.label && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                {trend.label}
              </Typography>
            )}
          </Box>
        )}

        {humanExplanation && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: 'text.secondary',
              fontSize: '0.75rem',
              lineHeight: 1.35,
              fontWeight: 500,
            }}
          >
            {humanExplanation}
          </Typography>
        )}
      </Box>
    </ProtectiveCard>
  );
};
