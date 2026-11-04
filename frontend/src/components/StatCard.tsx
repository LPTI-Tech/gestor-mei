import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = '#1976D2',
  trend,
  trendType = 'neutral',
  onClick,
}) => {
  return (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 3,
        border: '1px solid',
        borderColor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(7, 25, 51, 0.07)',
        bgcolor: 'background.paper',
        boxShadow: '0 1px 3px rgba(7, 25, 51, 0.04), 0 1px 2px rgba(7, 25, 51, 0.02)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px -4px rgba(7, 25, 51, 0.08), 0 4px 8px -2px rgba(7, 25, 51, 0.03)',
          borderColor: onClick
            ? (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.16)'
                  : 'rgba(25, 118, 210, 0.3)'
            : undefined,
          '& .stat-icon-bubble': {
            transform: 'scale(1.05)',
          },
        },
      }}
    >
      <CardContent
        sx={{
          p: 2.5,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          '&:last-child': { pb: 2.5 },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'text.secondary',
              lineHeight: 1.3,
            }}
          >
            {title}
          </Typography>
          <Box
            className="stat-icon-bubble"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 42,
              height: 42,
              borderRadius: 2.5,
              backgroundColor: `${color}14`,
              color: color,
              flexShrink: 0,
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '& svg': {
                fontSize: '1.35rem',
              },
            }}
          >
            {icon}
          </Box>
        </Box>

        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.45rem', sm: '1.6rem', md: '1.75rem' },
            letterSpacing: '-0.025em',
            fontFeatureSettings: '"tnum"',
            lineHeight: 1.15,
            color: 'text.primary',
            wordBreak: 'break-word',
            mb: 1,
          }}
        >
          {value}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            flexWrap: 'wrap',
            mt: 'auto',
            pt: 0.5,
          }}
        >
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              {subtitle}
            </Typography>
          )}

          {trend && (
            <Chip
              label={trend}
              size="small"
              sx={{
                fontWeight: 800,
                fontSize: '0.7rem',
                height: 22,
                borderRadius: 1.5,
                bgcolor:
                  trendType === 'positive'
                    ? 'rgba(46, 125, 50, 0.08)'
                    : trendType === 'negative'
                    ? 'rgba(211, 47, 47, 0.08)'
                    : 'rgba(7, 25, 51, 0.04)',
                color:
                  trendType === 'positive'
                    ? '#2E7D32'
                    : trendType === 'negative'
                    ? '#D32F2F'
                    : 'text.secondary',
                border: '1px solid',
                borderColor:
                  trendType === 'positive'
                    ? 'rgba(46, 125, 50, 0.2)'
                    : trendType === 'negative'
                    ? 'rgba(211, 47, 47, 0.2)'
                    : 'rgba(7, 25, 51, 0.08)',
              }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
