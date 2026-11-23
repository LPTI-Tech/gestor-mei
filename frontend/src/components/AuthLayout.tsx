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
} from '@mui/icons-material';
import { ApiStatusIndicator } from './ApiStatusIndicator';
import { ConstellationBackground } from './ConstellationBackground';
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
        bgcolor: '#030712',
        background: '#030712',
        color: '#ffffff',
        py: { xs: 0.8, md: 1 },
        px: { xs: 2, sm: 3 },
      }}
    >
      {/* ==================================================================== */}
      {/* FUNDO TECNOLÓGICO PREMIUM: CONSTELAÇÃO DINÂMICA & AURORAS CANVAS     */}
      {/* ==================================================================== */}
      <ConstellationBackground />

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
          zIndex: 10,
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
          zIndex: 10,
          my: 'auto',
        }}
      >
        {/* CONTAINER DA LOGO COM GLASS PRÓPRIO E HALO TECNOLÓGICO */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 380,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            mb: 1.5,
            py: 1.2,
            px: 2,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.36), inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
            textAlign: 'center',
          }}
        >
          {/* HALO TECNOLÓGICO SUAVE ATRÁS DA LOGO (GLOW RADIAL CIANO) */}
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 220,
              height: 100,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.22) 0%, rgba(56, 189, 248, 0) 70%)',
              filter: 'blur(14px)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          <Box
            component="img"
            src={logoOficial}
            alt="Logo Oficial Gestor MEI"
            sx={{
              width: { xs: 130, sm: 135, md: 140 },
              height: 'auto',
              display: 'block',
              margin: '0 auto',
              filter: 'drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5))',
              mb: 0.5,
              position: 'relative',
              zIndex: 1,
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
              position: 'relative',
              zIndex: 1,
            }}
          >
            A gestão completa do seu negócio MEI
          </Typography>
        </Box>

        {/* CARD CENTRAL DE LOGIN — GLASS PREMIUM REFINADO */}
        <Card
          elevation={0}
          sx={{
            width: '100%',
            borderRadius: '16px',
            border: '1px solid rgba(56, 189, 248, 0.28)',
            background: 'rgba(30, 41, 59, 0.82)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 24px 0 rgba(56, 189, 248, 0.12), inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 10,
          }}
        >
          {/* LEVE GRADIENTE INTERNO NO TOPO DO CARD PARA DESTAQUE DA SEÇÃO */}
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 72,
              background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.12) 0%, rgba(56, 189, 248, 0) 100%)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } }, position: 'relative', zIndex: 1 }}>
            {/* Título & Subtítulo Interno */}
            <Box sx={{ mb: 1.5, textAlign: 'left' }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  letterSpacing: '-0.02em',
                  color: '#F8FAFC',
                  lineHeight: 1.2,
                }}
              >
                {title}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#94A3B8',
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
          zIndex: 10,
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
