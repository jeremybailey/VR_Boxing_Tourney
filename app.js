// DOM Elements
const setupPhase = document.getElementById('setup-phase');
const tournamentPhase = document.getElementById('tournament-phase');
const winnerScreen = document.getElementById('winner-screen');
const playerNameInput = document.getElementById('player-name');
const addPlayerBtn = document.getElementById('add-player');
const playerList = document.getElementById('player-list');
const startTournamentBtn = document.getElementById('start-tournament');
const roundTitle = document.getElementById('round-title');
const bracket = document.getElementById('bracket');
const resetTournamentBtn = document.getElementById('reset-tournament');
const newTournamentBtn = document.getElementById('new-tournament');
const winnerName = document.getElementById('winner-name');

// State
let players = [];
let tournamentRounds = [];
let currentRound = 0;
const MAX_PLAYERS = 32;
let ws;

// WebSocket server configuration
const WS_URL = `ws://${window.location.hostname}:8000/ws`;

// Import confetti functions
import { initConfetti, cleanupConfetti } from './confetti.js';

// Fallback to local development if production URL fails
let usingFallback = false;
const FALLBACK_WS_SERVER = 'ws://localhost:8000/ws'; // Added /ws endpoint

// Initialize the app
function init() {
    try {
        // Ensure all UI is in the correct initial state
        setupPhase.classList.remove('d-none');
        tournamentPhase.classList.add('d-none');
        winnerScreen.classList.add('d-none');
        
        // Reset any existing state
        players = [];
        tournamentRounds = [];
        
        // Set up event listeners
        addEventListeners();
        
        // Connect to WebSocket
        connectWebSocket();
        
        // Focus the player name input
        if (playerNameInput) {
            playerNameInput.value = '';
            playerNameInput.focus();
        }
        
        // Clear any existing confetti
        if (typeof cleanupConfetti === 'function') {
            cleanupConfetti();
        }
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Connect to WebSocket server with fallback
function connectWebSocket() {
    const wsUrl = usingFallback ? FALLBACK_WS_SERVER : WS_URL;
    console.log(`Connecting to WebSocket server: ${wsUrl}`);
    
    try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('Connected to WebSocket server');
            showAlert('Connected to tournament server', 'success');
            usingFallback = false; // Reset fallback flag on successful connection
        };
        
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'stateUpdate') {
                    updateLocalState(message.data);
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        };
        
        ws.onclose = () => {
            console.log('Disconnected from WebSocket server. Attempting to reconnect...');
            if (!usingFallback && wsUrl === WS_URL) {
                // Try fallback server if primary fails
                usingFallback = true;
                console.log('Trying fallback WebSocket server...');
            }
            setTimeout(connectWebSocket, 3000);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            // Try fallback on error if not already using it
            if (!usingFallback) {
                ws.close(); // Close the failed connection
            }
        };
    } catch (error) {
        console.error('Error creating WebSocket:', error);
        // Try fallback if not already using it
        if (!usingFallback) {
            usingFallback = true;
            setTimeout(connectWebSocket, 1000);
        }
    }
}

// Update local state from server
function updateLocalState(newState) {
    if (newState.players) {
        players = newState.players;
        renderPlayerList();
    }
    
    if (newState.tournamentRounds) {
        const previousRounds = tournamentRounds ? [...tournamentRounds] : [];
        tournamentRounds = newState.tournamentRounds;
        
        // If we just started the tournament, hide the setup phase
        if (tournamentRounds.length > 0 && setupPhase && !setupPhase.classList.contains('d-none')) {
            setupPhase.classList.add('d-none');
            if (tournamentPhase) tournamentPhase.classList.remove('d-none');
        }
        
        renderBracket();
        updateActiveRoundHighlighting();
        
        // Check if we have a winner
        if (tournamentRounds.length > 0) {
            const finalRound = tournamentRounds[tournamentRounds.length - 1];
            if (Array.isArray(finalRound) && finalRound.length === 1 && finalRound[0] && finalRound[0].winner) {
                showWinner(finalRound[0].winner);
            } else if (winnerScreen) {
                winnerScreen.classList.add('d-none');
            }
        }
    }
    
    // Update UI based on current phase
    if (newState.phase === 'setup' && setupPhase && tournamentPhase) {
        setupPhase.classList.remove('d-none');
        tournamentPhase.classList.add('d-none');
    } else if (newState.phase === 'tournament' && setupPhase && tournamentPhase) {
        setupPhase.classList.add('d-none');
        tournamentPhase.classList.remove('d-none');
    }
}

