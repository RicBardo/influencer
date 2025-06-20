import React from 'react';
import { Box, Typography } from '@mui/material';

export default function PlayerColumn({ player, isCurrent, interestColors }) {
  const color = interestColors[player.interest] || '#9147ff';
  return (
    <div style={{
      border: `3px solid ${color}`,
      borderRadius: 8,
      padding: 16,
      minWidth: 180,
      background: isCurrent ? 'rgba(145,71,255,0.08)' : 'white',
      boxShadow: isCurrent ? '0 0 15px 5px rgba(145,71,255,0.15)' : undefined,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      position: 'relative',
      boxSizing: 'border-box',
      width: '100%'
    }}>
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography fontWeight={700}>{player.name}</Typography>
        <Typography>{player.interest ? player.interest.charAt(0).toUpperCase() + player.interest.slice(1) : ''}</Typography>
      </Box>
      <Box sx={{ width: '100%', height: 18, background: '#eee', borderRadius: 1, mb: 1 }}>
        {/* Progress bar placeholder */}
      </Box>
      <Box sx={{ width: '100%', minHeight: 60, background: '#f8f8ff', borderRadius: 1, mb: 1 }}>
        <Typography variant="caption" color="text.secondary">Wall</Typography>
        {/* Wall cards placeholder */}
      </Box>
      <Box sx={{ width: '100%', minHeight: 40, background: '#f8f8ff', borderRadius: 1, mb: 1 }}>
        <Typography variant="caption" color="text.secondary">Hand</Typography>
        {/* Hand cards placeholder */}
      </Box>
      <Box sx={{ width: '100%', minHeight: 32, background: '#f8f8ff', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">Tokens</Typography>
        {/* Tokens placeholder */}
      </Box>
    </div>
  );
} 