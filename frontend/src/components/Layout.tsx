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

const DRAWER_WIDTH = 260;

interface NavItemDef {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  consultorOnly?: boolean;
  badge?: string;
  moduleKey?: 'modulo_motoboy' | 'modulo_ifood';
}

export const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, empresa, logout, isAdmin, isConsultor } = useAuth();
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
      adminOnly: false, 
      badge: 'Sprint 6' 
    },
    { 
      label: 'Compras', 
      path: '/compras', 
      icon: <ShoppingBag color="success" />, 
      adminOnly: false, 
      badge: 'Sprint 6.5' 
    },
    { label: 'Despesas', path: '/despesas', icon: <ReceiptLong />, adminOnly: false },
    { 
      label: 'Controle DAS', 
      path: '/das', 
      icon: <RequestQuote color="primary" />, 
      adminOnly: false, 
      badge: 'Sprint 5' 
    },
    { label: 'Relatório Entregas', path: '/relatorio-entregas', icon: <TrendingUp color="primary" />, adminOnly: false },
    { 
      label: 'Relatório MEI (DASN)', 
      path: '/relatorio-mei', 
      icon: <Assessment color="secondary" />, 
      adminOnly: false, 
      badge: 'Principal' 
    },
    { label: 'Saúde do Negócio', path: '/saude-negocio', icon: <Favorite color="error" />, adminOnly: false },
    
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
    if (item.moduleKey === 'modulo_motoboy' && empresa?.modulo_motoboy === false) return false;
    if (item.moduleKey === 'modulo_ifood' && empresa?.modulo_ifood === false) return false;
    return true;
  });

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.2rem',
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)',
          }}
        >
          MEI
        </Box>
        <Box sx={{ overflow: 'hidden' }}>
          <Typography variant="h6" fontWeight={800} color="primary" lineHeight={1.2}>
            GESTOR MEI
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mb: 0.5 }}>
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
              {isAdmin ? 'Administrador' : 'Operador'}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={handleLogout} title="Sair da Conta">
          <Logout fontSize="small" />
        </IconButton>
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
                label="MEI"
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
