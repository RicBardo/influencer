import React, { useState } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, TextField, Switch, FormControlLabel, Button, Grid, Accordion, AccordionSummary, AccordionDetails, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const interests = [
  { name: 'Fashion', emoji: '👗' },
  { name: 'Gaming', emoji: '🎮' },
  { name: 'Music', emoji: '🎵' },
  { name: 'Travel', emoji: '✈️' },
  { name: 'Food', emoji: '🍔' },
  { name: 'Tech', emoji: '💻' }
];
const firstNames = ['Alex', 'Taylor', 'Jordan', 'Morgan', 'Casey', 'Jamie', 'Riley', 'Avery', 'Cameron', 'Drew', 'Harper', 'Quinn', 'Reese', 'Skyler', 'Sydney', 'Peyton', 'Rowan', 'Sawyer', 'Emerson', 'Finley'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Martinez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White'];

const rules = [
  {
    title: 'Setup',
    content: `
      <div style="font-weight: bold; font-size: 1.15em; margin-bottom: 6px;">
        Each influencer chooses their interest and places the corresponding Wall Card and tokens (one for each type) in front of them.
      </div>
      <div style="font-weight: bold; margin-bottom: 2px;">Deck composition</div>
      There are two types of cards in the deck: Content Cards (10 for each interest) and Network Cards (10 in total).<br/>
      Before starting the game, remove from the deck all Content Cards of interests not chosen by any influencer.<br/>
      <span style="color: #888; font-style: italic;">Example: if 3 people are playing and they chose Fashion, Food and Gaming as their interests, the deck will have 40 cards: 10 for Fashion, 10 for Food, 10 for Gaming, plus 10 Network Cards.</span><br/>
      <br/>
      If it's a 1v1 game — or if you prefer a simpler experience — remove the Network Cards as well.<br/>
      <br/>
      Once you have assembled the deck, shuffle it and deal 3 cards to each player. Then, place the deck in the center of the table within everyone's reach.
    `
  },
  {
    title: 'Cards',
    content: `
      <div style="margin-bottom: 8px;"><b>Content Cards</b></div>
      Each interest has 10 Content Cards (also called 'posts'), with values ranging from 1 to 3 Popularity Points (Pp):
      <ul style="margin-top: 4px; margin-bottom: 8px;">
        <li>6 cards worth 1 Pp</li>
        <li>3 cards worth 2 Pp</li>
        <li>1 card worth 3 Pp</li>
      </ul>
      <div style="margin-bottom: 4px;"><b>Network Cards</b></div>
      There are 10 different Network Cards, each introducing unique actions and twists to the gameplay. The effect of each card is written directly on it.
    `
  },
  {
    title: 'Tokens',
    content: `
      There are six types of tokens: Like, Dislike, Share, Report, Follow, and Ban.<br/>
      Players start the game with 1 token of each type.
      <ul style="margin-top: 4px;">
        <li><b>Like</b> and <b>Dislike</b> tokens can be played on any published Content Card, adding +1 or -1 to its value.</li>
        <li><b>Share</b> and <b>Report</b> tokens can only be played on Content Cards published by other players. Sharing a post counts as if it were published on your own wall. A Report token nullifies the card's value.</li>
        <li><b>Follow</b> and <b>Ban</b> tokens must be played directly on other players' profiles. Following an influencer allows you to acquire their interest (in addition to your own). Banning an influencer removes all of their tokens in play from the game (including Share tokens).</li>
      </ul>
    `
  },
  {
    title: 'Turn',
    content: `
      <ol style="margin-top: 4px; margin-bottom: 8px; padding-left: 20px;">
        <li>Draw a card.</li>
        <li>Play a card. If you play a <b>Content Card</b>, publish it on your wall above any previous posts (newest on top). If your wall already contains 3 cards, the oldest post slides off and goes to a discard pile next to the deck. Any tokens on it return to their owners' hands. If you play a <b>Network Card</b>, its effect is applied immediately, and the card goes straight to the discard pile.</li>
        <li>Play a token (optional – see "Tokens" section).</li>
        <li>Calculate your score (see "Scoring" section) and end your turn.</li>
      </ol>
    `
  },
  {
    title: 'Scoring',
    content: `
      At the end of your turn, calculate your total Pp:
      <ul style="margin-top: 4px;">
        <li>Add the value of any Content Cards you published during this turn.</li>
        <li>Add the value of any Content Cards (of your innate or acquired interest) still on your wall from previous turns.</li>
        <li>Include any bonus Pp from tokens or Network Cards.</li>
      </ul>
      The first player to reach 40 Pp wins!
    `
  }
];

const nameEmojis = ['🎲', '✨', '😎', '🌟', '🔥', '💡'];

export default function SetupScreen({ onStart }) {
  const [numPlayers, setNumPlayers] = useState(2);
  const [players, setPlayers] = useState([
    { name: '', interest: '' },
    { name: '', interest: '' }
  ]);
  const [networkCards, setNetworkCards] = useState(true);

  const handleNumPlayers = (e) => {
    const n = parseInt(e.target.value, 10);
    setNumPlayers(n);
    setPlayers((prev) => {
      const arr = prev.slice(0, n);
      while (arr.length < n) arr.push({ name: '', interest: '' });
      return arr;
    });
    if (n === 2) setNetworkCards(false);
    if (n > 2) setNetworkCards(true);
  };

  const handlePlayerChange = (idx, field, value) => {
    setPlayers((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const generateName = (idx) => {
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    handlePlayerChange(idx, 'name', `${first} ${last}`);
  };

  // Button disabled logic: all interests must be chosen and unique
  const allInterestsSelected = players.length > 0 && players.every(p => p.interest) && new Set(players.map(p => p.interest)).size === players.length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onStart && allInterestsSelected) onStart({ players, networkCards });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 3px 12px rgba(0,0,0,0.08)', maxWidth: 480, width: '100%', margin: 'auto' }}>
        <div style={{ color: '#9147ff', fontWeight: 700, fontSize: 32, textAlign: 'center', marginBottom: 8, fontFamily: 'Rowdies, sans-serif' }}>
          Influencer
        </div>
        <div style={{ color: '#222', fontWeight: 400, fontSize: 18, textAlign: 'center', marginBottom: 16 }}>
          Welcome to the world of social media superstardom! Each player is an influencer battling for the spotlight. The first to reach a <span style={{ fontWeight: 700, color: '#9147ff' }}>Popularity Score of 40</span> wins the game!
        </div>
        {/* Rules Accordions */}
        <div style={{ marginBottom: 24 }}>
          {rules.map((rule, idx) => (
            <Accordion key={idx} sx={{ mb: 1, border: '1px solid #9147ff', borderRadius: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#9147ff' }} />}>
                <span style={{ fontWeight: 600, color: '#9147ff' }}>{rule.title}</span>
              </AccordionSummary>
              <AccordionDetails>
                <span style={{ color: '#444', textAlign: 'left', display: 'block' }} dangerouslySetInnerHTML={{ __html: rule.content }} />
              </AccordionDetails>
            </Accordion>
          ))}
        </div>
        {/* Player Setup Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, color: '#9147ff', marginBottom: 4 }}>Number of Players</label>
            <select value={numPlayers} onChange={handleNumPlayers} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}>
              {[2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, color: '#9147ff', marginBottom: 4 }}>Player Names & Interests</label>
            {players.map((player, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    placeholder={`Player ${idx + 1} Name`}
                    value={player.name}
                    onChange={e => handlePlayerChange(idx, 'name', e.target.value)}
                    style={{ width: '100%', padding: '8px 36px 8px 8px', borderRadius: 6, border: '1px solid #ccc', fontSize: 16, boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => generateName(idx)}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9147ff', padding: 0 }}
                    title="Auto-generate name"
                  >
                    🎲
                  </button>
                </div>
                <select
                  value={player.interest}
                  onChange={e => handlePlayerChange(idx, 'interest', e.target.value)}
                  style={{ flex: 1, minWidth: 0, padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16, boxSizing: 'border-box' }}
                >
                  <option value="" disabled hidden>Select interest…</option>
                  {interests.map(interest => {
                    // Disable if this interest is already selected by another player
                    const taken = players.some((p, i) => i !== idx && p.interest === interest.name);
                    return (
                      <option key={interest.name} value={interest.name} disabled={taken}>
                        {interest.emoji} {interest.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            ))}
          </div>
          {/* Network Cards Toggle Switch */}
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label htmlFor="networkCards" style={{ color: '#9147ff', fontWeight: 600, cursor: numPlayers === 2 ? 'not-allowed' : 'pointer', marginRight: 8 }}>
              Network Cards
            </label>
            <Switch
              checked={numPlayers === 2 ? false : networkCards}
              onChange={e => setNetworkCards(e.target.checked)}
              disabled={numPlayers === 2}
              inputProps={{ id: 'networkCards' }}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#9147ff',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#9147ff',
                },
                '& .MuiSwitch-track': {
                  backgroundColor: '#ccc',
                },
              }}
            />
          </div>
          <button type="submit" style={{ width: '100%', background: allInterestsSelected ? '#9147ff' : '#aaa', color: '#fff', fontWeight: 700, fontSize: 18, padding: '12px 0', border: 'none', borderRadius: 8, cursor: allInterestsSelected ? 'pointer' : 'not-allowed', marginTop: 8 }} disabled={!allInterestsSelected}>
            Start Game
          </button>
        </form>
      </div>
    </div>
  );
} 