import React from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  alpha,
  SxProps,
  Theme,
} from '@mui/material';

export type ProtectiveCardVariant = 'default' | 'elevated' | 'accent' | 'subtle' | 'hero';
export type ProtectiveCardAccent = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface ProtectiveCardProps {
  /**
   * Conteúdo interno do cartão
   */
  children?: React.ReactNode;
  /**
   * Título principal do cartão
   */
  title?: React.ReactNode;
  /**
   * Subtítulo ou texto contextual explicativo
   */
  subtitle?: React.ReactNode;
  /**
   * Ícone temático renderizado dentro do microcontainer Sentinel 36x36px
   */
  icon?: React.ReactNode;
  /**
   * Elemento de ação posicionado no canto superior direito (ex: botão, menu)
   */
  action?: React.ReactNode;
  /**
   * Pílula de status exibida ao lado do título ou no topo
   */
  statusPill?: React.ReactNode;
  /**
   * Estilo visual do cartão cerâmico
   */
  variant?: ProtectiveCardVariant;
  /**
   * Cor da borda lateral de proteção (4px)
   */
  accentColor?: ProtectiveCardAccent | string;
  /**
   * Habilita animação e elevação tátil no hover
   */
  interactive?: boolean;
  /**
   * Callback disparado ao clicar no cartão
   */
  onClick?: () => void;
  /**
   * Espaçamento interno customizado (padrão: 3 / 24px)
   */
  padding?: number | string | { xs?: number | string; sm?: number | string; md?: number | string };
  /**
   * Estilizações customizadas adicionais
   */
  sx?: SxProps<Theme>;
}

export const ProtectiveCard: React.FC<ProtectiveCardProps> = ({
  children,
  title,
  subtitle,
  icon,
  action,
  statusPill,
  variant = 'default',
  accentColor,
  interactive = false,
  onClick,
  padding = { xs: 2, sm: 2.5 },
  sx,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Resolução de cores de acento Sentinel
  const getAccentHex = (acc?: ProtectiveCardAccent | string): string => {
    switch (acc) {
      case 'primary':
        return '#2563EB';
      case 'success':
        return '#059669';
      case 'warning':
        return '#D97706';
      case 'error':
        return '#DC2626';
      case 'info':
        return '#2563EB';
      case 'neutral':
        return '#64748B';
      default:
        return acc || '#2563EB';
    }
  };

  const accentHex = accentColor ? getAccentHex(accentColor) : undefined;

  // Determinação de fundo e sombras
  const getSurfaceStyles = () => {
    const radius = variant === 'hero' ? '20px' : '16px';

    if (variant === 'subtle') {
      return {
        bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(248, 250, 252, 0.8)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
        boxShadow: 'none',
        borderRadius: radius,
      };
    }

    if (variant === 'elevated' || variant === 'hero') {
      return {
        bgcolor: isDark ? '#131C31' : '#FFFFFF',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
        boxShadow: isDark
          ? '0 8px 24px -4px rgba(0, 0, 0, 0.45)'
          : '0 8px 24px -4px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        borderRadius: radius,
      };
    }

    // Default / Accent
    return {
      bgcolor: isDark ? '#131C31' : '#FFFFFF',
      border: '1px solid',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
      boxShadow: isDark
        ? '0 1px 3px rgba(0, 0, 0, 0.3)'
        : '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)',
      borderRadius: radius,
    };
  };

  const surface = getSurfaceStyles();

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: padding,
        ...surface,
        position: 'relative',
        overflow: 'hidden',
        borderLeft: accentHex ? `4px solid ${accentHex}` : surface.border,
        cursor: onClick || interactive ? 'pointer' : 'default',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': (onClick || interactive)
          ? {
              transform: 'translateY(-2px)',
              boxShadow: isDark
                ? '0 12px 28px -4px rgba(0, 0, 0, 0.5)'
                : '0 12px 28px -4px rgba(15, 23, 42, 0.1)',
            }
          : {},
        ...sx,
      }}
    >
      {/* Cabeçalho do Cartão (se houver título, ícone, ação ou pill) */}
      {(title || icon || action || statusPill) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 1.5,
            mb: children ? 2 : 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            {/* Microcontainer Sentinel do Ícone */}
            {icon && (
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  bgcolor: accentHex
                    ? alpha(accentHex, 0.1)
                    : isDark
                    ? 'rgba(37, 99, 235, 0.15)'
                    : 'rgba(37, 99, 235, 0.08)',
                  color: accentHex || '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {icon}
              </Box>
            )}

            {/* Título e Subtítulo */}
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {typeof title === 'string' ? (
                  <Typography
                    variant="h6"
                    fontWeight={800}
                    sx={{
                      fontSize: '1rem',
                      letterSpacing: '-0.015em',
                      lineHeight: 1.25,
                      color: 'text.primary',
                    }}
                  >
                    {title}
                  </Typography>
                ) : (
                  title
                )}
                {statusPill}
              </Box>

              {subtitle && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    mt: 0.25,
                    fontSize: '0.75rem',
                    lineHeight: 1.3,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Ação no Canto Superior Direito */}
          {action && (
            <Box sx={{ flexShrink: 0 }}>
              {action}
            </Box>
          )}
        </Box>
      )}

      {/* Conteúdo Principal */}
      {children}
    </Paper>
  );
};