// Update the active round highlighting
function updateActiveRoundHighlighting() {
    // Remove active class from all rounds first
    document.querySelectorAll('.round').forEach(round => {
        round.classList.remove('active');
    });

    // Make sure we have valid tournament rounds
    if (!Array.isArray(tournamentRounds) || tournamentRounds.length === 0) {
        return;
    }
    
    // Find the first round with incomplete matches
    let activeRoundIndex = -1;
    
    for (let i = 0; i < tournamentRounds.length; i++) {
        const roundMatches = tournamentRounds[i];
        
        // Skip if round is not an array
        if (!Array.isArray(roundMatches)) {
            console.warn(`Round at index ${i} is not an array:`, roundMatches);
            continue;
        }
        
        // Check if any match in this round is incomplete
        const hasIncompleteMatch = roundMatches.some(match => {
            return match && !match.winner;
        });
        
        if (hasIncompleteMatch) {
            activeRoundIndex = i;
            break;
        }
    }
    
    // If all matches are complete, highlight the last round
    if (activeRoundIndex === -1 && tournamentRounds.length > 0) {
        activeRoundIndex = tournamentRounds.length - 1;
    }
    
    // Add active class to the active round
    if (activeRoundIndex !== -1) {
        const roundElements = document.querySelectorAll('.round');
        if (roundElements[activeRoundIndex]) {
            roundElements[activeRoundIndex].classList.add('active');
        }
    }
}

// Send a message to the WebSocket server
function sendMessage(type, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, ...data }));
    }
}

// Add event listeners
function addEventListeners() {
    // Add player button
    document.getElementById('add-player').addEventListener('click', addPlayer);
    
    // Player name input - allow Enter key to add player
    document.getElementById('player-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addPlayer();
        }
    });
    
    // File upload
    document.getElementById('file-upload').addEventListener('change', handleFileUpload);
    
    // Start tournament button
    document.getElementById('start-tournament').addEventListener('click', startTournament);
    
    // Reset tournament button
    document.getElementById('reset-tournament').addEventListener('click', resetTournament);
    
    // New tournament button (on winner screen)
    document.getElementById('new-tournament').addEventListener('click', resetTournament);
    
    // Close winner screen button
    const closeButton = document.getElementById('close-winner');
    if (closeButton) {
        closeButton.addEventListener('click', closeWinnerScreen);
    }
}

// Handle file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        // Split by newlines and clean up the names
        const names = content.split(/[\r\n]+/)
            .map(name => name.trim())
            .filter(name => name.length > 0);
        
        // Clear existing players
        players = [];
        
        // Add new players (up to MAX_PLAYERS)
        const remainingSlots = MAX_PLAYERS - players.length;
        const namesToAdd = names.slice(0, remainingSlots);
        players.push(...namesToAdd);
        
        // Update UI
        renderPlayerList();
        startTournamentBtn.disabled = players.length < 2;
        
        if (names.length > remainingSlots) {
            showAlert(`Only the first ${remainingSlots} names were added (max ${MAX_PLAYERS} players)`, 'warning');
        } else if (names.length > 0) {
            showAlert(`Added ${names.length} players from file`, 'success');
        }
        
        // Reset file input
        event.target.value = '';
        
        // Clean up confetti
        cleanupConfetti();
    };
    
    reader.onerror = function() {
        showAlert('Error reading file', 'danger');
    };
    
    reader.readAsText(file);
}

// Add a player to the list
function addPlayer() {
    const playerName = playerNameInput.value.trim();
    
    if (!playerName) return;
    
    if (players.length >= MAX_PLAYERS) {
        showAlert(`Maximum of ${MAX_PLAYERS} players allowed`, 'warning');
        return;
    }
    
    if (players.includes(playerName)) {
        showAlert('Player already exists', 'warning');
        return;
    }
    
    const newPlayers = [...players, playerName];
    sendMessage('updatePlayers', { players: newPlayers });
    playerNameInput.value = '';
    playerNameInput.focus();
}

