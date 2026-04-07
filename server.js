// THE MASTER REFEREE: Controls all monsters
setInterval(() => {
    const pKeys = Object.keys(players);
    if (pKeys.length > 0) {
        
        // 1. Force EXACTLY 20 monsters to always exist on the map
        while (Object.keys(mobs).length < 20) {
            let id = mobIdCounter++;
            let targetId = pKeys[Math.floor(Math.random() * pKeys.length)];
            let p = players[targetId];
            let angle = Math.random() * Math.PI * 2;
            let dist = 25 + Math.random() * 15; // Spawn slightly further away
            mobs[id] = { id: id, x: p.x + Math.cos(angle)*dist, y: 0.5, z: p.z + Math.sin(angle)*dist };
            io.emit('mobSpawned', mobs[id]);
        }

        // 2. Move monsters and kill them if they touch a player
        for (let id in mobs) {
            let mob = mobs[id];
            let closestP = null, closestD = 9999;
            for (let pid in players) {
                let d = Math.hypot(players[pid].x - mob.x, players[pid].z - mob.z);
                if (d < closestD) { closestD = d; closestP = players[pid]; }
            }
            
            if (closestP) {
                // THE FIX: If monster touches player, INSTANT KILL!
                if (closestD < 2.0) {
                    io.emit('mobDied', id); // Tells all players to play the explosion effect
                    delete mobs[id];        // Deletes it from the server instantly
                    continue;               // Skip moving this deleted mob
                }

                let dx = closestP.x - mob.x, dz = closestP.z - mob.z;
                let len = Math.hypot(dx, dz);
                mob.x += (dx/len) * 0.15; // Monster speed
                mob.z += (dz/len) * 0.15;
            }
        }
        io.emit('mobsUpdate', mobs); // Broadcast new positions
    }
}, 50); // Server ticks 20 times per second
