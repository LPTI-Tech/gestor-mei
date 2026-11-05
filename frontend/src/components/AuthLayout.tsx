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
  PointOfSale,
  Inventory2,
  ReceiptLong,
  Security,
  VerifiedUser,
  CheckCircle,
} from '@mui/icons-material';
import { ApiStatusIndicator } from './ApiStatusIndicator';
import logoOficial from '../assets/branding/gestor-mei-logo-tight.png';

export interface AuthLayoutProps {
  title: string;
  subtitle: string;
  badgeText?: string;
  backTo?: string;
  backText?: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  badgeText = 'Acesso Seguro • TLS 1.3',
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
      {/* LADO ESQUERDO: BRANDING INSTITUCIONAL & RECURSOS REAIS (DESKTOP)     */}
      {/* ==================================================================== */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: { md: '48%', lg: '45%' },
          minHeight: '100vh',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { md: 5, lg: 6 },
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
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

            {/* Versão Real do Sistema */}
            <Chip
              label="v1.4.7 • Homologado"
              size="small"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                fontWeight: 700,
                fontSize: '0.74rem',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 2,
              }}
            />
          </Box>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              fontSize: { md: '1.75rem', lg: '2.1rem' },
              lineHeight: 1.25,
              letterSpacing: '-0.025em',
              color: '#ffffff',
              mb: 1.5,
              mt: 2,
            }}
          >
            A plataforma completa para gerenciar, controlar e proteger o seu MEI.
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: '#94a3b8',
              fontSize: '0.98rem',
              lineHeight: 1.55,
              maxWidth: 480,
            }}
          >
            Projetado sob medida para microempreendedores individuais. Vendas, estoque, compras, DASN fiscal e segurança de nível corporativo.
          </Typography>
        </Box>

        {/* Módulos & Recursos Reais do Sistema */}
        <Box sx={{ position: 'relative', zIndex: 1, my: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Recurso 1: PDV */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              p: 2,
              borderRadius: 3,
              bgcolor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: 'rgba(56, 189, 248, 0.35)',
              },
            }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: 'rgba(2, 132, 199, 0.2)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PointOfSale fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f1f5f9', mb: 0.3 }}>
                PDV & Terminal de Vendas em &lt;10s
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.45 }}>
                Vendas balcão e delivery com múltiplos pagamentos (PIX, cartões e dinheiro), comanda térmica e fechamento cego de caixa.
              </Typography>
            </Box>
          </Box>

          {/* Recurso 2: Estoque Kardex */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              p: 2,
              borderRadius: 3,
              bgcolor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: 'rgba(56, 189, 248, 0.35)',
              },
            }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Inventory2 fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f1f5f9', mb: 0.3 }}>
                Controle de Estoque & Kardex Completo
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.45 }}>
                Rastreabilidade de entradas, saídas, perdas e ajustes, cálculo de custo de reposição e alertas de reposição mínima.
              </Typography>
            </Box>
          </Box>

          {/* Recurso 3: XML NF-e SEFAZ */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              p: 2,
              borderRadius: 3,
              bgcolor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: 'rgba(56, 189, 248, 0.35)',
              },
            }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ReceiptLong fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f1f5f9', mb: 0.3 }}>
                Importação Inteligente de NF-e (XML)
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.45 }}>
                Parser SEFAZ v4.00 com memória De-Para de fornecedores e conversão de caixas e embalagens para o estoque real.
              </Typography>
            </Box>
          </Box>

          {/* Recurso 4: Fiscal DASN-SIMEI & RBAC */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              p: 2,
              borderRadius: 3,
              bgcolor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: 'rgba(56, 189, 248, 0.35)',
              },
            }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: 'rgba(139, 92, 246, 0.2)',
                color: '#a78bfa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Security fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f1f5f9', mb: 0.3 }}>
                Guia DAS Mensal, Teto Fiscal & RBAC
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.45 }}>
                Acompanhamento das 12 guias DAS, controle do limite de R$ 81.000,00 e controle de acesso estrito com perfis Master, Dono e Operador.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Rodapé do Lado Esquerdo */}
        <Box sx={{ position: 'relative', zIndex: 1, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
              <CheckCircle sx={{ fontSize: 16, color: '#38bdf8' }} />
              <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600 }}>
                100% Legislação MEI
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#475569' }}>•</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
              <CheckCircle sx={{ fontSize: 16, color: '#38bdf8' }} />
              <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600 }}>
                Arquitetura Multiempresa
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#475569' }}>•</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
              <CheckCircle sx={{ fontSize: 16, color: '#38bdf8' }} />
              <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600 }}>
                Blindagem RBAC
              </Typography>
            </Box>
          </Box>

          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 1.5, fontSize: '0.75rem' }}>
            Desenvolvido com tecnologia de classe empresarial por <strong>LPTI Tech</strong>
          </Typography>
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
          p: { xs: 2.5, sm: 4, md: 6 },
          position: 'relative',
        }}
      >
        {/* Barra Superior com Status da API & Versão Discreta */}
        <Box
          sx={{
            position: { xs: 'static', sm: 'absolute' },
            top: { sm: 24 },
            right: { sm: 32 },
            left: { sm: 32 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: 520,
            mb: { xs: 3, sm: 0 },
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
                fontSize: '0.85rem',
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
                sx={{ height: 32, width: 'auto' }}
              />
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
            <ApiStatusIndicator size="small" />
            <Typography
              variant="caption"
              sx={{
                color: 'text.disabled',
                fontWeight: 600,
                fontSize: '0.72rem',
                display: { xs: 'none', sm: 'inline-block' },
              }}
            >
              v1.4.7
            </Typography>
          </Box>
        </Box>

        {/* Card Glassmorphism Central */}
        <Card
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 480,
            borderRadius: 5,
            border: '1px solid',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
            bgcolor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.65)'
              : '0 20px 45px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.02)',
            overflow: 'hidden',
            transition: 'box-shadow 0.3s ease',
          }}
        >
          {/* Faixa Superior com Badge de Segurança */}
          <Box
            sx={{
              py: 1.5,
              px: { xs: 3, sm: 4 },
              bgcolor: isDark ? 'rgba(2, 132, 199, 0.12)' : 'rgba(2, 132, 199, 0.06)',
              borderBottom: '1px solid',
              borderColor: isDark ? 'rgba(2, 132, 199, 0.2)' : 'rgba(2, 132, 199, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VerifiedUser sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography
                variant="caption"
                sx={{
                  color: 'primary.main',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  letterSpacing: '0.02em',
                }}
              >
                {badgeText}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: 'text.disabled',
                fontWeight: 600,
                fontSize: '0.72rem',
              }}
            >
              Blindagem RBAC
            </Typography>
          </Box>

          <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
            {/* Título & Subtítulo */}
            <Box sx={{ mb: 3.5 }}>
              <Typography
                variant="h5"
                component="h1"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.45rem', sm: '1.65rem' },
                  letterSpacing: '-0.025em',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  mb: 0.8,
                }}
              >
                {title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                }}
              >
                {subtitle}
              </Typography>
            </Box>

            {/* Conteúdo Injetado (Formulários) */}
            {children}
          </CardContent>
        </Card>

        {/* Rodapé Interativo Discreto */}
        <Box
          sx={{
            textAlign: 'center',
            mt: 3.5,
            width: '100%',
            maxWidth: 480,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.76rem',
              letterSpacing: '0.01em',
              display: 'block',
            }}
          >
            Gestor MEI © 2026 • Produto Oficial <strong>LPTI Tech</strong>
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.disabled',
              fontSize: '0.72rem',
              mt: 0.4,
              display: 'block',
            }}
          >
            Autenticação segura via JSON Web Tokens com taxa limitada por IP (Anti-Bruteforce)
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