// Render the player list
function renderPlayerList() {
    playerList.innerHTML = '';
    
    players.forEach((player, index) => {
        const playerTag = document.createElement('span');
        playerTag.className = 'player-tag';
        playerTag.innerHTML = `
            ${player}
            <span class="remove-player" data-index="${index}">&times;</span>
        `;
        playerList.appendChild(playerTag);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-player').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            players.splice(index, 1);
            renderPlayerList();
            startTournamentBtn.disabled = players.length < 2;
        });
    });
}

// Start the tournament
function startTournament() {
    if (players.length < 2) {
        showAlert('You need at least 2 players to start a tournament', 'warning');
        return;
    }
    
    // Create a new array, shuffle it, and replace the players array
    const shuffledPlayers = [...players];
    shuffleArray(shuffledPlayers);
    players.length = 0;
    players.push(...shuffledPlayers);
    
    // Force a re-render of the player list to show the new order
    renderPlayerList();
    
    // Clear any existing tournament state
    tournamentRounds = [];
    currentRound = 0;
    
    // Initialize and render the tournament
    initializeTournament();
    sendMessage('startTournament', { tournamentRounds });
    setupPhase.classList.add('d-none');
    tournamentPhase.classList.remove('d-none');
    renderBracket();
}

// Initialize tournament structure
function initializeTournament() {
    tournamentRounds = [];
    currentRound = 0;
    
    // Create first round with all players
    const firstRound = [];
    let numPlayers = players.length;
    
    // Use the players array directly (already shuffled)
    let roundPlayers = [...players];
    console.log('Players for first round (before BYE check):', [...roundPlayers]);
    
    // If we have an odd number of players, add a BYE
    if (numPlayers % 2 !== 0) {
        roundPlayers.push('BYE');
        numPlayers++;
        console.log('Added BYE, new player count:', numPlayers);
    }
    
    // Calculate number of byes needed to reach next power of 2
    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
    let numByes = nextPowerOfTwo - numPlayers;
    
    console.log('Final players for first round:', [...roundPlayers]);
    
    // Create first round matches
    for (let i = 0; i < roundPlayers.length; i += 2) {
        const player1 = roundPlayers[i];
        const player2 = roundPlayers[i + 1] || null;
        const isBye = player1 === 'BYE' || player2 === 'BYE';
        
        const match = {
            players: [player1, player2],
            winner: null,
            isBye: isBye,
            round: 0,
            matchNum: i / 2
        };
        
        // Auto-win for byes
        if (isBye) {
            match.winner = player1 === 'BYE' ? player2 : player1;
            numByes--;
        }
        
        firstRound.push(match);
    }
    
    tournamentRounds.push(firstRound);
    
    // Create subsequent rounds
    let currentRoundMatches = firstRound;
    let roundNum = 1;
    
    while (currentRoundMatches.length > 1) {
        const nextRound = [];
        
        // Create next round matches (half as many as current round, rounded up)
        const numMatches = Math.ceil(currentRoundMatches.length / 2);
        
        for (let i = 0; i < numMatches; i++) {
            nextRound.push({
                players: [null, null],
                winner: null,
                isBye: false,
                round: roundNum,
                matchNum: i
            });
        }
        
        tournamentRounds.push(nextRound);
        currentRoundMatches = nextRound;
        roundNum++;
    }
}

// Get round label based on round index and total rounds
function getRoundLabel(roundIndex, totalRounds) {
    const roundNumber = roundIndex + 1;
    const roundFromEnd = totalRounds - roundIndex;
    
    // Special cases for final rounds
    if (roundFromEnd === 0) return 'Final';
    if (roundFromEnd === 1) return 'Final';
    if (roundFromEnd === 2) return 'Semi-Finals';
    if (roundFromEnd === 3) return 'Quarter-Finals';
    
    // For earlier rounds, use 1st, 2nd, 3rd, etc.
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = roundNumber % 100;
    return `${roundNumber}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]} Round`;
}

