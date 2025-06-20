import React, { useState } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, TextField, Switch, FormControlLabel, Button, Grid, Paper, Accordion, AccordionSummary, AccordionDetails, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const interests = [
  { name: 'fashion', icon: '👗' },
  { name: 'tourism', icon: '🌍' },
  { name: 'food', icon: '🍔' },
  { name: 'fitness', icon: '🏋️' },
  { name: 'music', icon: '🎵' },
  { name: 'gaming', icon: '🎮' }
];
const nameSuggestions = [
  'Alex', 'Jamie', 'Taylor', 'Jordan', 'Morgan', 'Casey', 'Riley', 'Skyler', 'Avery', 'Quinn', 'Charlie', 'Dakota',
  'Sam', 'Jess', 'Robin', 'Cameron', 'Drew', 'Harper', 'Peyton', 'Reese', 'Sawyer', 'Toby', 'Emery', 'Finley'
];

const rules = [
  {
    title: 'Your Turn',
    content: (
      <ol>
        <li><strong>Draw a Card:</strong> Take a new content card from the deck.</li>
        <li><strong>Post to Your Wall:</strong> Choose a card from your hand and add it to your Wall. If this makes 4 cards, the oldest post slides off into the Discard Pile. Any tokens on the sliding post are returned to their owners' token pool.</li>
        <li><strong>Play Interaction Tokens (optional):</strong> You may play as many tokens as you wish, or none at all, before ending your turn.</li>
        <li><strong>End Your Turn:</strong> Click 'End Turn' to calculate your new Popularity Score.</li>
      </ol>
    )
  },
  {
    title: 'How to Score Points',
    content: (
      <ul>
        <li>At the end of your turn, you gain Popularity Points from all posts you are currently scoring (including your Wall and any posts you are sharing).</li>
        <li>Posts that match your Interest score for you every turn they are in play.</li>
        <li>Any new post you play scores for you once, even if it doesn't match your Interest.</li>
        <li>Tokens can change how much a post scores, or who gets points from it.</li>
      </ul>
    )
  },
  {
    title: 'Interaction Tokens',
    content: (
      <ul>
        <li><strong>Like:</strong> Place on any post to add +1 point to its score for as long as the token remains in play.</li>
        <li><strong>Dislike:</strong> Place on any post to subtract 1 point from its score for as long as the token remains in play.</li>
        <li><strong>Report:</strong> Place on an opponent's post to nullify its score for as long as the token remains in play.</li>
        <li><strong>Share:</strong> Place on an opponent's post (that matches your Interest) to score from it every turn, as long as the token remains in play.</li>
        <li><strong>Follow:</strong> Place on another player's profile to temporarily gain their Interest and score from their type of content as well as your own. This token is single-use and stays until you follow someone else or are banned.</li>
        <li><strong>Ban:</strong> Place on an opponent's profile to remove all of their tokens from the board (including any Follow tokens) and send them to the Dump. The Ban token is also sent to the Dump after use.</li>
      </ul>
    )
  }
];

