import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
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
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        bgcolor: isDark ? '#070d18' : '#f8fafc',
      }}
    >
      {/* ==================================================================== */}
      {/* LADO ESQUERDO: BRANDING INSTITUCIONAL & MOCKUP SENTINEL (DESKTOP)   */}
      {/* ==================================================================== */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: { md: '48%', lg: '45%' },
          minHeight: '100vh',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { md: 4, lg: 5 },
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #071933 0%, #0d2847 40%, #0a1f38 75%, #051326 100%)',
          color: '#ffffff',
          boxShadow: 'inset -1px 0 0 rgba(255, 255, 255, 0.08)',
          '::before': {
            content: '""',
            position: 'absolute',
            top: '-20%',
            left: '-20%',
            width: '140%',
            height: '140%',
            background: 'radial-gradient(circle at 25% 25%, rgba(2, 132, 199, 0.22) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(14, 165, 233, 0.12) 0%, transparent 45%)',
            pointerEvents: 'none',
          },
        }}
      >
        {/* Cabeçalho do Lado Esquerdo */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            {/* Logo Oficial com Container Elegante */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                p: 1.2,
                borderRadius: 3,
                bgcolor: 'rgba(5, 19, 38, 0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
              }}
            >
              <Box
                component="img"
                src={logoOficial}
                alt="Logo Oficial Gestor MEI"
                sx={{
                  width: { md: 155, lg: 175 },
                  height: 'auto',
                  display: 'block',
                }}
              />
            </Box>
          </Box>

          {/* ALTERAÇÃO 1: TÍTULO, SUBTÍTULO, DESCRIÇÃO E BENEFÍCIOS */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              fontSize: { md: '1.85rem', lg: '2.2rem' },
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              mb: 1,
            }}
          >
            GESTOR MEI
          </Typography>

          <Typography
            variant="h6"
            sx={{
              color: '#38bdf8',
              fontSize: { md: '1.1rem', lg: '1.25rem' },
              fontWeight: 700,
              lineHeight: 1.35,
              mb: 1.5,
            }}
          >
            A gestão do seu negócio ficou simples.
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: '#94a3b8',
              fontSize: { md: '0.9rem', lg: '0.96rem' },
              lineHeight: 1.55,
              maxWidth: 460,
              mb: 2.5,
            }}
          >
            Controle vendas, estoque, compras, financeiro e obrigações fiscais em um único lugar.
          </Typography>

          {/* Benefícios */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
            {[
              'Vendas e PDV',
              'Estoque e Compras',
              'Gestão Fiscal MEI',
            ].map((beneficio) => (
              <Box key={beneficio} sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    bgcolor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </Box>
                <Typography sx={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.92rem' }}>
                  {beneficio}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ALTERAÇÃO 2: MOCKUP DISCRETO DO DASHBOARD SENTINEL */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            my: { md: 2, lg: 2.5 },
            borderRadius: 3.5,
            p: 2.2,
            bgcolor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 12px 32px -8px rgba(0, 0, 0, 0.45)',
            opacity: 0.92,
          }}
        >
          {/* Header da Mini Janela */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1.8,
              pb: 1,
              borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444', opacity: 0.7 }} />
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b', opacity: 0.7 }} />
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', opacity: 0.7 }} />
              <Typography
                variant="caption"
                sx={{ ml: 1, color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.02em' }}
              >
                Dashboard Sentinel • Visão Geral
              </Typography>
            </Box>
            <Chip
              label="Tempo Real"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.64rem',
                fontWeight: 700,
                bgcolor: 'rgba(16, 185, 129, 0.12)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 1.5,
              }}
            />
          </Box>

          {/* Grid 2x2 com os Dados Fictícios */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1.2,
            }}
          >
            {/* Vendas Hoje */}
            <Box
              sx={{
                p: 1.4,
                borderRadius: 2,
                bgcolor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', mb: 0.2 }}>
                Vendas Hoje
              </Typography>
              <Typography variant="subtitle2" sx={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.98rem' }}>
                R$ 1.248,50
              </Typography>
            </Box>

            {/* Produtos */}
            <Box
              sx={{
                p: 1.4,
                borderRadius: 2,
                bgcolor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', mb: 0.2 }}>
                Produtos
              </Typography>
              <Typography variant="subtitle2" sx={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.98rem' }}>
                127
              </Typography>
            </Box>

            {/* Fluxo de Caixa */}
            <Box
              sx={{
                p: 1.4,
                borderRadius: 2,
                bgcolor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', mb: 0.2 }}>
                Fluxo de Caixa
              </Typography>
              <Typography variant="subtitle2" sx={{ color: '#34d399', fontWeight: 800, fontSize: '0.98rem' }}>
                R$ 3.420,00
              </Typography>
            </Box>

            {/* Próximo DAS */}
            <Box
              sx={{
                p: 1.4,
                borderRadius: 2,
                bgcolor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', mb: 0.2 }}>
                Próximo DAS
              </Typography>
              <Typography variant="subtitle2" sx={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.98rem' }}>
                20/11/2026
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Rodapé do Lado Esquerdo */}
        <Box sx={{ position: 'relative', zIndex: 1, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
              Desenvolvido por <strong>LPTI Tech</strong>
            </Typography>
            <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.72rem' }}>
              🔒 Controle seguro de acesso
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ==================================================================== */}
      {/* LADO DIREITO: ÁREA DE ACESSO INTERATIVA (GLASSMORPHISM CARD)         */}
      {/* ==================================================================== */}
      <Box
        sx={{
          flex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, sm: 3.5, md: 4 },
          position: 'relative',
        }}
      >
        {/* ALTERAÇÃO 6: Barra Superior com Sistema Online Sutil (Sem Versão no Topo) */}
        <Box
          sx={{
            position: { xs: 'static', sm: 'absolute' },
            top: { sm: 20 },
            right: { sm: 28 },
            left: { sm: 28 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: 480,
            mb: { xs: 2.5, sm: 0 },
            px: { xs: 0, sm: 1 },
          }}
        >
          {backTo ? (
            <Button
              size="small"
              onClick={() => navigate(backTo)}
              startIcon={<ArrowBack fontSize="small" />}
              sx={{
                color: 'text.secondary',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.82rem',
                borderRadius: 2,
                '&:hover': { color: 'primary.main', bgcolor: 'transparent' },
              }}
            >
              {backText}
            </Button>
          ) : (
            <Box
              sx={{
                display: { xs: 'flex', md: 'none' },
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box
                component="img"
                src={logoOficial}
                alt="Logo Gestor MEI"
                sx={{ height: 30, width: 'auto' }}
              />
            </Box>
          )}

          {/* ALTERAÇÃO 6: 🟢 Sistema Online com Destaque Reduzido */}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
            <ApiStatusIndicator variant="text" size="small" />
          </Box>
        </Box>

        {/* Card Glassmorphism Central (Reduzido ~25% de altura) */}
        <Card
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 440,
            borderRadius: 4,
            border: '1px solid',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
            bgcolor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(16px)',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.65)'
              : '0 20px 45px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.02)',
            overflow: 'hidden',
          }}
        >
          {/* ALTERAÇÃO 5: Faixa Superior com "🔒 Seus dados protegidos" e "🔒 Controle seguro de acesso" */}
          <Box
            sx={{
              py: 1.1,
              px: { xs: 2.5, sm: 3.5 },
              bgcolor: isDark ? 'rgba(2, 132, 199, 0.1)' : 'rgba(2, 132, 199, 0.05)',
              borderBottom: '1px solid',
              borderColor: isDark ? 'rgba(2, 132, 199, 0.18)' : 'rgba(2, 132, 199, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '0.78rem',
                letterSpacing: '0.01em',
              }}
            >
              {badgeText}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                fontSize: '0.72rem',
              }}
            >
              {securitySubtext}
            </Typography>
          </Box>

          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            {/* Título & Subtítulo mais compactos */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="h5"
                component="h1"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.35rem', sm: '1.5rem' },
                  letterSpacing: '-0.025em',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  mb: 0.3,
                }}
              >
                {title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.88rem',
                  lineHeight: 1.4,
                }}
              >
                {subtitle}
              </Typography>
            </Box>

            {/* Conteúdo Injetado (Formulários) */}
            {children}
          </CardContent>
        </Card>

        {/* ALTERAÇÃO 6: Versão v1.4.7 no Rodapé */}
        <Box
          sx={{
            textAlign: 'center',
            mt: 2.5,
            width: '100%',
            maxWidth: 440,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.75rem',
              display: 'block',
            }}
          >
            Gestor MEI • v1.4.7 • LPTI Tech
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
