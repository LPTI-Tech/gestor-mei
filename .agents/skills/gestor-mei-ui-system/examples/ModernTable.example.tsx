import React from 'react';
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { MoreVert, Edit, Visibility } from '@mui/icons-material';

interface ColumnDef<T> {
  id: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => React.ReactNode;
}

interface ModernTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function ModernTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'Nenhum registro encontrado no período selecionado.',
}: ModernTableProps<T>) {
  if (data.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 6,
          textAlign: 'center',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="body1" fontWeight={600} color="text.secondary">
          {emptyMessage}
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow
            sx={{
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC'),
            }}
          >
            {columns.map((col) => (
              <TableCell
                key={col.id}
                align={col.align || 'left'}
                sx={{
                  py: 1.8,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'text.secondary',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={keyExtractor(row)}
              hover
              onClick={() => onRowClick && onRowClick(row)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background-color 0.15s ease',
                '&:last-child td, &:last-child th': { border: 0 },
                '&:hover': {
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(7, 25, 51, 0.02)'),
                },
              }}
            >
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align || 'left'}
                  sx={{
                    py: 1.8,
                    fontSize: '0.875rem',
                    borderColor: 'divider',
                  }}
                >
                  {col.render ? col.render(row) : (row as any)[col.id]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

