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
  const newDeck = [];
  // Collect all unique interests in play
  const interestsInPlay = [...new Set(players.map(p => p.interest))];
  interestsInPlay.forEach(interest => {
    for (let i = 0; i < 6; i++) newDeck.push({ interest, value: 1 });
    for (let i = 0; i < 3; i++) newDeck.push({ interest, value: 2 });
    newDeck.push({ interest, value: 3 });
  });
  // Add 10 SOCIAL CHALLENGE Network Cards if enabled (for focused testing)
  if (networkCardsEnabled) {
    for (let i = 0; i < 10; i++) {
      newDeck.push({
        title: 'SOCIAL CHALLENGE',
        description: 'Reveal a post from your hand and gain 2 Pp. All players with a card of the same interest also get 2 Pp. Others lose 2 Pp.',
        effectKey: 'challenge',
        type: 'network',
      });
    }
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
  const [socialChallengeState, setSocialChallengeState] = useState(null);
  const [hasPlayedCardThisTurn, setHasPlayedCardThisTurn] = useState(false);

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
    setHasPlayedCardThisTurn(false);
  }, [setup]);

  if (!setup || players.length === 0) return null;
  const currentPlayer = players[currentIdx];

  // Utility to set scoreGainedThisTurn and clear it after 3 seconds
  const setScoreGainedForPlayer = (playerIdx, value) => {
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers];
      newPlayers[playerIdx] = {
        ...newPlayers[playerIdx],
        scoreGainedThisTurn: value
      };
      return newPlayers;
    });
    setTimeout(() => {
      setPlayers(prevPlayers => {
        const newPlayers = [...prevPlayers];
        if (newPlayers[playerIdx].scoreGainedThisTurn === value) {
          newPlayers[playerIdx] = {
            ...newPlayers[playerIdx],
            scoreGainedThisTurn: undefined
          };
        }
        return newPlayers;
      });
    }, 3000);
  };

  // Calculate score function
  const calculateScore = () => {
    let score = 0;
    let log = '';

    const activeInterests = new Set([currentPlayer.interest]);
    if (currentPlayer.isFollowing) {
      const followedPlayer = currentPlayer.isFollowing;
      if (followedPlayer) {
        activeInterests.add(followedPlayer.interest);
        log += `${currentPlayer.name} is following ${followedPlayer.name}, gaining their interest: ${followedPlayer.interest}.\n`;
      }
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
    if (deck.length === 0) {
      // Reshuffle discard into deck
      setDeck(shuffleDeck(discard));
      setDiscard([]);
      return;
    }
    const newPlayers = [...players];
    newPlayers[currentIdx] = {
      ...currentPlayer,
      hand: [...currentPlayer.hand, deck[0]]
    };
    setPlayers(newPlayers);
    setDeck(deck.slice(1));
    // After each draw in handleDrawCard:
    console.log('Player', currentPlayer.name, 'drew', deck[0]);
    console.log('Deck after draw:', deck.slice(1).map(card => card.interest + (card.type ? ' (network)' : '')));
    setMustDraw(false);
  };

  // Play card logic (from hand to wall)
  const handlePlayCard = idx => {
    const isSocialChallengeBlocking = socialChallengeState && (
      (socialChallengeState.phase === 'select-own' && currentIdx !== yourPlayerIndex) ||
      (socialChallengeState.phase === 'select-others')
    );
    if (mustDraw || isTokenPhase || hasPlayedCardThisTurn || isSocialChallengeBlocking) return;
    const card = currentPlayer.hand[idx];
    
    // Check if it's a network card
    if (card.type === 'network') {
      applyNetworkCardEffect(card, idx);
      setMustDraw(false); // Do not allow drawing again this turn
      setHasPlayedCardThisTurn(true);
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
    setHasPlayedCardThisTurn(true);
    setMustDraw(false);
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
      // Remove Follow token (if banned player is following someone)
      if (bannedPlayer.isFollowing) {
        removedTokens.push({ type: 'follow', player: bannedPlayer });
        bannedPlayer.isFollowing = null;
      }
      // Remove banned player from any followers arrays
      newPlayers.forEach(p => {
        if (p.followers) {
          p.followers = p.followers.filter(f => f.name !== bannedPlayer.name);
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
      setTimeout(() => {
        setPlayers(prevPlayers => {
          const updated = [...prevPlayers];
          if (updated[lastPlayerIndex].scoreGainedThisTurn === score) {
            updated[lastPlayerIndex] = {
              ...updated[lastPlayerIndex],
              scoreGainedThisTurn: undefined
            };
          }
          return updated;
        });
      }, 3000);
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
        // All other players lose 3 PP (min 0), show -3 indicator, no popup
        newPlayers.forEach((p, i) => {
          if (i !== currentIdx) {
            const before = p.position;
            const lost = Math.min(3, p.position);
            p.position = Math.max(0, p.position - 3);
            setScoreGainedForPlayer(i, -lost);
          }
        });
        // Remove network card from hand and add to discard pile
        newDiscard.push(card);
        newPlayers[currentIdx] = {
          ...newPlayers[currentIdx],
          hand: newPlayers[currentIdx].hand.filter((_, i) => i !== handIdx)
        };
        setPlayers(newPlayers);
        setDeck(newDeck);
        setDiscard(newDiscard);
        setTokensDump(newTokensDump);
        setIsTokenPhase(true);
        setSelectedToken(null);
        setHasPlayedCardThisTurn(true);
        return;
      }
      case 'sponsored': {
        // Count posts of player's interest on all walls
        const playerInterest = players[currentIdx].interest;
        const postsCount = players.reduce((count, player) => {
          return count + player.wall.filter(card => card.interest === playerInterest).length;
        }, 0);

        // Add points immediately and show +N indicator
        const newPlayers = [...players];
        newPlayers[currentIdx] = {
          ...newPlayers[currentIdx],
          position: newPlayers[currentIdx].position + postsCount,
          scoreGainedThisTurn: postsCount
        };

        // Remove network card from hand and add to discard pile
        newDiscard.push(card);
        newPlayers[currentIdx] = {
          ...newPlayers[currentIdx],
          hand: newPlayers[currentIdx].hand.filter((_, i) => i !== handIdx)
        };
        setPlayers(newPlayers);
        setDeck(newDeck);
        setDiscard(newDiscard);
        setTokensDump(newTokensDump);
        setIsTokenPhase(true);
        setSelectedToken(null);
        setScoreGainedForPlayer(currentIdx, postsCount);
        setHasPlayedCardThisTurn(true);
        return;
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
      case 'challenge': {
        // Remove network card from hand and add to discard pile
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
    setHasPlayedCardThisTurn(true);
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
      if (currentPlayer.isFollowing) interests.push(currentPlayer.isFollowing.interest);
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
    
    // For follow tokens, check if already following someone
    if (selectedToken.type === 'follow' && currentPlayer.isFollowing) return false;
    
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

  // Add a handler for when a content card is clicked during SOCIAL CHALLENGE
  const handleSocialChallengeReveal = (idx) => {
    const card = players[currentIdx].hand[idx];
    const revealedInterest = card.interest;
    // Award points
    const newPlayers = [...players];
    // Current player always gets +2
    newPlayers[currentIdx].position += 2;
    newPlayers[currentIdx].scoreGainedThisTurn = 2;
    // Other players
    players.forEach((p, i) => {
      if (i === currentIdx) return;
      const hasMatch = p.hand.some(c => c.interest === revealedInterest);
      if (hasMatch) {
        newPlayers[i].position += 2;
        newPlayers[i].scoreGainedThisTurn = 2;
      } else {
        const lost = Math.min(2, newPlayers[i].position);
        newPlayers[i].position = Math.max(0, newPlayers[i].position - 2);
        newPlayers[i].scoreGainedThisTurn = -lost;
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
        const followers = players.filter(p => p.isFollowing && p.isFollowing.name === player.name);
        const cardInterestData = getInterestData(player.interest);
        const playerColor = cardInterestData.color;
        const isSocialChallengeSelectOwn = socialChallengeState && socialChallengeState.phase === 'select-own' && i === currentIdx;
        const isSelected = isSocialChallengeSelectOwn && socialChallengeState.revealedIdx === i;
        const isHighlight = isSocialChallengeSelectOwn && socialChallengeState.revealedIdx === null;
        const isSocialChallengeSelectOthers = socialChallengeState && socialChallengeState.phase === 'select-others' && i === socialChallengeState.pending[0];
        const isMatching = isSocialChallengeSelectOthers && player.hand[socialChallengeState.revealedIdx] && player.hand[socialChallengeState.revealedIdx].interest === socialChallengeState.revealedInterest;
        const isOtherSelected = isSocialChallengeSelectOthers && socialChallengeState.selections && socialChallengeState.selections[i] === socialChallengeState.revealedIdx;
        const isSocialChallengeBlocking = socialChallengeState && (
          (socialChallengeState.phase === 'select-own' && i === currentIdx)
        );
        const isPlayable = i === currentIdx && !mustDraw && !isTokenPhase && !hasPlayedCardThisTurn && !isSocialChallengeBlocking;
        const isSocialChallengeReveal = socialChallengeState && socialChallengeState.phase === 'reveal' && i === currentIdx;
        const isCC = !player.hand[i].type || player.hand[i].type !== 'network';
        const isNC = player.hand[i].type === 'network';
        const highlightCC = isSocialChallengeReveal && isCC;
        const disableNC = isSocialChallengeReveal && isNC;
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
              ) : isCurrentPlayer ? (
                <Typography variant="body2" sx={{ color: 'white', textAlign: 'center', fontSize: '0.95rem' }}>
                  Play a card
                </Typography>
              ) : null}
            </Box>
            <Paper elevation={isCurrentPlayer ? 6 : 2} sx={{
              border: `3px solid ${playerColor}`,
              borderRadius: 2,
              p: 2,
              pt: 0,
              width: '100%',
              background: '#fff',
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
                outline: isTokenPhase && isProfileValidTarget(i) ? '2px solid #4cff8d' : undefined,
                border: isTokenPhase && isProfileValidTarget(i) ? '2px solid #4cff8d' : undefined,
                background: isTokenPhase && isProfileValidTarget(i) ? '#f3eaff' : undefined,
                cursor: isTokenPhase && isProfileValidTarget(i) ? 'pointer' : undefined,
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
                    {player.isFollowing && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, mt: 0 }}>
                        <span style={{ fontSize: 16 }}>{getInterestData(player.isFollowing.interest).icon}</span>
                        <span style={{ fontSize: 13, color: '#666' }}>{player.isFollowing.interest.charAt(0).toUpperCase() + player.isFollowing.interest.slice(1)}</span>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
              <Box sx={{ width: '100%', height: 18, background: '#eee', borderRadius: 1, mb: 1, position: 'relative' }}>
                <LinearProgress variant="determinate" value={Math.min(100, (player.position / BOARD_SIZE) * 100)} sx={{ height: 18, borderRadius: 1, background: '#eee', '& .MuiLinearProgress-bar': { background: playerColor } }} />
                <Typography sx={{ position: 'absolute', left: 8, top: 0, fontSize: 12, color: '#333' }}>{player.position} / {BOARD_SIZE}</Typography>
                {player.scoreGainedThisTurn !== undefined && (
                  <Typography sx={{ position: 'absolute', right: 8, top: 0, fontSize: 12, color: playerColor, fontWeight: 'bold' }}>
                    {player.scoreGainedThisTurn > 0 ? `+${player.scoreGainedThisTurn}` : player.scoreGainedThisTurn}
                  </Typography>
                )}
              </Box>
              {/* Wall - fixed height for 3 cards, 16px left/right padding */}
              <Box sx={{ width: '100%', height: 268, background: '#f8f8ff', borderRadius: 1, p: 1, px: 2, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="caption" color="text.secondary" sx={{ flex: '0 0 auto' }}>Wall</Typography>
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
                        border: card.type === 'network' ? '2px solid #9147ff' : `2px solid ${cardInterestData.color}`,
                        background: '#fff',
                        cursor: isTokenPhase && isCardValidTarget(player, card) ? 'pointer' : undefined,
                        outline: isTokenPhase && isCardValidTarget(player, card) ? '2px solid #4cff8d' : undefined,
                        boxShadow: isTokenPhase && isCardValidTarget(player, card) ? '0 0 16px 4px #4cff8d80, 0 4px 24px 4px #0002' : undefined,
                        transition: undefined,
                        borderRadius: 2,
                        margin: 0,
                        position: 'relative',
                        overflow: 'visible',
                      }}
                        onClick={
                          isTokenPhase && isCardValidTarget(player, card) ? () => handlePlaceTokenOnCard(i, idx)
                          : isPlayable ? () => handlePlayCard(idx)
                          : isSocialChallengeSelectOwn && socialChallengeState.revealedIdx === null ? () => handleSocialChallengeReveal(idx)
                          : isMatching && !isOtherSelected ? () => handleSocialChallengeSelectOther(i, idx)
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
                <Typography variant="caption" color="text.secondary">Hand</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 1, mt: 0.5 }}>
                  {player.hand.map((card, idx) => {
                    const cardInterestData = getInterestData(card.interest);
                    const isSocialChallengeReveal = socialChallengeState && socialChallengeState.phase === 'reveal' && i === currentIdx;
                    const isSocialChallengeSelectOthers = socialChallengeState && socialChallengeState.phase === 'select-others' && i === socialChallengeState.pending[0];
                    const isMatching = isSocialChallengeSelectOthers && card.interest === socialChallengeState.revealedInterest;
                    const isOtherSelected = isSocialChallengeSelectOthers && socialChallengeState.selections && socialChallengeState.selections[i] === idx;
                    const isCC = !card.type || card.type !== 'network';
                    const isNC = card.type === 'network';
                    const highlightCC = isSocialChallengeReveal && isCC;
                    const disableNC = isSocialChallengeReveal && isNC;
                    return (
                      <Paper
                        key={idx}
                        sx={{
                          p: 1,
                          width: '100%',
                          maxWidth: 240,
                          minWidth: 0,
                          minHeight: 48,
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          border: card.type === 'network' ? '2px solid #9147ff' : `2px solid ${cardInterestData.color}`,
                          background: '#fff',
                          cursor: highlightCC ? 'pointer' : isPlayable ? 'pointer' : 'default',
                          opacity: disableNC ? 0.5 : 1,
                          pointerEvents: disableNC ? 'none' : highlightCC ? 'auto' : isPlayable ? 'auto' : 'auto',
                          outline: highlightCC ? '2px solid #4cff8d' : undefined,
                          boxShadow: highlightCC ? '0 0 0 3px #4cff8d, 0 5px 10px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.2)',
                          zIndex: 1,
                          '&:hover': highlightCC ? { filter: 'brightness(0.93)' } : isPlayable ? { transform: 'scale(1.05)', filter: 'brightness(0.93)' } : {}
                        }}
                        onClick={
                          highlightCC ? () => handleSocialChallengeReveal(idx)
                          : isPlayable ? () => handlePlayCard(idx)
                          : isMatching && !isOtherSelected ? () => handleSocialChallengeSelectOther(i, idx)
                          : undefined
                        }
                      >
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
                  {sortTokens(player.tokens).map((token, idx) => {
                    const isSelected = i === currentIdx && selectedToken && selectedToken.type === token.type;
                    return (
                      <Box
                        key={idx}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          backgroundColor: token.count > 0 ? cardInterestData.color : '#ccc',
                          color: 'white',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 0 0 3px #4cff8d, 0 5px 10px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.2)',
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                          '&:hover': { transform: 'scale(1.05)', filter: 'brightness(0.93)' }
                        }}
                        onClick={() => handleSelectToken(token.type)}
                        title={token.tooltip}
                      >
                        {getMaterialIcon(token.type)}
                      </Box>
                    );
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
    </>
  );
} 