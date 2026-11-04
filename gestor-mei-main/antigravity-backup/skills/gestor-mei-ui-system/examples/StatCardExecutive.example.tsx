import React from 'react';
import { Card, Box, Typography, Chip, Tooltip } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

interface StatCardExecutiveProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconColor?: string;
  iconBgColor?: string;
  trend?: {
    value: string;
    isPositive: boolean;
    periodText?: string;
  };
  subtitle?: string;
  tooltipText?: string;
}

export const StatCardExecutive: React.FC<StatCardExecutiveProps> = ({
  title,
  value,
  icon,
  iconColor = '#1976D2',
  iconBgColor = 'rgba(25, 118, 210, 0.08)',
  trend,
  subtitle,
  tooltipText,
}) => {
  const cardContent = (
    <Card
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
        bgcolor: 'background.paper',
        boxShadow: '0 2px 8px rgba(7, 25, 51, 0.04)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: '0 8px 24px rgba(7, 25, 51, 0.08)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontSize: '0.72rem',
          }}
        >
          {title}
        </Typography>
        <Box
          sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: iconBgColor,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>

      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          mb: 1,
          fontFeatureSettings: '"tnum"',
        }}
      >
        {value}
      </Typography>

      {(trend || subtitle) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {trend && (
            <Chip
              size="small"
              icon={
                trend.isPositive ? (
                  <TrendingUp sx={{ fontSize: '14px !important', color: 'success.main' }} />
                ) : (
                  <TrendingDown sx={{ fontSize: '14px !important', color: 'error.main' }} />
                )
              }
              label={trend.value}
              sx={{
                height: 22,
                fontWeight: 700,
                fontSize: '0.7rem',
                bgcolor: trend.isPositive ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)',
                color: trend.isPositive ? 'success.main' : 'error.main',
                border: 'none',
              }}
            />
          )}
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {trend?.periodText || subtitle}
          </Typography>
        </Box>
      )}
    </Card>
  );

  return tooltipText ? (
    <Tooltip title={tooltipText} arrow>
      {cardContent}
    </Tooltip>
  ) : (
    cardContent
  );
};

