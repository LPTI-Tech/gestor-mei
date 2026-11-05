import React from 'react';
import { Box, Typography } from '@mui/material';

export type StatusPillVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusPillProps {
  label: string;
  variant?: StatusPillVariant;
  pulse?: boolean;
  size?: 'small' | 'medium';
  icon?: React.ReactNode;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  label,
  variant = 'neutral',
  pulse = false,
  size = 'small',
  icon,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'rgba(16, 185, 129, 0.1)',
          border: 'rgba(16, 185, 129, 0.28)',
          color: '#059669',
          dot: '#10B981',
          glow: 'rgba(16, 185, 129, 0.4)',
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.1)',
          border: 'rgba(245, 158, 11, 0.28)',
          color: '#D97706',
          dot: '#F59E0B',
          glow: 'rgba(245, 158, 11, 0.4)',
        };
      case 'error':
        return {
          bg: 'rgba(239, 68, 68, 0.1)',
          border: 'rgba(239, 68, 68, 0.28)',
          color: '#DC2626',
          dot: '#EF4444',
          glow: 'rgba(239, 68, 68, 0.4)',
        };
      case 'info':
        return {
          bg: 'rgba(37, 99, 235, 0.1)',
          border: 'rgba(37, 99, 235, 0.28)',
          color: '#2563EB',
          dot: '#3B82F6',
          glow: 'rgba(37, 99, 235, 0.4)',
        };
      case 'neutral':
      default:
        return {
          bg: 'rgba(100, 116, 139, 0.1)',
          border: 'rgba(100, 116, 139, 0.25)',
          color: '#475569',
          dot: '#94A3B8',
          glow: 'transparent',
        };
    }
  };

  const colors = getColors();
  const isSmall = size === 'small';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: isSmall ? 1.15 : 1.5,
        py: isSmall ? 0.25 : 0.4,
        borderRadius: '9999px',
        bgcolor: colors.bg,
        border: '1px solid',
        borderColor: colors.border,
        color: colors.color,
        fontSize: isSmall ? '0.7rem' : '0.78rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
        lineHeight: 1.2,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Ponto indicador tátil com micro-pulso opcional */}
      <Box
        sx={{
          width: isSmall ? 6 : 8,
          height: isSmall ? 6 : 8,
          borderRadius: '50%',
          bgcolor: colors.dot,
          boxShadow: pulse ? `0 0 6px ${colors.glow}` : 'none',
          animation: pulse ? 'statusPillPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
          '@keyframes statusPillPulse': {
            '0%, 100%': { opacity: 1, transform: 'scale(1)' },
            '50%': { opacity: 0.4, transform: 'scale(0.85)' },
          },
        }}
      />

      {icon && (
        <Box sx={{ display: 'flex', alignItems: 'center', fontSize: 'inherit' }}>
          {icon}
        </Box>
      )}

      <Typography
        component="span"
        sx={{
          fontSize: 'inherit',
          fontWeight: 'inherit',
          color: 'inherit',
          letterSpacing: 'inherit',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};
