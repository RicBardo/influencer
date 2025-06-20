const BOARD_SIZE = 40;
const interests = [
    { name: 'fashion', icon: '👗' },
    { name: 'tourism', icon: '🌍' },
    { name: 'food', icon: '🍔' },
    { name: 'fitness', icon: '🏋️' },
    { name: 'music', icon: '🎵' },
    { name: 'gaming', icon: '🎮' }
];
const interestColors = {
    'fashion': '#FF69B4',
    'tourism': '#87CEEB',
    'food': '#FFA500',
    'fitness': '#32CD32',
    'music': '#9370DB',
    'gaming': '#FF6347'
};
let players, currentPlayer, deck, discardPile, selectedCard, tokens, canInteractWithTokens, isTokenPhase;
let selectedToken = null;
let tokensDump = [];

// --- NETWORK CARDS DATA ---
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
  // Return a deep copy so shuffling doesn't mutate the original
  return NETWORK_CARDS.map(card => ({...card}));
}

function initGame() {
    const startGameButton = document.getElementById('start-game');
    startGameButton.disabled = true;
    startGameButton.title = 'Please select number of players';
    updateInterestSelectOptions();
}

function updateInterestSelectOptions() {
    const playerCount = document.getElementById('player-count').value;
    if (!playerCount) return;

    for (let i = 1; i <= playerCount; i++) {
        const interestSelect = document.getElementById(`player${i}-interest`);
        interestSelect.innerHTML = '<option value="" disabled selected>Please select</option>';
        interests.forEach(interest => {
            interestSelect.innerHTML += `<option value="${interest.name}">${interest.icon} ${interest.name.charAt(0).toUpperCase() + interest.name.slice(1)}</option>`;
        });
    }
}

function updatePlayerFields() {
    const playerCount = document.getElementById('player-count').value;
    const playerFields = document.getElementById('player-fields');
    const startGameButton = document.getElementById('start-game');
    
    // If no player count is selected, hide the player fields and disable the start button
    if (!playerCount) {
        playerFields.innerHTML = '';
        startGameButton.disabled = true;
        startGameButton.title = 'Please select number of players';
        return;
    }

    const nameSuggestions = [
        'Alex', 'Jamie', 'Taylor', 'Jordan', 'Morgan', 'Casey', 'Riley', 'Skyler', 'Avery', 'Quinn', 'Charlie', 'Dakota'
    ];
    playerFields.innerHTML = '';
    for (let i = 1; i <= playerCount; i++) {
        playerFields.innerHTML += `
            <div class="player-row" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; justify-content: center;">
                <label for="player${i}-name" style="margin-bottom:0;">Player ${i} Name:</label>
                <div style="position: relative; display: flex; align-items: center;">
                    <input id="player${i}-name" value="Player ${i}" style="padding-right: 32px;">
                    <button type="button" class="auto-gen-btn" tabindex="-1" style="position: absolute; right: 2px; top: 50%; transform: translateY(-50%); height: 28px; width: 28px; border: none; background: none; cursor: pointer; color: #3d91ff; font-size: 1.2em;" onclick="autoGenerateName(${i})" title="Auto-generate name">🎲</button>
                </div>
                <select id="player${i}-interest" onchange="updateInterestOptions()" style="min-width: 120px;">
                    <option value="" disabled selected>Please select</option>
                </select>
            </div>
        `;
    }
    updateInterestSelectOptions();
    updateInterestOptions();
}

function updateInterestOptions() {
    const playerCount = document.getElementById('player-count').value;
    if (!playerCount) return;

    let selectedInterests = [];
    const startGameButton = document.getElementById('start-game');

    // First, check if all interests are selected
    for (let i = 1; i <= playerCount; i++) {
        const interestSelect = document.getElementById(`player${i}-interest`);
        const selectedInterest = interestSelect.value;
        selectedInterests.push(selectedInterest);
    }

    // Update the disabled state of interest options
    for (let i = 1; i <= playerCount; i++) {
        const interestSelect = document.getElementById(`player${i}-interest`);
        interestSelect.querySelectorAll('option').forEach(option => {
            option.disabled = selectedInterests.includes(option.value) && option.value !== interestSelect.value;
        });
    }

    // Check if all interests are selected
    const allInterestsSelected = selectedInterests.every(val => val !== '');
    
    // Update button state
    startGameButton.disabled = !allInterestsSelected;
    startGameButton.title = allInterestsSelected ? 'Start the game' : 'Please select interests for all players';
}

function startGame() {
    const playerCount = document.getElementById('player-count').value;
    
    // Check if a valid player count has been selected
    if (!playerCount) {
        alert('Please select the number of players first.');
        return;
    }

    players = [];

    for (let i = 1; i <= playerCount; i++) {
        const playerName = document.getElementById(`player${i}-name`).value.trim() || `Player ${i}`;
        const playerInterest = document.getElementById(`player${i}-interest`).value;
        
        const player = {
            name: playerName,
            interest: playerInterest,
            position: 0,
            wall: [],
            hand: [],
            tokens: createTokens(i, playerCount),
            mustDraw: true,
            isFollowing: null,
            followers: []
        };
        players.push(player);
    }

    // Double check that all interests are selected and unique
    if (new Set(players.map(p => p.interest)).size !== players.length) {
        alert('Please choose different interests for each player.');
        return;
    }

    currentPlayer = players[0];
    deck = createDeck();
    discardPile = [];
    dealInitialCards();
    canInteractWithTokens = false;
    isTokenPhase = false;

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-board').style.display = 'block';
    updateGameBoard();
}

