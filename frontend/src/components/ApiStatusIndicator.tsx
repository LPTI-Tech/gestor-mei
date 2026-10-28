import React, { useState, useEffect, useCallback } from 'react';
import { Chip, Tooltip, Box, Typography } from '@mui/material';
import api from '../services/api';

interface ApiStatusIndicatorProps {
  size?: 'small' | 'medium';
  variant?: 'chip' | 'text';
}

export const ApiStatusIndicator: React.FC<ApiStatusIndicatorProps> = ({
  size = 'small',
  variant = 'chip',
}) => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      setChecking(true);
      const res = await api.get('/health', { timeout: 5000 });
      if (res.status === 200 && res.data?.status === 'ok') {
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setChecking(false);
      setLastCheck(new Date());
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkHealth();

    // Periodic check every 15 seconds
    const interval = setInterval(checkHealth, 15000);

    // Re-check when window regains focus or comes online
    const handleOnline = () => checkHealth();
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleOnline);
    };
  }, [checkHealth]);

  const label = isOnline ? '🟢 Sistema Online' : '🔴 Sistema Offline';
  const tooltipText = isOnline
    ? `Backend e Banco de Dados Conectados${lastCheck ? ` (${lastCheck.toLocaleTimeString()})` : ''}`
    : `Falha na conexão com o servidor${lastCheck ? ` (${lastCheck.toLocaleTimeString()})` : ''}`;

  if (variant === 'text') {
    return (
      <Tooltip title={tooltipText} arrow>
        <Box
          onClick={() => !checking && checkHealth()}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              fontSize: '0.75rem',
              color: isOnline ? 'success.main' : 'error.main',
            }}
          >
            {label}
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={tooltipText} arrow>
      <Chip
        label={label}
        size={size}
        onClick={() => !checking && checkHealth()}
        variant="outlined"
        sx={{
          fontWeight: 700,
          fontSize: '0.75rem',
          cursor: 'pointer',
          borderColor: isOnline ? 'success.main' : 'error.main',
          color: isOnline ? 'success.main' : 'error.main',
          bgcolor: isOnline ? 'rgba(46, 125, 50, 0.08)' : 'rgba(211, 47, 47, 0.08)',
          '&:hover': {
            bgcolor: isOnline ? 'rgba(46, 125, 50, 0.16)' : 'rgba(211, 47, 47, 0.16)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      />
    </Tooltip>
  );
};

