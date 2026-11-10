import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Popover,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Button,
  Badge,
  useTheme,
  useMediaQuery,
  Tooltip,
  Breadcrumbs,
} from '@mui/material';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  Bike,
  Users,
  PackageSearch,
  Warehouse,
  Truck,
  ReceiptText,
  MapPin,
  Navigation as NavigationIcon,
  Utensils,
  Activity,
  Landmark,
  FileCheck,
  FileUp,
  BarChart3,
  ShieldCheck,
  UsersRound,
  SlidersHorizontal,
  Menu as MenuIconLucide,
  ChevronLeft,
  ChevronRight,
  Bell,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import {
  Globe,
  Building2,
  ChevronDown,
  Check,
} from 'lucide-react';
import api from '../services/api';
import { EmpresaMasterListItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../contexts/ThemeContext';
import { ApiStatusIndicator } from './ApiStatusIndicator';
import logoIcon from '../assets/branding/gestor-mei-icon.png';
import { resolveImageUrl } from '../services/api';

const DRAWER_WIDTH_EXPANDED = 260;
const DRAWER_WIDTH_COLLAPSED = 74;

interface NavItemDef {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  consultorOnly?: boolean;
  adminOrConsultorOnly?: boolean;
  badge?: string;
  moduleKey?: 'modulo_motoboy' | 'modulo_ifood';
}

interface NavSection {
  id: string;
  title: string;
  items: NavItemDef[];
}

export const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    empresa,
    logout,
    isAdmin,
    isOwner,
    isMaster,
    isConsultor,
    isOperator,
    activeEmpresaId,
    isSupportMode,
    setContextEmpresaId,
  } = useAuth();
  // Tenant Switcher State (MASTER)
  const [tenantAnchorEl, setTenantAnchorEl] = useState<null | HTMLElement>(null);
  const [todasEmpresas, setTodasEmpresas] = useState<EmpresaMasterListItem[]>([]);

  useEffect(() => {
    if (isMaster) {
      api.get<EmpresaMasterListItem[]>('/empresa/todas')
        .then((res) => setTodasEmpresas(res.data))
        .catch((err) => console.error('Erro ao buscar empresas para switcher:', err));
    }
  }, [isMaster, activeEmpresaId]);

  const handleOpenTenantMenu = (e: React.MouseEvent<HTMLElement>) => {
    setTenantAnchorEl(e.currentTarget);
  };

  const handleCloseTenantMenu = () => {
    setTenantAnchorEl(null);
  };

  const handleSelectTenant = async (empresaId: number | null) => {
    handleCloseTenantMenu();
    try {
      if (empresaId) {
        await api.post('/suporte/sessao/iniciar', { empresa_id: empresaId });
      } else if (activeEmpresaId) {
        await api.post('/suporte/sessao/encerrar', { empresa_id: Number(activeEmpresaId) });
      }
    } catch (err) {
      console.warn('Erro ao auditar sessão de suporte:', err);
    }
    await setContextEmpresaId(empresaId);
    navigate('/');
  };
  const { mode, toggleTheme } = useAppTheme();

  // Estado de recolhimento da Sidebar (persistido no localStorage)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('gestor_mei_sidebar_collapsed') === 'true';
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(2);

  const currentDrawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  const toggleSidebarCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('gestor_mei_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Atalhos de teclado globais: F2 para PDV, Ctrl+B para recolher sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        navigate('/vendas');
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotifClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotifAnchorEl(event.currentTarget);
  };

  const handleNotifClose = () => {
    setNotifAnchorEl(null);
  };

  const handleClearNotifs = () => {
    setUnreadNotifs(0);
    handleNotifClose();
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  // Configuração semântica do perfil RBAC
  const getRoleConfig = () => {
    if (isMaster) {
      return {
        label: 'MASTER',
        title: 'Administrador Master da Plataforma',
        chipBg: mode === 'dark' ? 'rgba(168, 85, 247, 0.18)' : 'rgba(147, 51, 234, 0.1)',
        chipColor: mode === 'dark' ? '#C084FC' : '#7E22CE',
        chipBorder: '1px solid rgba(147, 51, 234, 0.25)',
      };
    }
    if (isOwner) {
      return {
        label: 'PROPRIETÁRIO',
        title: 'Proprietário Titular do MEI',
        chipBg: mode === 'dark' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(2, 132, 199, 0.1)',
        chipColor: mode === 'dark' ? '#38BDF8' : '#0369A1',
        chipBorder: '1px solid rgba(2, 132, 199, 0.25)',
      };
    }
    if (isConsultor) {
      return {
        label: 'CONSULTOR',
        title: 'Consultor Credenciado LPTI Tech',
        chipBg: mode === 'dark' ? 'rgba(52, 211, 153, 0.18)' : 'rgba(16, 185, 129, 0.1)',
        chipColor: mode === 'dark' ? '#34D399' : '#047857',
        chipBorder: '1px solid rgba(16, 185, 129, 0.25)',
      };
    }
    return {
      label: 'OPERADOR',
      title: 'Operador de Caixa e Atendimento',
      chipBg: mode === 'dark' ? 'rgba(148, 163, 184, 0.18)' : 'rgba(100, 116, 139, 0.1)',
      chipColor: mode === 'dark' ? '#CBD5E1' : '#475569',
      chipBorder: '1px solid rgba(100, 116, 139, 0.25)',
    };
  };

  const roleConfig = getRoleConfig();

  // Estrutura hierárquica dividida nos 4 blocos semânticos com ícones Lucide React (strokeWidth 1.75)
  const navSections: NavSection[] = [
    {
      id: 'operacao',
      title: 'Operação',
      items: [
        { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} strokeWidth={1.75} /> },
        { label: 'Caixa do Dia', path: '/caixa', icon: <Wallet size={18} strokeWidth={1.75} /> },
        { label: 'PDV / Vendas', path: '/vendas', icon: <Receipt size={18} strokeWidth={1.75} />, badge: 'F2' },
        { label: 'Pedidos Delivery', path: '/pedidos-entrega', icon: <Bike size={18} strokeWidth={1.75} /> },
      ],
    },
    {
      id: 'gestao',
      title: 'Gestão Comercial',
      items: [
        { label: 'Clientes', path: '/clientes', icon: <Users size={18} strokeWidth={1.75} /> },
        { label: 'Produtos & Serviços', path: '/produtos', icon: <PackageSearch size={18} strokeWidth={1.75} /> },
        { label: 'Controle de Estoque', path: '/estoque', icon: <Warehouse size={18} strokeWidth={1.75} /> },
        { label: 'Compras', path: '/compras', icon: <Truck size={18} strokeWidth={1.75} />, adminOrConsultorOnly: true },
        { label: 'Despesas', path: '/despesas', icon: <ReceiptText size={18} strokeWidth={1.75} />, adminOrConsultorOnly: true },
        { label: 'Regiões & Taxas', path: '/regioes-entrega', icon: <MapPin size={18} strokeWidth={1.75} /> },
        { label: 'Motoboys', path: '/motoboys', icon: <NavigationIcon size={18} strokeWidth={1.75} />, moduleKey: 'modulo_motoboy' },
        { label: 'Controle iFood', path: '/ifood', icon: <Utensils size={18} strokeWidth={1.75} />, moduleKey: 'modulo_ifood' },
      ],
    },
    {
      id: 'fiscal',
      title: 'Fiscal & Inteligência',
      items: [
        { label: 'Saúde do Negócio', path: '/saude-negocio', icon: <Activity size={18} strokeWidth={1.75} />, adminOrConsultorOnly: true },
        { label: 'Controle DAS', path: '/das', icon: <Landmark size={18} strokeWidth={1.75} />, adminOrConsultorOnly: true },
        { label: 'Declaração MEI (DASN)', path: '/relatorio-mei', icon: <FileCheck size={18} strokeWidth={1.75} />, adminOrConsultorOnly: true },
        { label: 'Entrada XML NF-e', path: '/nfe', icon: <FileUp size={18} strokeWidth={1.75} />, adminOrConsultorOnly: true },
        { label: 'Relatório Entregas', path: '/relatorio-entregas', icon: <BarChart3 size={18} strokeWidth={1.75} />, adminOrConsultorOnly: true },
      ],
    },
    {
      id: 'sistema',
      title: 'Sistema',
      items: [
        { label: 'Painel do Consultor', path: '/consultor', icon: <ShieldCheck size={18} strokeWidth={1.75} />, consultorOnly: true },
        { label: 'Usuários / Equipe', path: '/usuarios', icon: <UsersRound size={18} strokeWidth={1.75} />, adminOnly: true },
        { label: 'Configurações', path: '/configuracoes', icon: <SlidersHorizontal size={18} strokeWidth={1.75} />, adminOnly: true },
      ],
    },
  ];

  // Filtro de visibilidade baseado em papéis RBAC e feature flags
  const filterSectionItems = (items: NavItemDef[]) => {
    return items.filter((item) => {
      // No perfil MASTER (visão global ou modo suporte na empresa cliente),
      // o MASTER possui acesso irrestrito a todos os módulos operacionais, fiscais e administrativos
      if (isMaster) {
        if (item.consultorOnly) return false;
        return true;
      }
      if (item.consultorOnly && !isConsultor) return false;
      if (item.adminOnly && !isAdmin) return false;
      if (item.adminOrConsultorOnly && !isAdmin && !isConsultor) return false;
      if (item.moduleKey === 'modulo_motoboy' && empresa?.modulo_motoboy === false) return false;
      if (item.moduleKey === 'modulo_ifood' && empresa?.modulo_ifood === false) return false;
      return true;
    });
  };

  // Breadcrumbs contextuais calculados automaticamente
  const getBreadcrumbs = (pathname: string) => {
    if (pathname === '/') return { section: 'Operação', title: 'Dashboard' };
    if (pathname.startsWith('/vendas')) return { section: 'Operação', title: 'PDV / Vendas Rápido' };
    if (pathname.startsWith('/caixa')) return { section: 'Operação', title: 'Caixa do Dia' };
    if (pathname.startsWith('/pedidos-entrega')) return { section: 'Operação', title: 'Pedidos Delivery' };
    if (pathname.startsWith('/clientes')) return { section: 'Gestão Comercial', title: 'Clientes' };
    if (pathname.startsWith('/produtos')) return { section: 'Gestão Comercial', title: 'Produtos & Serviços' };
    if (pathname.startsWith('/estoque')) return { section: 'Gestão Comercial', title: 'Controle de Estoque' };
    if (pathname.startsWith('/compras')) return { section: 'Gestão Comercial', title: 'Compras' };
    if (pathname.startsWith('/despesas')) return { section: 'Gestão Comercial', title: 'Despesas' };
    if (pathname.startsWith('/regioes-entrega')) return { section: 'Gestão Comercial', title: 'Regiões & Taxas' };
    if (pathname.startsWith('/motoboys')) return { section: 'Gestão Comercial', title: 'Motoboys' };
    if (pathname.startsWith('/ifood')) return { section: 'Gestão Comercial', title: 'Controle iFood' };
    if (pathname.startsWith('/saude-negocio')) return { section: 'Fiscal & Inteligência', title: 'Saúde do Negócio' };
    if (pathname.startsWith('/das')) return { section: 'Fiscal & Inteligência', title: 'Controle DAS Mensal' };
    if (pathname.startsWith('/relatorio-mei')) return { section: 'Fiscal & Inteligência', title: 'Declaração MEI (DASN)' };
    if (pathname.startsWith('/nfe')) return { section: 'Fiscal & Inteligência', title: 'Entrada XML NF-e' };
    if (pathname.startsWith('/relatorio-entregas')) return { section: 'Fiscal & Inteligência', title: 'Relatório de Entregas' };
    if (pathname.startsWith('/consultor')) return { section: 'Sistema', title: 'Painel do Consultor' };
    if (pathname.startsWith('/usuarios')) return { section: 'Sistema', title: 'Usuários / Equipe' };
    if (pathname.startsWith('/configuracoes')) return { section: 'Sistema', title: 'Configurações' };
    return { section: 'Módulo', title: 'Gestão' };
  };

  const breadcrumb = getBreadcrumbs(location.pathname);

  // Conteúdo da Sidebar (Desktop expandida/recolhida e Mobile Drawer)
  const renderSidebarContent = (isDrawerMobile = false) => {
    const isEffectivelyCollapsed = !isDrawerMobile && collapsed;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
        {/* Header da Sidebar */}
        <Box
          sx={{
            p: isEffectivelyCollapsed ? 1.5 : 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: isEffectivelyCollapsed ? 'center' : 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            minHeight: 64,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              overflow: 'hidden',
              textDecoration: 'none',
            }}
            onClick={() => navigate('/')}
          >
            <Box
              component="img"
              src={resolveImageUrl(empresa?.logo_url) || logoIcon}
              alt={empresa?.nome_fantasia || "Logo Gestor MEI"}
              onError={(e: any) => {
                e.currentTarget.src = logoIcon;
              }}
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.12)',
                objectFit: empresa?.logo_url ? 'contain' : 'cover',
                bgcolor: empresa?.logo_url ? (theme: any) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#FFFFFF' : 'transparent',
                flexShrink: 0,
              }}
            />
            {!isEffectivelyCollapsed && (
              <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  color="text.primary"
                  sx={{ lineHeight: 1.15, letterSpacing: '-0.02em', fontSize: '0.95rem' }}
                  noWrap
                >
                  {empresa?.nome_fantasia || 'GESTOR MEI'}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600, fontSize: '0.68rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                  noWrap
                >
                  {empresa?.nome_fantasia || 'ERP Executivo'}
                </Typography>
              </Box>
            )}
          </Box>

          {!isDrawerMobile && (
            <Tooltip title={collapsed ? 'Expandir menu (Ctrl+B)' : 'Recolher menu (Ctrl+B)'} placement="right">
              <IconButton
                size="small"
                onClick={toggleSidebarCollapse}
                sx={{
                  color: 'text.secondary',
                  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                {collapsed ? <ChevronRight size={18} strokeWidth={1.75} /> : <ChevronLeft size={18} strokeWidth={1.75} />}
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Lista de Navegação por Categorias */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1.5, px: isEffectivelyCollapsed ? 0.75 : 1 }}>
          {navSections.map((section) => {
            const visibleItems = filterSectionItems(section.items);
            if (visibleItems.length === 0) return null;

            return (
              <Box key={section.id} sx={{ mb: 1.5 }}>
                {!isEffectivelyCollapsed && (
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      display: 'block',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      opacity: 0.85,
                    }}
                  >
                    {section.title}
                  </Typography>
                )}

                <List disablePadding>
                  {visibleItems.map((item) => {
                    const isSelected = location.pathname === item.path;

                    const buttonContent = (
                      <ListItemButton
                        onClick={() => {
                          navigate(item.path);
                          if (isDrawerMobile) setMobileOpen(false);
                        }}
                        selected={isSelected}
                        sx={{
                          borderRadius: 2,
                          py: 0.9,
                          px: isEffectivelyCollapsed ? 1 : 1.5,
                          minHeight: isDrawerMobile ? 48 : 38,
                          justifyContent: isEffectivelyCollapsed ? 'center' : 'flex-start',
                          mb: 0.4,
                          transition: 'all 140ms ease-in-out',
                          bgcolor: isSelected
                            ? mode === 'dark'
                              ? 'rgba(2, 132, 199, 0.16)'
                              : 'rgba(2, 132, 199, 0.08)'
                            : 'transparent',
                          color: isSelected ? 'primary.main' : 'text.primary',
                          borderLeft: isSelected && !isEffectivelyCollapsed ? '3px solid' : '3px solid transparent',
                          borderColor: isSelected ? 'primary.main' : 'transparent',
                          '&:hover': {
                            bgcolor: isSelected
                              ? mode === 'dark'
                               ? 'rgba(2, 132, 199, 0.22)'
                                : 'rgba(2, 132, 199, 0.12)'
                              : 'action.hover',
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: isEffectivelyCollapsed ? 0 : 34,
                            justifyContent: 'center',
                            color: isSelected ? 'primary.main' : 'text.secondary',
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>

                        {!isEffectivelyCollapsed && (
                          <>
                            <ListItemText
                              primary={item.label}
                              primaryTypographyProps={{
                                fontSize: '0.84rem',
                                fontWeight: isSelected ? 600 : 500,
                                noWrap: true,
                              }}
                            />
                            {item.badge && (
                              <Chip
                                label={item.badge}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  px: 0.5,
                                  bgcolor: isSelected ? 'primary.main' : 'action.selected',
                                  color: isSelected ? 'primary.contrastText' : 'text.secondary',
                                }}
                              />
                            )}
                          </>
                        )}
                      </ListItemButton>
                    );

                    return (
                      <ListItem key={item.path} disablePadding>
                        {isEffectivelyCollapsed ? (
                          <Tooltip title={item.label} placement="right" arrow>
                            {buttonContent}
                          </Tooltip>
                        ) : (
                          buttonContent
                        )}
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            );
          })}
        </Box>

        {/* Rodapé da Sidebar: Perfil do Usuário e Badge RBAC */}
        <Box
          sx={{
            p: isEffectivelyCollapsed ? 1 : 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: mode === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(248, 250, 252, 0.8)',
          }}
        >
          {isEffectivelyCollapsed ? (
            <Tooltip
              title={`${user?.nome || 'Usuário'} (${roleConfig.label}) - Clique para sair`}
              placement="right"
              arrow
            >
              <IconButton onClick={handleLogout} sx={{ width: '100%', p: 0.5 }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: 'primary.main',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                  }}
                >
                  {user?.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0, overflow: 'hidden' }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: 'primary.main',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {user?.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
                </Avatar>
                <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.82rem', lineHeight: 1.2 }}>
                    {user?.nome || 'Usuário'}
                  </Typography>
                  <Box sx={{ mt: 0.3 }}>
                    <Chip
                      label={roleConfig.label}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        bgcolor: roleConfig.chipBg,
                        color: roleConfig.chipColor,
                        border: roleConfig.chipBorder,
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  </Box>
                </Box>
              </Box>
              <Tooltip title="Sair do sistema">
                <IconButton size="small" onClick={handleLogout} sx={{ color: 'text.secondary', flexShrink: 0 }}>
                  <LogOut size={18} strokeWidth={1.75} />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {!isEffectivelyCollapsed && (
            <Box sx={{ mt: 1, pt: 0.8, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', opacity: 0.75 }}>
                Gestor MEI • <strong>LPTI Tech</strong>
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Barra Fixa Superior de Modo Suporte LPTI Tech */}
      {isSupportMode && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 42,
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 1.5, sm: 2.5 },
            background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 40%, #1e1b4b 100%)',
            color: '#ffffff',
            borderBottom: '1px solid rgba(129, 140, 248, 0.4)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Chip
              icon={<ShieldCheck size={14} color="#a5b4fc" />}
              label="Modo Suporte LPTI Tech"
              size="small"
              sx={{
                bgcolor: 'rgba(99, 102, 241, 0.25)',
                color: '#e0e7ff',
                fontWeight: 800,
                fontSize: '0.72rem',
                border: '1px solid rgba(165, 180, 252, 0.4)',
                height: 24,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.78rem',
                display: { xs: 'none', md: 'inline-block' },
                color: '#c7d2fe',
              }}
            >
              Empresa: <strong style={{ color: '#ffffff' }}>{empresa?.nome_fantasia || `Empresa #${activeEmpresaId}`}</strong>
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.78rem',
                display: { xs: 'none', lg: 'inline-block' },
                color: '#c7d2fe',
                borderLeft: '1px solid rgba(255,255,255,0.2)',
                pl: 1.5,
              }}
            >
              MASTER: <strong style={{ color: '#ffffff' }}>{user?.nome || user?.email}</strong>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.72rem',
                display: { xs: 'inline-block', md: 'none' },
                color: '#e0e7ff',
                fontWeight: 700,
                maxWidth: 140,
              }}
              noWrap
            >
              {empresa?.nome_fantasia || `Empresa #${activeEmpresaId}`}
            </Typography>
            <Button
              size="small"
              variant="contained"
              onClick={() => handleSelectTenant(null)}
              startIcon={<Globe size={14} />}
              sx={{
                height: 28,
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'none',
                bgcolor: '#4f46e5',
                color: '#ffffff',
                borderRadius: 1.5,
                px: 1.5,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#4338ca' },
              }}
            >
              Voltar para Visão Global
            </Button>
          </Box>
        </Box>
      )}

      {/* Topbar Executiva */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          top: isSupportMode ? '42px' : 0,
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          ml: { md: `${currentDrawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
          transition: theme.transitions.create(['width', 'margin-left', 'top'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shorter,
          }),
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: { xs: 56, sm: 60 }, px: { xs: 1.5, sm: 2.5 } }}>
          {/* Lado Esquerdo: Menu Mobile + Breadcrumbs Contextuais */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <IconButton
              color="inherit"
              aria-label="abrir menu"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ display: { md: 'none' } }}
            >
              <MenuIconLucide size={20} strokeWidth={1.75} />
            </IconButton>

            {/* Breadcrumbs Contextuais Estilo Stripe / Linear */}
            <Breadcrumbs
              separator={<ChevronRight size={14} strokeWidth={1.75} style={{ opacity: 0.5, margin: '0 -2px' }} />}
              aria-label="breadcrumb"
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  letterSpacing: '0.02em',
                }}
              >
                {breadcrumb.section}
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'text.primary',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                {breadcrumb.title}
              </Typography>
            </Breadcrumbs>

            {/* Mobile Title */}
            <Typography variant="subtitle1" fontWeight={700} sx={{ display: { xs: 'block', sm: 'none' } }} noWrap>
              {breadcrumb.title}
            </Typography>
          </Box>

            {/* Tenant Switcher Global para Perfil MASTER */}
            {isMaster && (
              <Box sx={{ ml: { xs: 0, sm: 1.5 } }}>
                <Button
                  size="small"
                  onClick={handleOpenTenantMenu}
                  startIcon={activeEmpresaId ? <Building2 size={15} /> : <Globe size={15} />}
                  endIcon={<ChevronDown size={14} />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: { xs: '0.72rem', sm: '0.78rem' },
                    borderRadius: 2,
                    px: { xs: 1, sm: 1.5 },
                    py: 0.5,
                    bgcolor: activeEmpresaId
                      ? (mode === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)')
                      : (mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)'),
                    color: activeEmpresaId
                      ? (mode === 'dark' ? '#38bdf8' : '#0284c7')
                      : (mode === 'dark' ? '#34d399' : '#059669'),
                    border: '1px solid',
                    borderColor: activeEmpresaId
                      ? (mode === 'dark' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.25)')
                      : (mode === 'dark' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(16, 185, 129, 0.25)'),
                    maxWidth: { xs: 150, sm: 260 },
                    '&:hover': {
                      bgcolor: activeEmpresaId
                        ? (mode === 'dark' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 132, 199, 0.18)')
                        : (mode === 'dark' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.18)'),
                    },
                  }}
                >
                  <Typography noWrap variant="caption" sx={{ fontWeight: 700, fontSize: 'inherit' }}>
                    {activeEmpresaId
                      ? (empresa?.nome_fantasia || `Empresa #${activeEmpresaId}`)
                      : '🌐 Visão Global (MASTER)'}
                  </Typography>
                </Button>

                <Menu
                  anchorEl={tenantAnchorEl}
                  open={Boolean(tenantAnchorEl)}
                  onClose={handleCloseTenantMenu}
                  PaperProps={{
                    sx: {
                      width: 320,
                      maxHeight: 440,
                      borderRadius: 2.5,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                      p: 0.5,
                    },
                  }}
                >
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                      Contexto Multi-tenant (MASTER)
                    </Typography>
                  </Box>

                  <MenuItem
                    selected={!activeEmpresaId}
                    onClick={() => handleSelectTenant(null)}
                    sx={{ borderRadius: 1.5, my: 0.3 }}
                  >
                    <ListItemIcon>
                      <Globe size={18} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Todas as Empresas (Visão Global)"
                      secondary="Dashboard Macro & Auditoria"
                      primaryTypographyProps={{ fontWeight: !activeEmpresaId ? 700 : 500, fontSize: '0.82rem' }}
                      secondaryTypographyProps={{ fontSize: '0.7rem' }}
                    />
                    {!activeEmpresaId && <Check size={16} color="#10b981" />}
                  </MenuItem>

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ px: 2, py: 0.5 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                      Empresas Clientes ({todasEmpresas.length})
                    </Typography>
                  </Box>

                  {todasEmpresas.map((emp) => {
                    const isSelected = activeEmpresaId === emp.id;
                    return (
                      <MenuItem
                        key={emp.id}
                        selected={isSelected}
                        onClick={() => handleSelectTenant(emp.id)}
                        sx={{ borderRadius: 1.5, my: 0.3 }}
                      >
                        <ListItemIcon>
                          <Building2 size={18} />
                        </ListItemIcon>
                        <ListItemText
                          primary={emp.nome_fantasia}
                          secondary={`CNPJ: ${emp.cnpj}`}
                          primaryTypographyProps={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.82rem' }}
                          secondaryTypographyProps={{ fontSize: '0.7rem' }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {!emp.ativo && (
                            <Chip label="Bloqueada" size="small" color="error" sx={{ height: 18, fontSize: '0.62rem' }} />
                          )}
                          {isSelected && <Check size={16} color="#0284c7" />}
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Menu>
              </Box>
            )}

          {/* Lado Direito: Atalhos Rápidos, Notificações, Status e Avatar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.2 } }}>
            {/* Atalho Rápido: + Nova Venda (F2) */}
            <Button
              variant="contained"
              size="small"
              color="primary"
              startIcon={<Receipt size={16} strokeWidth={1.75} />}
              onClick={() => navigate('/vendas')}
              sx={{
                display: { xs: 'none', md: 'inline-flex' },
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.78rem',
                px: 1.5,
                py: 0.6,
                boxShadow: 'none',
                '&:hover': { boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)' },
              }}
            >
              + Venda (F2)
            </Button>

            {/* Atalho Rápido: + Nova Despesa (Apenas Admin/Consultor) */}
            {isAdmin && (
              <Button
                variant="outlined"
                size="small"
                color="inherit"
                startIcon={<ReceiptText size={16} strokeWidth={1.75} />}
                onClick={() => navigate('/despesas')}
                sx={{
                  display: { xs: 'none', lg: 'inline-flex' },
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  px: 1.4,
                  py: 0.6,
                  borderColor: 'divider',
                  color: 'text.primary',
                  '&:hover': { borderColor: 'text.secondary', bgcolor: 'action.hover' },
                }}
              >
                + Despesa
              </Button>
            )}

            {/* Status de Conexão com a API */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
              <ApiStatusIndicator size="small" />
            </Box>

            {/* Central de Notificações com Popover */}
            <Tooltip title="Alertas e Notificações do Sistema">
              <IconButton size="small" color="inherit" onClick={handleNotifClick} sx={{ p: 1 }}>
                <Badge badgeContent={unreadNotifs} color="error" variant={unreadNotifs > 0 ? 'standard' : 'dot'}>
                  <Bell size={18} strokeWidth={1.75} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Popover da Central de Notificações */}
            <Popover
              open={Boolean(notifAnchorEl)}
              anchorEl={notifAnchorEl}
              onClose={handleNotifClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                sx: { width: 320, p: 2, borderRadius: 2.5, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Notificações do Negócio
                </Typography>
                {unreadNotifs > 0 && (
                  <Chip
                    label={`${unreadNotifs} novas`}
                    size="small"
                    color="primary"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                  />
                )}
              </Box>

              <List disablePadding>
                {/* Notificação 1: DAS */}
                <ListItem
                  disablePadding
                  sx={{
                    mb: 1,
                    p: 1.2,
                    borderRadius: 2,
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.02)',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => {
                    handleNotifClose();
                    navigate('/das');
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'flex-start' }}>
                    <Box sx={{ color: 'primary.main', mt: 0.3 }}>
                      <Landmark size={20} strokeWidth={1.75} />
                    </Box>
                    <Box>
                      <Typography variant="caption" fontWeight={700} color="text.primary" sx={{ display: 'block' }}>
                        Guia DAS do Mês
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                        O DAS deste mês vence no dia 20. Clique para conferir seu status.
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>

                {/* Notificação 2: Estoque */}
                <ListItem
                  disablePadding
                  sx={{
                    mb: 1,
                    p: 1.2,
                    borderRadius: 2,
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.02)',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => {
                    handleNotifClose();
                    navigate('/estoque');
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'flex-start' }}>
                    <Box sx={{ color: 'warning.main', mt: 0.3 }}>
                      <Warehouse size={20} strokeWidth={1.75} />
                    </Box>
                    <Box>
                      <Typography variant="caption" fontWeight={700} color="text.primary" sx={{ display: 'block' }}>
                        Alerta de Estoque Mínimo
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                        Mantenha suas matérias-primas e produtos com estoque em dia.
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              </List>

              <Divider sx={{ my: 1.2 }} />

              <Button
                fullWidth
                size="small"
                variant="text"
                color="primary"
                onClick={handleClearNotifs}
                sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 }}
              >
                Marcar todas como lidas
              </Button>
            </Popover>

            {/* Alternador de Tema (Claro / Escuro) */}
            <Tooltip title={mode === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}>
              <IconButton onClick={toggleTheme} color="inherit" size="small" sx={{ p: 1 }}>
                {mode === 'dark' ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
              </IconButton>
            </Tooltip>

            {/* Avatar do Usuário e Dropdown Menu */}
            <IconButton onClick={handleMenuClick} size="small" sx={{ p: 0.5, ml: 0.5 }}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: 'primary.main',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                }}
              >
                {user?.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                sx: { minWidth: 220, borderRadius: 2.5, boxShadow: '0 10px 25px rgba(0,0,0,0.12)' },
              }}
            >
              <Box sx={{ px: 2, py: 1.2 }}>
                <Typography variant="body2" fontWeight={700} color="text.primary" noWrap>
                  {user?.nome || 'Usuário'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.8 }} noWrap>
                  {user?.email}
                </Typography>
                <Chip
                  label={roleConfig.label}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    bgcolor: roleConfig.chipBg,
                    color: roleConfig.chipColor,
                    border: roleConfig.chipBorder,
                  }}
                />
              </Box>

              <Divider />

              {isAdmin && (
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate('/configuracoes');
                  }}
                  sx={{ fontSize: '0.85rem', py: 1 }}
                >
                  <ListItemIcon>
                    <SlidersHorizontal size={16} strokeWidth={1.75} />
                  </ListItemIcon>
                  Configurações do MEI
                </MenuItem>
              )}

              <MenuItem onClick={handleLogout} sx={{ color: 'error.main', fontSize: '0.85rem', py: 1 }}>
                <ListItemIcon>
                  <LogOut size={16} strokeWidth={1.75} color="var(--mui-palette-error-main, #d32f2f)" />
                </ListItemIcon>
                Sair da Conta
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar / Navigation Drawer */}
      <Box
        component="nav"
        sx={{
          width: { md: currentDrawerWidth },
          flexShrink: { md: 0 },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shorter,
          }),
        }}
      >
        {/* Mobile Drawer (Temporário) */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 280,
              boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
            },
          }}
        >
          {renderSidebarContent(true)}
        </Drawer>

        {/* Desktop Drawer (Permanente com animação de recolhimento) */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: currentDrawerWidth,
              borderRight: 1,
              borderColor: 'divider',
              overflowX: 'hidden',
              top: isSupportMode ? '42px' : 0,
              height: isSupportMode ? 'calc(100% - 42px)' : '100%',
              transition: theme.transitions.create(['width', 'top', 'height'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.shorter,
              }),
            },
          }}
          open
        >
          {renderSidebarContent(false)}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          mt: isSupportMode ? { xs: '98px', sm: '102px' } : { xs: '56px', sm: '60px' },
          mb: { xs: '65px', md: 0 },
          minHeight: isSupportMode ? 'calc(100vh - 102px)' : 'calc(100vh - 60px)',
          transition: theme.transitions.create(['width', 'margin-left', 'margin-top'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shorter,
          }),
        }}
      >
        <Outlet />
      </Box>

      {/* Barra de Navegação Inferior para Celulares com Lucide React */}
      {isMobile && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            borderTop: 1,
            borderColor: 'divider',
          }}
          elevation={4}
        >
          <BottomNavigation
            showLabels
            value={location.pathname}
            onChange={(_, newValue) => {
              if (newValue === 'menu') {
                handleDrawerToggle();
              } else {
                navigate(newValue);
              }
            }}
            sx={{ height: 60 }}
          >
            <BottomNavigationAction
              label="Vendas"
              value="/vendas"
              icon={<Receipt size={20} strokeWidth={1.75} />}
            />
            <BottomNavigationAction
              label="Início"
              value="/"
              icon={<LayoutDashboard size={20} strokeWidth={1.75} />}
            />
            <BottomNavigationAction
              label="Caixa"
              value="/caixa"
              icon={<Wallet size={20} strokeWidth={1.75} />}
            />
            <BottomNavigationAction
              label="MEI"
              value="/relatorio-mei"
              icon={<FileCheck size={20} strokeWidth={1.75} />}
            />
            <BottomNavigationAction
              label="Menu"
              value="menu"
              icon={<MenuIconLucide size={20} strokeWidth={1.75} />}
            />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};
