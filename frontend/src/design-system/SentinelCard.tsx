import React from 'react';
import { Paper, PaperProps, styled } from '@mui/material';
import { sentinelTokens } from './tokens';

export interface SentinelCardProps extends PaperProps {
  sentinelVariant?: 'default' | 'master' | 'inset' | 'stat';
  dense?: boolean;
}

export const SentinelCard = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'sentinelVariant' && prop !== 'dense',
})<SentinelCardProps>(({ theme, sentinelVariant = 'default', dense = false }) => {
  const isDark = theme.palette.mode === 'dark';

  const baseStyles = {
    borderRadius: sentinelTokens.shape.card,
    padding: dense ? '12px 14px' : '16px 20px',
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: sentinelTokens.typography.fontFamily,
  };

  if (sentinelVariant === 'master') {
    return {
      ...baseStyles,
      backgroundColor: isDark ? sentinelTokens.colors.master.obsidian : '#FFFFFF',
      border: `1px solid ${isDark ? 'rgba(25, 118, 210, 0.28)' : 'rgba(7, 25, 51, 0.12)'}`,
      borderTop: `2.5px solid ${sentinelTokens.colors.master.accent}`,
      boxShadow: isDark
        ? '0 1px 3px rgba(0, 0, 0, 0.5), 0 0 12px rgba(25, 118, 210, 0.08)'
        : '0 1px 3px rgba(7, 25, 51, 0.04)',
      '&:hover': {
        borderColor: isDark ? 'rgba(25, 118, 210, 0.45)' : 'rgba(25, 118, 210, 0.35)',
      },
    };
  }

  if (sentinelVariant === 'inset') {
    return {
      ...baseStyles,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.02)',
      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}`,
      boxShadow: 'none',
    };
  }

  // Default Sentinel Card: Clean surface with 1px hairline border
  return {
    ...baseStyles,
    backgroundColor: isDark ? sentinelTokens.colors.surfaces.darkPaper : '#FFFFFF',
    border: `1px solid ${isDark ? sentinelTokens.colors.surfaces.darkBorder : sentinelTokens.colors.surfaces.lightBorder}`,
    boxShadow: isDark
      ? '0 1px 2px rgba(0, 0, 0, 0.4)'
      : '0 1px 3px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02)',
    '&:hover': {
      borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.16)',
    },
  };
});
