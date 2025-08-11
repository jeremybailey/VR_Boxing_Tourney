const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Serve static files from the current directory
app.use(express.static('.'));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ 
    server,
    path: '/ws'
});

// Store the current state
let state = {
    players: [],
    tournamentRounds: [],
    currentRound: 0,
    tournamentStarted: false
};

// Broadcast state to all connected clients
function broadcastState() {
    const message = JSON.stringify({ type: 'stateUpdate', data: state });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Clear subsequent matches when a winner changes
function clearSubsequentMatches(roundIndex, matchIndex) {
    // Clear all matches after the current one in the same round
    for (let i = matchIndex + 1; i < state.tournamentRounds[roundIndex].length; i++) {
        state.tournamentRounds[roundIndex][i].winner = null;
    }
    
    // Clear all matches in subsequent rounds
    for (let r = roundIndex + 1; r < state.tournamentRounds.length; r++) {
        for (let m = 0; m < state.tournamentRounds[r].length; m++) {
            state.tournamentRounds[r][m].winner = null;
        }
    }
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
    // Send current state to newly connected client
    ws.send(JSON.stringify({ type: 'stateUpdate', data: state }));
    
    // Handle messages from clients
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received message type:', data.type);
            
            if (data.type === 'updatePlayers') {
                console.log('Updating players:', data.players);
                state.players = data.players;
            } else if (data.type === 'startTournament') {
                console.log('Starting tournament with rounds:', data.tournamentRounds);
                state.tournamentStarted = true;
                state.tournamentRounds = data.tournamentRounds;
                state.currentRound = 0;
            } else if (data.type === 'selectWinner') {
                const { roundIndex, matchIndex, winner } = data;
                console.log(`Selecting winner: round ${roundIndex}, match ${matchIndex}, winner: ${winner}`);
                
                if (state.tournamentRounds[roundIndex] && 
                    state.tournamentRounds[roundIndex][matchIndex]) {
                    
                    // Store the old winner to check for changes
                    const oldWinner = state.tournamentRounds[roundIndex][matchIndex].winner;
                    state.tournamentRounds[roundIndex][matchIndex].winner = winner;
                    
                    // Only proceed if the winner actually changed
                    if (oldWinner !== winner) {
                        // Update next round if there is one
                        if (roundIndex < state.tournamentRounds.length - 1) {
                            const nextRoundIndex = roundIndex + 1;
                            const nextMatchIndex = Math.floor(matchIndex / 2);
                            
                            if (state.tournamentRounds[nextRoundIndex] && 
                                state.tournamentRounds[nextRoundIndex][nextMatchIndex]) {
                                
                                const nextMatch = state.tournamentRounds[nextRoundIndex][nextMatchIndex];
                                const position = matchIndex % 2 === 0 ? 0 : 1; // 0 for top, 1 for bottom
                                
                                console.log(`Updating next round ${nextRoundIndex}, match ${nextMatchIndex}, position ${position} with ${winner}`);
                                
                                // Only update if the player is different
                                if (nextMatch.players[position] !== winner) {
                                    nextMatch.players[position] = winner;
                                    
                                    // Clear the winner and all subsequent matches if the winner changed
                                    if (nextMatch.winner) {
                                        console.log('Clearing subsequent matches due to winner change');
                                        nextMatch.winner = null;
                                        clearSubsequentMatches(nextRoundIndex, nextMatchIndex);
                                    }
                                }
                            }
                        }
                    }
                }
            } else if (data.type === 'resetTournament') {
                console.log('Resetting tournament');
                state.players = [];
                state.tournamentRounds = [];
                state.currentRound = 0;
                state.tournamentStarted = false;
            }
            
            // Broadcast the updated state to all clients
            console.log('Broadcasting updated state');
            broadcastState();
            
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
    
    // Log connection
    console.log('New WebSocket connection');
    
    // Handle client disconnection
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please close any other servers using this port.`);
    }
});

// Handle WebSocket server errors
wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
});
