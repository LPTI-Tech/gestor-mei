import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Shield,
  VpnKey,
  VerifiedUser,
} from '@mui/icons-material';
import { ApiStatusIndicator } from './ApiStatusIndicator';
import logoOficial from '../assets/branding/gestor-mei-logo-tight.png';

export interface AuthLayoutProps {
  title: string;
  subtitle: string;
  badgeText?: string;
  securitySubtext?: string;
  backTo?: string;
  backText?: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  badgeText = '🔒 Seus dados protegidos',
  securitySubtext = '🔒 Controle seguro de acesso',
  backTo,
  backText = 'Voltar para o Login',
  children,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box
      sx={{
        height: '100vh',
        minHeight: '100vh',
        maxHeight: '100vh',
        width: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        overflowX: 'hidden',
        overflowY: { xs: 'auto', md: 'hidden' }, // Eliminação total de rolagem em desktops e laptops 1366x768
        boxSizing: 'border-box',
        // Fundo 100% da tela: Experiência única em Azul Sentinel escuro com profundidade
        bgcolor: '#071933',
        background: `
          radial-gradient(ellipse 90% 80% at 50% -20%, rgba(14, 165, 233, 0.24) 0%, transparent 60%),
          radial-gradient(ellipse 70% 50% at 90% 90%, rgba(16, 185, 129, 0.16) 0%, transparent 55%),
          radial-gradient(ellipse 60% 40% at 10% 80%, rgba(2, 132, 199, 0.18) 0%, transparent 50%),
          linear-gradient(160deg, #071933 0%, #0a2540 40%, #0d3257 75%, #071933 100%)
        `,
        color: '#ffffff',
        py: { xs: 0.8, md: 1 },
        px: { xs: 2, sm: 3 },
      }}
    >
      {/* ==================================================================== */}
      {/* MALHA TECNOLÓGICA & REDE DE CONEXÕES DIGITAIS (SVG OVERLAY)           */}
      {/* ==================================================================== */}
      <Box
        component="svg"
        aria-hidden="true"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.45,
        }}
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="sentinel-tech-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="rgba(56, 189, 248, 0.08)"
              strokeWidth="1"
            />
            <circle cx="60" cy="0" r="1.5" fill="rgba(56, 189, 248, 0.25)" />
            <circle cx="0" cy="60" r="1.5" fill="rgba(16, 185, 129, 0.25)" />
          </pattern>
          <linearGradient id="circ-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="circ-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Grade de Malha Tecnológica */}
        <rect width="100%" height="100%" fill="url(#sentinel-tech-grid)" />

        {/* Linhas de Circuitos Discretos & Nós de Rede */}
        <path
          d="M 120 180 L 320 180 L 440 300 L 700 300 L 780 220"
          stroke="url(#circ-grad-1)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <circle cx="120" cy="180" r="3" fill="#38bdf8" />
        <circle cx="440" cy="300" r="3.5" fill="#10b981" />
        <circle cx="780" cy="220" r="2.5" fill="#38bdf8" />

        <path
          d="M 960 120 L 1120 280 L 1320 280"
          stroke="url(#circ-grad-2)"
          strokeWidth="1.5"
          strokeDasharray="6 4"
        />
        <circle cx="960" cy="120" r="2.5" fill="#10b981" />
        <circle cx="1120" cy="280" r="4" fill="#38bdf8" />
        <circle cx="1320" cy="280" r="3" fill="#10b981" />

        <path
          d="M 180 720 L 360 720 L 480 600 L 640 600"
          stroke="url(#circ-grad-1)"
          strokeWidth="1.2"
        />
        <circle cx="180" cy="720" r="2.5" fill="#10b981" />
        <circle cx="480" cy="600" r="3.5" fill="#38bdf8" />

        <path
          d="M 1020 780 L 1200 600 L 1380 600"
          stroke="url(#circ-grad-2)"
          strokeWidth="1.2"
        />
        <circle cx="1020" cy="780" r="3" fill="#38bdf8" />
        <circle cx="1200" cy="600" r="3" fill="#10b981" />

        {/* Partículas Suaves de Profundidade */}
        <circle cx="280" cy="140" r="1.5" fill="#38bdf8" opacity="0.6" />
        <circle cx="620" cy="160" r="2" fill="#10b981" opacity="0.5" />
        <circle cx="860" cy="340" r="1.5" fill="#38bdf8" opacity="0.5" />
        <circle cx="200" cy="480" r="2" fill="#38bdf8" opacity="0.4" />
        <circle cx="1280" cy="420" r="2.5" fill="#10b981" opacity="0.6" />
        <circle cx="820" cy="720" r="1.5" fill="#38bdf8" opacity="0.4" />
      </Box>

      {/* ==================================================================== */}
      {/* TOPO: BARRA DE NAVEGAÇÃO & STATUS DO SISTEMA                          */}
      {/* ==================================================================== */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 1180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 2,
          mb: 0.5,
        }}
      >
        {backTo ? (
          <Button
            size="small"
            onClick={() => navigate(backTo)}
            startIcon={<ArrowBack fontSize="small" />}
            sx={{
              color: 'rgba(255, 255, 255, 0.75)',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.76rem',
              borderRadius: 2,
              px: 1,
              py: 0.3,
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              '&:hover': {
                color: '#ffffff',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
            {backText}
          </Button>
        ) : (
          <Box />
        )}

        {/* 🟢 Sistema Online com Destaque Discreto e Elegante */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: 1,
            py: 0.2,
            borderRadius: 3,
            bgcolor: 'rgba(10, 37, 64, 0.65)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          }}
        >
          <ApiStatusIndicator variant="text" size="small" />
        </Box>
      </Box>

      {/* ==================================================================== */}
      {/* CORPO CENTRAL: LOGO PRINCIPAL + CARD GLASSMORPHISM                   */}
      {/* ==================================================================== */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 430,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 2,
          my: 'auto',
        }}
      >
        {/* LOGO TOTALMENTE LIVRE — SEM CAIXA */}
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1.5,
            textAlign: 'center',
          }}
        >
          <Box
            component="img"
            src={logoOficial}
            alt="Logo Oficial Gestor MEI"
            sx={{
              width: { xs: 130, sm: 135, md: 140 },
              height: 'auto',
              display: 'block',
              margin: '0 auto',
              filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4))',
              mb: 0.6,
            }}
          />

          <Typography
            sx={{
              color: '#38bdf8',
              fontWeight: 600,
              fontSize: '0.74rem',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
              textAlign: 'center',
            }}
          >
            A gestão completa do seu negócio MEI
          </Typography>
        </Box>

        {/* CARD CENTRAL DE LOGIN — LOGIN 2.3: Superfície Porcelana #F7F6F5 */}
        <Card
          elevation={0}
          sx={{
            width: '100%',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            background: '#F7F6F5',
            backdropFilter: 'none',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.60)',
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
            {/* Título & Subtítulo Interno */}
            <Box sx={{ mb: 1.5, textAlign: 'left' }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  letterSpacing: '-0.02em',
                  color: '#0F172A',
                  lineHeight: 1.2,
                }}
              >
                {title}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#64748b',
                  fontSize: '0.78rem',
                }}
              >
                {subtitle}
              </Typography>
            </Box>

            {children}
          </CardContent>
        </Card>
      </Box>

      {/* ==================================================================== */}
      {/* PARTE 1 - ITEM 4: RODAPÉ INSTITUCIONAL ULTRA COMPACTO EM LINHA ÚNICA   */}
      {/* ==================================================================== */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 900,
          position: 'relative',
          zIndex: 2,
          mt: 0.6,
          pt: 0.6,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: { xs: 1.5, sm: 2.5 },
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
          <CheckCircle sx={{ fontSize: 13, color: '#10b981' }} />
          <Typography sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.68rem' }}>
            Login Seguro (LGPD)
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
          <CheckCircle sx={{ fontSize: 13, color: '#10b981' }} />
          <Typography sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.68rem' }}>
            Google e Microsoft
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.8,
            color: '#64748b',
            fontSize: '0.66rem',
          }}
        >
          <span>Gestor MEI © 2026</span>
          <span>•</span>
          <span style={{ color: '#94a3b8', fontWeight: 600 }}>LPTI Tech</span>
          <span>•</span>
          <span style={{ color: '#38bdf8', fontWeight: 600 }}>v1.4.7</span>
        </Box>
      </Box>
    </Box>
  );
};

export default AuthLayout;