// Render the entire bracket
function renderBracket() {
    if (!tournamentRounds.length) return;

    const bracketElement = document.getElementById('bracket');
    bracketElement.innerHTML = '';
    const totalRounds = tournamentRounds.length;

    tournamentRounds.forEach((round, roundIndex) => {
        const roundElement = document.createElement('div');
        roundElement.className = 'round' + (roundIndex === 0 ? ' first-round' : '');
        roundElement.id = `round-${roundIndex}`;
        roundElement.dataset.round = roundIndex;

        // Add round label
        const roundLabel = document.createElement('div');
        roundLabel.className = 'round-label';
        roundLabel.textContent = getRoundLabel(roundIndex, totalRounds);
        roundElement.appendChild(roundLabel);

        const matchesContainer = document.createElement('div');
        matchesContainer.className = 'matches-container';

        round.forEach((match, matchIndex) => {
            const matchElement = document.createElement('div');
            matchElement.className = 'match' + (match.winner ? ' completed' : '');
            matchElement.dataset.match = matchIndex;
            matchElement.onclick = (e) => selectWinner(roundIndex, matchIndex, e);

            // Create player 1 element
            const player1 = document.createElement('div');
            const player1Name = match.players ? match.players[0] : match.player1;
            player1.className = 'player' + (match.winner === player1Name ? ' winner' : '');
            // Only show BYE text in the first round
            player1.textContent = (roundIndex === 0 && !player1Name) ? 'BYE' : (player1Name || '');
            if (player1Name && player1Name !== 'BYE') {
                player1.dataset.player = player1Name;
            } else if (roundIndex > 0) {
                // Hide empty player slots in later rounds
                player1.textContent = '';
            }

            // Create player 2 element if it exists
            const vs = document.createElement('div');
            vs.className = 'vs';

            const player2 = document.createElement('div');
            const player2Name = match.players ? match.players[1] : match.player2;
            player2.className = 'player' + (match.winner === player2Name ? ' winner' : '');
            // Only show BYE text in the first round
            player2.textContent = (roundIndex === 0 && !player2Name) ? 'BYE' : (player2Name || '');
            if (player2Name && player2Name !== 'BYE') {
                player2.dataset.player = player2Name;
            } else if (roundIndex > 0) {
                // Hide empty player slots in later rounds
                player2.textContent = '';
            }

            // Only add player 2 if it exists
            if (player2Name) {
                matchElement.appendChild(player1);
                matchElement.appendChild(vs);
                matchElement.appendChild(player2);
            } else {
                matchElement.appendChild(player1);
            }

            matchesContainer.appendChild(matchElement);
        });

        roundElement.appendChild(matchesContainer);
        bracketElement.appendChild(roundElement);
    });
}

// Update the UI for a single match
function updateMatchUI(roundIndex, matchIndex) {
    const match = tournamentRounds[roundIndex]?.[matchIndex];
    if (!match) return;
    
    // Find the match element
    const matchEl = bracket.querySelector(`.round:nth-child(${roundIndex + 1}) .match:nth-child(${matchIndex + 1})`);
    if (!matchEl) return;
    
    // Update player elements
    const playerEls = matchEl.querySelectorAll('.player');
    playerEls.forEach((el, i) => {
        const player = match.players[i];
        el.textContent = player || 'BYE';
        el.dataset.player = player || '';
        el.classList.toggle('winner', match.winner === player);
        el.classList.toggle('empty', !player);
    });
}

