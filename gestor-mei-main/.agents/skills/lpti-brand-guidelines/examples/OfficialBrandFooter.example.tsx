import React from 'react';
import { Box, Typography } from '@mui/material';

interface OfficialBrandFooterProps {
  version?: string;
}

export const OfficialBrandFooter: React.FC<OfficialBrandFooterProps> = ({ version = '1.4.0' }) => {
  return (
    <Box
      sx={{
        py: 1.5,
        px: 2,
        textAlign: 'center',
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          fontSize: '0.7rem',
          letterSpacing: '0.01em',
          display: 'block',
        }}
      >
        Desenvolvido por <strong>LPTI Tech</strong> • v{version}
      </Typography>
    </Box>
  );
};
