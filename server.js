const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Serve static files
app.use(express.static('.'));

// Create HTTP server
const server = http.createServer(app);

// Log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

    // Serve static files
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm',
        '.ico': 'image/x-icon'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Handle favicon.ico
    if (filePath === './favicon.ico') {
        res.writeHead(204); // No content
        return res.end();
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code === 'ENOENT') {
                console.error(`File not found: ${filePath}`);
                res.writeHead(404);
                res.end('File not found');
            } else {
                console.error(`Server error: ${error.code}`);
                res.writeHead(500);
                res.end('Server Error: '+error.code);
            }
        } else {
            console.log(`Serving file: ${filePath}`);
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content, 'utf-8');
        }
    });
});

// Create WebSocket server on the same port
const wss = new WebSocket.Server({ 
    server,
    path: '/ws' // Explicit WebSocket endpoint
});

// Store the current state
let state = {
    players: [],
    tournamentRounds: [],
    currentRound: 0
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

// Log when a client connects
wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`New WebSocket connection from ${clientIp}`);
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
    
    // ... rest of the WebSocket connection handling ...
});
