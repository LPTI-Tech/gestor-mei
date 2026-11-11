import React from 'react';
import { TextField, TextFieldProps, styled } from '@mui/material';
import { sentinelTokens } from './tokens';

export interface SentinelInputProps extends Omit<TextFieldProps, 'variant'> {
  sentinelDense?: boolean;
}

export const SentinelInput = styled(TextField, {
  shouldForwardProp: (prop) => prop !== 'sentinelDense',
})<SentinelInputProps>(({ theme, sentinelDense = true }) => {
  const isDark = theme.palette.mode === 'dark';

  return {
    fontFamily: sentinelTokens.typography.fontFamily,
    '& .MuiOutlinedInput-root': {
      borderRadius: sentinelTokens.shape.control,
      fontFamily: sentinelTokens.typography.fontFamily,
      fontSize: sentinelTokens.typography.sizes.bodyDense, // 13px
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      ...sentinelTokens.typography.tabularNums,

      '& fieldset': {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
        borderWidth: '1px',
      },
      '&:hover fieldset': {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.28)',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#1976D2',
        borderWidth: '1.5px',
      },
      '&.Mui-focused': {
        boxShadow: isDark
          ? '0 0 0 3px rgba(25, 118, 210, 0.25)'
          : '0 0 0 3px rgba(25, 118, 210, 0.12)',
      },
      '& input': {
        padding: sentinelDense ? '8.5px 12px' : '12px 14px',
        fontSize: sentinelTokens.typography.sizes.bodyDense,
        fontFamily: sentinelTokens.typography.fontFamily,
        '&::placeholder': {
          fontSize: sentinelTokens.typography.sizes.bodyDense,
          opacity: 0.65,
        },
      },
    },
    '& .MuiInputLabel-root': {
      fontFamily: sentinelTokens.typography.fontFamily,
      fontSize: '0.8125rem',
      '&.Mui-focused': {
        color: '#1976D2',
      },
    },
    '& .MuiFormHelperText-root': {
      fontFamily: sentinelTokens.typography.fontFamily,
      fontSize: sentinelTokens.typography.sizes.micro,
      marginLeft: '2px',
    },
  };
});
