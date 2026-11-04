import React, { useState } from 'react';
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
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Brightness4,
  Brightness7,
  Dashboard as DashboardIcon,
  PointOfSale,
  AccountBalanceWallet,
  RestaurantMenu,
  ReceiptLong,
  TwoWheeler,
  DeliveryDining,
  Assessment,
  Favorite,
  People,
  PeopleAlt,
  LocalShipping,
  Map,
  TrendingUp,
  Settings,
  Logout,
  Storefront,
  Inventory2,
  RequestQuote,
  CloudUpload,
  ShoppingBag,
  SupervisorAccount,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../contexts/ThemeContext';
import { ApiStatusIndicator } from './ApiStatusIndicator';
import logoIcon from '../assets/branding/gestor-mei-icon.png';

const DRAWER_WIDTH = 280;

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

export const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, empresa, logout, isAdmin, isOwner, isMaster, isConsultor } = useAuth();

  const getCargoLabel = () => {
    if (isMaster) return 'Plataforma MASTER';
    if (isOwner) return 'Proprietário (OWNER)';
    if (user?.role === 'CONSULTOR') return 'Consultor LPTI Tech';
    return 'Operador de Caixa';
  };
  const { mode, toggleTheme } = useAppTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const navItems: NavItemDef[] = [
    // CORE (Núcleo Essencial para todos os MEIs)
    { label: 'Dashboard', path: '/', icon: <DashboardIcon />, adminOnly: false },
    { label: 'PDV / Vendas Rápido', path: '/vendas', icon: <PointOfSale color="primary" />, adminOnly: false },
    { label: 'Pedidos Delivery', path: '/pedidos-entrega', icon: <LocalShipping color="secondary" />, adminOnly: false, badge: 'Novo' },
    { label: 'Regiões & Taxas', path: '/regioes-entrega', icon: <Map />, adminOnly: false },
    { label: 'Clientes', path: '/clientes', icon: <PeopleAlt />, adminOnly: false },
    { label: 'Caixa do Dia', path: '/caixa', icon: <AccountBalanceWallet />, adminOnly: false },
    { label: 'Produtos & Serviços', path: '/produtos', icon: <RestaurantMenu />, adminOnly: false },
    { label: 'Controle de Estoque', path: '/estoque', icon: <Inventory2 color="warning" />, adminOnly: false, badge: 'Sprint 4' },
    { 
      label: 'Entrada XML NF-e', 
      path: '/nfe', 
      icon: <CloudUpload color="primary" />, 
      adminOrConsultorOnly: true, 
      badge: 'Sprint 6' 
    },
    { 
      label: 'Compras', 
      path: '/compras', 
      icon: <ShoppingBag color="success" />, 
      adminOrConsultorOnly: true, 
      badge: 'Sprint 6.5' 
    },
    { label: 'Despesas', path: '/despesas', icon: <ReceiptLong />, adminOrConsultorOnly: true },
    { 
      label: 'Controle DAS', 
      path: '/das', 
      icon: <RequestQuote color="primary" />, 
      adminOrConsultorOnly: true, 
      badge: 'Sprint 5' 
    },
    { label: 'Relatório Entregas', path: '/relatorio-entregas', icon: <TrendingUp color="primary" />, adminOrConsultorOnly: true },
    { 
      label: 'Relatório MEI (DASN)', 
      path: '/relatorio-mei', 
      icon: <Assessment color="secondary" />, 
      adminOrConsultorOnly: true, 
      badge: 'Principal' 
    },
    { label: 'Saúde do Negócio', path: '/saude-negocio', icon: <Favorite color="error" />, adminOrConsultorOnly: true },
    
    // MÓDULOS SATÉLITES OPCIONAIS (Feature Flags por Empresa)
    { label: 'Motoboys', path: '/motoboys', icon: <TwoWheeler />, adminOnly: false, moduleKey: 'modulo_motoboy' },
    { label: 'Controle iFood', path: '/ifood', icon: <DeliveryDining />, adminOnly: false, moduleKey: 'modulo_ifood' },
    
    // GESTÃO ADMINISTRATIVA & CONSULTORIA
    { 
      label: 'Painel do Consultor', 
      path: '/consultor', 
      icon: <SupervisorAccount color="primary" />, 
      consultorOnly: true, 
      badge: 'Sprint 7' 
    },
    { label: 'Usuários / Equipe', path: '/usuarios', icon: <People />, adminOnly: true },
    { label: 'Configurações & Módulos', path: '/configuracoes', icon: <Settings />, adminOnly: true },
  ];

  // Filtra itens com base nas permissões e nos módulos ativos da empresa
  const visibleNavItems = navItems.filter((item) => {
    if (item.consultorOnly && !isConsultor) return false;
    if (item.adminOnly && !isAdmin) return false;
    if (item.adminOrConsultorOnly && !isAdmin && !isConsultor) return false;
    if (item.moduleKey === 'modulo_motoboy' && empresa?.modulo_motoboy === false) return false;
    if (item.moduleKey === 'modulo_ifood' && empresa?.modulo_ifood === false) return false;
    return true;
  });

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand Header Oficial */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            component="img"
            src={logoIcon}
            alt="Logo Gestor MEI"
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              boxShadow: '0 4px 14px rgba(7, 25, 51, 0.25)',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
          <Box sx={{ overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="h6" fontWeight={800} color="primary" sx={{ lineHeight: 1.15, letterSpacing: '-0.01em' }} noWrap>
              GESTOR MEI
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.01em', display: 'block', lineHeight: 1.2 }}>
              ERP Inteligente
            </Typography>
          </Box>
        </Box>

        <Box sx={{ overflow: 'hidden', minWidth: 0, pl: 0.25 }}>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mb: 0.5, fontSize: '0.74rem', fontWeight: 500, opacity: 0.85 }}>
            {empresa?.nome_fantasia || 'Minha Empresa'}
          </Typography>
          <ApiStatusIndicator size="small" />
        </Box>
      </Box>

      <Divider />

      {/* Navigation List */}
      <List sx={{ px: 1.5, py: 1, flexGrow: 1 }}>
        {visibleNavItems.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                selected={isSelected}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  minHeight: 44,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isSelected ? 'inherit' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: isSelected ? 600 : 500,
                  }}
                />
                {item.badge && (
                  <Chip
                    label={item.badge}
                    size="small"
                    color="secondary"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* User Info footer */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: isAdmin ? 'secondary.main' : 'primary.main', fontSize: '0.85rem' }}>
            {user?.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {user?.nome}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {getCargoLabel()}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={handleLogout} title="Sair da Conta">
          <Logout fontSize="small" />
        </IconButton>
      </Box>

      {/* Assinatura Oficial LPTI Tech */}
      <Box sx={{ p: 1.2, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', opacity: 0.85 }}>
          Desenvolvido por <strong>LPTI Tech</strong>
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top App Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: { xs: 56, sm: 64 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              color="inherit"
              aria-label="abrir menu"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 1, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Storefront color="primary" sx={{ display: { xs: 'none', sm: 'inline-block' } }} />
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {empresa?.nome_fantasia || 'GESTOR MEI'}
              </Typography>
              <Chip
                label="ERP Oficial"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
              />
              <Box sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
                <ApiStatusIndicator size="small" />
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              <ApiStatusIndicator variant="text" />
            </Box>
            {/* Theme Toggle */}
            <Tooltip title={mode === 'dark' ? 'Modo Claro' : 'Modo Escuro'}>
              <IconButton onClick={toggleTheme} color="inherit" size="small">
                {mode === 'dark' ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
              </IconButton>
            </Tooltip>

            {/* Quick User Avatar */}
            <IconButton onClick={handleMenuClick} size="small" sx={{ ml: 0.5 }}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: isAdmin ? 'secondary.main' : 'primary.main',
                  fontSize: '0.85rem',
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
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {user?.nome}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => { handleMenuClose(); navigate('/configuracoes'); }}>
                <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
                Configurações & Módulos
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon>
                Sair
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Responsive Drawer */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: { xs: '56px', sm: '64px' },
          mb: { xs: '65px', md: 0 },
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Box>

      {/* Mobile Bottom Navigation Bar */}
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
              icon={<PointOfSale color={location.pathname === '/vendas' ? 'primary' : 'inherit'} />}
            />
            <BottomNavigationAction
              label="Início"
              value="/"
              icon={<DashboardIcon color={location.pathname === '/' ? 'primary' : 'inherit'} />}
            />
            <BottomNavigationAction
              label="Caixa"
              value="/caixa"
              icon={<AccountBalanceWallet color={location.pathname === '/caixa' ? 'primary' : 'inherit'} />}
            />
            <BottomNavigationAction
              label="MEI"
              value="/relatorio-mei"
              icon={<Assessment color={location.pathname === '/relatorio-mei' ? 'secondary' : 'inherit'} />}
            />
            <BottomNavigationAction
              label="Mais"
              value="menu"
              icon={<MenuIcon />}
            />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};