// Select or change a winner for a match
function selectWinner(roundIndex, matchIndex, event) {
    const match = tournamentRounds[roundIndex]?.[matchIndex];
    if (!match) return;
    
    const selectedPlayer = event.target.closest('.player');
    if (!selectedPlayer) return;
    
    const playerName = selectedPlayer.dataset.player;
    if (!playerName || playerName === 'BYE') return;
    
    // Toggle winner selection
    const newWinner = match.winner === playerName ? null : playerName;
    
    // Update the match winner
    match.winner = newWinner;
        
    // If there's a next round, highlight the winner in the next round's match
    if (newWinner && roundIndex < tournamentRounds.length - 1) {
        const nextRoundIndex = roundIndex + 1;
        const nextMatchIndex = Math.floor(matchIndex / 2);
        const nextMatch = tournamentRounds[nextRoundIndex]?.[nextMatchIndex];
        
        console.log('Next round index:', nextRoundIndex);
        console.log('Next match index:', nextMatchIndex);
        console.log('Next match data:', nextMatch);
        
        if (nextMatch) {
            // Find the player element in the next round
            const nextRoundElement = document.querySelector(`.round[data-round="${nextRoundIndex}"]`);
            console.log('Next round element:', nextRoundElement);
            
            if (nextRoundElement) {
                const nextMatchElement = nextRoundElement.querySelector(`.match[data-match="${nextMatchIndex}"]`);
                console.log('Next match element:', nextMatchElement);
                
                if (nextMatchElement) {
                    // Find which position this winner is in the next match
                    const position = matchIndex % 2 === 0 ? 0 : 1;
                    const nextPlayerElements = nextMatchElement.querySelectorAll('.player');
                    console.log('Next player elements:', nextPlayerElements);
                    
                    if (nextPlayerElements[position]) {
                        console.log('Found next player element at position', position, ':', nextPlayerElements[position]);
                        
                        // Remove any existing highlights
                        nextMatchElement.querySelectorAll('.player').forEach(el => {
                            el.classList.remove('winner-highlight');
                        });
                        
                        // Add highlight class (removed animation logic)
                        nextPlayerElements[position].classList.add('winner-highlight');
                        
                        // Remove highlight after a short delay
                        setTimeout(() => {
                            nextPlayerElements[position].classList.remove('winner-highlight');
                        }, 1000);
                    } else {
                        console.error('Could not find next player element at position', position);
                    }
                }
            }
        } else {
            console.error('Could not find next match data');
        }
    } else {
        console.log('No next round or no new winner');
    }
        
    // Update the UI for this match
    updateMatchUI(roundIndex, matchIndex);
        
    // If there's a next round, update the next match
    if (roundIndex < tournamentRounds.length - 1) {
        const nextRoundIndex = roundIndex + 1;
        const nextMatchIndex = Math.floor(matchIndex / 2);
        const nextRound = tournamentRounds[nextRoundIndex];
        
        if (nextRound && nextMatchIndex < nextRound.length) {
            const nextMatch = nextRound[nextMatchIndex];
            const position = matchIndex % 2;
            
            // Only update if the player is different
            if (nextMatch.players[position] !== playerName) {
                nextMatch.players[position] = playerName;
                updateMatchUI(nextRoundIndex, nextMatchIndex);
                
                // Clear any existing winner in the next match since we're changing its players
                if (nextMatch.winner) {
                    nextMatch.winner = null;
                    updateMatchUI(nextRoundIndex, nextMatchIndex);
                }
            }
        }
    }
    
    // If this is the final match and we have a winner, show the winner screen
    if (roundIndex === tournamentRounds.length - 1 && newWinner) {
        showWinner(newWinner);
    }
    
    // Send the update to the server
    sendMessage('selectWinner', {
        roundIndex,
        matchIndex,
        winner: newWinner
    });
}

/**
 * Clears the player in the next round's match position
 */
function clearNextRoundPlayer(roundIndex, matchIndex) {
    const nextRoundIndex = roundIndex + 1;
    if (nextRoundIndex >= tournamentRounds.length) return;
    
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextRound = tournamentRounds[nextRoundIndex];
    
    if (nextMatchIndex < nextRound.length) {
        const nextMatch = nextRound[nextMatchIndex];
        const position = matchIndex % 2;
        nextMatch.players[position] = null;
    }
}

/**
 * Updates the bracket UI for all rounds from startRound to the end
 */
function updateBracketUI(startRound) {
    for (let i = startRound; i < tournamentRounds.length; i++) {
        renderRound(i);
    }
}

/**
 * Clears all matches in subsequent rounds that depend on the specified match
 * @param {number} startRound - The round where the change originated
 * @param {number} startMatchIndex - The match index where the change originated
 */
function clearSubsequentRounds(startRound, startMatchIndex) {
    // Start from the round after the current one
    for (let round = startRound + 1; round < tournamentRounds.length; round++) {
        // Calculate the range of matches in this round that might be affected
        const firstAffectedMatch = Math.floor((startMatchIndex * 2) / 2);
        const lastAffectedMatch = Math.ceil(((startMatchIndex + 1) * 2 - 1) / 2);
        
        // Process each potentially affected match in this round
        for (let matchIndex = firstAffectedMatch; matchIndex <= lastAffectedMatch; matchIndex++) {
            if (matchIndex >= tournamentRounds[round].length) continue;
            
            const match = tournamentRounds[round][matchIndex];
            const isAffected = match.players.some(player => player !== null);
            
            if (isAffected) {
                // Clear the match and its winner
                match.winner = null;
                
                // Clear the match in the next round if this isn't the final round
                if (round < tournamentRounds.length - 1) {
                    const nextMatchIndex = Math.floor(matchIndex / 2);
                    const nextMatch = tournamentRounds[round + 1][nextMatchIndex];
                    const position = matchIndex % 2;
                    nextMatch.players[position] = null;
                }
                
                // Recursively clear subsequent rounds
                clearSubsequentRounds(round, matchIndex);
            }
        }
    }
}

