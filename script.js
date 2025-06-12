const BOARD_SIZE = 40;
const interests = ['fashion', 'tourism', 'food', 'fitness', 'music', 'gaming'];
const interestColors = {
    'fashion': '#FF69B4',
    'tourism': '#87CEEB',
    'food': '#FFA500',
    'fitness': '#32CD32',
    'music': '#9370DB',
    'gaming': '#FF6347'
};
let players, currentPlayer, deck, discardPile, selectedCard, tokens, canInteractWithTokens, isTokenPhase;

function initGame() {
    updateInterestSelectOptions();
}

function updateInterestSelectOptions() {
    const playerCount = parseInt(document.getElementById('player-count').value);
    for (let i = 1; i <= playerCount; i++) {
        const interestSelect = document.getElementById(`player${i}-interest`);
        interestSelect.innerHTML = '<option value="" disabled selected>Please select</option>';
        interests.forEach(interest => {
            interestSelect.innerHTML += `<option value="${interest}">${interest}</option>`;
        });
    }
}

function updatePlayerFields() {
    const playerCount = document.getElementById('player-count').value;
    const playerFields = document.getElementById('player-fields');

    playerFields.innerHTML = '';
    for (let i = 1; i <= playerCount; i++) {
        playerFields.innerHTML += `
            <div>
                <label for="player${i}-name">Player ${i} Name:</label>
                <input id="player${i}-name" value="Player ${i}">
                <label for="player${i}-interest">Player ${i} Interest:</label>
                <select id="player${i}-interest" onchange="updateInterestOptions()">
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
    let selectedInterests = [];

    for (let i = 1; i <= playerCount; i++) {
        const interestSelect = document.getElementById(`player${i}-interest`);
        const selectedInterest = interestSelect.value;
        selectedInterests.push(selectedInterest);
    }

    for (let i = 1; i <= playerCount; i++) {
        const interestSelect = document.getElementById(`player${i}-interest`);
        interestSelect.querySelectorAll('option').forEach(option => {
            option.disabled = selectedInterests.includes(option.value) && option.value !== interestSelect.value;
        });
    }

    const startGameButton = document.getElementById('start-game');
    startGameButton.style.display = selectedInterests.every(val => val !== '') ? 'block' : 'none';
}

function startGame() {
    const playerCount = parseInt(document.getElementById('player-count').value);
    players = [];

    for (let i = 1; i <= playerCount; i++) {
        const player = {
            name: document.getElementById(`player${i}-name`).value,
            interest: document.getElementById(`player${i}-interest`).value,
            position: 0,
            wall: [],
            hand: [],
            tokens: createTokens(i, playerCount),
            mustDraw: true,
            followedBy: null
        };
        players.push(player);
    }

    if (players.some(player => !player.name || !player.interest) || new Set(players.map(p => p.interest)).size !== players.length) {
        alert('Please fill in all fields and choose different interests.');
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
    const score = calculateScore();
    currentPlayer.position = Math.min(BOARD_SIZE, currentPlayer.position + score);
    
    if (currentPlayer.position >= BOARD_SIZE) {
        endGame(currentPlayer);
        return;
    }
    
    const currentIndex = players.indexOf(currentPlayer);
    currentPlayer = players[(currentIndex + 1) % players.length];
    currentPlayer.mustDraw = true;
    selectedCard = null;
    canInteractWithTokens = false;
    isTokenPhase = false;
    updateGameBoard();
}

function calculateScore() {
    let score = 0;
    let log = `Calculating score for ${currentPlayer.name}:\n`;

    currentPlayer.wall.forEach(card => {
        let baseCardScore = card.value;
        let tokenPoints = 0;
        let reportTokenPresent = false;

        card.tokens?.forEach(token => {
            if (token.type === 'like') {
                tokenPoints += 1;
            } else if (token.type === 'dislike') {
                tokenPoints -= 1;
            } else if (token.type === 'report') {
                reportTokenPresent = true;
            }
        });

        if (reportTokenPresent) {
            baseCardScore = 0;
            tokenPoints = 0;
            log += `Card ${card.interest} (${card.value}) has a report token, nullifying all points.\n`;
        }

        if (card.interest !== currentPlayer.interest && card.turnPosted) {
            score += baseCardScore + tokenPoints;
            log += `Card ${card.interest} (${card.value}) played once scored ${baseCardScore + tokenPoints} points (including token points: ${tokenPoints}).\n`;
            card.turnPosted = false;
        } else if (card.interest === currentPlayer.interest) {
            score += baseCardScore + tokenPoints;
            log += `Card ${card.interest} (${card.value}) scored ${baseCardScore + tokenPoints} points (including token points: ${tokenPoints}).\n`;
        }
    });

    players.forEach(player => {
        player.wall.forEach(otherCard => {
            let otherCardTokenPoints = 0;
            let otherCardReportTokenPresent = false;

            if (otherCard.tokens) {
                otherCard.tokens.forEach(token => {
                    if (token.type === 'like') {
                        otherCardTokenPoints += 1;
                    } else if (token.type === 'dislike') {
                        otherCardTokenPoints -= 1;
                    } else if (token.type === 'report') {
                        otherCardReportTokenPresent = true;
                    }
                });

                if (!otherCardReportTokenPresent) {
                    otherCard.tokens.forEach(otherToken => {
                        if (otherToken.type === 'share' && otherToken.player === currentPlayer) {
                            score += otherCard.value + otherCardTokenPoints;
                            log += `Share token on card ${otherCard.interest} (${otherCard.value}) added ${otherCard.value + otherCardTokenPoints} points to ${currentPlayer.name}.\n`;
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

function handleDropToken(event, cardIndex) {
    event.preventDefault();
    if (!canInteractWithTokens) return;
    const tokenType = event.dataTransfer.getData('text/plain');
    const token = currentPlayer.tokens.find(t => t.type === tokenType);
    if (token && token.count > 0) {
        const playerIndex = event.target.getAttribute('data-player-index');
        const card = players[playerIndex].wall[cardIndex];
        card.tokens = card.tokens || [];
        card.tokens.push({ type: tokenType, player: currentPlayer, tooltip: token.tooltip });
        token.count -= 1;
        updateGameBoard();
    }
}

function handleDropProfileToken(event, playerIndex) {
    event.preventDefault();
    if (!canInteractWithTokens) return;

    const tokenType = event.dataTransfer.getData('text/plain');
    const token = currentPlayer.tokens.find(t => t.type === tokenType);

    if (token && token.count > 0) {
        if (playerIndex === players.indexOf(currentPlayer)) {
            let errorMessage;
            switch (tokenType) {
                case 'like':
                    errorMessage = "You cannot like your profile";
                    break;
                case 'dislike':
                    errorMessage = "You cannot dislike your profile";
                    break;
                case 'ban':
                    errorMessage = "You cannot ban yourself";
                    break;
                case 'follow':
                    errorMessage = "You cannot follow yourself";
                    break;
                case 'report':
                    errorMessage = "You cannot report your profile";
                    break;
                case 'share':
                    errorMessage = "You cannot share your profile";
                    break;
                default:
                    errorMessage = "Invalid action on your profile";
                    break;
            }
            alert(errorMessage);
            return;
        }

        if (tokenType === 'ban') {
            players.forEach(player => {
                player.wall.forEach(card => {
                    if (card.tokens) {
                        card.tokens = card.tokens.filter(token => {
                            if (token.player === players[playerIndex]) {
                                const tokenOwner = token.player;
                                const originalToken = tokenOwner.tokens.find(t => t.type === token.type);
                                originalToken.count += 1;
                                return false;
                            }
                            return true;
                        });
                    }
                });
            });

            token.count -= 1;
            greyOutToken(token);
        } else if (tokenType === 'follow') {
            players[playerIndex].followedBy = currentPlayer;
            token.count -= 1;
        }

        updateGameBoard();
    }
}

function handleDragToken(event, tokenType) {
    if (!canInteractWithTokens) return;
    event.dataTransfer.setData('text/plain', tokenType);
    event.dataTransfer.setDragImage(event.target, 25, 25);
    event.target.classList.add('dragging');
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
}

function updateGameBoard() {
    const gameContent = document.querySelector('.game-content');
    const turnInfo = document.querySelector('.turn-info');
    const deckInfo = document.querySelector('.deck-info');

    turnInfo.innerHTML = `
        Current Turn: ${currentPlayer.name}
        ${currentPlayer.mustDraw ? 
            `<button onclick="drawCard()">Draw Card</button>` : 
            (selectedCard !== null && !isTokenPhase ? 
                `<button onclick="postToWall()">Post to Wall</button>` : '')
        }
        ${isTokenPhase ? 
            `<button onclick="endTurn()">End Turn</button>` : ''}
    `;

    deckInfo.innerHTML = `Deck: ${deck.length} | Discard: ${discardPile.length}`;

    let html = '';

    players.forEach((player, playerIndex) => {
        html += `
            <div class="player-column">
                <div class="player-section">
                    <div class="board">
                        <div class="player-position" style="width: ${(player.position / BOARD_SIZE) * 100}%; background-color: ${interestColors[player.interest]}"></div>
                    </div>
                    <div class="player-profile" 
                        ondrop="handleDropProfileToken(event, ${playerIndex})" 
                        ondragover="event.preventDefault()"
                        data-player-index="${playerIndex}">
                        <h3>${player.name} (${player.interest}): ${player.position} / ${BOARD_SIZE}</h3>
                        <div class="profile-token-container">
                            ${player.followedBy ? 
                                `<div class="token" style="background-color: ${interestColors[player.followedBy.interest]}" data-tooltip="follow">
                                    follow
                                </div>` : ''}
                        </div>
                    </div>
                    <div class="wall-hand-container">
                        <div class="wall-container card" style="background-color: ${interestColors[player.interest]}22">
                            <h3 class="wall-hand-title">Wall</h3>
                            <div class="wall">
                                ${player.wall.map((card, index) => `
                                    <div class="wall-card" style="background-color: ${interestColors[card.interest]}44" 
                                        ondrop="handleDropToken(event, ${index})" 
                                        ondragover="event.preventDefault()"
                                        data-player-index="${playerIndex}">
                                        ${card.interest}: ${card.value}
                                        <div class="token-wrapper">
                                            ${card.tokens ? card.tokens.map(token => `
                                                <div class="token" 
                                                    style="background-color: ${interestColors[token.player.interest]}" 
                                                    data-tooltip="${token.tooltip}">
                                                    ${token.type}
                                                </div>`).join('') : ''}
                                        </div>
                                    </div>`).join('')}
                            </div>
                        </div>
                        <div class="hand-container card" style="background-color: ${interestColors[player.interest]}22">
                            <h3 class="wall-hand-title">${currentPlayer === player && selectedCard === null && !currentPlayer.mustDraw && !isTokenPhase ? '<span class="blink">Select a card</span>' : 'Hand'}</h3>
                            <div class="hand">
                                ${player.hand.map((card, index) => `
                                    <div class="hand-card ${index === selectedCard && player === currentPlayer ? 'selected' : ''}" 
                                         onclick="${player === currentPlayer && !currentPlayer.mustDraw && !isTokenPhase ? `selectCard(${index})` : ''}"
                                         style="background-color: ${interestColors[card.interest]}44">
                                        ${card.interest}: ${card.value}
                                    </div>`).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="tokens">
                        <h3 class="wall-hand-title">${currentPlayer === player && isTokenPhase ? '<span class="blink">Drag and drop a token?</span>' : 'Tokens'}</h3>
                        <div class="tokens-container">
                            ${player.tokens.map(token => 
                                Array(token.count).fill().map(() => `
                                    <div class="token ${isTokenPhase && token.playerId === currentPlayer.tokens[0].playerId ? 'draggable' : ''}" draggable="${isTokenPhase}" 
                                         ondragstart="${isTokenPhase && token.playerId === currentPlayer.tokens[0].playerId ? `handleDragToken(event, '${token.type}')` : ''}"
                                         ondragend="handleDragEnd(event)"
                                         data-tooltip="${token.tooltip}"
                                         style="background-color: ${interestColors[player.interest]}">
                                        ${token.type}
                                    </div>`).join('')).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    gameContent.innerHTML = html;
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

initGame();
