import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, LinearProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import PlayerColumn from './PlayerColumn';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ShareIcon from '@mui/icons-material/Share';
import ReportIcon from '@mui/icons-material/Report';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import BlockIcon from '@mui/icons-material/Block';

const interestColors = {
  fashion: '#FF69B4',
  tourism: '#87CEEB',
  food: '#FFA500',
  fitness: '#32CD32',
  music: '#9370DB',
  gaming: '#FF6347'
};

// Network Cards Data
const NETWORK_CARDS = [
  {
    title: 'SHIT STORM',
    description: 'All influencers but you lose 3 Pp.',
    effectKey: 'shitstorm',
    type: 'network'
  },
  {
    title: 'SPONSORED POST',
    description: 'You gain as many Pp as the number of posts of your interest in play.',
    effectKey: 'sponsored',
    type: 'network'
  },
  {
    title: 'SOCIAL CHALLENGE',
    description: 'Reveal a post from your hand and gain 2 Pp. All players with a card of the same interest also get 2 Pp. Others lose 2 Pp.',
    effectKey: 'challenge',
    type: 'network'
  },
  {
    title: 'STEAL IDEA',
    description: 'Remove one post from another influencer\'s wall and publish it on your wall.',
    effectKey: 'steal',
    type: 'network'
  },
  {
    title: 'CONTENT PLANNER',
    description: 'Collect all players\' hands. Add 3 posts to your hand, then shuffle and redistribute the rest',
    effectKey: 'planner',
    type: 'network'
  },
  {
    title: 'BOT',
    description: 'Browse the deck, publish up to 3 posts directly on your wall, then shuffle the deck.',
    effectKey: 'bot',
    type: 'network'
  },
  {
    title: 'STALKER',
    description: 'Gain 3 Like tokens.',
    effectKey: 'stalker',
    type: 'network'
  },
  {
    title: 'TROLL',
    description: 'Gain 3 Dislike tokens.',
    effectKey: 'troll',
    type: 'network'
  },
  {
    title: 'OPINION MAKER',
    description: 'Gain 1 Follow or Ban token.',
    effectKey: 'opinion',
    type: 'network'
  },
  {
    title: 'ACTIVE USER',
    description: 'Gain 1 Share or Report token.',
    effectKey: 'active',
    type: 'network'
  }
];

function getNetworkCards() {
  return NETWORK_CARDS.map(card => ({...card}));
}

// Add Rowdies font
const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=Rowdies:wght@300;400;700&display=swap';
link.rel = 'stylesheet';
document.head.appendChild(link);

const BOARD_SIZE = 40;

function createDeck(players, networkCardsEnabled) {
  const newDeck = [];
  players.forEach(player => {
    for (let i = 0; i < 6; i++) newDeck.push({ interest: player.interest, value: 1 });
    for (let i = 0; i < 3; i++) newDeck.push({ interest: player.interest, value: 2 });
    newDeck.push({ interest: player.interest, value: 3 });
  });
  // Add Network Cards if enabled
  if (networkCardsEnabled) {
    newDeck.push(...getNetworkCards());
  }
  return shuffleDeck(newDeck);
}

function shuffleDeck(deck) {
  return [...deck].sort(() => Math.random() - 0.5);
}

function createTokens(playerId, playerCount) {
  const tokens = [
    { type: 'like', count: 1, playerId, tooltip: 'Like - Adds 1 point per turn' },
    { type: 'dislike', count: 1, playerId, tooltip: 'Dislike - Subtracts 1 point per turn' },
    { type: 'report', count: 1, playerId, tooltip: 'Report - Nullifies post points' },
    { type: 'share', count: 1, playerId, tooltip: 'Share - Counts post points on your wall' }
  ];

  if (playerCount > 2) {
    tokens.push({ type: 'ban', count: 1, playerId, tooltip: 'Ban - Removes all tokens of the banned player' });
    tokens.push({ type: 'follow', count: 1, playerId, tooltip: 'Follow - Acquires interest of followed player' });
  }

  return tokens;
}