export default function SetupScreen() {
  const [playerCount, setPlayerCount] = useState('');
  const [players, setPlayers] = useState([]);
  const [networkCards, setNetworkCards] = useState(true);
  const [started, setStarted] = useState(false);

  React.useEffect(() => {
    if (playerCount) {
      setPlayers(Array.from({ length: Number(playerCount) }, (_, i) => players[i] || { name: `Player ${i+1}`, interest: '' }));
    } else {
      setPlayers([]);
    }
    // eslint-disable-next-line
  }, [playerCount]);

  const handlePlayerName = (i, value) => {
    setPlayers(players => players.map((p, idx) => idx === i ? { ...p, name: value } : p));
  };
  const handlePlayerInterest = (i, value) => {
    setPlayers(players => players.map((p, idx) => idx === i ? { ...p, interest: value } : p));
  };
  const autoGenerateName = (i) => {
    const random = nameSuggestions[Math.floor(Math.random() * nameSuggestions.length)] + ' ' + (i+1);
    setPlayers(players => players.map((p, idx) => idx === i ? { ...p, name: random } : p));
  };
  const allInterestsSelected = players.length > 0 && players.every(p => p.interest) && new Set(players.map(p => p.interest)).size === players.length;

  const handleStartGame = () => {
    setStarted(true);
    // Hide React setup, show vanilla game UI
    const setupRoot = document.getElementById('root');
    if (setupRoot) setupRoot.style.display = 'none';
    const vanillaSetup = document.getElementById('game-container');
    if (vanillaSetup) vanillaSetup.style.display = 'block';
    // Optionally, pass setup data to window/global for vanilla JS
    window.influencerSetup = { playerCount, players, networkCards };
  };

  if (started) return null;

  return (
    <Box sx={{ width: 440, mx: 'auto', mt: 6 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" fontWeight={700} align="center" gutterBottom>Influencer</Typography>
        <Box id="rules" sx={{ mb: 3 }}>
          <Typography align="center" sx={{ mb: 1, fontSize: '1.1em' }}>
            Welcome to the world of social media superstardom! Each player is an influencer battling for the spotlight. The first to reach a <strong>Popularity Score of 40</strong> wins the game!
          </Typography>
          {rules.map((rule, idx) => (
            <Accordion key={idx} defaultExpanded={idx === 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={700}>{rule.title}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {rule.content}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="player-count-label">Number of Players</InputLabel>
            <Select
              labelId="player-count-label"
              value={playerCount}
              label="Number of Players"
              onChange={e => setPlayerCount(e.target.value)}
            >
              <MenuItem value=""><em>-</em></MenuItem>
              {[2,3,4,5,6].map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </Select>
          </FormControl>
          <Box id="player-fields">
            {players.map((player, i) => (
              <Grid container spacing={1} alignItems="center" key={i} sx={{ mb: 1 }}>
                <Grid item xs={7}>
                  <TextField
                    label={`Player ${i+1} Name`}
                    value={player.name}
                    onChange={e => handlePlayerName(i, e.target.value)}
                    fullWidth
                    InputProps={{
                      endAdornment: (
                        <IconButton onClick={() => autoGenerateName(i)} edge="end" size="small" title="Auto-generate name">
                          <span role="img" aria-label="dice">🎲</span>
                        </IconButton>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={5}>
                  <FormControl fullWidth>
                    <InputLabel id={`interest-label-${i}`}>Interest</InputLabel>
                    <Select
                      labelId={`interest-label-${i}`}
                      value={player.interest}
                      label="Interest"
                      onChange={e => handlePlayerInterest(i, e.target.value)}
                    >
                      <MenuItem value=""><em>-</em></MenuItem>
                      {interests.map(interest => (
                        <MenuItem
                          key={interest.name}
                          value={interest.name}
                          disabled={players.some((p, idx) => idx !== i && p.interest === interest.name)}
                        >
                          <span style={{ marginRight: 8 }}>{interest.icon}</span>
                          {interest.name.charAt(0).toUpperCase() + interest.name.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            ))}
          </Box>
          <Box className="toggle-row" sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={networkCards}
                  onChange={e => setNetworkCards(e.target.checked)}
                  color="secondary"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#9147ff',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#9147ff',
                    },
                  }}
                />
              }
              label={<Typography sx={{ fontWeight: 700 }}>Network Cards</Typography>}
              labelPlacement="start"
              sx={{ ml: 0 }}
            />
            <Typography sx={{ fontWeight: 700, minWidth: 32 }}>{networkCards ? 'ON' : 'OFF'}</Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 3 }}
            disabled={!allInterestsSelected}
            onClick={handleStartGame}
          >
            Start Game
          </Button>
        </Box>
      </Paper>
    </Box>
  );
} 