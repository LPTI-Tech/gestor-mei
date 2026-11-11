import React from 'react';
import { Box, BoxProps, styled, keyframes } from '@mui/material';
import { sentinelTokens } from './tokens';

export type SentinelBadgeVariant =
  | 'master'
  | 'owner'
  | 'consultor'
  | 'operator'
  | 'active'
  | 'warning'
  | 'error'
  | 'info'
  | 'default';

export interface SentinelBadgeProps extends BoxProps {
  sentinelVariant?: SentinelBadgeVariant;
  withDot?: boolean;
  pulse?: boolean;
  size?: 'small' | 'medium';
  label?: React.ReactNode;
}

const pulseAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.7);
    opacity: 1;
  }
  70% {
    box-shadow: 0 0 0 6px rgba(25, 118, 210, 0);
    opacity: 0.7;
  }
  100% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
    opacity: 1;
  }
`;

const getVariantStyles = (variant: SentinelBadgeVariant, isDark: boolean) => {
  switch (variant) {
    case 'master':
      return {
        bg: isDark ? 'rgba(79, 70, 229, 0.18)' : 'rgba(79, 70, 229, 0.08)',
        border: isDark ? 'rgba(99, 102, 241, 0.5)' : '#4F46E5',
        text: isDark ? '#A5B4FC' : '#4338CA',
        dot: '#6366F1',
      };
    case 'owner':
      return {
        bg: isDark ? 'rgba(16, 124, 65, 0.18)' : 'rgba(16, 124, 65, 0.08)',
        border: isDark ? 'rgba(34, 197, 94, 0.5)' : '#107C41',
        text: isDark ? '#86EFAC' : '#0F5132',
        dot: '#107C41',
      };
    case 'consultor':
      return {
        bg: isDark ? 'rgba(139, 92, 246, 0.18)' : 'rgba(139, 92, 246, 0.08)',
        border: isDark ? 'rgba(167, 139, 250, 0.5)' : '#8B5CF6',
        text: isDark ? '#C4B5FD' : '#6D28D9',
        dot: '#8B5CF6',
      };
    case 'operator':
      return {
        bg: isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.08)',
        border: isDark ? 'rgba(148, 163, 184, 0.4)' : '#64748B',
        text: isDark ? '#CBD5E1' : '#334155',
        dot: '#64748B',
      };
    case 'active':
      return {
        bg: isDark ? 'rgba(16, 124, 65, 0.18)' : 'rgba(16, 124, 65, 0.08)',
        border: isDark ? 'rgba(34, 197, 94, 0.45)' : '#107C41',
        text: isDark ? '#86EFAC' : '#0F5132',
        dot: '#22C55E',
      };
    case 'warning':
      return {
        bg: isDark ? 'rgba(217, 119, 6, 0.18)' : 'rgba(217, 119, 6, 0.08)',
        border: isDark ? 'rgba(245, 158, 11, 0.45)' : '#D97706',
        text: isDark ? '#FCD34D' : '#92400E',
        dot: '#F59E0B',
      };
    case 'error':
      return {
        bg: isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.08)',
        border: isDark ? 'rgba(248, 113, 113, 0.45)' : '#DC2626',
        text: isDark ? '#FCA5A5' : '#991B1B',
        dot: '#EF4444',
      };
    case 'info':
      return {
        bg: isDark ? 'rgba(2, 132, 199, 0.18)' : 'rgba(2, 132, 199, 0.08)',
        border: isDark ? 'rgba(56, 189, 248, 0.45)' : '#0284C7',
        text: isDark ? '#7DD3FC' : '#0369A1',
        dot: '#0284C7',
      };
    case 'default':
    default:
      return {
        bg: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
        border: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
        text: isDark ? '#E2E8F0' : '#475569',
        dot: '#94A3B8',
      };
  }
};

const BadgeRoot = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== 'sentinelVariant' && prop !== 'withDot' && prop !== 'pulse' && prop !== 'size',
})<{
  sentinelVariant: SentinelBadgeVariant;
  withDot?: boolean;
  pulse?: boolean;
  size?: 'small' | 'medium';
}>(({ theme, sentinelVariant, size = 'small' }) => {
  const isDark = theme.palette.mode === 'dark';
  const v = getVariantStyles(sentinelVariant, isDark);

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    borderRadius: sentinelTokens.shape.pill,
    backgroundColor: v.bg,
    border: `1px solid ${v.border}`,
    color: v.text,
    fontFamily: sentinelTokens.typography.fontFamily,
    fontSize: size === 'small' ? '0.6875rem' : '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    padding: size === 'small' ? '2px 8px' : '4px 10px',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    lineHeight: 1.35,
    ...sentinelTokens.typography.tabularNums,
  };
});

const IndicatorDot = styled('span')<{ dotColor: string; pulse?: boolean }>(
  ({ dotColor, pulse }) => ({
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: dotColor,
    display: 'inline-block',
    animation: pulse ? `${pulseAnimation} 1.8s infinite ease-out` : 'none',
  })
);

export const SentinelBadge: React.FC<SentinelBadgeProps> = ({
  sentinelVariant = 'default',
  withDot = false,
  pulse = false,
  size = 'small',
  label,
  children,
  ...props
}) => {
  const content = label !== undefined ? label : children;
  const isDark = false; // styled root handles theme
  const v = getVariantStyles(sentinelVariant, isDark);

  return (
    <BadgeRoot sentinelVariant={sentinelVariant} size={size} {...props}>
      {(withDot || sentinelVariant === 'master' || pulse) && (
        <IndicatorDot dotColor={v.dot} pulse={pulse || sentinelVariant === 'master'} />
      )}
      {content}
    </BadgeRoot>
  );
};