function createDeck() {
    const newDeck = [];
    players.forEach(player => {
        for (let i = 0; i < 6; i++) newDeck.push({ interest: player.interest, value: 1 });
        for (let i = 0; i < 3; i++) newDeck.push({ interest: player.interest, value: 2 });
        newDeck.push({ interest: player.interest, value: 3 });
    });
    // Add Network Cards if enabled
    const networkToggle = document.getElementById('network-cards-toggle');
    if (networkToggle && networkToggle.checked) {
        newDeck.push(...getNetworkCards());
    }
    return shuffleDeck(newDeck);
}

function shuffleDeck(deck) {
    return deck.sort(() => Math.random() - 0.5);
}

function dealInitialCards() {
    players.forEach(player => {
        for (let i = 0; i < 3; i++) {
            player.hand.push(deck.pop());
        }
    });
}

function drawCard() {
    if (!currentPlayer.mustDraw) return;
    if (deck.length === 0) {
        alert("Deck is empty. Reshuffling discarded cards.");
        deck = shuffleDeck(discardPile);
        discardPile = [];
    }
    currentPlayer.hand.push(deck.pop());
    currentPlayer.mustDraw = false;
    selectedCard = null;
    updateGameBoard();
}

function selectCard(index) {
    if (currentPlayer.mustDraw || isTokenPhase) return;
    selectedCard = selectedCard === index ? null : index;
    updateGameBoard();
}

function postToWall() {
    if (currentPlayer.mustDraw || selectedCard === null) return;
    const card = currentPlayer.hand[selectedCard];
    if (currentPlayer.wall.length >= 3) {
        const removedCard = currentPlayer.wall.shift();
        discardPile.push(removedCard);
        if (removedCard.tokens) {
            removedCard.tokens.forEach(token => {
                const owner = token.player;
                const playerToken = owner.tokens.find(t => t.type === token.type);
                playerToken.count += 1;
            });
        }
    }
    card.turnPosted = true;
    currentPlayer.wall.push(card);
    currentPlayer.hand.splice(selectedCard, 1);
    selectedCard = null;
    isTokenPhase = true;
    canInteractWithTokens = true;
    updateGameBoard();
}

function endTurn() {
    // Clear any score update flags from previous turns
    players.forEach(p => delete p.scoreGainedThisTurn);

    const score = calculateScore();
    const lastPlayerIndex = players.indexOf(currentPlayer);

    if (score > 0) {
        currentPlayer.scoreGainedThisTurn = score;
    }

    currentPlayer.position = Math.min(BOARD_SIZE, currentPlayer.position + score);

    if (currentPlayer.position >= BOARD_SIZE) {
        updateGameBoard(); // Update one last time to show the final score
        setTimeout(() => endGame(currentPlayer), 500); // Short delay before win screen
        return;
    }

    const currentIndex = players.indexOf(currentPlayer);
    currentPlayer = players[(currentIndex + 1) % players.length];
    currentPlayer.mustDraw = true;
    selectedToken = null;
    isTokenPhase = false;
    
    updateGameBoard();

    // After 2 seconds, remove the score update flag and re-render the board
    // to ensure the message is gone from the state.
    setTimeout(() => {
        const playerWhoScored = players[lastPlayerIndex];
        if (playerWhoScored && playerWhoScored.scoreGainedThisTurn) {
            delete playerWhoScored.scoreGainedThisTurn;
            updateGameBoard();
        }
    }, 2000);
}

