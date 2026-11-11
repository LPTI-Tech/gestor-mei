/**
 * ============================================================================
 * GESTOR MEI — Design System Sentinel Tokens
 * LPTI Tech Proprietary Design Tokens
 * ============================================================================
 */

export const sentinelTokens = {
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    tabularNums: {
      fontFeatureSettings: '"tnum"',
      fontVariantNumeric: 'tabular-nums',
    },
    sizes: {
      micro: '0.6875rem',    // 11px
      caption: '0.75rem',     // 12px
      bodyDense: '0.8125rem', // 13px (Padrão Operacional Godly/Sentinel)
      body: '0.875rem',       // 14px
      subhead: '0.9375rem',   // 15px
      h3: '1.125rem',         // 18px
      h2: '1.25rem',          // 20px
      h1: '1.5rem',           // 24px
      display: '1.75rem',     // 28px
    },
    weights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      black: 800,
    },
  },
  colors: {
    master: {
      obsidian: '#040D1A',
      slate: '#08162A',
      accent: '#1976D2',
      governance: '#4F46E5',
      border: 'rgba(25, 118, 210, 0.25)',
      glow: 'rgba(25, 118, 210, 0.12)',
    },
    owner: {
      navy: '#071933',
      slate: '#0F2547',
      accent: '#107C41',
      warning: '#B76E00',
      border: 'rgba(7, 25, 51, 0.15)',
    },
    surfaces: {
      lightCanvas: '#F8F9FA',
      lightPaper: '#FFFFFF',
      lightBorder: 'rgba(0, 0, 0, 0.08)',
      darkCanvas: '#060E18',
      darkPaper: '#0B1727',
      darkBorder: 'rgba(255, 255, 255, 0.08)',
    },
    status: {
      active: {
        bg: 'rgba(16, 124, 65, 0.08)',
        border: '#107C41',
        text: '#107C41',
      },
      warning: {
        bg: 'rgba(183, 110, 0, 0.08)',
        border: '#B76E00',
        text: '#B76E00',
      },
      error: {
        bg: 'rgba(197, 34, 31, 0.08)',
        border: '#C5221F',
        text: '#C5221F',
      },
      info: {
        bg: 'rgba(2, 132, 199, 0.08)',
        border: '#0284C7',
        text: '#0284C7',
      },
    },
  },
  shape: {
    pill: '9999px',
    control: '8px',
    card: '12px',
    micro: '6px',
  },
};
