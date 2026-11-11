import React from 'react';
import {
  Table,
  TableProps,
  TableContainer,
  TableContainerProps,
  TableHead,
  TableHeadProps,
  TableBody,
  TableBodyProps,
  TableRow,
  TableRowProps,
  TableCell,
  TableCellProps,
  Paper,
  styled,
} from '@mui/material';
import { sentinelTokens } from './tokens';

export const SentinelTableContainer = styled(Paper)(({ theme }) => {
  const isDark = theme.palette.mode === 'dark';
  return {
    borderRadius: sentinelTokens.shape.card,
    border: `1px solid ${isDark ? sentinelTokens.colors.surfaces.darkBorder : sentinelTokens.colors.surfaces.lightBorder}`,
    backgroundColor: isDark ? sentinelTokens.colors.surfaces.darkPaper : '#FFFFFF',
    boxShadow: 'none',
    overflow: 'hidden',
  };
});

export const SentinelTable = styled(Table)<TableProps>(() => ({
  fontFamily: sentinelTokens.typography.fontFamily,
  borderCollapse: 'separate',
  borderSpacing: 0,
}));

export const SentinelTableHead = styled(TableHead)<TableHeadProps>(({ theme }) => {
  const isDark = theme.palette.mode === 'dark';
  return {
    backgroundColor: isDark ? '#081322' : '#F1F3F5',
    '& .MuiTableCell-head': {
      fontSize: sentinelTokens.typography.sizes.micro,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: isDark ? 'rgba(255, 255, 255, 0.65)' : '#495057',
      borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
      padding: '10px 14px',
      whiteSpace: 'nowrap',
    },
  };
});

export const SentinelTableRow = styled(TableRow)<TableRowProps>(({ theme }) => {
  const isDark = theme.palette.mode === 'dark';
  return {
    minHeight: 44,
    transition: 'background-color 0.12s ease',
    '&:hover': {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(25, 118, 210, 0.03)',
    },
    '&:last-child .MuiTableCell-root': {
      borderBottom: 'none',
    },
  };
});

export interface SentinelTableCellProps extends TableCellProps {
  tabular?: boolean;
}

export const SentinelTableCell = styled(TableCell, {
  shouldForwardProp: (prop) => prop !== 'tabular',
})<SentinelTableCellProps>(({ theme, tabular = true }) => {
  const isDark = theme.palette.mode === 'dark';
  return {
    fontFamily: sentinelTokens.typography.fontFamily,
    fontSize: sentinelTokens.typography.sizes.bodyDense, // 13px
    padding: '9px 14px',
    color: isDark ? 'rgba(255, 255, 255, 0.9)' : '#212529',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    ...(tabular ? sentinelTokens.typography.tabularNums : {}),
  };
});
