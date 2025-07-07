import React from 'react';
import { Box, Typography } from '@mui/material';

const interests = [
  { name: 'fashion', icon: '👗', color: '#e040fb' },
  { name: 'tourism', icon: '🌍', color: '#40c4ff' },
  { name: 'food', icon: '🍔', color: '#ffa726' },
  { name: 'fitness', icon: '🏋️', color: '#66bb6a' },
  { name: 'music', icon: '🎵', color: '#7e57c2' },
  { name: 'gaming', icon: '🎮', color: '#ff7043' }
];
function getInterestData(interestName) {
  return interests.find(i => i.name === interestName) || { icon: '', color: '#ccc' };
}

export default function PlayerColumn({ player, isCurrent }) {
  const interestData = getInterestData(player.interest);
  return (
    <div style={{
      border: `3px solid ${interestData.color}`,
      borderRadius: 8,
      padding: 16,
      minWidth: 180,
      background: isCurrent ? `${interestData.color}15` : '#fff',
      boxShadow: isCurrent ? `0 0 15px 5px ${interestData.color}30` : undefined,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      position: 'relative',
      boxSizing: 'border-box',
      width: '100%'
    }}>
      <div style={{ minHeight: 80 }} />
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography fontWeight={700}>{player.name}</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 22, marginBottom: 2 }}>{interestData.icon}</span>
          <Typography>{player.interest ? player.interest.charAt(0).toUpperCase() + player.interest.slice(1) : ''}</Typography>
        </Box>
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