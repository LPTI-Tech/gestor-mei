import * as XLSX from 'xlsx';

export const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

function parseDateInput(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput;
  const str = String(dateInput).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [year, month, day] = str.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  const hasTimezone = str.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(str);
  return new Date(hasTimezone ? str : `${str}-03:00`);
}

export const formatDate = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return '-';
  try {
    const d = parseDateInput(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateStr);
  }
};

export const formatDateTime = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return '-';
  try {
    const d = parseDateInput(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return String(dateStr);
  }
};

export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Relatório') => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const exportToCSV = (data: any[], fileName: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
