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

    // 1. Determine the set of interests that score points for the current player.
    const activeInterests = new Set([currentPlayer.interest]);
    
    // 2. Check if the current player is following another player.
    if (currentPlayer.isFollowing) {
        const followedPlayer = currentPlayer.isFollowing;
        if (followedPlayer) {
            // IMPORTANT: Only the followed player's ORIGINAL interest is acquired.
            // There is no chain-following of interests.
            activeInterests.add(followedPlayer.interest);
            log += `${currentPlayer.name} is following ${followedPlayer.name}, gaining their interest: ${followedPlayer.interest}.\n`;
        }
    }

    // 3. Score cards on the current player's wall.
    currentPlayer.wall.forEach(card => {
        let baseCardScore = card.value;
        let tokenPoints = 0;
        let reportTokenPresent = false;

        card.tokens?.forEach(token => {
            if (token.type === 'like') tokenPoints += 1;
            else if (token.type === 'dislike') tokenPoints -= 1;
            else if (token.type === 'report') reportTokenPresent = true;
        });

        if (reportTokenPresent) {
            baseCardScore = 0;
            tokenPoints = 0;
            log += `Card ${card.interest} (${card.value}) has a report token, nullifying all points.\n`;
        }

        // Card scores continuously if its interest is one of the active interests.
        if (activeInterests.has(card.interest)) {
            score += baseCardScore + tokenPoints;
            log += `Card ${card.interest} (${card.value}) is an active interest and scored ${baseCardScore + tokenPoints} points.\n`;
        } 
        // Card scores only once if it was just posted and is not an active interest.
        else if (card.turnPosted) {
            score += baseCardScore + tokenPoints;
            log += `Card ${card.interest} (${card.value}) was just posted and scored ${baseCardScore + tokenPoints} points (one time).\n`;
            card.turnPosted = false; // Ensure it doesn't score again
        }
    });

    // 4. Score points from 'share' tokens on other players' walls.
    players.forEach(player => {
        if (player === currentPlayer) return; // Skip self

        player.wall.forEach(otherCard => {
            let otherCardTokenPoints = 0;
            let otherCardReportTokenPresent = false;

            if (otherCard.tokens) {
                otherCard.tokens.forEach(token => {
                    if (token.type === 'like') otherCardTokenPoints += 1;
                    else if (token.type === 'dislike') otherCardTokenPoints -= 1;
                    else if (token.type === 'report') otherCardReportTokenPresent = true;
                });

                if (!otherCardReportTokenPresent) {
                    otherCard.tokens.forEach(otherToken => {
                        if (otherToken.type === 'share' && otherToken.player === currentPlayer) {
                            score += otherCard.value + otherCardTokenPoints;
                            log += `Share token on ${player.name}'s card added ${otherCard.value + otherCardTokenPoints} points.\n`;
                        }
                    });
                }
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
                        ${player.hand.map((card, index) => `
                            <div class="hand-card" style="border-color: ${interestColors[card.interest]};"
                                 onclick="${isCurrentPlayer && !currentPlayer.mustDraw && !isTokenPhase ? `playCard(${index})` : ''}">
                                ${interests.find(i => i.name === card.interest).icon} ${card.interest.charAt(0).toUpperCase() + card.interest.slice(1)} (${card.value})
                            </div>`).join('')}
                    </div>
                </div>

                <div class="tokens">
                    <h3 class="wall-hand-title">${isCurrentPlayer && isTokenPhase ? '<span class="blink">Select a token</span>' : 'Tokens'}</h3>
                    <div class="tokens-container">
                        ${player.tokens.map(token => 
                            Array(token.count).fill().map(() => `
                                <div class="token"
                                     onclick="selectToken(this, '${token.type}')"
                                     data-tooltip="${token.type}"
                                     style="background-color: ${playerColor};">
                                     <span class="material-icons">${getMaterialIconName(token.type)}</span>
                                </div>`).join('')).join('')}
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

    // Move the clicked card from the hand to the wall.
    const card = currentPlayer.hand.splice(index, 1)[0];
    
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

function selectToken(tokenElement, tokenType) {
    if (!isTokenPhase) return;

    const isAlreadySelected = tokenElement.classList.contains('selected');
    
    // Deselect all tokens first
    document.querySelectorAll('.token').forEach(t => t.classList.remove('selected'));

    if (isAlreadySelected) {
        selectedToken = null; // Deselect if clicking the same token
    } else {
        tokenElement.classList.add('selected'); // Select the new token
        selectedToken = {
            type: tokenType,
            player: currentPlayer
        };
    }
    updateGameBoard(); // Re-render to highlight valid targets
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

function placeTokenOnCard(targetPlayerIndex, cardIndex) {
    const targetPlayer = players[targetPlayerIndex];
    const card = targetPlayer.wall[cardIndex];

    if (!isCardValidTarget(targetPlayer, card)) return;

    const tokenToPlay = currentPlayer.tokens.find(t => t.type === selectedToken.type);
    if (tokenToPlay && tokenToPlay.count > 0) {
        card.tokens = card.tokens || [];
        card.tokens.push({ type: selectedToken.type, player: currentPlayer, tooltip: tokenToPlay.tooltip });
        tokenToPlay.count--;
        selectedToken = null;
        updateGameBoard();
    }
}

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
        const cardsHtml = discardPile.map(card => `
            <div class="wall-card" style="border-color: ${interestColors[card.interest]}; margin: 5px; cursor: default;">
                ${interests.find(i => i.name === card.interest).icon} ${card.interest.charAt(0).toUpperCase() + card.interest.slice(1)} (${card.value})
            </div>
        `).join('');
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

initGame();
