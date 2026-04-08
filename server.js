const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const players = {};
const mobs = {};
const worldBlocks = {}; // Upgraded to an Object for instant deleting!
let mobIdCounter = 0;

setInterval(() => {
    const pKeys = Object.keys(players);
    if (pKeys.length > 0) {
        while (Object.keys(mobs).length < 20) {
            let id = mobIdCounter++; let targetId = pKeys[Math.floor(Math.random() * pKeys.length)];
            let p = players[targetId]; let angle = Math.random() * Math.PI * 2; let dist = 25 + Math.random() * 15; 
            mobs[id] = { id: id, x: p.x + Math.cos(angle)*dist, y: 0.5, z: p.z + Math.sin(angle)*dist };
            io.emit('mobSpawned', mobs[id]);
        }
        for (let id in mobs) {
            let mob = mobs[id]; let closestP = null, closestD = 9999;
            for (let pid in players) {
                let d = Math.hypot(players[pid].x - mob.x, players[pid].z - mob.z);
                if (d < closestD) { closestD = d; closestP = players[pid]; }
            }
            if (closestP) {
                if (closestD < 2.0) { io.emit('mobDied', id); delete mobs[id]; continue; }
                let dx = closestP.x - mob.x, dz = closestP.z - mob.z; let len = Math.hypot(dx, dz);
                mob.x += (dx/len) * 0.15; mob.z += (dz/len) * 0.15;
            }
        }
        io.emit('mobsUpdate', mobs); 
    }
}, 50);

io.on('connection', (socket) => {
    players[socket.id] = { x: 0, y: 2, z: 0, rx: 0, ry: 0 };
    socket.emit('currentPlayers', players);
    socket.emit('currentMobs', mobs);
    socket.emit('initBlocks', Object.values(worldBlocks));
    socket.broadcast.emit('newPlayer', { id: socket.id, position: players[socket.id] });

    // BUILDING & DESTROYING
    socket.on('placeBlock', (data) => { worldBlocks[data.id] = data; io.emit('blockPlaced', data); });
    socket.on('breakBlock', (blockId) => { delete worldBlocks[blockId]; io.emit('blockBroken', blockId); });

    // MULTIPLAYER BULLETS
    socket.on('playerShoot', (laserData) => { 
        laserData.playerId = socket.id; 
        socket.broadcast.emit('otherPlayerShoot', laserData); 
    });

    socket.on('playerMovement', (data) => { players[socket.id] = data; socket.broadcast.emit('playerMoved', { id: socket.id, position: data }); });
    socket.on('mobKilled', (mobId) => { if (mobs[mobId]) { delete mobs[mobId]; io.emit('mobDied', mobId); } });
    socket.on('disconnect', () => { delete players[socket.id]; io.emit('playerDisconnected', socket.id); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
