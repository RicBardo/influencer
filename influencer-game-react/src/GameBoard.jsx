import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import PlayerColumn from './PlayerColumn';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ShareIcon from '@mui/icons-material/Share';
import ReportIcon from '@mui/icons-material/Report';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import BlockIcon from '@mui/icons-material/Block';
import { interests, getInterestData } from './interests';

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
  let newDeck = [];
  // Collect all unique interests in play
  const interestsInPlay = [...new Set(players.map(p => p.interest))];
  interestsInPlay.forEach(interest => {
    for (let i = 0; i < 6; i++) newDeck.push({ interest, value: 1 });
    for (let i = 0; i < 3; i++) newDeck.push({ interest, value: 2 });
    newDeck.push({ interest, value: 3 });
  });
  // Add Network Cards if enabled (1 of each type)
  if (networkCardsEnabled) {
    // Add all 10 Network Cards (1 of each type)
    NETWORK_CARDS.forEach(card => {
      newDeck.push({
        title: card.title,
        description: card.description,
        effectKey: card.effectKey,
        type: 'network',
      });
    });
  }
  return shuffleDeck(newDeck);
}

function shuffleDeck(deck) {
  // Fisher-Yates shuffle
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

// Token order for consistent display
const TOKEN_ORDER = ['like', 'dislike', 'share', 'report', 'follow', 'ban'];
function sortTokens(tokens) {
  return [...tokens].sort((a, b) => TOKEN_ORDER.indexOf(a.type) - TOKEN_ORDER.indexOf(b.type));
}

export default function GameBoard({ setup }) {
  const [deck, setDeck] = useState([]);
  const [discard, setDiscard] = useState([]);
  const [players, setPlayers] = useState([]); // {name, interest, wall, hand, position, tokens, following, followers}
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
  const [scoreIndicators, setScoreIndicators] = useState({});
  const [socialChallengeState, setSocialChallengeState] = useState(null); // New state for Social Challenge
  const [hasPlayedCardThisTurn, setHasPlayedCardThisTurn] = useState(false); // New state to prevent playing another card
  const [stealState, setStealState] = useState(null); // New state for Steal Idea
  const [contentPlannerState, setContentPlannerState] = useState(null); // New state for Content Planner
  const [botState, setBotState] = useState(null); // New state for Bot
  const [opinionMakerState, setOpinionMakerState] = useState(null); // New state for Opinion Maker
  const [activeUserState, setActiveUserState] = useState(null); // New state for Active User

  // Utility to show indicator for 3 seconds without mutating players
  function showScoreIndicator(playerIdx, value) {
    setScoreIndicators(prev => ({ ...prev, [playerIdx]: value }));
    setTimeout(() => {
      setScoreIndicators(prev => {
        const updated = { ...prev };
        delete updated[playerIdx];
        return updated;
      });
    }, 3000);
  }

  useEffect(() => {
    if (!setup) return;
    // Initialize players
    const initialPlayers = setup.players.map((p, idx) => ({
      ...p,
      wall: [],
      hand: [],
      position: 0,
      tokens: createTokens(idx, setup.players.length),
      following: [],
      followers: []
    }));
    // Create and shuffle deck
    let newDeck = createDeck(initialPlayers, setup.networkCards);
    newDeck = shuffleDeck(newDeck);
    console.log('Deck after shuffling:', newDeck.map(card => card.interest || card.type));
    // Deal 3 cards to each player
    for (let i = 0; i < 3; i++) {
      initialPlayers.forEach(player => {
        player.hand.push(newDeck.shift());
      });
    }
    console.log('Player hands after deal:', initialPlayers.map(p => p.hand.map(card => card.interest || card.type)));
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
    setSocialChallengeState(null);
    setStealState(null);
    setContentPlannerState(null);
    setBotState(null);
    setHasPlayedCardThisTurn(false);
  }, [setup]);

  if (!setup || players.length === 0) return null;
  const currentPlayer = players[currentIdx];

  // Calculate score function
  const calculateScore = () => {
    let score = 0;
    let log = '';

    const activeInterests = new Set([currentPlayer.interest]);
    if (currentPlayer.following && currentPlayer.following.length > 0) {
      currentPlayer.following.forEach(followedPlayer => {
        if (followedPlayer) {
          activeInterests.add(followedPlayer.interest);
          log += `${currentPlayer.name} is following ${followedPlayer.name}, gaining their interest: ${followedPlayer.interest}.\n`;
        }
      });
    }

    // Score your own wall
    players.forEach(player => {
      player.wall.forEach(card => {
        // If card has a Report token, it scores 0
        if (card.tokens && card.tokens.some(token => token.type === 'report')) return;
        let cardValue = card.calculatedValue !== undefined ? card.calculatedValue : card.value;
        let tokenPoints = 0;
        if (card.tokens) {
          card.tokens.forEach(token => {
            if (token.type === 'like') tokenPoints += 1;
            else if (token.type === 'dislike') tokenPoints -= 1;
          });
        }
        const totalCardValue = cardValue + tokenPoints;
        if (player === currentPlayer) {
          if (card.turnPosted) {
            score += totalCardValue;
            log += `Your new card ${card.interest} scored ${totalCardValue} points (played this turn).\n`;
            card.turnPosted = false;
          } else if (activeInterests.has(card.interest)) {
            score += totalCardValue;
            log += `Your card ${card.interest} scored ${totalCardValue} points (active interest).\n`;
          }
        }
      });
    });

    // Score for Share tokens you have placed on other players' cards
    players.forEach(player => {
      if (player === currentPlayer) return;
      player.wall.forEach(card => {
        // If card has a Report token, it scores 0
        if (card.tokens && card.tokens.some(token => token.type === 'report')) return;
        if (card.tokens && card.tokens.some(token => token.type === 'share' && token.player && token.player.name === currentPlayer.name)) {
          // Only count if card matches your interest
          if (activeInterests.has(card.interest)) {
            let cardValue = card.calculatedValue !== undefined ? card.calculatedValue : card.value;
            let tokenPoints = 0;
            if (card.tokens) {
              card.tokens.forEach(token => {
                if (token.type === 'like') tokenPoints += 1;
                else if (token.type === 'dislike') tokenPoints -= 1;
              });
            }
            const totalCardValue = cardValue + tokenPoints;
            score += totalCardValue;
            log += `Your share token on ${player.name}'s card ${card.interest} scored ${totalCardValue} points.\n`;
          }
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
    
    let currentDeck = [...deck];
    let currentDiscard = [...discard];
    
    // If deck is empty, reshuffle discard pile into deck
    if (currentDeck.length === 0) {
      if (currentDiscard.length === 0) {
        // No cards left to draw
        return;
      }
      currentDeck = shuffleDeck(currentDiscard);
      currentDiscard = [];
    }
    
    const newPlayers = [...players];
    newPlayers[currentIdx] = {
      ...currentPlayer,
      hand: [...currentPlayer.hand, currentDeck[0]]
    };
    setPlayers(newPlayers);
    setDeck(currentDeck.slice(1));
    setDiscard(currentDiscard);
    
    // After each draw in handleDrawCard:
    console.log('Player', currentPlayer.name, 'drew', currentDeck[0]);
    console.log('Deck after draw:', currentDeck.slice(1).map(card => card.interest + (card.type ? ' (network)' : '')));
    setMustDraw(false);
  };

  // Play card logic (from hand to wall)
  const handlePlayCard = idx => {
    if (mustDraw || isTokenPhase) return;
    const card = currentPlayer.hand[idx];
    
    // Check if it's a network card
    if (card.type === 'network') {
      applyNetworkCardEffect(card, idx); // Pass idx for challenge effect
      return;
    }

    const newPlayers = [...players];
    const newHand = currentPlayer.hand.filter((_, i) => i !== idx);
    let newWall = [{ ...card, turnPosted: true }, ...currentPlayer.wall];
    let newDiscard = [...discard];
    if (newWall.length > 3) {
      // Remove oldest card (last in array)
      let removedCard = newWall[newWall.length - 1];
      // Return tokens to owners
      if (removedCard.tokens && removedCard.tokens.length > 0) {
        removedCard.tokens.forEach(token => {
          const ownerIdx = newPlayers.findIndex(p => p.name === token.player.name);
          if (ownerIdx !== -1) {
            let ownerTokens = [...newPlayers[ownerIdx].tokens];
            const tokenIdx = ownerTokens.findIndex(t => t.type === token.type);
            if (tokenIdx !== -1) {
              ownerTokens[tokenIdx] = { ...ownerTokens[tokenIdx], count: ownerTokens[tokenIdx].count + 1 };
            } else {
              ownerTokens.push({ type: token.type, count: 1, playerId: ownerIdx });
            }
            newPlayers[ownerIdx].tokens = sortTokens(ownerTokens);
          }
        });
      }
      // Remove tokens from card before discarding
      removedCard = { ...removedCard, tokens: [] };
      newDiscard.push(removedCard);
      newWall = newWall.slice(0, 3); // Keep only the 3 newest cards
    }
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
    let newTokens = sortTokens(newPlayers[currentIdx].tokens.map(t => {
      if (t.type === selectedToken.type) {
        return { ...t, count: t.count - 1 };
      }
      return t;
    }).filter(t => t.count > 0));
    newPlayers[currentIdx].tokens = newTokens;
    
    setPlayers(newPlayers);
    setSelectedToken(null);
  };

  // Token placement on profile
  const handlePlaceTokenOnProfile = (playerIdx) => {
    if (!isTokenPhase || !selectedToken) return;
    if (!isProfileValidTarget(playerIdx)) return;
    
    const newPlayers = [...players];
    
    if (selectedToken.type === 'follow') {
      // Add the new follow to the array
      if (!newPlayers[currentIdx].following) {
        newPlayers[currentIdx].following = [];
      }
      newPlayers[currentIdx].following.push(newPlayers[playerIdx]);
      
      // Add current player to the followed player's followers list
      if (!newPlayers[playerIdx].followers) newPlayers[playerIdx].followers = [];
      newPlayers[playerIdx].followers.push(newPlayers[currentIdx]);
    } else if (selectedToken.type === 'ban') {
      const bannedPlayer = newPlayers[playerIdx];
      let removedTokens = [];
      // Remove all tokens of the banned player from all cards on all walls
      newPlayers.forEach(p => {
        p.wall.forEach(card => {
          if (card.tokens && card.tokens.length > 0) {
            const toRemove = card.tokens.filter(token => token.player && token.player.name === bannedPlayer.name);
            removedTokens.push(...toRemove);
            card.tokens = card.tokens.filter(token => !(token.player && token.player.name === bannedPlayer.name));
          }
        });
      });
      // Remove Follow tokens (if banned player is following someone)
      if (bannedPlayer.following && bannedPlayer.following.length > 0) {
        bannedPlayer.following.forEach(() => {
          removedTokens.push({ type: 'follow', player: bannedPlayer });
        });
        bannedPlayer.following = [];
      }
      // Remove banned player from any followers arrays and following arrays
      newPlayers.forEach(p => {
        if (p.followers) {
          p.followers = p.followers.filter(f => f.name !== bannedPlayer.name);
        }
        if (p.following) {
          p.following = p.following.filter(f => f.name !== bannedPlayer.name);
        }
      });
      // Add all removed tokens and the Ban token itself to the dump
      setTokensDump([...tokensDump, ...removedTokens, { type: 'ban', player: newPlayers[currentIdx] }]);
    }
    
    // Remove token from current player after applying effects
    let newTokens2 = sortTokens(newPlayers[currentIdx].tokens.map(t => {
      if (t.type === selectedToken.type) {
        return { ...t, count: t.count - 1 };
      }
      return t;
    }).filter(t => t.count > 0));
    newPlayers[currentIdx].tokens = newTokens2;
    
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
      showScoreIndicator(lastPlayerIndex, score);
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
    setSocialChallengeState(null);
    setStealState(null);
    setContentPlannerState(null);
    setBotState(null);
    setHasPlayedCardThisTurn(false);
  };

  // Network card effects
  const applyNetworkCardEffect = (card, handIdx) => {
    let effectText = '';
    let newPlayers = [...players];
    let newDeck = [...deck];
    let newDiscard = [...discard];
    let newTokensDump = [...tokensDump];

    switch (card.effectKey) {
      case 'shitstorm': {
        // Remove network card from hand and add to discard pile immediately
        newPlayers[currentIdx] = {
          ...newPlayers[currentIdx],
          hand: newPlayers[currentIdx].hand.filter((_, i) => i !== handIdx)
        };
        newDiscard.push(card);
        
        // All other players lose 3 PP (min 0), show -3 indicator, no popup
        newPlayers.forEach((p, i) => {
          if (i !== currentIdx) {
            const before = p.position;
            const lost = Math.min(3, p.position);
            p.position = Math.max(0, p.position - 3);
            p.scoreGainedThisTurn = -lost; // Show -3 (or -2/-1 if near zero)
            showScoreIndicator(i, -lost); // Show the score indicator
          }
        });
        // No modal or popup
        setPlayers(newPlayers);
        setDeck(newDeck);
        setDiscard(newDiscard);
        setTokensDump(newTokensDump);
        setIsTokenPhase(true); // Allow token phase after playing
        setSelectedToken(null);
        return;
      }
      case 'sponsored': {
        // Remove network card from hand and add to discard pile immediately
        newPlayers[currentIdx] = {
          ...newPlayers[currentIdx],
          hand: newPlayers[currentIdx].hand.filter((_, i) => i !== handIdx)
        };
        newDiscard.push(card);
        
        // Count posts of player's innate interest (not acquired) on all walls
        const playerInnateInterest = currentPlayer.interest;
        const postsCount = players.reduce((count, player) => {
          return count + player.wall.filter(card => card.interest === playerInnateInterest).length;
        }, 0);

        // Add points immediately and show +N indicator
        newPlayers[currentIdx] = {
          ...newPlayers[currentIdx],
          position: newPlayers[currentIdx].position + postsCount,
          scoreGainedThisTurn: postsCount
        };

        setPlayers(newPlayers);
        setDeck(newDeck);
        setDiscard(newDiscard);
        setTokensDump(newTokensDump);
        setIsTokenPhase(true);
        showScoreIndicator(currentIdx, postsCount);
        return; // Prevents the outer setPlayers from overwriting
      }
      case 'challenge': {
        // Remove network card from hand and add to discard pile immediately
        const newPlayers = [...players];
        const newDiscard = [...discard, card];
        newPlayers[currentIdx] = {
          ...newPlayers[currentIdx],
          hand: newPlayers[currentIdx].hand.filter((_, i) => i !== handIdx)
        };
        setPlayers(newPlayers);
        setDiscard(newDiscard);
        // Set state to highlight content cards and disable network cards in hand
        setSocialChallengeState({
          phase: 'reveal', // new phase name for this effect
          revealedInterest: null,
          revealedIdx: null
        });
        setIsTokenPhase(false); // Block token phase until challenge is resolved
        setHasPlayedCardThisTurn(true); // Prevent playing another card
        return;
      }
      case 'steal': {
        // Remove network card from hand and add to discard pile immediately
        newPlayers[currentIdx] = {
          ...newPlayers[currentIdx],
          hand: newPlayers[currentIdx].hand.filter((_, i) => i !== handIdx)
        };
        newDiscard.push(card);
        
        // Set state to allow selecting a card from another player's wall
        setStealState({
          phase: 'select',
          targetPlayerIdx: null,
          targetCardIdx: null
        });
        setIsTokenPhase(false); // Block token phase until steal is resolved
        setHasPlayedCardThisTurn(true); // Prevent playing another card
        
        setPlayers(newPlayers);
        setDeck(newDeck);
        setDiscard(newDiscard);
        setTokensDump(newTokensDump);
        return;
      }
      case 'planner': {
        // Remove network card from hand and add to discard pile immediately
        newPlayers[currentIdx] = {
          ...newPlayers[currentIdx],
          hand: newPlayers[currentIdx].hand.filter((_, i) => i !== handIdx)
        };
        newDiscard.push(card);
        
        // Collect all cards (Content and Network) from all players' hands
        let allCards = [];
        newPlayers.forEach(player => {
          allCards.push(...player.hand);
        });
        
        // Set state to show modal with all cards for selection
        setContentPlannerState({
          phase: 'select',
          allCards: allCards,
          selectedCards: [],
          remainingCards: []
        });
        setIsTokenPhase(false); // Block token phase until selection is complete
        setHasPlayedCardThisTurn(true); // Prevent playing another card
        
        setPlayers(newPlayers);
        setDeck(newDeck);
        setDiscard(newDiscard);
        setTokensDump(newTokensDump);
        return;
      }
      case 'bot': {
        // Remove network card from hand and add to discard pile immediately
        newPlayers[currentIdx] = {
          ...newPlayers[currentIdx],
          hand: newPlayers[currentIdx].hand.filter((_, i) => i !== handIdx)
        };
        newDiscard.push(card);
        
        // Filter deck to only show Content Cards (not Network Cards)
        const contentCardsOnly = deck.filter(card => !card.type);
        
        // Set state to show modal for deck browsing
        setBotState({
          phase: 'browse',
          deckCards: contentCardsOnly,
          selectedCards: [],
          maxSelections: 3
        });
        setIsTokenPhase(false); // Block token phase until selection is complete
        setHasPlayedCardThisTurn(true); // Prevent playing another card
        
        setPlayers(newPlayers);
        setDeck(newDeck);
        setDiscard(newDiscard);
        setTokensDump(newTokensDump);
        return;
      }
      case 'stalker': {
        // Remove network card from hand and add to discard pile immediately
        newPlayers[currentIdx] = {
          ...newPlayers[currentIdx],
          hand: newPlayers[currentIdx].hand.filter((_, i) => i !== handIdx)
        };
        newDiscard.push(card);
        
        // Gain 3 Like tokens
        console.log('STALKER: Current player tokens:', newPlayers[currentIdx].tokens);
        const token = newPlayers[currentIdx].tokens.find(t => t.type === 'like');
        console.log('STALKER: Found like token:', token);
        if (token) {
          console.log('STALKER: Before adding tokens, count was:', token.count);
          token.count += 3;
          console.log('STALKER: After adding tokens, count is:', token.count);
        } else {
          console.log('STALKER: No like token found!');
        }
        
        // Enter token phase and show End Turn button
        setPlayers(newPlayers);
        setDeck(newDeck);
        setDiscard(newDiscard);
        setTokensDump(newTokensDump);
        setIsTokenPhase(true);
        setSelectedToken(null);
        return;
      }
      case 'troll': {
        // Remove network card from hand and add to discard pile immediately
        newPlayers[currentIdx] = {
          ...newPlayers[currentIdx],
          hand: newPlayers[currentIdx].hand.filter((_, i) => i !== handIdx)
        };
        newDiscard.push(card);
        
        // Gain 3 Dislike tokens
        const token = newPlayers[currentIdx].tokens.find(t => t.type === 'dislike');
        console.log('TROLL: Found dislike token:', token);
        if (token) {
          console.log('TROLL: Before adding tokens, count was:', token.count);
          token.count += 3;
          console.log('TROLL: After adding tokens, count is:', token.count);
        } else {
          console.log('TROLL: No dislike token found!');
        }
        
        // Enter token phase and show End Turn button
        setPlayers(newPlayers);
        setDeck(newDeck);
        setDiscard(newDiscard);
        setTokensDump(newTokensDump);
        setIsTokenPhase(true);
        setSelectedToken(null);
        return;
      }
      case 'opinion': {
        // Remove network card from hand and add to discard pile immediately
        newPlayers[currentIdx] = {
          ...newPlayers[currentIdx],
          hand: newPlayers[currentIdx].hand.filter((_, i) => i !== handIdx)
        };
        newDiscard.push(card);
        
        // Set state to show Opinion Maker modal
        setOpinionMakerState({
          phase: 'select',
          selectedToken: null
        });
        
        setPlayers(newPlayers);
        setDeck(newDeck);
        setDiscard(newDiscard);
        setTokensDump(newTokensDump);
        return;
      }
      case 'active': {
        console.log('ACTIVE USER: Card played, setting up modal');
        // Remove network card from hand and add to discard pile immediately
        newPlayers[currentIdx] = {
          ...newPlayers[currentIdx],
          hand: newPlayers[currentIdx].hand.filter((_, i) => i !== handIdx)
        };
        newDiscard.push(card);
        
        // Set state to show Active User modal
        setActiveUserState({
          phase: 'select',
          selectedToken: null
        });
        
        console.log('ACTIVE USER: Modal state set, players updated');
        setPlayers(newPlayers);
        setDeck(newDeck);
        setDiscard(newDiscard);
        setTokensDump(newTokensDump);
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
    newPlayers[currentIdx].tokens = sortTokens(newPlayers[currentIdx].tokens);
    setPlayers(newPlayers);
    setModalOpen(false);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalContent(null);
  };

  const isCardValidTarget = (targetPlayer, card) => {
    if (!isTokenPhase || !selectedToken) return false;
    // Like/Dislike: any content card (on any wall, including your own)
    if (selectedToken.type === 'like' || selectedToken.type === 'dislike') {
      return true;
    }
    // Share: only on other players' cards, and only if card matches your innate or acquired interest
    if (selectedToken.type === 'share' && targetPlayer !== currentPlayer) {
      const interests = [currentPlayer.interest];
      if (currentPlayer.following && currentPlayer.following.length > 0) {
        currentPlayer.following.forEach(followedPlayer => {
          interests.push(followedPlayer.interest);
        });
      }
      if (interests.includes(card.interest)) {
        return true;
      }
      return false;
    }
    // Report: only on other players' cards
    if (selectedToken.type === 'report' && targetPlayer !== currentPlayer) {
      return true;
    }
    return false;
  };

  const isProfileValidTarget = (targetPlayerIndex) => {
    if (!isTokenPhase || !selectedToken) return false;
    
    const targetPlayer = players[targetPlayerIndex];
    if (targetPlayer === currentPlayer) return false;
    
    // Only Follow and Ban tokens can be placed on profiles
    if (selectedToken.type !== 'follow' && selectedToken.type !== 'ban') {
      return false;
    }
    
    // For follow tokens, check if already following this specific player
    if (selectedToken.type === 'follow' && currentPlayer.following && currentPlayer.following.some(p => p.name === targetPlayer.name)) return false;
    
    // For ban tokens, check if already has a ban token on them
    if (selectedToken.type === 'ban') {
      // Check if there's already a ban token on this player in the dump
      const hasBanToken = tokensDump.some(token => 
        token.type === 'ban' && token.player === targetPlayer
      );
      if (hasBanToken) return false;
    }
    
    return true;
  };

  // Add handler for revealing a content card during Social Challenge
  const handleSocialChallengeReveal = idx => {
    const card = players[currentIdx].hand[idx];
    const revealedInterest = card.interest;
    
    // The revealed Content Card stays in hand - it just returns to normal state
    const newPlayers = [...players];
    
    // Award points
    // Current player always gets +2
    newPlayers[currentIdx].position += 2;
    newPlayers[currentIdx].scoreGainedThisTurn = 2;
    showScoreIndicator(currentIdx, 2);
    
    // Other players
    players.forEach((p, i) => {
      if (i === currentIdx) return;
      const hasMatch = p.hand.some(c => c.interest === revealedInterest);
      if (hasMatch) {
        newPlayers[i].position += 2;
        newPlayers[i].scoreGainedThisTurn = 2;
        showScoreIndicator(i, 2);
      } else {
        const lost = Math.min(2, newPlayers[i].position);
        newPlayers[i].position = Math.max(0, newPlayers[i].position - 2);
        newPlayers[i].scoreGainedThisTurn = -lost;
        showScoreIndicator(i, -lost);
      }
    });
    
    setPlayers(newPlayers);
    
    // Clear scoreGainedThisTurn after 3 seconds for all affected players
    newPlayers.forEach((p, i) => {
      if (typeof p.scoreGainedThisTurn !== 'undefined') {
        setTimeout(() => {
          setPlayers(prevPlayers => {
            const updated = [...prevPlayers];
            if (updated[i].scoreGainedThisTurn === p.scoreGainedThisTurn) {
              updated[i] = { ...updated[i], scoreGainedThisTurn: undefined };
            }
            return updated;
          });
        }, 3000);
      }
    });
    
    // End challenge state, show End Turn button and enter token phase
    setSocialChallengeState(null);
    setIsTokenPhase(true);
  };

  // Add handler for selecting other player's card during Social Challenge
  const handleSocialChallengeSelectOther = (playerIdx, cardIdx) => {
    // Placeholder function for social challenge select other
    console.log('Social challenge select other:', playerIdx, cardIdx);
  };

  // Add handler for Content Planner card selection
  const handleContentPlannerSelectCard = (cardIndex) => {
    if (!contentPlannerState || contentPlannerState.phase !== 'select') return;
    
    const card = contentPlannerState.allCards[cardIndex];
    const isSelected = contentPlannerState.selectedCards.some(selected => 
      selected.index === cardIndex
    );
    
    if (isSelected) {
      // Deselect card
      setContentPlannerState(prev => ({
        ...prev,
        selectedCards: prev.selectedCards.filter(selected => selected.index !== cardIndex)
      }));
    } else {
      // Select card (max 3)
      if (contentPlannerState.selectedCards.length < 3) {
        setContentPlannerState(prev => ({
          ...prev,
          selectedCards: [...prev.selectedCards, { card, index: cardIndex }]
        }));
      }
    }
  };

  // Add handler for Bot card selection
  const handleBotSelectCard = (cardIndex) => {
    if (!botState || botState.phase !== 'browse') return;
    
    const card = botState.deckCards[cardIndex];
    const isSelected = botState.selectedCards.some(selected => 
      selected.index === cardIndex
    );
    
    if (isSelected) {
      // Deselect card
      setBotState(prev => ({
        ...prev,
        selectedCards: prev.selectedCards.filter(selected => selected.index !== cardIndex)
      }));
    } else {
      // Select card (max 3, only Content Cards)
      if (botState.selectedCards.length < botState.maxSelections && !card.type) {
        setBotState(prev => ({
          ...prev,
          selectedCards: [...prev.selectedCards, { card, index: cardIndex }]
        }));
      }
    }
  };

  // Add handler for Bot confirmation
  const handleBotConfirm = () => {
    if (!botState) return;
    
    const selectedCards = botState.selectedCards.map(selected => selected.card);
    const remainingCards = botState.deckCards.filter((_, index) => 
      !botState.selectedCards.some(selected => selected.index === index)
    );
    
    const newPlayers = [...players];
    
    // Add selected cards to current player's wall (with turnPosted flag)
    let newWall = [...newPlayers[currentIdx].wall];
    selectedCards.forEach(card => {
      newWall = [{ ...card, turnPosted: true }, ...newWall];
    });
    
    // Handle wall overflow (max 3 cards)
    if (newWall.length > 3) {
      // Remove oldest cards (last in array) and return tokens to owners
      for (let i = newWall.length - 1; i >= 3; i--) {
        let removedCard = newWall[i];
        if (removedCard.tokens && removedCard.tokens.length > 0) {
          removedCard.tokens.forEach(token => {
            const ownerIdx = newPlayers.findIndex(p => p.name === token.player.name);
            if (ownerIdx !== -1) {
              let ownerTokens = [...newPlayers[ownerIdx].tokens];
              const tokenIdx = ownerTokens.findIndex(t => t.type === token.type);
              if (tokenIdx !== -1) {
                ownerTokens[tokenIdx] = { ...ownerTokens[tokenIdx], count: ownerTokens[tokenIdx].count + 1 };
              } else {
                ownerTokens.push({ type: token.type, count: 1, playerId: ownerIdx });
              }
              newPlayers[ownerIdx].tokens = sortTokens(ownerTokens);
            }
          });
        }
        // Remove tokens from card before discarding
        removedCard = { ...removedCard, tokens: [] };
        setDiscard(prev => [...prev, removedCard]);
      }
      newWall = newWall.slice(0, 3); // Keep only the 3 newest cards
    }
    
    // Update current player's wall
    newPlayers[currentIdx] = {
      ...newPlayers[currentIdx],
      wall: newWall
    };
    
    // Get the original deck cards that were not shown (Network Cards)
    const networkCardsFromDeck = deck.filter(card => card.type);
    
    // Combine remaining Content Cards with Network Cards and shuffle
    const allRemainingCards = [...remainingCards, ...networkCardsFromDeck];
    const shuffledDeck = shuffleDeck(allRemainingCards);
    
    setPlayers(newPlayers);
    setDeck(shuffledDeck);
    
    // Clear bot state and enter token phase
    setBotState(null);
    setIsTokenPhase(true);
    setHasPlayedCardThisTurn(false);
  };

  // Add handler for Content Planner confirmation
  const handleContentPlannerConfirm = () => {
    if (!contentPlannerState || contentPlannerState.selectedCards.length !== 3) return;
    
    const selectedCards = contentPlannerState.selectedCards.map(selected => selected.card);
    const remainingCards = contentPlannerState.allCards.filter((_, index) => 
      !contentPlannerState.selectedCards.some(selected => selected.index === index)
    );
    
    // Shuffle remaining cards
    const shuffledRemaining = shuffleDeck(remainingCards);
    
    const newPlayers = [...players];
    
    // Give selected cards to current player
    newPlayers[currentIdx] = {
      ...newPlayers[currentIdx],
      hand: selectedCards
    };
    
    // Redistribute remaining cards among other players (3 each)
    let cardIndex = 0;
    newPlayers.forEach((player, idx) => {
      if (idx !== currentIdx) {
        const playerCards = [];
        for (let i = 0; i < 3 && cardIndex < shuffledRemaining.length; i++) {
          playerCards.push(shuffledRemaining[cardIndex]);
          cardIndex++;
        }
        newPlayers[idx] = {
          ...newPlayers[idx],
          hand: playerCards
        };
      }
    });
    
    // Add any remaining cards back to the deck
    if (cardIndex < shuffledRemaining.length) {
      setDeck(prev => [...prev, ...shuffledRemaining.slice(cardIndex)]);
    }
    
    setPlayers(newPlayers);
    
    // Clear content planner state and enter token phase
    setContentPlannerState(null);
    setIsTokenPhase(true);
    setHasPlayedCardThisTurn(false);
  };

  // Add handler for Opinion Maker token selection
  const handleOpinionMakerSelectToken = (tokenType) => {
    if (!opinionMakerState || opinionMakerState.phase !== 'select') return;
    
    const isSelected = opinionMakerState.selectedToken === tokenType;
    
    if (isSelected) {
      // Deselect token
      setOpinionMakerState(prev => ({
        ...prev,
        selectedToken: null
      }));
    } else {
      // Select token
      setOpinionMakerState(prev => ({
        ...prev,
        selectedToken: tokenType
      }));
    }
  };

  // Add handler for Opinion Maker confirmation
  const handleOpinionMakerConfirm = () => {
    if (!opinionMakerState || !opinionMakerState.selectedToken) return;
    
    const newPlayers = [...players];
    const token = newPlayers[currentIdx].tokens.find(t => t.type === opinionMakerState.selectedToken);
    if (token) {
      token.count += 1;
    }
    newPlayers[currentIdx].tokens = sortTokens(newPlayers[currentIdx].tokens);
    
    setPlayers(newPlayers);
    
    // Clear opinion maker state and enter token phase
    setOpinionMakerState(null);
    setIsTokenPhase(true);
    setSelectedToken(null);
  };

  // Add handler for Active User token selection
  const handleActiveUserSelectToken = (tokenType) => {
    if (!activeUserState || activeUserState.phase !== 'select') return;
    
    const isSelected = activeUserState.selectedToken === tokenType;
    
    if (isSelected) {
      // Deselect token
      setActiveUserState(prev => ({
        ...prev,
        selectedToken: null
      }));
    } else {
      // Select token
      setActiveUserState(prev => ({
        ...prev,
        selectedToken: tokenType
      }));
    }
  };

  // Add handler for Active User confirmation
  const handleActiveUserConfirm = () => {
    if (!activeUserState || !activeUserState.selectedToken) return;
    
    console.log('ACTIVE USER: Confirming token selection:', activeUserState.selectedToken);
    
    const newPlayers = [...players];
    console.log('ACTIVE USER: Current player tokens:', newPlayers[currentIdx].tokens);
    const token = newPlayers[currentIdx].tokens.find(t => t.type === activeUserState.selectedToken);
    console.log('ACTIVE USER: Found token:', token);
    if (token) {
      console.log('ACTIVE USER: Before adding token, count was:', token.count);
      token.count += 1;
      console.log('ACTIVE USER: After adding token, count is:', token.count);
    } else {
      console.log('ACTIVE USER: No token found!');
    }
    newPlayers[currentIdx].tokens = sortTokens(newPlayers[currentIdx].tokens);
    
    setPlayers(newPlayers);
    
    // Clear active user state and enter token phase
    setActiveUserState(null);
    setIsTokenPhase(true);
    setSelectedToken(null);
  };

  // Add handler for stealing a card from another player's wall
  const handleStealCard = (targetPlayerIdx, targetCardIdx) => {
    const targetPlayer = players[targetPlayerIdx];
    const stolenCard = targetPlayer.wall[targetCardIdx];
    
    if (!stolenCard) return;
    
    const newPlayers = [...players];
    
    // Remove the card from the target player's wall
    newPlayers[targetPlayerIdx] = {
      ...newPlayers[targetPlayerIdx],
      wall: newPlayers[targetPlayerIdx].wall.filter((_, i) => i !== targetCardIdx)
    };
    
    // Add the stolen card to the current player's wall (with turnPosted flag)
    const stolenCardWithFlag = { ...stolenCard, turnPosted: true };
    let newWall = [stolenCardWithFlag, ...newPlayers[currentIdx].wall];
    
    // Handle wall overflow (max 3 cards)
    if (newWall.length > 3) {
      // Remove oldest card (last in array) and return tokens to owners
      let removedCard = newWall[newWall.length - 1];
      if (removedCard.tokens && removedCard.tokens.length > 0) {
        removedCard.tokens.forEach(token => {
          const ownerIdx = newPlayers.findIndex(p => p.name === token.player.name);
          if (ownerIdx !== -1) {
            let ownerTokens = [...newPlayers[ownerIdx].tokens];
            const tokenIdx = ownerTokens.findIndex(t => t.type === token.type);
            if (tokenIdx !== -1) {
              ownerTokens[tokenIdx] = { ...ownerTokens[tokenIdx], count: ownerTokens[tokenIdx].count + 1 };
            } else {
              ownerTokens.push({ type: token.type, count: 1, playerId: ownerIdx });
            }
            newPlayers[ownerIdx].tokens = sortTokens(ownerTokens);
          }
        });
      }
      // Remove tokens from card before discarding
      removedCard = { ...removedCard, tokens: [] };
      setDiscard(prev => [...prev, removedCard]);
      newWall = newWall.slice(0, 3); // Keep only the 3 newest cards
    }
    
    // Update current player's wall
    newPlayers[currentIdx] = {
      ...newPlayers[currentIdx],
      wall: newWall
    };
    
    setPlayers(newPlayers);
    
    // Clear steal state and enter token phase
    setStealState(null);
    setIsTokenPhase(true);
    setHasPlayedCardThisTurn(false);
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

  // Main header and score log (full width, 40px left/right padding)
  const headerAndLog = (
    <Box sx={{ width: '100%', px: 5, pt: 3, boxSizing: 'border-box' }}>
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
    </Box>
  );

  // Player row: full width, 40px left/right padding, 32px gap between columns
  const playerRow = (
    <Box sx={{
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      gap: 4,
      overflowX: 'auto',
      px: 5,
      alignItems: 'flex-start',
      boxSizing: 'border-box'
    }}>
      {players.map((player, i) => {
        const isCurrentPlayer = i === currentIdx;
        const followers = players.filter(p => p.following && p.following.some(followedPlayer => followedPlayer.name === player.name));
        const cardInterestData = getInterestData(player.interest);
        const playerColor = cardInterestData.color;
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
            <Box sx={{
              width: '100%',
              height: 64,
              background: 'transparent',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 64,
              mb: 0
            }}>
              {isCurrentPlayer && socialChallengeState && socialChallengeState.phase === 'reveal' ? (
                <Typography variant="body2" sx={{ color: 'white', textAlign: 'center', fontSize: '0.95rem' }}>
                  Reveal card
                </Typography>
              ) : isCurrentPlayer && stealState && stealState.phase === 'select' ? (
                <Typography variant="body2" sx={{ color: 'white', textAlign: 'center', fontSize: '0.95rem' }}>
                  Select card to steal
                </Typography>
              ) : isCurrentPlayer && contentPlannerState && contentPlannerState.phase === 'select' ? (
                <Typography variant="body2" sx={{ color: 'white', textAlign: 'center', fontSize: '0.95rem' }}>
                  Select 3 cards
                </Typography>
              ) : isCurrentPlayer && mustDraw ? (
                <Button
                  variant="contained"
                  sx={{
                    minWidth: 120,
                    borderRadius: 2,
                    backgroundColor: playerColor,
                    color: '#fff',
                    transition: 'all 0.15s',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      filter: 'brightness(0.93)',
                      backgroundColor: playerColor
                    }
                  }}
                  onClick={handleDrawCard}
                >
                  Draw Card
                </Button>
              ) : isCurrentPlayer && isTokenPhase ? (
                <Button
                  variant="contained"
                  sx={{
                    minWidth: 120,
                    borderRadius: 2,
                    backgroundColor: playerColor,
                    color: '#fff',
                    transition: 'all 0.15s',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      filter: 'brightness(0.93)',
                      backgroundColor: playerColor
                    }
                  }}
                  onClick={handleEndTurn}
                >
                  End Turn
                </Button>
              ) : null}
            </Box>
            <Paper elevation={isCurrentPlayer ? 6 : 2} sx={{
              border: `3px solid ${playerColor}`,
              borderRadius: 2,
              p: 2,
              pt: 0,
              width: '100%',
              background: '#fff',
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
                    backgroundColor: getInterestData(follower.interest).color,
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
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1,
                borderRadius: 1,
                background: isTokenPhase && isProfileValidTarget(i) ? '#f3eaff' : undefined,
                cursor: isTokenPhase && isProfileValidTarget(i) ? 'pointer' : undefined,
                border: isTokenPhase && isProfileValidTarget(i) ? '2px solid #4cff8d' : undefined,
                outline: isTokenPhase && isProfileValidTarget(i) ? '2px solid #4cff8d' : undefined,
                zIndex: isTokenPhase && isProfileValidTarget(i) ? 3 : 1
              }}
                onClick={isTokenPhase && isProfileValidTarget(i) ? () => handlePlaceTokenOnProfile(i) : undefined}
              >
                <Box sx={{ width: '100%', height: 60, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography fontWeight={700}>{player.name}</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span style={{ fontSize: 22 }}>{cardInterestData.icon}</span>
                      <Typography>{player.interest ? player.interest.charAt(0).toUpperCase() + player.interest.slice(1) : ''}</Typography>
                    </Box>
                    {player.following && player.following.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0 }}>
                        {player.following.map((followedPlayer, idx) => (
                          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span style={{ fontSize: 16 }}>{getInterestData(followedPlayer.interest).icon}</span>
                            <span style={{ fontSize: 13, color: '#666' }}>{followedPlayer.interest.charAt(0).toUpperCase() + followedPlayer.interest.slice(1)}</span>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
              <Box sx={{ width: '100%', height: 18, background: '#eee', borderRadius: 1, mb: 1, position: 'relative' }}>
                <LinearProgress variant="determinate" value={Math.min(100, (player.position / BOARD_SIZE) * 100)} sx={{ height: 18, borderRadius: 1, background: '#eee', '& .MuiLinearProgress-bar': { background: playerColor } }} />
                <Typography sx={{ position: 'absolute', left: 8, top: 0, fontSize: 12, color: '#333' }}>{player.position} / {BOARD_SIZE}</Typography>
                {scoreIndicators[i] !== undefined && (
                  <Typography sx={{ position: 'absolute', right: 8, top: 0, fontSize: 12, color: playerColor, fontWeight: 'bold' }}>
                    {scoreIndicators[i] < 0 ? `-${Math.abs(scoreIndicators[i])}` : `+${scoreIndicators[i]}`}
                  </Typography>
                )}
              </Box>
              {/* Wall - fixed height for 3 cards, 16px left/right padding */}
              <Box sx={{ width: '100%', height: 268, background: '#f8f8ff', borderRadius: 1, p: 1, px: 2, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="caption" color="text.secondary" sx={{ flex: '0 0 auto', textAlign: 'center', width: '100%' }}>Wall</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 1, mt: 0.5, height: '100%', overflowY: 'auto', justifyContent: 'flex-end', flex: '1 1 0' }}>
                  {player.wall.map((card, idx) => {
                    const cardInterestData = getInterestData(card.interest);
                    return (
                      <Paper key={idx} sx={{
                        p: 1,
                        width: '100%',
                        maxWidth: 240,
                        minWidth: 0,
                        minHeight: 48,
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: `2px solid ${cardInterestData.color}`,
                        background: '#fff',
                        cursor: (isTokenPhase && isCardValidTarget(player, card)) || (stealState && stealState.phase === 'select' && i !== currentIdx) ? 'pointer' : undefined,
                        boxShadow: (isTokenPhase && isCardValidTarget(player, card)) || (stealState && stealState.phase === 'select' && i !== currentIdx) ? 'inset 0 0 10px 3px #4cff8d, 0 0 10px 3px #4cff8d' : undefined,
                        borderRadius: 2,
                        margin: 0,
                        position: 'relative',
                        overflow: 'visible',
                        outline: (isTokenPhase && isCardValidTarget(player, card)) || (stealState && stealState.phase === 'select' && i !== currentIdx) ? '2px solid #4cff8d' : undefined,
                        zIndex: (isTokenPhase && isCardValidTarget(player, card)) || (stealState && stealState.phase === 'select' && i !== currentIdx) ? 3 : 1,
                        transition: 'all 0.15s',
                        '&:hover': (isTokenPhase && isCardValidTarget(player, card)) || (stealState && stealState.phase === 'select' && i !== currentIdx) ? { transform: 'scale(1.05)', filter: 'brightness(0.93)' } : {}
                      }}
                        onClick={
                          isTokenPhase && isCardValidTarget(player, card) ? () => handlePlaceTokenOnCard(i, idx)
                          : stealState && stealState.phase === 'select' && i !== currentIdx ? () => handleStealCard(i, idx)
                          : undefined
                        }
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span style={{ fontSize: 20 }}>{cardInterestData.icon}</span>
                          <span style={{ fontWeight: 700 }}>{card.interest ? card.interest.charAt(0).toUpperCase() + card.interest.slice(1) : ''}</span>
                        </Box>
                        <span style={{ fontWeight: 900, fontSize: 22, color: cardInterestData.color }}>{card.value}</span>
                        {/* Tokens on card, absolutely centered and overlapping */}
                        {card.tokens && card.tokens.length > 0 && (
                          <Box sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 0.5,
                            zIndex: 2
                          }}>
                            {card.tokens.map((token, tIdx) => (
                              <Box key={tIdx} sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                backgroundColor: getInterestData(token.player.interest).color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: 22,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.18)'
                              }} title={token.type}>
                                {getMaterialIcon(token.type)}
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Paper>
                    );
                  })}
                </Box>
              </Box>
              {/* Hand - 16px left/right padding */}
              <Box sx={{ width: '100%', minHeight: 40, background: '#f8f8ff', borderRadius: 1, p: 1, px: 2, boxSizing: 'border-box' }}>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', width: '100%', display: 'flex', justifyContent: 'center' }}>Hand</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 1, mt: 0.5 }}>
                  {player.hand.map((card, idx) => {
                    const cardInterestData = getInterestData(card.interest);
                    const isPlayable = i === currentIdx && !mustDraw && !isTokenPhase;
                    const isMatching = socialChallengeState && socialChallengeState.phase === 'reveal' && card.interest === socialChallengeState.revealedInterest;
                    const isOtherSelected = socialChallengeState && socialChallengeState.phase === 'reveal' && socialChallengeState.revealedIdx !== null && idx !== socialChallengeState.revealedIdx;
                    const isSocialChallengeReveal = socialChallengeState && socialChallengeState.phase === 'reveal' && i === currentIdx;
                    const isCC = !card.type || card.type !== 'network';
                    const isNC = card.type === 'network';
                    const highlightCC = isSocialChallengeReveal && isCC;
                    const disableNC = isSocialChallengeReveal && isNC;
                    return (
                      <Paper key={idx} sx={{
                        p: 1,
                        width: '100%',
                        maxWidth: 240,
                        minWidth: 0,
                        minHeight: 48,
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: `2px solid ${card.type === 'network' ? '#9147ff' : cardInterestData.color}`,
                        background: '#fff',
                        cursor: highlightCC ? 'pointer' : isPlayable ? 'pointer' : 'default',
                        opacity: disableNC ? 0.5 : 1,
                        pointerEvents: disableNC ? 'none' : highlightCC ? 'auto' : isPlayable ? 'auto' : 'auto',
                        outline: highlightCC ? '2px solid #4cff8d' : undefined,
                        boxShadow: highlightCC ? '0 0 0 3px #4cff8d, 0 5px 10px rgba(0,0,0,0.4)' : isPlayable ? '0 0 8px 2px #9147ff40' : '0 1px 3px rgba(0,0,0,0.2)',
                        borderRadius: 2,
                        margin: 0,
                        position: 'relative',
                        overflow: 'visible',
                        transition: 'all 0.15s',
                        '&:hover': highlightCC ? { filter: 'brightness(0.93)' } : isPlayable ? { transform: 'scale(1.05)', filter: 'brightness(0.93)' } : {}
                      }} onClick={
                        highlightCC ? () => handleSocialChallengeReveal(idx)
                        : isPlayable ? () => handlePlayCard(idx)
                        : isMatching && !isOtherSelected ? () => handleSocialChallengeSelectOther(i, idx)
                        : undefined
                      }>
                        {card.type === 'network' ? (
                          <Box sx={{ width: '100%' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#9147ff' }}>{card.title}</div>
                            <div style={{ fontSize: '0.7rem', color: '#666' }}>{card.description}</div>
                          </Box>
                        ) : (
                          <>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <span style={{ fontSize: 20 }}>{cardInterestData.icon}</span>
                              <span style={{ fontWeight: 700 }}>{card.interest ? card.interest.charAt(0).toUpperCase() + card.interest.slice(1) : ''}</span>
                            </Box>
                            <span style={{ fontWeight: 900, fontSize: 22, color: cardInterestData.color }}>{card.value}</span>
                            {/* Tokens on card, absolutely centered and overlapping (should be rare in hand, but for consistency) */}
                            {card.tokens && card.tokens.length > 0 && (
                              <Box sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                display: 'flex',
                                flexDirection: 'row',
                                gap: 0.5,
                                zIndex: 2
                              }}>
                                {card.tokens.map((token, tIdx) => (
                                  <Box key={tIdx} sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    backgroundColor: getInterestData(token.player.interest).color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: 22,
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.18)'
                                  }} title={token.type}>
                                    {getMaterialIcon(token.type)}
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </>
                        )}
                      </Paper>
                    );
                  })}
                </Box>
              </Box>
              {/* Token Pool */}
              <Box sx={{ width: '100%', minHeight: 40, background: '#f8f8ff', borderRadius: 1, p: 1, px: 2, boxSizing: 'border-box' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5, justifyContent: 'center' }}>
                  {sortTokens(player.tokens).map((token, tokenIdx) => {
                    const isSelectable = i === currentIdx && isTokenPhase && token.count > 0;
                    // Only highlight as selected if this is the current player
                    const isSelected = i === currentIdx && selectedToken && selectedToken.type === token.type;
                    
                    // Create multiple token elements based on count
                    return Array.from({ length: token.count }, (_, tokenInstanceIdx) => (
                      <Box
                        key={`${tokenIdx}-${tokenInstanceIdx}`}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          backgroundColor: token.count > 0 ? getInterestData(player.interest).color : '#ccc',
                          color: 'white',
                          cursor: isSelectable ? 'pointer' : 'default',
                          transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                          boxShadow: isSelected ? '0 0 0 3px #3d91ff, 0 5px 10px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.2)',
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                          '&:hover': isSelectable ? { transform: 'scale(1.05)', filter: 'brightness(0.93)' } : {}
                        }}
                        onClick={isSelectable ? () => handleSelectToken(token.type) : undefined}
                        title={token.tooltip}
                      >
                        {getMaterialIcon(token.type)}
                      </Box>
                    ));
                  })}
                </Box>
              </Box>
            </Paper>
          </Box>
        );
      })}
    </Box>
  );

  console.log('Players state before render:', players.map(p => ({
    name: p.name,
    interest: p.interest,
    hand: p.hand.map(card => card.interest || card.type)
  })));

  return (
    <>
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
            <Button key={index} onClick={action.action} variant="contained" color="primary" sx={{ borderRadius: 2, transition: 'all 0.15s', '&:hover': { transform: 'scale(1.05)', filter: 'brightness(0.93)' } }}>
              {action.text}
            </Button>
          ))}
        </DialogActions>
      </Dialog>

      {/* Content Planner Modal */}
      <Dialog 
        open={contentPlannerState && contentPlannerState.phase === 'select'} 
        onClose={() => {}} 
        maxWidth="lg" 
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 700 }}>
          CONTENT PLANNER
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
              Select 3 cards to add to your hand
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Selected: {contentPlannerState?.selectedCards?.length || 0}/3
            </Typography>
          </Box>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: 2,
            maxHeight: '60vh',
            overflowY: 'auto'
          }}>
            {contentPlannerState?.allCards?.map((card, index) => {
              const cardInterestData = getInterestData(card.interest);
              const isSelected = contentPlannerState?.selectedCards?.some(selected => selected.index === index);
              return (
                <Paper key={index} sx={{
                  p: 1,
                  minHeight: 80,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px solid ${card.type === 'network' ? '#9147ff' : cardInterestData.color}`,
                  background: isSelected ? '#e3f2fd' : '#fff',
                  cursor: 'pointer',
                  outline: isSelected ? '2px solid #2196f3' : undefined,
                  boxShadow: isSelected ? '0 0 0 3px #2196f3, 0 5px 10px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.2)',
                  borderRadius: 2,
                  transition: 'all 0.15s',
                  '&:hover': { transform: 'scale(1.05)', filter: 'brightness(0.93)' }
                }} onClick={() => handleContentPlannerSelectCard(index)}>
                  {card.type === 'network' ? (
                    <Box sx={{ width: '100%', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#9147ff' }}>{card.title}</div>
                      <div style={{ fontSize: '0.7rem', color: '#666' }}>{card.description}</div>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <span style={{ fontSize: 20 }}>{cardInterestData.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{card.interest ? card.interest.charAt(0).toUpperCase() + card.interest.slice(1) : ''}</span>
                      </Box>
                      <span style={{ fontWeight: 900, fontSize: 22, color: cardInterestData.color }}>{card.value}</span>
                    </>
                  )}
                </Paper>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button 
            onClick={handleContentPlannerConfirm}
            variant="contained" 
            color="primary"
            disabled={!contentPlannerState || contentPlannerState.selectedCards.length !== 3}
            sx={{ 
              borderRadius: 2, 
              transition: 'all 0.15s', 
              '&:hover': { transform: 'scale(1.05)', filter: 'brightness(0.93)' },
              '&:disabled': { opacity: 0.5 }
            }}
          >
            Confirm ({contentPlannerState?.selectedCards?.length || 0}/3)
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bot Modal */}
      <Dialog 
        open={botState && botState.phase === 'browse'} 
        onClose={() => {}} 
        maxWidth="lg" 
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 700 }}>
          BOT
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
              Select up to 3 cards to publish on your wall
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Selected: {botState?.selectedCards?.length || 0}/3
            </Typography>
          </Box>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: 2,
            maxHeight: '60vh',
            overflowY: 'auto'
          }}>
            {botState?.deckCards?.map((card, index) => {
              const cardInterestData = getInterestData(card.interest);
              const isSelected = botState?.selectedCards?.some(selected => selected.index === index);
              const isContentCard = !card.type;
              return (
                <Paper key={index} sx={{
                  p: 1,
                  minHeight: 80,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px solid ${isContentCard ? cardInterestData.color : '#9147ff'}`,
                  background: isSelected ? '#e3f2fd' : '#fff',
                  cursor: isContentCard ? 'pointer' : 'not-allowed',
                  outline: isSelected ? '2px solid #2196f3' : undefined,
                  boxShadow: isSelected ? '0 0 0 3px #2196f3, 0 5px 10px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.2)',
                  borderRadius: 2,
                  opacity: isContentCard ? 1 : 0.5,
                  transition: 'all 0.15s',
                  '&:hover': isContentCard ? { transform: 'scale(1.05)', filter: 'brightness(0.93)' } : {}
                }} onClick={isContentCard ? () => handleBotSelectCard(index) : undefined}>
                  {isContentCard ? (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <span style={{ fontSize: 20 }}>{cardInterestData.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{card.interest ? card.interest.charAt(0).toUpperCase() + card.interest.slice(1) : ''}</span>
                      </Box>
                      <span style={{ fontWeight: 900, fontSize: 22, color: cardInterestData.color }}>{card.value}</span>
                    </>
                  ) : (
                    <Box sx={{ width: '100%', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#9147ff' }}>{card.title}</div>
                      <div style={{ fontSize: '0.7rem', color: '#666' }}>{card.description}</div>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button 
            onClick={handleBotConfirm}
            variant="contained" 
            color="primary"
            disabled={!botState || botState.selectedCards.length === 0 || botState.selectedCards.length > 3}
            sx={{ 
              borderRadius: 2, 
              transition: 'all 0.15s', 
              '&:hover': { transform: 'scale(1.05)', filter: 'brightness(0.93)' },
              '&:disabled': { opacity: 0.5 }
            }}
          >
            Confirm ({botState?.selectedCards?.length || 0}/3)
          </Button>
        </DialogActions>
      </Dialog>

      {/* Opinion Maker Modal */}
      <Dialog 
        open={opinionMakerState && opinionMakerState.phase === 'select'} 
        onClose={() => {}} 
        maxWidth="sm" 
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 700 }}>
          OPINION MAKER
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
            Choose a token type
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 3, 
            mb: 3 
          }}>
            {/* Follow Token */}
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: getInterestData(currentPlayer.interest).color,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                transform: opinionMakerState?.selectedToken === 'follow' ? 'scale(1.15)' : 'scale(1)',
                boxShadow: opinionMakerState?.selectedToken === 'follow' ? '0 0 0 3px #3d91ff, 0 5px 10px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'all 0.15s',
                '&:hover': { transform: 'scale(1.05)', filter: 'brightness(0.93)' }
              }}
              onClick={() => handleOpinionMakerSelectToken('follow')}
              title="Follow token"
            >
              <PersonAddIcon />
            </Box>
            
            {/* Ban Token */}
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: getInterestData(currentPlayer.interest).color,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                transform: opinionMakerState?.selectedToken === 'ban' ? 'scale(1.15)' : 'scale(1)',
                boxShadow: opinionMakerState?.selectedToken === 'ban' ? '0 0 0 3px #3d91ff, 0 5px 10px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'all 0.15s',
                '&:hover': { transform: 'scale(1.05)', filter: 'brightness(0.93)' }
              }}
              onClick={() => handleOpinionMakerSelectToken('ban')}
              title="Ban token"
            >
              <BlockIcon />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button 
            onClick={handleOpinionMakerConfirm}
            variant="contained" 
            color="primary"
            disabled={!opinionMakerState || !opinionMakerState.selectedToken}
            sx={{ 
              borderRadius: 2, 
              transition: 'all 0.15s', 
              '&:hover': { transform: 'scale(1.05)', filter: 'brightness(0.93)' },
              '&:disabled': { opacity: 0.5 }
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Active User Modal */}
      <Dialog 
        open={activeUserState && activeUserState.phase === 'select'} 
        onClose={() => {}} 
        maxWidth="sm" 
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 700 }}>
          ACTIVE USER
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
            Choose a token type
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 3, 
            mb: 3 
          }}>
            {/* Share Token */}
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: getInterestData(currentPlayer.interest).color,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                transform: activeUserState?.selectedToken === 'share' ? 'scale(1.15)' : 'scale(1)',
                boxShadow: activeUserState?.selectedToken === 'share' ? '0 0 0 3px #3d91ff, 0 5px 10px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'all 0.15s',
                '&:hover': { transform: 'scale(1.05)', filter: 'brightness(0.93)' }
              }}
              onClick={() => handleActiveUserSelectToken('share')}
              title="Share token"
            >
              <ShareIcon />
            </Box>
            
            {/* Report Token */}
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: getInterestData(currentPlayer.interest).color,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                transform: activeUserState?.selectedToken === 'report' ? 'scale(1.15)' : 'scale(1)',
                boxShadow: activeUserState?.selectedToken === 'report' ? '0 0 0 3px #3d91ff, 0 5px 10px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'all 0.15s',
                '&:hover': { transform: 'scale(1.05)', filter: 'brightness(0.93)' }
              }}
              onClick={() => handleActiveUserSelectToken('report')}
              title="Report token"
            >
              <ReportIcon />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button 
            onClick={handleActiveUserConfirm}
            variant="contained" 
            color="primary"
            disabled={!activeUserState || !activeUserState.selectedToken}
            sx={{ 
              borderRadius: 2, 
              transition: 'all 0.15s', 
              '&:hover': { transform: 'scale(1.05)', filter: 'brightness(0.93)' },
              '&:disabled': { opacity: 0.5 }
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 