// Show the winner screen with confetti
function showWinner(winner) {
    // Ensure the bracket is fully rendered
    renderBracket();
    
    // Show the winner screen
    setupPhase.classList.add('d-none');
    tournamentPhase.classList.add('d-none');
    winnerScreen.classList.remove('d-none');
    
    // Update the winner name in the UI
    const winnerName = document.getElementById('winner-name');
    if (winnerName) {
        winnerName.textContent = winner;
    }
    
    // Initialize and show confetti
    setTimeout(() => {
        // Clean up any existing confetti
        cleanupConfetti();
        // Start new confetti
        initConfetti();
    }, 500);
    
    // Scroll to the winner screen
    winnerScreen.scrollIntoView({ behavior: 'smooth' });
}

// Close winner screen and clean up confetti
function closeWinnerScreen() {
    winnerScreen.classList.add('d-none');
    cleanupConfetti();
}

// Reset the tournament
function resetTournament() {
    try {
        // Clean up confetti
        if (typeof cleanupConfetti === 'function') {
            cleanupConfetti();
        }
        
        // Reset the tournament state
        players = [];
        tournamentRounds = [];
        
        // Reset the UI
        if (playerNameInput) playerNameInput.value = '';
        
        const playerList = document.getElementById('player-list');
        if (playerList) playerList.innerHTML = '';
        
        // Show setup phase and hide others
        if (setupPhase) setupPhase.classList.remove('d-none');
        if (tournamentPhase) tournamentPhase.classList.add('d-none');
        if (winnerScreen) winnerScreen.classList.add('d-none');
        
        // Reset file input
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = '';
        
        // Send reset message to server if WebSocket is connected
        if (ws && ws.readyState === WebSocket.OPEN) {
            sendMessage('resetTournament');
        }
    } catch (error) {
        console.error('Error resetting tournament:', error);
    }
}

// Seed players for better bracket structure
function seedPlayers(players) {
    if (players.length <= 2) return players;
    
    // If we have a BYE, handle it specially
    const byeIndex = players.indexOf('BYE');
    if (byeIndex !== -1) {
        // Move BYE to the end
        players.splice(byeIndex, 1);
        players.push('BYE');
    }
    
    const seeded = [];
    const numPlayers = players.length;
    const numRounds = Math.ceil(Math.log2(numPlayers));
    
    // First round seeding
    for (let i = 0; i < numPlayers / 2; i++) {
        seeded.push(players[i]);
        if (i * 2 + 1 < numPlayers) {
            seeded.push(players[numPlayers - 1 - i]);
        }
    }
    
    return seeded;
}

// Helper function to shuffle an array using Fisher-Yates algorithm (in-place)
function shuffleArray(array) {
    let currentIndex = array.length;
    let temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    
    return array;
}

// Create confetti effect at a specific position
function createConfetti(element) {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    
    // Position the container over the element
    const rect = element.getBoundingClientRect();
    container.style.position = 'absolute';
    container.style.left = `${rect.left}px`;
    container.style.top = `${rect.top}px`;
    container.style.width = `${rect.width}px`;
    container.style.height = `${rect.height}px`;
    
    // Add to the document
    document.body.appendChild(container);
    
    // Create confetti pieces
    const colors = ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff'];
    const count = 20;
    
    for (let i = 0; i < count; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        // Random position and color
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Random size and animation delay
        const size = 5 + Math.random() * 10;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        
        // Random rotation
        const rotation = Math.random() * 360;
        confetti.style.transform = `rotate(${rotation}deg)`;
        
        container.appendChild(confetti);
    }
    
    // Remove the container after animation
    setTimeout(() => {
        container.remove();
    }, 3000);
}

// Show an alert message
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to the top of the container
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(alertDiv);
        bsAlert.close();
    }, 3000);
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Ensure all elements exist before initializing
    if (setupPhase && tournamentPhase && winnerScreen && playerNameInput) {
        init();
    } else {
        console.error('Required DOM elements not found');
    }
});
