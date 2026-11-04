import { createTheme, responsiveFontSizes } from '@mui/material/styles';

export const getAppTheme = (mode: 'light' | 'dark') => {
  let theme = createTheme({
    palette: {
      mode,
      primary: {
        main: '#1976D2', // Confiança, tom bancário e profissional
        light: '#42A5F5',
        dark: '#1565C0',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#2E7D32', // Sucesso, dinheiro, lucratividade
        light: '#4CAF50',
        dark: '#1B5E20',
        contrastText: '#ffffff',
      },
      warning: {
        main: '#ED6C02',
        light: '#FF9800',
        dark: '#E65100',
      },
      error: {
        main: '#D32F2F',
        light: '#EF5350',
        dark: '#C62828',
      },
      background: {
        default: mode === 'light' ? '#F4F6F8' : '#121212',
        paper: mode === 'light' ? '#FFFFFF' : '#1E1E1E',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 700,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: '0.95rem',
            minHeight: '44px', // Touch-friendly for mobile
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: mode === 'light' 
              ? '0 2px 10px rgba(0,0,0,0.06)' 
              : '0 2px 10px rgba(0,0,0,0.3)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: {
            borderRadius: 12,
          },
        },
      },
    },
  });

  return responsiveFontSizes(theme);
};
