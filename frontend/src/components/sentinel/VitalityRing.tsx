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
  Activity,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { StatusPill } from '../StatusPill';

export interface VitalityRingProps {
  /**
   * Pontuação global de saúde do negócio de 0 a 100
   */
  score: number;
  /**
   * Diâmetro do anel em pixels (padrão: 130)
   */
  size?: number;
  /**
   * Espessura da linha do anel (padrão: 10)
   */
  strokeWidth?: number;
  /**
   * Margem líquida real de lucro do MEI (ex: 34 para 34%), opcional
   */
  margemLucro?: number;
  /**
   * Rótulo opcional para substituir a classificação automática
   */
  statusLabel?: string;
  /**
   * Ativa efeito de pulso e brilho vital no anel
   */
  pulse?: boolean;
  /**
   * Exibe o card de diagnóstico textual logo abaixo do mostrador
   */
  showDiagnosis?: boolean;
  /**
   * Título descritivo exibido acima do anel
   */
  title?: string;
  /**
   * Ação disparada ao clicar no mostrador
   */
  onClick?: () => void;
  /**
   * Estilizações customizadas adicionais
   */
  sx?: SxProps<Theme>;
}

export const VitalityRing: React.FC<VitalityRingProps> = ({
  score,
  size = 130,
  strokeWidth = 10,
  margemLucro,
  statusLabel,
  pulse = false,
  showDiagnosis = true,
  title = 'Vitalidade do Negócio',
  onClick,
  sx,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Normalização segura do score
  const safeScore = Math.min(Math.max(Math.round(score || 0), 0), 100);

  // Classificação semântica do score Sentinel
  const getClassification = () => {
    if (safeScore >= 85) {
      return {
        label: statusLabel || 'Excelente',
        pillVariant: 'success' as const,
        color: '#10B981',
        secondaryColor: '#059669',
        glow: 'rgba(16, 185, 129, 0.35)',
        icon: <CheckCircle2 size={16} strokeWidth={2.2} />,
        shortDesc: 'Operação robusta com margem sólida e obrigações 100% regulares.',
      };
    }
    if (safeScore >= 70) {
      return {
        label: statusLabel || 'Saudável',
        pillVariant: 'success' as const,
        color: '#059669',
        secondaryColor: '#10B981',
        glow: 'rgba(5, 150, 105, 0.25)',
        icon: <Activity size={16} strokeWidth={2} />,
        shortDesc: 'Negócio lucrativo com fluxo constante e baixo risco fiscal.',
      };
    }
    if (safeScore >= 40) {
      return {
        label: statusLabel || 'Atenção',
        pillVariant: 'warning' as const,
        color: '#F59E0B',
        secondaryColor: '#D97706',
        glow: 'rgba(245, 158, 11, 0.3)',
        icon: <AlertTriangle size={16} strokeWidth={2} />,
        shortDesc: 'Custos de mercadorias ou prazos de DAS exigem atenção preventiva.',
      };
    }
    return {
      label: statusLabel || 'Crítico',
      pillVariant: 'error' as const,
      color: '#EF4444',
      secondaryColor: '#DC2626',
      glow: 'rgba(239, 68, 68, 0.35)',
      icon: <AlertCircle size={16} strokeWidth={2} />,
      shortDesc: 'Despesas superiores às entradas ou guias tributárias pendentes.',
    };
  };

  const status = getClassification();

  // Geometria matemática do anel SVG
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  const gradientId = `vitality-grad-${Math.floor(score)}-${size}`;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease',
        '&:hover': onClick ? { transform: 'scale(1.02)' } : {},
        ...sx,
      }}
    >
      {/* Título Superior */}
      {title && (
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'text.secondary',
            mb: 1.5,
          }}
        >
          {title}
        </Typography>
      )}

      {/* Mostrador Circular (SVG Ring) */}
      <Box
        sx={{
          position: 'relative',
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={status.color} />
              <stop offset="100%" stopColor={status.secondaryColor} />
            </linearGradient>
            {pulse && (
              <filter id={`glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            )}
          </defs>

          {/* Trilha do Fundo (Inativa) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)'}
            strokeWidth={strokeWidth}
          />

          {/* Anel de Progresso Ativo */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter={pulse ? `url(#glow-${gradientId})` : undefined}
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </svg>

        {/* Centro do Anel: Valor Numérico e Ícone */}
        <Box
          sx={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="h3"
            fontWeight={900}
            sx={{
              fontSize: size > 120 ? '2.2rem' : '1.75rem',
              letterSpacing: '-0.03em',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
              color: 'text.primary',
            }}
          >
            {safeScore}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              color: 'text.secondary',
              fontSize: '0.68rem',
              letterSpacing: '0.04em',
              mt: 0.2,
            }}
          >
            DE 100
          </Typography>
        </Box>
      </Box>

      {/* Classificação e Diagnóstico Logo Abaixo */}
      {showDiagnosis && (
        <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.8 }}>
          <StatusPill
            label={status.label}
            variant={status.pillVariant}
            size="small"
            icon={status.icon}
            pulse={pulse}
          />

          {/* Margem Real (Termômetro de Lucratividade) */}
          {margemLucro !== undefined && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                px: 1.2,
                py: 0.3,
                borderRadius: '8px',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)',
                border: '1px solid',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
              }}
            >
              <TrendingUp size={13} strokeWidth={2.2} color={status.color} />
              <Typography variant="caption" sx={{ fontWeight: 800, fontFeatureSettings: '"tnum"', color: 'text.secondary', fontSize: '0.72rem' }}>
                Margem Real: <strong style={{ color: status.color }}>{margemLucro.toFixed(1)}%</strong>
              </Typography>
            </Box>
          )}

          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.75rem',
              maxWidth: 220,
              lineHeight: 1.3,
            }}
          >
            {status.shortDesc}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