function getMaterialIcon(tokenType) {
  switch (tokenType) {
    case 'like': return <ThumbUpIcon />;
    case 'dislike': return <ThumbDownIcon />;
    case 'share': return <ShareIcon />;
    case 'report': return <ReportIcon />;
    case 'follow': return <PersonAddIcon />;
    case 'ban': return <BlockIcon />;
    default: return null;
  }
}

export default function GameBoard({ setup }) {
  const [deck, setDeck] = useState([]);
  const [discard, setDiscard] = useState([]);
  const [players, setPlayers] = useState([]); // {name, interest, wall, hand, position, tokens, isFollowing, followers}
  const [currentIdx, setCurrentIdx] = useState(0);
  const [mustDraw, setMustDraw] = useState(true);
  const [isTokenPhase, setIsTokenPhase] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null); // {type: 'like'|'dislike'|'share'|'report'|'follow'|'ban'}
  const [tokensDump, setTokensDump] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [scoreLog, setScoreLog] = useState('');
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    if (!setup) return;
    // Initialize players
    const initialPlayers = setup.players.map((p, idx) => ({
      ...p,
      wall: [],
      hand: [],
      position: 0,
      tokens: createTokens(idx, setup.players.length),
      isFollowing: null,
      followers: []
    }));
    // Create and shuffle deck
    let newDeck = createDeck(initialPlayers, setup.networkCards);
    // Deal 3 cards to each player
    for (let i = 0; i < 3; i++) {
      initialPlayers.forEach(player => {
        player.hand.push(newDeck.pop());
      });
    }
    setPlayers(initialPlayers);
    setDeck(newDeck);
    setDiscard([]);
    setCurrentIdx(0);
    setMustDraw(true);
    setIsTokenPhase(false);
    setSelectedToken(null);
    setTokensDump([]);
    setScoreLog('');
    setGameEnded(false);
    setWinner(null);
  }, [setup]);

  if (!setup || players.length === 0) return null;
  const currentPlayer = players[currentIdx];

  // Calculate score function
  const calculateScore = () => {
    let score = 0;
    let log = `Calculating score for ${currentPlayer.name}:\n`;

    const activeInterests = new Set([currentPlayer.interest]);
    if (currentPlayer.isFollowing) {
      const followedPlayer = currentPlayer.isFollowing;
      if (followedPlayer) {
        activeInterests.add(followedPlayer.interest);
        log += `${currentPlayer.name} is following ${followedPlayer.name}, gaining their interest: ${followedPlayer.interest}.\n`;
      }
    }

    players.forEach(player => {
      player.wall.forEach(card => {
        let cardValue = card.value;
        let tokenPoints = 0;
        let reportTokenPresent = false;

        if (card.tokens) {
          card.tokens.forEach(token => {
            if (token.type === 'like') tokenPoints += 1;
            else if (token.type === 'dislike') tokenPoints -= 1;
            else if (token.type === 'report') reportTokenPresent = true;
          });
        }

        if (reportTokenPresent) {
          log += `Card ${card.interest} on ${player.name}'s wall is reported, nullifying its points.\n`;
          return; // Skip this card entirely
        }

        const totalCardValue = cardValue + tokenPoints;

        // Score for the owner of the wall
        if (player === currentPlayer) {
          if (activeInterests.has(card.interest)) {
            score += totalCardValue;
            log += `Your card ${card.interest} scored ${totalCardValue} points (active interest).\n`;
          } else if (card.turnPosted) {
            score += totalCardValue;
            log += `Your new card ${card.interest} scored ${totalCardValue} points (one time).\n`;
            card.turnPosted = false;
          }
        }

        // Score for share tokens from the current player
        if (card.tokens) {
          card.tokens.forEach(token => {
            if (token.type === 'share' && token.player === currentPlayer) {
              score += totalCardValue;
              log += `Your share token on ${player.name}'s card ${card.interest} scored ${totalCardValue} points.\n`;
            }
          });
        }
      });
    });

    log += `Total score for this turn: ${score}\n`;
    setScoreLog(log);
    return score;
  };

  // Draw card logic
  const handleDrawCard = () => {
    if (!mustDraw) return;
    if (deck.length === 0) {
      // Reshuffle discard into deck
      setDeck(shuffleDeck(discard));
      setDiscard([]);
      return;
    }
    const newPlayers = [...players];
    newPlayers[currentIdx] = {
      ...currentPlayer,
      hand: [...currentPlayer.hand, deck[deck.length - 1]]
    };
    setPlayers(newPlayers);
    setDeck(deck.slice(0, -1));
    setMustDraw(false);
  };

  // Play card logic (from hand to wall)
  const handlePlayCard = idx => {
    if (mustDraw || isTokenPhase) return;
    const card = currentPlayer.hand[idx];
    
    // Check if it's a network card
    if (card.type === 'network') {
      applyNetworkCardEffect(card);
      // Remove network card from hand
      const newPlayers = [...players];
      newPlayers[currentIdx] = {
        ...currentPlayer,
        hand: currentPlayer.hand.filter((_, i) => i !== idx)
      };
      setPlayers(newPlayers);
      return;
    }

    const newHand = currentPlayer.hand.filter((_, i) => i !== idx);
    let newWall = [...currentPlayer.wall, card];
    let newDiscard = [...discard];
    if (newWall.length > 3) {
      newDiscard.push(newWall[0]);
      newWall = newWall.slice(1);
    }
    const newPlayers = [...players];
    newPlayers[currentIdx] = {
      ...currentPlayer,
      hand: newHand,
      wall: newWall
    };
    setPlayers(newPlayers);
    setDiscard(newDiscard);
    setIsTokenPhase(true);
    setSelectedToken(null);
  };

  // Token selection
  const handleSelectToken = (type) => {
    if (!isTokenPhase) return;
    // If the clicked token type is already selected, deselect it.
    if (selectedToken && selectedToken.type === type) {
      setSelectedToken(null);
    } else {
      // Otherwise, select the new token type.
      setSelectedToken({
        type: type,
        player: currentPlayer
      });
    }
  };

  // Token placement on card
  const handlePlaceTokenOnCard = (playerIdx, cardIdx) => {
    if (!isTokenPhase || !selectedToken) return;
    if (!isCardValidTarget(players[playerIdx], players[playerIdx].wall[cardIdx])) return;
    
    const newPlayers = [...players];
    const targetCard = { ...newPlayers[playerIdx].wall[cardIdx] };
    if (!targetCard.tokens) targetCard.tokens = [];
    targetCard.tokens = [...targetCard.tokens, { type: selectedToken.type, player: currentPlayer }];
    newPlayers[playerIdx].wall[cardIdx] = targetCard;
    
    // Remove token from current player
    const tokenObj = newPlayers[currentIdx].tokens.find(t => t.type === selectedToken.type);
    if (tokenObj && tokenObj.count > 0) tokenObj.count -= 1;
    
    setPlayers(newPlayers);
    setSelectedToken(null);
  };

  // Token placement on profile
  const handlePlaceTokenOnProfile = (playerIdx) => {
    if (!isTokenPhase || !selectedToken) return;
    if (!isProfileValidTarget(playerIdx)) return;
    
    const newPlayers = [...players];
    const tokenToPlay = newPlayers[currentIdx].tokens.find(t => t.type === selectedToken.type);
    if (tokenToPlay && tokenToPlay.count > 0) {
      if (tokenToPlay.type === 'follow') {
        // If player is already following someone, just update the link.
        if (newPlayers[currentIdx].isFollowing) {
          const previouslyFollowedPlayer = newPlayers[currentIdx].isFollowing;
          if (previouslyFollowedPlayer.followers) {
            previouslyFollowedPlayer.followers = previouslyFollowedPlayer.followers.filter(p => p !== newPlayers[currentIdx]);
          }
        }
        newPlayers[currentIdx].isFollowing = newPlayers[playerIdx];
        if (!newPlayers[playerIdx].followers) newPlayers[playerIdx].followers = [];
        newPlayers[playerIdx].followers.push(newPlayers[currentIdx]);
      } else if (tokenToPlay.type === 'ban') {
        // Remove all tokens of the banned player
        newPlayers.forEach(player => {
          player.wall.forEach(card => {
            if (card.tokens) {
              card.tokens = card.tokens.filter(token => token.player !== newPlayers[playerIdx]);
            }
          });
        });
        // Remove follow tokens
        newPlayers.forEach(player => {
          if (player.isFollowing === newPlayers[playerIdx]) {
            player.isFollowing = null;
          }
          if (player.followers) {
            player.followers = player.followers.filter(p => p !== newPlayers[playerIdx]);
          }
        });
        // Add ban token to dump
        setTokensDump([...tokensDump, { type: 'ban', player: newPlayers[currentIdx] }]);
      }
      tokenToPlay.count -= 1;
    }
    
    setPlayers(newPlayers);
    setSelectedToken(null);
  };

  // End turn logic
  const handleEndTurn = () => {
    // Clear any score update flags from previous turns
    const newPlayers = players.map(p => {
      const { scoreGainedThisTurn, ...rest } = p;
      return rest;
    });

    const score = calculateScore();
    const lastPlayerIndex = currentIdx;

    if (score > 0) {
      newPlayers[lastPlayerIndex].scoreGainedThisTurn = score;
    }

    newPlayers[lastPlayerIndex].position = Math.min(BOARD_SIZE, newPlayers[lastPlayerIndex].position + score);

    if (newPlayers[lastPlayerIndex].position >= BOARD_SIZE) {
      setGameEnded(true);
      setWinner(newPlayers[lastPlayerIndex]);
      setPlayers(newPlayers);
      return;
    }

    const nextIdx = (currentIdx + 1) % players.length;
    newPlayers[nextIdx].mustDraw = true;
    
    setPlayers(newPlayers);
    setCurrentIdx(nextIdx);
    setMustDraw(true);
    setSelectedToken(null);
    setIsTokenPhase(false);

    // After 2 seconds, remove the score update flag
    setTimeout(() => {
      setPlayers(prevPlayers => 
        prevPlayers.map((p, i) => 
          i === lastPlayerIndex ? { ...p, scoreGainedThisTurn: undefined } : p
        )
      );
    }, 2000);
  };

  // Network card effects
  const applyNetworkCardEffect = (card) => {
    let effectText = '';
    let newPlayers = [...players];
    let newDeck = [...deck];
    let newDiscard = [...discard];
    let newTokensDump = [...tokensDump];

    switch (card.effectKey) {
      case 'shitstorm': {
        // All other players lose 3 PP (min 0)
        let affected = [];
        newPlayers.forEach((p, i) => {
          if (i !== currentIdx) {
            const before = p.position;
            p.position = Math.max(0, p.position - 3);
            affected.push(`${p.name} (${before} → ${p.position})`);
          }
        });
        effectText = `SHIT STORM:\nAll influencers but you lose 3 Pp.\n\nEffect:\n${affected.join('\n')}`;
        break;
      }
      case 'sponsored': {
        // Current player gains PP equal to number of posts of their interest on all walls
        let count = 0;
        newPlayers.forEach(p => {
          p.wall.forEach(card => {
            if (card.interest === currentPlayer.interest) count++;
          });
        });
        const before = newPlayers[currentIdx].position;
        newPlayers[currentIdx].position = Math.min(BOARD_SIZE, newPlayers[currentIdx].position + count);
        effectText = `SPONSORED POST:\nYou gain as many Pp as the number of posts of your interest in play.\n\nEffect: +${count} Pp (${before} → ${newPlayers[currentIdx].position})`;
        break;
      }
      case 'stalker': {
        // Gain 3 Like tokens
        const token = newPlayers[currentIdx].tokens.find(t => t.type === 'like');
        token.count += 3;
        effectText = 'STALKER:\nGain 3 Like tokens.';
        break;
      }
      case 'troll': {
        // Gain 3 Dislike tokens
        const token = newPlayers[currentIdx].tokens.find(t => t.type === 'dislike');
        token.count += 3;
        effectText = 'TROLL:\nGain 3 Dislike tokens.';
        break;
      }
      case 'opinion': {
        // Prompt for Follow or Ban token
        setModalContent({
          title: 'OPINION MAKER',
          content: 'Choose 1 token to gain:',
          actions: [
            { text: 'Follow', action: () => addTokenToPlayer('follow') },
            { text: 'Ban', action: () => addTokenToPlayer('ban') }
          ]
        });
        setModalOpen(true);
        return;
      }
      case 'active': {
        // Prompt for Share or Report token
        setModalContent({
          title: 'ACTIVE USER',
          content: 'Choose 1 token to gain:',
          actions: [
            { text: 'Share', action: () => addTokenToPlayer('share') },
            { text: 'Report', action: () => addTokenToPlayer('report') }
          ]
        });
        setModalOpen(true);
        return;
      }
      default:
        effectText = 'Unknown Network Card effect.';
    }

    setPlayers(newPlayers);
    setDeck(newDeck);
    setDiscard(newDiscard);
    setTokensDump(newTokensDump);
    
    if (effectText) {
      setModalContent({
        title: 'Network Card Played',
        content: effectText,
        actions: [{ text: 'Close', action: () => setModalOpen(false) }]
      });
      setModalOpen(true);
    }
  };

  const addTokenToPlayer = (tokenType) => {
    const newPlayers = [...players];
    const token = newPlayers[currentIdx].tokens.find(t => t.type === tokenType);
    if (token) token.count += 1;
    setPlayers(newPlayers);
    setModalOpen(false);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalContent(null);
  };

  const isCardValidTarget = (targetPlayer, card) => {
    if (!isTokenPhase || !selectedToken) return false;
    
    // Can't place tokens on your own cards during token phase
    if (targetPlayer === currentPlayer) return false;
    
    // Check if the card already has a token of the same type from the current player
    if (card.tokens) {
      const hasSameToken = card.tokens.some(token => 
        token.type === selectedToken.type && token.player === currentPlayer
      );
      if (hasSameToken) return false;
    }
    
    return true;
  };

  const isProfileValidTarget = (targetPlayerIndex) => {
    if (!isTokenPhase || !selectedToken) return false;
    
    const targetPlayer = players[targetPlayerIndex];
    if (targetPlayer === currentPlayer) return false;
    
    // For follow tokens, check if already following someone
    if (selectedToken.type === 'follow' && currentPlayer.isFollowing) return false;
    
    // For ban tokens, check if already has a ban token on them
    if (selectedToken.type === 'ban') {
      // Check if there's already a ban token on this player
      const hasBanToken = players.some(p => 
        p.wall.some(card => 
          card.tokens && card.tokens.some(token => 
            token.type === 'ban' && token.player === targetPlayer
          )
        )
      );
      if (hasBanToken) return false;
    }
    
    return true;
  };

  // Game end screen
  if (gameEnded && winner) {
    return (
      <Box sx={{ 
        p: 3, 
        minHeight: '100vh', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography variant="h2" sx={{ color: 'white', fontWeight: 700, fontFamily: 'Rowdies', mb: 3 }}>
          🎉 GAME OVER! 🎉
        </Typography>
        <Typography variant="h3" sx={{ color: 'white', mb: 2 }}>
          {winner.name} wins!
        </Typography>
        <Typography variant="h5" sx={{ color: 'white', mb: 4 }}>
          Final Score: {winner.position} / {BOARD_SIZE}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          size="large"
          onClick={() => window.location.reload()}
        >
          Play Again
        </Button>
      </Box>
    );
  }

  // Main header and score log (full width, 48px left/right padding)
  const headerAndLog = (
    <Box sx={{ width: '100%', px: 6, pt: 3, boxSizing: 'border-box' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, fontFamily: 'Rowdies' }}>
          Influencer
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'white' }}>
            Deck: {deck.length}
          </Typography>
          <Typography variant="body2" sx={{ color: 'white' }}>
            Discard: {discard.length}
          </Typography>
          <Typography variant="body2" sx={{ color: 'white', cursor: tokensDump.length > 0 ? 'pointer' : 'default' }}>
            Dump: {tokensDump.length}
          </Typography>
        </Box>
      </Box>
      {/* Score Log */}
      {scoreLog && (
        <Box sx={{ 
          mb: 2, 
          p: 2, 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: 1,
          border: '1px solid rgba(255,255,255,0.2)',
          mx: 0
        }}>
          <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
            {scoreLog}
          </Typography>
        </Box>
      )}
    </Box>
  );

  // Player row: full width, 48px left/right padding, 32px gap between columns
  const playerRow = (
    <Box sx={{
      display: 'flex',
      gap: 4, // 32px
      px: 6, // 48px
      width: '100%',
      maxWidth: '100%',
      alignItems: 'flex-start',
      boxSizing: 'border-box',
      mt: 2
    }}>
      {players.map((player, i) => {
        const isCurrentPlayer = i === currentIdx;
        const followers = players.filter(p => p.isFollowing && p.isFollowing.name === player.name);
        const playerColor = interestColors[player.interest];
        const lightTint = `${playerColor}15`; // Very light tint
        return (
          <Box key={i} sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flex: '1 1 0',
            minWidth: 0,
            boxSizing: 'border-box'
          }}>
            {/* Actions Section - only for current player */}
            {isCurrentPlayer && (
              <Box sx={{
                width: '100%',
                maxWidth: 240,
                mb: 2,
                p: 2,
                background: 'transparent',
                borderRadius: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1
              }}>
                {/* Phase Instructions */}
                <Typography variant="body2" sx={{ color: 'white', textAlign: 'center', mb: 1, fontSize: '0.875rem' }}>
                  {mustDraw && "Draw a card to start your turn"}
                  {!mustDraw && !isTokenPhase && "Play a card from your hand to your wall"}
                  {isTokenPhase && !selectedToken && "Optionally select a token to play on a card or player"}
                  {isTokenPhase && selectedToken && `Place your ${selectedToken.type} token on a valid target`}
                </Typography>
                {/* Action Buttons */}
                {mustDraw && (
                  <Button variant="contained" color="primary" sx={{ minWidth: 120 }} onClick={handleDrawCard}>
                    Draw Card
                  </Button>
                )}
                {isTokenPhase && (
                  <Button variant="contained" color="secondary" sx={{ minWidth: 120 }} onClick={handleEndTurn}>
                    End Turn
                  </Button>
                )}
              </Box>
            )}
            <Paper elevation={isCurrentPlayer ? 6 : 2} sx={{
              border: `3px solid ${playerColor}`,
              borderRadius: 2,
              p: 2,
              width: '100%',
              background: lightTint,
              boxShadow: isCurrentPlayer ? `0 0 20px 8px ${playerColor}40` : undefined,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 1,
              position: 'relative',
              boxSizing: 'border-box'
            }}>
              {/* Follow tokens on top */}
              {followers.map((follower, index) => {
                const totalFollowers = followers.length;
                const offset = (index - (totalFollowers - 1) / 2) * 45;
                return (
                  <Box key={index} sx={{
                    position: 'absolute',
                    top: -20,
                    left: '50%',
                    transform: `translateX(${offset}px)`,
                    zIndex: 10,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: interestColors[follower.interest],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }} title={`followed by ${follower.name}`}>
                    <PersonAddIcon />
                  </Box>
                );
              })}
              {/* Player profile - clickable for Follow/Ban tokens */}
              <Box sx={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1,
                borderRadius: 1,
                background: isTokenPhase && isProfileValidTarget(i) ? '#f3eaff' : undefined,
                cursor: isTokenPhase && isProfileValidTarget(i) ? 'pointer' : undefined,
                border: isTokenPhase && isProfileValidTarget(i) ? '2px solid #4cff8d' : undefined
              }}
                onClick={isTokenPhase && isProfileValidTarget(i) ? () => handlePlaceTokenOnProfile(i) : undefined}
              >
                <Typography fontWeight={700}>{player.name}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <Typography>{player.interest ? player.interest.charAt(0).toUpperCase() + player.interest.slice(1) : ''}</Typography>
                  {player.isFollowing && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Following {player.isFollowing.name}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Box sx={{ width: '100%', height: 18, background: '#eee', borderRadius: 1, mb: 1, position: 'relative' }}>
                <LinearProgress variant="determinate" value={Math.min(100, (player.position / BOARD_SIZE) * 100)} sx={{ height: 18, borderRadius: 1, background: '#eee', '& .MuiLinearProgress-bar': { background: playerColor } }} />
                <Typography sx={{ position: 'absolute', left: 8, top: 0, fontSize: 12, color: '#333' }}>{player.position} / {BOARD_SIZE}</Typography>
                {player.scoreGainedThisTurn && (
                  <Typography sx={{ position: 'absolute', right: 8, top: 0, fontSize: 12, color: playerColor, fontWeight: 'bold' }}>
                    +{player.scoreGainedThisTurn}
                  </Typography>
                )}
              </Box>
              {/* Wall - fixed height for 3 cards, 16px left/right padding */}
              <Box sx={{ width: '100%', height: 200, background: '#f8f8ff', borderRadius: 1, mb: 1, p: 1, px: 2, boxSizing: 'border-box' }}>
                <Typography variant="caption" color="text.secondary">Wall</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 1, mt: 0.5, height: 'calc(100% - 20px)', overflowY: 'auto' }}>
                  {player.wall.map((card, idx) => (
                    <Paper key={idx} sx={{
                      p: 1,
                      width: '100%',
                      maxWidth: 240,
                      minWidth: 0,
                      minHeight: 48,
                      textAlign: 'center',
                      border: `2px solid ${interestColors[card.interest]}`,
                      position: 'relative',
                      background: isTokenPhase && isCardValidTarget(player, card) ? '#f3eaff' : undefined,
                      cursor: isTokenPhase && isCardValidTarget(player, card) ? 'pointer' : undefined,
                      boxShadow: isTokenPhase && isCardValidTarget(player, card) ? 'inset 0 0 10px 3px #4cff8d, 0 0 10px 3px #4cff8d' : undefined,
                      margin: '8px auto',
                      mx: 'auto'
                    }}
                      onClick={isTokenPhase && isCardValidTarget(player, card) ? () => handlePlaceTokenOnCard(i, idx) : undefined}
                    >
                      <span style={{ fontSize: 20 }}>{interests.find(x => x.name === card.interest)?.icon}</span>&nbsp;
                      <span style={{ fontWeight: 700 }}>{card.interest.charAt(0).toUpperCase() + card.interest.slice(1)}</span>&nbsp;
                      <span>({card.value})</span>
                      {/* Show tokens on card */}
                      {card.tokens && card.tokens.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, justifyContent: 'center' }}>
                          {card.tokens.map((token, tIdx) => (
                            <Box key={tIdx} sx={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              backgroundColor: interestColors[token.player.interest],
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: 12
                            }} title={token.type}>
                              {getMaterialIcon(token.type)}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Paper>
                  ))}
                </Box>
              </Box>
              {/* Hand - 16px left/right padding */}
              <Box sx={{ width: '100%', minHeight: 40, background: '#f8f8ff', borderRadius: 1, mb: 1, p: 1, px: 2, boxSizing: 'border-box' }}>
                <Typography variant="caption" color="text.secondary">Hand</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 1, mt: 0.5 }}>
                  {player.hand.map((card, idx) => (
                    i === currentIdx && !mustDraw && !isTokenPhase ? (
                      <Paper key={idx} sx={{ 
                        p: 1, 
                        width: '100%',
                        maxWidth: 240,
                        minWidth: 0,
                        minHeight: 48, 
                        textAlign: 'center', 
                        border: `2px solid ${card.type === 'network' ? '#9147ff' : interestColors[card.interest]}`, 
                        cursor: 'pointer', 
                        background: card.type === 'network' ? '#f0e6ff' : '#fff',
                        margin: '8px auto',
                        mx: 'auto'
                      }} onClick={() => handlePlayCard(idx)}>
                        {card.type === 'network' ? (
                          <>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#9147ff' }}>{card.title}</div>
                            <div style={{ fontSize: '0.7rem', color: '#666' }}>{card.description}</div>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 20 }}>{interests.find(i => i.name === card.interest)?.icon}</span>&nbsp;
                            <span style={{ fontWeight: 700 }}>{card.interest.charAt(0).toUpperCase() + card.interest.slice(1)}</span>&nbsp;
                            <span>({card.value})</span>
                          </>
                        )}
                      </Paper>
                    ) : (
                      <Paper key={idx} sx={{ 
                        p: 1, 
                        width: '100%',
                        maxWidth: 240,
                        minWidth: 0,
                        minHeight: 48, 
                        textAlign: 'center', 
                        border: `2px solid ${card.type === 'network' ? '#9147ff' : interestColors[card.interest]}`,
                        background: card.type === 'network' ? '#f0e6ff' : '#fff',
                        margin: '8px auto',
                        mx: 'auto'
                      }}>
                        {card.type === 'network' ? (
                          <>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#9147ff' }}>{card.title}</div>
                            <div style={{ fontSize: '0.7rem', color: '#666' }}>{card.description}</div>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 20 }}>{interests.find(i => i.name === card.interest)?.icon}</span>&nbsp;
                            <span style={{ fontWeight: 700 }}>{card.interest.charAt(0).toUpperCase() + card.interest.slice(1)}</span>&nbsp;
                            <span>({card.value})</span>
                          </>
                        )}
                      </Paper>
                    )
                  ))}
                </Box>
              </Box>
              {/* Token Pool */}
              <Box sx={{ width: '100%', minHeight: 60, background: '#f8f8ff', borderRadius: 1, p: 1 }}>
                <Typography variant="caption" color="text.secondary">Tokens</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, justifyContent: 'center' }}>
                  {player.tokens.map((token, idx) => (
                    <IconButton
                      key={idx}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: token.count > 0 ? playerColor : '#ccc',
                        color: 'white',
                        cursor: token.count > 0 ? 'pointer' : 'default',
                        transform: selectedToken && selectedToken.type === token.type ? 'scale(1.15)' : 'scale(1)',
                        boxShadow: selectedToken && selectedToken.type === token.type ? '0 0 0 3px #3d91ff, 0 5px 10px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.2)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: token.count > 0 ? 'scale(1.1)' : 'scale(1)'
                        }
                      }}
                      onClick={i === currentIdx && isTokenPhase ? () => handleSelectToken(token.type) : undefined}
                      disabled={token.count === 0}
                      title={token.tooltip}
                    >
                      {getMaterialIcon(token.type)}
                    </IconButton>
                  ))}
                </Box>
              </Box>
            </Paper>
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Box sx={{ width: '100vw', height: '100vh', minHeight: '100vh', boxSizing: 'border-box', background: 'none', margin: 0, padding: 0 }}>
      {headerAndLog}
      {playerRow}
      {/* Modal Dialog */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>{modalContent?.title}</DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: 'pre-line' }}>
            {modalContent?.content}
          </Typography>
        </DialogContent>
        <DialogActions>
          {modalContent?.actions?.map((action, index) => (
            <Button key={index} onClick={action.action} variant="contained">
              {action.text}
            </Button>
          ))}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const interests = [
  { name: 'fashion', icon: '👗' },
  { name: 'tourism', icon: '🌍' },
  { name: 'food', icon: '🍔' },
  { name: 'fitness', icon: '🏋️' },
  { name: 'music', icon: '🎵' },
  { name: 'gaming', icon: '🎮' }
]; 