const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

// 🌟 THIS IS THE MAGIC LINE 🌟
// It tells Railway to display your index.html game to anyone who visits the link!
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] } 
});

const players = {};

io.on('connection', (socket) => {
    console.log('Player connected: ' + socket.id);
    
    // Starting position for new players
    players[socket.id] = { x: 0, y: 2, z: 0 };
    
    // Send them the current lobby
    socket.emit('currentPlayers', players);
    
    // Announce to others that a new player joined
    socket.broadcast.emit('newPlayer', { id: socket.id, position: players[socket.id] });

    // When someone moves, update their spot and tell the lobby
    socket.on('playerMovement', (data) => {
        players[socket.id] = data;
        socket.broadcast.emit('playerMoved', { id: socket.id, position: data });
    });

    // When someone leaves
    socket.on('disconnect', () => {
        console.log('Player disconnected: ' + socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
