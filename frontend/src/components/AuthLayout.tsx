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
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        overflowX: 'hidden',
        // Fundo 100% da tela: Experiência única em Azul Sentinel escuro com profundidade
        bgcolor: '#071933',
        background: `
          radial-gradient(ellipse 90% 80% at 50% -20%, rgba(14, 165, 233, 0.24) 0%, transparent 60%),
          radial-gradient(ellipse 70% 50% at 90% 90%, rgba(16, 185, 129, 0.16) 0%, transparent 55%),
          radial-gradient(ellipse 60% 40% at 10% 80%, rgba(2, 132, 199, 0.18) 0%, transparent 50%),
          linear-gradient(160deg, #071933 0%, #0a2540 40%, #0d3257 75%, #071933 100%)
        `,
        color: '#ffffff',
        py: { xs: 3, md: 4 },
        px: { xs: 2, sm: 3, md: 4 },
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
          mb: { xs: 2, md: 3 },
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
              fontSize: '0.84rem',
              borderRadius: 2,
              px: 1.5,
              py: 0.6,
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
            px: 1.5,
            py: 0.5,
            borderRadius: 3,
            bgcolor: 'rgba(10, 37, 64, 0.65)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
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
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: 2,
          my: 'auto',
        }}
      >
        {/* PARTE 1 - ITEM 3: A LOGO VOLTA A SER O PRINCIPAL DESTAQUE VISUAL */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: { xs: 2.5, md: 3 },
            textAlign: 'center',
          }}
        >
          {/* Caixa de Acrílico Iluminada para a Logo */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: { xs: 1.8, sm: 2.2 },
              borderRadius: 4,
              bgcolor: 'rgba(7, 25, 51, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              boxShadow: `
                0 16px 36px -8px rgba(0, 0, 0, 0.6),
                0 0 24px -4px rgba(16, 185, 129, 0.22),
                inset 0 1px 0 rgba(255, 255, 255, 0.12)
              `,
              mb: 1.8,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `
                  0 20px 44px -8px rgba(0, 0, 0, 0.7),
                  0 0 32px -4px rgba(16, 185, 129, 0.3),
                  inset 0 1px 0 rgba(255, 255, 255, 0.18)
                `,
              },
            }}
          >
            <Box
              component="img"
              src={logoOficial}
              alt="Logo Oficial Gestor MEI"
              sx={{
                width: { xs: 190, sm: 220, md: 235 },
                height: 'auto',
                display: 'block',
                filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35))',
              }}
            />
          </Box>

          <Typography
            variant="h6"
            sx={{
              color: '#38bdf8',
              fontWeight: 700,
              fontSize: { xs: '0.95rem', sm: '1.05rem' },
              letterSpacing: '-0.01em',
              lineHeight: 1.3,
            }}
          >
            A gestão do seu negócio ficou simples.
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: '#94a3b8',
              fontSize: '0.78rem',
              mt: 0.4,
              display: 'block',
            }}
          >
            Vendas, estoque, compras, financeiro e obrigações fiscais em um único lugar.
          </Typography>
        </Box>

        {/* CARD CENTRAL DE LOGIN (GLASSMORPHISM PREMIUM REDUZIDO EM ALTURA) */}
        <Card
          elevation={0}
          sx={{
            width: '100%',
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            bgcolor: 'rgba(10, 37, 64, 0.78)',
            backdropFilter: 'blur(20px)',
            boxShadow: `
              0 24px 60px -12px rgba(0, 0, 0, 0.7),
              0 0 32px -8px rgba(2, 132, 199, 0.18),
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `,
            overflow: 'hidden',
          }}
        >
          {/* Faixa Superior de Proteção e Blindagem RBAC */}
          <Box
            sx={{
              py: 1,
              px: { xs: 2.5, sm: 3 },
              bgcolor: 'rgba(2, 132, 199, 0.14)',
              borderBottom: '1px solid rgba(56, 189, 248, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: '#38bdf8',
                fontWeight: 700,
                fontSize: '0.78rem',
                letterSpacing: '0.01em',
                display: 'flex',
                alignItems: 'center',
                gap: 0.6,
              }}
            >
              {badgeText}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#94a3b8',
                fontWeight: 600,
                fontSize: '0.72rem',
              }}
            >
              {securitySubtext}
            </Typography>
          </Box>

          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            {/* Título & Subtítulo Interno */}
            <Box sx={{ mb: 2, textAlign: 'left' }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.25rem', sm: '1.4rem' },
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                }}
              >
                {title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#94a3b8',
                  fontSize: '0.84rem',
                  mt: 0.3,
                }}
              >
                {subtitle}
              </Typography>
            </Box>

            {children}
          </CardContent>
        </Card>

        {/* Benefícios em Pílulas Sutis */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 1.2, sm: 2 },
            mt: 2.5,
            flexWrap: 'wrap',
          }}
        >
          {['Vendas e PDV', 'Estoque e Compras', 'Gestão Fiscal MEI'].map((item) => (
            <Box
              key={item}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                px: 1.2,
                py: 0.4,
                borderRadius: 2,
                bgcolor: 'rgba(10, 37, 64, 0.45)',
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  bgcolor: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.62rem',
                  fontWeight: 900,
                }}
              >
                ✓
              </Box>
              <Typography sx={{ color: '#cbd5e1', fontSize: '0.74rem', fontWeight: 600 }}>
                {item}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ==================================================================== */}
      {/* PARTE 1 - ITEM 4: RODAPÉ INSTITUCIONAL DE ALTA CREDIBILIDADE          */}
      {/* ==================================================================== */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 960,
          position: 'relative',
          zIndex: 2,
          mt: { xs: 3, md: 4 },
          pt: 2,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        {/* Badges de Confiança */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 1.5, sm: 3 },
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
            <CheckCircle sx={{ fontSize: 16, color: '#10b981' }} />
            <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.78rem' }}>
              Login Seguro
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
            <CheckCircle sx={{ fontSize: 16, color: '#10b981' }} />
            <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.78rem' }}>
              Microsoft e Google
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
            <CheckCircle sx={{ fontSize: 16, color: '#10b981' }} />
            <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.78rem' }}>
              Proteção de Dados (LGPD)
            </Typography>
          </Box>
        </Box>

        {/* Informações Institucionais Finais */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.2,
            color: '#64748b',
            fontSize: '0.72rem',
            flexWrap: 'wrap',
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