function calculateScore() {
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
    document.getElementById('score-log').innerText = log;
    return score;
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

function getMaterialIconName(tokenType) {
    switch (tokenType) {
        case 'like': return 'thumb_up';
        case 'dislike': return 'thumb_down';
        case 'share': return 'share';
        case 'report': return 'error';
        case 'follow': return 'person_add';
        case 'ban': return 'block';
        default: return '';
    }
}

function updateGameBoard() {
    const gameContent = document.querySelector('.game-content');
    const deckInfo = document.querySelector('.deck-info');
    const discardInfo = document.querySelector('.discard-info');
    const tokensDumpContainer = document.querySelector('.tokens-dump');

    deckInfo.innerHTML = `Deck: ${deck.length}`;
    
    discardInfo.innerHTML = `Discard: ${discardPile.length}`;
    discardInfo.style.cursor = discardPile.length > 0 ? 'pointer' : 'default';
    discardInfo.onclick = discardPile.length > 0 ? showDiscardModal : null;

    tokensDumpContainer.innerHTML = `<span class="material-icons">delete_forever</span> ${tokensDump.length}`;
    tokensDumpContainer.style.cursor = tokensDump.length > 0 ? 'pointer' : 'default';
    tokensDumpContainer.onclick = tokensDump.length > 0 ? showTokensDumpModal : null;

    let html = `<div class="players-row">`;

    players.forEach((player, playerIndex) => {
        const isCurrentPlayer = player === currentPlayer;
        const profileTargetClass = isProfileValidTarget(playerIndex) ? 'valid-target' : '';
        const playerColor = interestColors[player.interest];

        const followers = players.filter(p => p.isFollowing === player);
        html += `
            <div class="player-column ${isCurrentPlayer ? 'current-turn' : ''}" style="border-color: ${playerColor}; position: relative;">
                ${followers.map((follower, index) => {
                    const totalFollowers = followers.length;
                    const offset = (index - (totalFollowers - 1) / 2) * 45; // 45px per token
                    return `
                        <div class="token" 
                             data-tooltip="followed by ${follower.name}" 
                             style="background-color: ${interestColors[follower.interest]};
                                    position: absolute;
                                    top: -20px;
                                    left: 50%;
                                    transform: translateX(${offset}px);
                                    z-index: 10;">
                            <span class="material-icons">person_add</span>
                        </div>
                    `;
                }).join('')}

                <div class="player-profile ${profileTargetClass}" onclick="placeTokenOnProfile(${playerIndex})">
                    <div class="player-profile-header">
                        <span class="player-name">${player.name}</span>
                        <div class="player-interest-container">
                            <span class="player-interest">
                                ${interests.find(i => i.name === player.interest).icon}
                                ${player.interest.charAt(0).toUpperCase() + player.interest.slice(1)}
                            </span>
                            ${player.isFollowing ? `
                                <span class="player-interest secondary" title="Following ${player.isFollowing.name}">
                                    + ${interests.find(i => i.name === player.isFollowing.interest).icon}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${(player.position / BOARD_SIZE) * 100}%; background-color: ${playerColor};">
                            ${player.position} / ${BOARD_SIZE}
                        </div>
                        ${player.scoreGainedThisTurn ? `
                            <span class="score-update" style="color: ${playerColor};">+${player.scoreGainedThisTurn}</span>
                        ` : ''}
                    </div>
                </div>
                
                ${isCurrentPlayer ? 
                    (currentPlayer.mustDraw ? 
                        `<button class="draw-card-button" onclick="drawCard()">Draw Card</button>` :
                        (isTokenPhase ? 
                            `<button class="draw-card-button" onclick="endTurn()">End Turn</button>` : '')) 
                    : ''}

                <div class="wall-container">
                    <h3 class="wall-hand-title">Wall</h3>
                    <div class="wall">
                        ${[...player.wall].reverse().map((card, cardIndex) => {
                            const originalCardIndex = player.wall.length - 1 - cardIndex;
                            const cardTargetClass = isCardValidTarget(player, card) ? 'valid-target' : '';
                            return `
                            <div class="wall-card ${cardTargetClass}" style="border-color: ${interestColors[card.interest]};" onclick="placeTokenOnCard(${playerIndex}, ${originalCardIndex})">
                                ${interests.find(i => i.name === card.interest).icon} ${card.interest.charAt(0).toUpperCase() + card.interest.slice(1)} (${card.value})
                                <div class="token-wrapper">
                                    ${card.tokens ? card.tokens.map(token => {
                                        const tokenOwnerColor = interestColors[token.player.interest];
                                        return `
                                        <div class="token" 
                                            data-tooltip="${token.tooltip}"
                                            style="background-color: ${tokenOwnerColor};">
                                            <span class="material-icons">${getMaterialIconName(token.type)}</span>
                                        </div>`;
                                    }).join('') : ''}
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
                
                <div class="hand-container">
                    <h3 class="wall-hand-title">${isCurrentPlayer && !currentPlayer.mustDraw && !isTokenPhase ? '<span class="blink">Select a card to play</span>' : 'Hand'}</h3>
                    <div class="hand">
                        ${player.hand.map((card, index) => {
                            if (card.type === 'network') {
                                return `<div class="hand-card network-card" onclick="${isCurrentPlayer && !currentPlayer.mustDraw && !isTokenPhase ? `playCard(${index})` : ''}">
                                    <div class="network-title">${card.title}</div>
                                    <div class="network-desc">${card.description}</div>
                                </div>`;
                            } else {
                                return `<div class="hand-card" style="border-color: ${interestColors[card.interest]};"
                                    onclick="${isCurrentPlayer && !currentPlayer.mustDraw && !isTokenPhase ? `playCard(${index})` : ''}">
                                    ${interests.find(i => i.name === card.interest).icon} ${card.interest.charAt(0).toUpperCase() + card.interest.slice(1)} (${card.value})
                                </div>`;
                            }
                        }).join('')}
                    </div>
                </div>

                <div class="tokens">
                    <h3 class="wall-hand-title">${
                        isCurrentPlayer && isTokenPhase 
                            ? (selectedToken 
                                ? `<span class="blink">Play ${selectedToken.type} token</span>` 
                                : '<span class="blink">Select a token</span>') 
                            : 'Tokens'
                    }</h3>
                    <div class="tokens-container">
                        ${player.tokens.map(token => 
                            Array(token.count).fill().map(() => {
                                const isSelected = selectedToken && selectedToken.type === token.type && player === currentPlayer;
                                return `
                                <div class="token ${isSelected ? 'selected' : ''}"
                                     onclick="selectToken('${token.type}')"
                                     data-tooltip="${token.type}"
                                     style="background-color: ${playerColor};">
                                     <span class="material-icons">${getMaterialIconName(token.type)}</span>
                                </div>`;
                            }).join('')).join('')}
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    gameContent.innerHTML = html;
}

function playCard(index) {
    // This function is called when a player clicks a card in their hand.
    if (currentPlayer.mustDraw || isTokenPhase) return;

    // Remove the clicked card from the hand.
    const card = currentPlayer.hand.splice(index, 1)[0];

    if (card.type === 'network') {
        // Network Card: send to discard and trigger effect
        discardPile.push(card);
        applyNetworkCardEffect(card);
        isTokenPhase = true;
        updateGameBoard();
        return;
    }

    // If the wall is full (3 cards), remove the oldest card and move it to the discard pile.
    if (currentPlayer.wall.length >= 3) {
        const removedCard = currentPlayer.wall.shift(); 
        discardPile.push(removedCard);

        // Return any tokens on the discarded card back to their owners.
        if (removedCard.tokens) {
            removedCard.tokens.forEach(token => {
                const owner = token.player;
                const playerToken = owner.tokens.find(t => t.type === token.type);
                if (playerToken) {
                    playerToken.count += 1;
                }
            });
        }
    }
    
    card.turnPosted = true;
    currentPlayer.wall.push(card);
    
    // Enter the token phase, allowing the player to play tokens or end their turn.
    isTokenPhase = true;
    updateGameBoard();
}

function greyOutToken(token) {
    token.count = 0;
    token.greyedOut = true;
    document.querySelectorAll(`.token[data-tooltip="${token.tooltip}"]`).forEach(el => {
        el.classList.add('greyed-out');
    });
}

function endGame(winner) {
    document.getElementById('game-board').style.display = 'none';
    const winScreen = document.getElementById('win-screen');
    winScreen.style.display = 'block';
    winScreen.innerHTML = `<h1>${winner.name} wins!</h1>`;
}

defaultAutoNames = [
    'Alex', 'Jamie', 'Taylor', 'Jordan', 'Morgan', 'Casey', 'Riley', 'Skyler', 'Avery', 'Quinn', 'Charlie', 'Dakota'
];
function autoGenerateName(i) {
    const input = document.getElementById(`player${i}-name`);
    const randomName = defaultAutoNames[Math.floor(Math.random() * defaultAutoNames.length)] + ' ' + i;
    input.value = randomName;
    input.focus();
}

function selectToken(tokenType) {
    if (!isTokenPhase) return;

    // If the clicked token type is already selected, deselect it.
    if (selectedToken && selectedToken.type === tokenType) {
        selectedToken = null;
    } else {
        // Otherwise, select the new token type.
        selectedToken = {
            type: tokenType,
            player: currentPlayer
        };
    }
    updateGameBoard(); // Re-render to update highlights and text
}

function isCardValidTarget(targetPlayer, card) {
    if (!selectedToken) return false;

    const targetPlayerIndex = players.indexOf(targetPlayer);
    const currentPlayerIndex = players.indexOf(currentPlayer);
    const tokenType = selectedToken.type;

    switch (tokenType) {
        case 'like':
        case 'dislike':
            return true; // Any card is a valid target
        case 'report':
            return targetPlayerIndex !== currentPlayerIndex; // Only other players' cards
        case 'share':
            // Only cards matching the current player's interest on other players' walls
            return targetPlayerIndex !== currentPlayerIndex && card.interest === currentPlayer.interest;
        default:
            return false;
    }
}

function isProfileValidTarget(targetPlayerIndex) {
    if (!selectedToken) return false;

    const currentPlayerIndex = players.indexOf(currentPlayer);
    const tokenType = selectedToken.type;

    if (targetPlayerIndex === currentPlayerIndex) return false; // Cannot target oneself

    return tokenType === 'follow' || tokenType === 'ban';
}

// Patch placeTokenOnCard to support steal mode
const _orig_placeTokenOnCard = window.placeTokenOnCard;
window.placeTokenOnCard = function(targetPlayerIndex, cardIndex) {
    if (window._stealMode && typeof window._stealHandler === 'function') {
        window._stealHandler(targetPlayerIndex, cardIndex);
        return;
    }
    return _orig_placeTokenOnCard(targetPlayerIndex, cardIndex);
};

function placeTokenOnProfile(targetPlayerIndex) {
    if (!isProfileValidTarget(targetPlayerIndex)) return;

    const tokenToPlay = currentPlayer.tokens.find(t => t.type === selectedToken.type);
    if (tokenToPlay && tokenToPlay.count > 0) {
        
        if (tokenToPlay.type === 'follow') {
            // If player is already following someone, just update the link.
            if (currentPlayer.isFollowing) {
                const previouslyFollowedPlayer = currentPlayer.isFollowing;
                if (previouslyFollowedPlayer.followers) {
                    previouslyFollowedPlayer.followers = previouslyFollowedPlayer.followers.filter(p => p !== currentPlayer);
                }
            } else {
                // If this is the first time using the token, decrement its count.
                tokenToPlay.count--;
            }
            // Set who the current player is following
            const targetPlayer = players[targetPlayerIndex];
            currentPlayer.isFollowing = targetPlayer;
            // Add the current player to the target's list of followers
            if (!targetPlayer.followers) {
                targetPlayer.followers = [];
            }
            targetPlayer.followers.push(currentPlayer);

        } else if (tokenToPlay.type === 'ban') {
            tokenToPlay.count--; // Consume the ban token
            const bannedPlayer = players[targetPlayerIndex];
            
            // 1. Remove all tokens placed by the banned player from every card on the board.
            players.forEach(p => {
                p.wall.forEach(card => {
                    if (card.tokens) {
                        const tokensFromBannedPlayer = card.tokens.filter(token => token.player === bannedPlayer);
                        if (tokensFromBannedPlayer.length > 0) {
                            tokensDump.push(...tokensFromBannedPlayer);
                            card.tokens = card.tokens.filter(token => token.player !== bannedPlayer);
                        }
                    }
                });
            });

            // 2. If the banned player was following someone, break that link and dump their follow token.
            if (bannedPlayer.isFollowing) {
                const followedPlayer = bannedPlayer.isFollowing;
                if (followedPlayer.followers) {
                    followedPlayer.followers = followedPlayer.followers.filter(p => p !== bannedPlayer);
                }
                bannedPlayer.isFollowing = null;
                tokensDump.push({ type: 'follow', player: bannedPlayer });
            }

            // 3. If any other player was following the banned player, break their link and return their token.
            players.forEach(p => {
                if (p.isFollowing === bannedPlayer) {
                    p.isFollowing = null;
                    const followToken = p.tokens.find(t => t.type === 'follow');
                    if (followToken) followToken.count++;
                }
            });

            // 4. Move the ban token itself to the dump.
            tokensDump.push({ type: 'ban', player: currentPlayer });
        }
        
        selectedToken = null; // Deselect token after placing it.
        updateGameBoard();
    }
}

function closeModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.style.display = 'none';
    modalOverlay.onclick = null;
}

function showDiscardModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalBody = document.getElementById('modal-body');
    
    let content = '<h2>Discard Pile</h2>';
    if (discardPile.length === 0) {
        content += '<p>The discard pile is empty.</p>';
    } else {
        const cardsHtml = discardPile.map(card => {
            if (card.type === 'network') {
                return `<div class="wall-card network-card" style="margin: 5px; cursor: default;">
                    <div class="network-title">${card.title}</div>
                    <div class="network-desc">${card.description}</div>
                </div>`;
            } else {
                return `<div class="wall-card" style="border-color: ${interestColors[card.interest]}; margin: 5px; cursor: default;">
                    ${interests.find(i => i.name === card.interest).icon} ${card.interest.charAt(0).toUpperCase() + card.interest.slice(1)} (${card.value})
                </div>`;
            }
        }).join('');
        content += `<div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">${cardsHtml}</div>`;
    }
    modalBody.innerHTML = content;
    
    modalOverlay.style.display = 'flex';
    // Close modal if user clicks outside the content area
    modalOverlay.onclick = function(event) {
        if (event.target === modalOverlay) {
            closeModal();
        }
    };
}

function showTokensDumpModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalBody = document.getElementById('modal-body');

    let content = '<h2>Tokens Dump</h2>';
    if (tokensDump.length === 0) {
        content += '<p>The tokens dump is empty.</p>';
    } else {
        const tokensHtml = tokensDump.map(token => {
            const tokenOwnerColor = interestColors[token.player.interest];
            return `
                <div class="token" 
                     title="${token.type} from ${token.player.name}"
                     style="background-color: ${tokenOwnerColor}; cursor: default;">
                    <span class="material-icons">${getMaterialIconName(token.type)}</span>
                </div>
            `;
        }).join('');
        content += `<div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">${tokensHtml}</div>`;
    }
    modalBody.innerHTML = content;
    
    modalOverlay.style.display = 'flex';
    modalOverlay.onclick = function(event) {
        if (event.target === modalOverlay) {
            closeModal();
        }
    };
}

function applyNetworkCardEffect(card) {
    // For now, stub: show modal with effect name
    let effectText = '';
    switch (card.effectKey) {
        case 'shitstorm': {
            // All other players lose 3 PP (min 0)
            let affected = [];
            players.forEach(p => {
                if (p !== currentPlayer) {
                    const before = p.position;
                    p.position = Math.max(0, p.position - 3);
                    affected.push(`${p.name} (${before} → ${p.position})`);
                }
            });
            effectText = `SHIT STORM:<br>All influencers but you lose 3 Pp.<br><br><strong>Effect:</strong><br>${affected.join('<br>')}`;
            break;
        }
        case 'sponsored': {
            // Current player gains PP equal to number of posts of their interest on all walls
            let count = 0;
            players.forEach(p => {
                p.wall.forEach(card => {
                    if (card.interest === currentPlayer.interest) count++;
                });
            });
            const before = currentPlayer.position;
            currentPlayer.position = Math.min(BOARD_SIZE, currentPlayer.position + count);
            effectText = `SPONSORED POST:<br>You gain as many Pp as the number of posts of your interest in play.<br><br><strong>Effect:</strong> +${count} Pp (${before} → ${currentPlayer.position})`;
            break;
        }
        case 'challenge': {
            // SOCIAL CHALLENGE: Reveal a post from your hand, gain 2 Pp, others respond
            if (!currentPlayer.hand.some(card => !card.type)) {
                // No post to reveal
                effectText = 'You have no post to reveal.';
                break;
            }
            let revealedIndex = null;
            function renderRevealModal() {
                const modalOverlay = document.getElementById('modal-overlay');
                const modalBody = document.getElementById('modal-body');
                modalBody.innerHTML = `<h2>SOCIAL CHALLENGE</h2><p>Select a post from your hand to reveal.</p>
                    <div style='display:flex;flex-wrap:wrap;gap:8px;justify-content:center;'>
                        ${currentPlayer.hand.map((card, i) => {
                            if (card.type === 'network') {
                                return `<div class='hand-card network-card' style='opacity:0.5;cursor:not-allowed;'><div class='network-title'>${card.title}</div><div class='network-desc'>${card.description}</div></div>`;
                            } else {
                                return `<div class='hand-card' style='border-color:${interestColors[card.interest]};cursor:pointer;${revealedIndex===i?'box-shadow:0 0 0 3px #9147ff;':''}' onclick='selectRevealCard(${i})'>${interests.find(x=>x.name===card.interest).icon} ${card.interest.charAt(0).toUpperCase()+card.interest.slice(1)} (${card.value})</div>`;
                            }
                        }).join('')}
                    </div>
                    <button onclick='confirmRevealCard()' ${revealedIndex===null?'disabled':''}>Ok</button>
                    <button onclick='closeModal()'>Cancel</button>`;
                modalOverlay.style.display = 'flex';
            }
            window.selectRevealCard = function(i) {
                revealedIndex = i;
                renderRevealModal();
            };
            window.confirmRevealCard = function() {
                const revealedCard = currentPlayer.hand[revealedIndex];
                // Gain 2 Pp
                const before = currentPlayer.position;
                currentPlayer.position = Math.min(BOARD_SIZE, currentPlayer.position + 2);
                // Now prompt each other player
                let responses = [];
                let idx = 0;
                function promptNextPlayer() {
                    if (idx >= players.length) {
                        // All done, show summary
                        closeModal();
                        updateGameBoard();
                        setTimeout(() => {
                            const modalOverlay = document.getElementById('modal-overlay');
                            const modalBody = document.getElementById('modal-body');
                            let summary = `<h2>SOCIAL CHALLENGE</h2><p>You revealed a ${revealedCard.interest} post and gained 2 Pp (${before} → ${currentPlayer.position}).<br><br>`;
                            responses.forEach(r => {
                                summary += `${r.name}: ${r.result}<br>`;
                            });
                            summary += '</p><button onclick="closeModal()">Close</button>';
                            modalBody.innerHTML = summary;
                            modalOverlay.style.display = 'flex';
                        }, 200);
                        return;
                    }
                    const p = players[idx];
                    idx++;
                    if (p === currentPlayer) {
                        promptNextPlayer();
                        return;
                    }
                    // Does this player have a matching card?
                    const matchIdx = p.hand.findIndex(card => !card.type && card.interest === revealedCard.interest);
                    const modalOverlay = document.getElementById('modal-overlay');
                    const modalBody = document.getElementById('modal-body');
                    if (matchIdx !== -1) {
                        // Can reveal
                        modalBody.innerHTML = `<h2>SOCIAL CHALLENGE</h2><p>${p.name}, you may reveal a ${revealedCard.interest} post to gain 2 Pp.</p>
                            <div class='hand-card' style='border-color:${interestColors[revealedCard.interest]};cursor:pointer;' onclick='revealMatchCard()'>${interests.find(x=>x.name===revealedCard.interest).icon} ${revealedCard.interest.charAt(0).toUpperCase()+revealedCard.interest.slice(1)}</div>
                            <button onclick='noMatchCard()'>No ${revealedCard.interest} card</button>`;
                        modalOverlay.style.display = 'flex';
                        window.revealMatchCard = function() {
                            const before = p.position;
                            p.position = Math.min(BOARD_SIZE, p.position + 2);
                            responses.push({name:p.name,result:`Revealed (${before}→${p.position})`});
                            promptNextPlayer();
                        };
                        window.noMatchCard = function() {
                            const before = p.position;
                            p.position = Math.max(0, p.position - 2);
                            responses.push({name:p.name,result:`No card (${before}→${p.position})`});
                            promptNextPlayer();
                        };
                    } else {
                        // No match, must lose 2 Pp
                        const before = p.position;
                        p.position = Math.max(0, p.position - 2);
                        responses.push({name:p.name,result:`No card (${before}→${p.position})`});
                        promptNextPlayer();
                    }
                }
                promptNextPlayer();
            };
            renderRevealModal();
            return;
        }
        case 'steal': {
            // STEAL IDEA: Highlight all posts on other players' walls, prompt to select one
            effectText = 'STEAL IDEA:<br>Select a post from another influencer\'s wall to steal.';
            // Set up steal mode
            window._stealMode = true;
            window._stealHandler = function(targetPlayerIndex, cardIndex) {
                if (!window._stealMode) return;
                const targetPlayer = players[targetPlayerIndex];
                if (targetPlayer === currentPlayer) return;
                const card = targetPlayer.wall[cardIndex];
                // Remove from target wall
                targetPlayer.wall.splice(cardIndex, 1);
                // If currentPlayer wall is full, discard oldest
                if (currentPlayer.wall.length >= 3) {
                    const removedCard = currentPlayer.wall.shift();
                    discardPile.push(removedCard);
                    if (removedCard.tokens) {
                        removedCard.tokens.forEach(token => {
                            const owner = token.player;
                            const playerToken = owner.tokens.find(t => t.type === token.type);
                            if (playerToken) playerToken.count += 1;
                        });
                    }
                }
                // Move card (and tokens) to currentPlayer's wall
                currentPlayer.wall.push(card);
                window._stealMode = false;
                window._stealHandler = null;
                closeModal();
                updateGameBoard();
                // Show summary
                setTimeout(() => {
                    const modalOverlay = document.getElementById('modal-overlay');
                    const modalBody = document.getElementById('modal-body');
                    modalBody.innerHTML = `<h2>STEAL IDEA</h2><p>You stole a post from ${targetPlayer.name}!</p><button onclick=\"closeModal()\">Close</button>`;
                    modalOverlay.style.display = 'flex';
                }, 200);
            };
            // Show modal with instructions
            setTimeout(() => {
                const modalOverlay = document.getElementById('modal-overlay');
                const modalBody = document.getElementById('modal-body');
                modalBody.innerHTML = `<h2>STEAL IDEA</h2><p>${effectText}</p><p><em>Click a post on another player\'s wall to steal it.</em></p>`;
                modalOverlay.style.display = 'flex';
            }, 100);
            return;
        }
        case 'planner': {
            // CONTENT PLANNER: Collect all hands, let player keep 3, redistribute rest
            let allCards = [];
            players.forEach(p => {
                allCards = allCards.concat(p.hand);
                p.hand = [];
            });
            let selected = [];
            function renderPlannerModal() {
                const modalOverlay = document.getElementById('modal-overlay');
                const modalBody = document.getElementById('modal-body');
                modalBody.innerHTML = `<h2>CONTENT PLANNER</h2><p>Select exactly 3 posts to keep in your hand.</p>
                    <div style='display:flex;flex-wrap:wrap;gap:8px;justify-content:center;'>
                        ${allCards.map((card, i) => {
                            if (card.type === 'network') {
                                return `<div class='hand-card network-card' style='cursor:not-allowed;opacity:0.5;'>
                                    <div class='network-title'>${card.title}</div>
                                    <div class='network-desc'>${card.description}</div>
                                </div>`;
                            } else {
                                return `<div class='hand-card' style='border-color:${interestColors[card.interest]};cursor:pointer;${selected.includes(i) ? 'box-shadow:0 0 0 3px #9147ff;' : ''}' onclick='selectPlannerCard(${i})'>
                                    ${interests.find(x => x.name === card.interest).icon} ${card.interest.charAt(0).toUpperCase() + card.interest.slice(1)} (${card.value})
                                </div>`;
                            }
                        }).join('')}
                    </div>
                    <button onclick='confirmPlannerCards()' ${selected.length !== 3 ? 'disabled' : ''}>Ok</button>
                    <button onclick='closeModal()'>Cancel</button>`;
                modalOverlay.style.display = 'flex';
            }
            window.selectPlannerCard = function(i) {
                if (allCards[i].type === 'network') return; // Can't select network cards
                if (selected.includes(i)) {
                    selected = selected.filter(x => x !== i);
                } else if (selected.length < 3) {
                    selected.push(i);
                }
                renderPlannerModal();
            };
            window.confirmPlannerCards = function() {
                // Give selected to current player
                selected.forEach(idx => {
                    currentPlayer.hand.push(allCards[idx]);
                });
                // Remove selected from allCards
                const rest = allCards.filter((_, i) => !selected.includes(i));
                // Shuffle and redistribute rest (3 per player, skip current)
                let restShuffled = rest.sort(() => Math.random() - 0.5);
                let playerIdx = 0;
                players.forEach(p => {
                    if (p !== currentPlayer) {
                        for (let i = 0; i < 3 && restShuffled.length > 0; i++) {
                            p.hand.push(restShuffled.pop());
                        }
                    }
                });
                closeModal();
                updateGameBoard();
                setTimeout(() => {
                    const modalOverlay = document.getElementById('modal-overlay');
                    const modalBody = document.getElementById('modal-body');
                    modalBody.innerHTML = `<h2>CONTENT PLANNER</h2><p>You kept 3 posts. All other hands were shuffled and redistributed.</p><button onclick=\"closeModal()\">Close</button>`;
                    modalOverlay.style.display = 'flex';
                }, 200);
            };
            renderPlannerModal();
            return;
        }
        case 'bot': {
            // BOT: Browse the deck, publish up to 3 posts directly on your wall, then shuffle the deck.
            // Filter only Post cards (not network)
            const postCards = deck.filter(c => !c.type);
            let selected = [];
            function renderBotModal() {
                const modalOverlay = document.getElementById('modal-overlay');
                const modalBody = document.getElementById('modal-body');
                modalBody.innerHTML = `<h2>BOT</h2><p>Select up to 3 posts to publish directly to your wall.</p>
                    <div style='display:flex;flex-wrap:wrap;gap:8px;justify-content:center;'>
                        ${postCards.map((card, i) => `
                            <div class='wall-card' style='border-color:${interestColors[card.interest]};cursor:pointer;${selected.includes(i) ? 'box-shadow:0 0 0 3px #9147ff;' : ''}' onclick='selectBotCard(${i})'>
                                ${interests.find(x => x.name === card.interest).icon} ${card.interest.charAt(0).toUpperCase() + card.interest.slice(1)} (${card.value})
                            </div>`).join('')}
                    </div>
                    <button onclick='confirmBotCards()' ${selected.length === 0 ? 'disabled' : ''}>Ok</button>
                    <button onclick='closeModal()'>Cancel</button>`;
                modalOverlay.style.display = 'flex';
            }
            window.selectBotCard = function(i) {
                if (selected.includes(i)) {
                    selected = selected.filter(x => x !== i);
                } else if (selected.length < 3) {
                    selected.push(i);
                }
                renderBotModal();
            };
            window.confirmBotCards = function() {
                // Post selected cards to wall (respect wall size limit)
                selected.forEach(idx => {
                    const card = postCards[idx];
                    // Remove from deck
                    const deckIdx = deck.indexOf(card);
                    if (deckIdx !== -1) deck.splice(deckIdx, 1);
                    // If wall full, discard oldest
                    if (currentPlayer.wall.length >= 3) {
                        const removedCard = currentPlayer.wall.shift();
                        discardPile.push(removedCard);
                        if (removedCard.tokens) {
                            removedCard.tokens.forEach(token => {
                                const owner = token.player;
                                const playerToken = owner.tokens.find(t => t.type === token.type);
                                if (playerToken) playerToken.count += 1;
                            });
                        }
                    }
                    card.turnPosted = true;
                    currentPlayer.wall.push(card);
                });
                // Reshuffle deck (including unused Network Cards)
                deck = shuffleDeck(deck);
                closeModal();
                updateGameBoard();
                setTimeout(() => {
                    const modalOverlay = document.getElementById('modal-overlay');
                    const modalBody = document.getElementById('modal-body');
                    modalBody.innerHTML = `<h2>BOT</h2><p>You published ${selected.length} post(s) from the deck to your wall.</p><button onclick=\"closeModal()\">Close</button>`;
                    modalOverlay.style.display = 'flex';
                }, 200);
            };
            renderBotModal();
            return;
        }
        case 'stalker': {
            // Gain 3 Like tokens
            const token = currentPlayer.tokens.find(t => t.type === 'like');
            token.count += 3;
            effectText = 'STALKER:<br>Gain 3 Like tokens.';
            break;
        }
        case 'troll': {
            // Gain 3 Dislike tokens
            const token = currentPlayer.tokens.find(t => t.type === 'dislike');
            token.count += 3;
            effectText = 'TROLL:<br>Gain 3 Dislike tokens.';
            break;
        }
        case 'opinion': {
            // Prompt for Follow or Ban token
            effectText = 'OPINION MAKER:<br>Choose 1 token to gain:';
            const modalOverlay = document.getElementById('modal-overlay');
            const modalBody = document.getElementById('modal-body');
            modalBody.innerHTML = `<h2>Network Card Played</h2><p>${effectText}</p>
                <button onclick="addOpinionToken('follow')">Follow</button>
                <button onclick="addOpinionToken('ban')">Ban</button>`;
            modalOverlay.style.display = 'flex';
            return;
        }
        case 'active': {
            // Prompt for Share or Report token
            effectText = 'ACTIVE USER:<br>Choose 1 token to gain:';
            const modalOverlay = document.getElementById('modal-overlay');
            const modalBody = document.getElementById('modal-body');
            modalBody.innerHTML = `<h2>Network Card Played</h2><p>${effectText}</p>
                <button onclick="addActiveToken('share')">Share</button>
                <button onclick="addActiveToken('report')">Report</button>`;
            modalOverlay.style.display = 'flex';
            return;
        }
        default:
            effectText = 'Unknown Network Card effect.';
    }
    const modalOverlay = document.getElementById('modal-overlay');
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `<h2>Network Card Played</h2><p>${effectText}</p><button onclick="closeModal()">Close</button>`;
    modalOverlay.style.display = 'flex';
}

// Add these helper functions globally:
window.addOpinionToken = function(type) {
    const token = currentPlayer.tokens.find(t => t.type === type);
    if (token) token.count += 1;
    closeModal();
    updateGameBoard();
};
window.addActiveToken = function(type) {
    const token = currentPlayer.tokens.find(t => t.type === type);
    if (token) token.count += 1;
    closeModal();
    updateGameBoard();
};

function updateNetworkToggleLabel() {
    const toggle = document.getElementById('network-cards-toggle');
    const label = document.getElementById('network-cards-toggle-label');
    if (toggle && label) {
        label.textContent = toggle.checked ? 'ON' : 'OFF';
    }
}

initGame();

// Call on page load
window.addEventListener('DOMContentLoaded', () => {
    updateNetworkToggleLabel();
});
