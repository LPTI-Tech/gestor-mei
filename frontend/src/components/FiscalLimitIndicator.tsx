import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { Landmark, AlertTriangle, ShieldCheck } from 'lucide-react';
import { StatusPill } from './StatusPill';

interface FiscalLimitIndicatorProps {
  faturamentoAcumulado: number;
  limiteAnual?: number;
  anoReferencia?: number;
}

export const FiscalLimitIndicator: React.FC<FiscalLimitIndicatorProps> = ({
  faturamentoAcumulado,
  limiteAnual = 81000,
  anoReferencia = new Date().getFullYear(),
}) => {
  const percentual = Math.min(Math.max((faturamentoAcumulado / limiteAnual) * 100, 0), 100);
  const saldoRestante = Math.max(limiteAnual - faturamentoAcumulado, 0);

  const getStatus = () => {
    if (percentual >= 100) {
      return {
        label: 'Teto Excedido',
        variant: 'error' as const,
        description: 'Faturamento ultrapassou o teto do MEI (R$ 81.000). Necessário desenquadramento.',
        color: '#DC2626',
        icon: <AlertTriangle size={14} strokeWidth={1.75} />,
      };
    }
    if (percentual >= 80) {
      return {
        label: 'Atenção Prudencial',
        variant: 'warning' as const,
        description: 'Faturamento ultrapassou 80% do teto. Consulte seu consultor credenciado LPTI.',
        color: '#D97706',
        icon: <AlertTriangle size={14} strokeWidth={1.75} />,
      };
    }
    return {
      label: 'Regularidade Fiscal',
      variant: 'success' as const,
      description: 'Faturamento acumulado dentro da faixa segura do MEI.',
      color: '#059669',
      icon: <ShieldCheck size={14} strokeWidth={1.75} />,
    };
  };

  const status = getStatus();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2.5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
        boxShadow: (theme) =>
          theme.palette.mode === 'dark'
            ? '0 1px 3px rgba(0, 0, 0, 0.3)'
            : '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Cabeçalho do Indicador */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.08)',
              color: 'primary.main',
              flexShrink: 0,
            }}
          >
            <Landmark size={20} strokeWidth={1.75} />
          </Box>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'text.secondary',
                display: 'block',
              }}
            >
              Limite Anual MEI • {anoReferencia}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                fontSize: '1.05rem',
                lineHeight: 1.2,
                color: 'text.primary',
                letterSpacing: '-0.02em',
              }}
            >
              Teto de Faturamento ({formatCurrency(limiteAnual)})
            </Typography>
          </Box>
        </Box>

        <Tooltip title={status.description} arrow>
          <Box>
            <StatusPill
              label={status.label}
              variant={status.variant}
              pulse={percentual >= 80}
              icon={status.icon}
            />
          </Box>
        </Tooltip>
      </Box>

      {/* Valores em Destaque */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          mb: 1.2,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.35rem', sm: '1.5rem' },
              letterSpacing: '-0.025em',
              fontFeatureSettings: '"tnum"',
              color: 'text.primary',
            }}
          >
            {formatCurrency(faturamentoAcumulado)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.74rem' }}>
            Consumido até o momento
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              fontSize: '1rem',
              color: percentual >= 100 ? 'error.main' : 'primary.main',
              fontFeatureSettings: '"tnum"',
            }}
          >
            {percentual.toFixed(1)}%
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.74rem' }}>
            Restante: {formatCurrency(saldoRestante)}
          </Typography>
        </Box>
      </Box>

      {/* Barra de Progresso Slim com Gradiente e Marcador de 80% */}
      <Box sx={{ position: 'relative', width: '100%', mb: 1.5, pt: 0.5 }}>
        <Box
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${percentual}%`,
              borderRadius: 3,
              background:
                percentual >= 100
                  ? 'linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)'
                  : percentual >= 80
                  ? 'linear-gradient(90deg, #3B82F6 0%, #F59E0B 100%)'
                  : 'linear-gradient(90deg, #2563EB 0%, #10B981 100%)',
              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </Box>

        {/* Marcador Vertical de 80% (Limite Prudencial R$ 64.800) */}
        <Box
          sx={{
            position: 'absolute',
            left: '80%',
            top: 2,
            bottom: -2,
            width: '2px',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(15, 23, 42, 0.3)',
            pointerEvents: 'none',
          }}
        />
      </Box>

      {/* Legenda Informativa Inferior */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.72rem',
          color: 'text.secondary',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            sx={{
              width: 8,
              height: 2,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(15, 23, 42, 0.3)',
            }}
          />
          <span>Alerta Prudencial: 80% ({formatCurrency(limiteAnual * 0.8)})</span>
        </Box>

        <Typography variant="caption" sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 500 }}>
          Base legal: Art. 18-A da LC nº 123/2006
        </Typography>
      </Box>
    </Box>
  );
};
