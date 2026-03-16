export class MonicaEscape {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = 600;
        this.height = 450;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.tileSize = 40;
        this.cols = Math.floor(this.width / this.tileSize);
        this.rows = Math.floor(this.height / this.tileSize);

        this.level = 1;
        this.gameState = 'START'; // START, PLAYING, CAUGHT, ESCAPED
        this.resetGame();
        
        this.keys = {};
        this.boundKeyDown = (e) => this.keys[e.code] = true;
        this.boundKeyUp = (e) => this.keys[e.code] = false;
        this.boundClick = this.handleClick.bind(this);
    }

    resetGame() {
        this.player = {
            x: 1,
            y: 1,
            moveCooldown: 0,
            isCrouching: false
        };

        this.walls = [];
        this.desks = [];
        this.decorations = []; // For visual flair
        this.generateMap();

        // Place Hall Passes - Ensure reachable
        this.hallPasses = [];
        const passCount = Math.min(2 + Math.floor(this.level / 2), 5);
        for (let i = 0; i < passCount; i++) {
            let pos = this.getReachableOpenPos();
            this.hallPasses.push({ x: pos.x, y: pos.y, collected: false });
        }

        // Place Exit - Ensure reachable
        let exitPos = this.getReachableOpenPos();
        this.exit = { x: exitPos.x, y: exitPos.y };

        // Monica Setup
        let monicaPos = this.getReachableOpenPos(5);
        this.monica = {
            x: monicaPos.x,
            y: monicaPos.y,
            dir: 1,
            moveTimer: 0,
            moveSpeed: Math.max(500 - (this.level * 25), 250),
            patrolPoints: this.generatePatrolPoints(monicaPos),
            pathIndex: 0,
            investigating: null, // {x, y, timer}
            currentPath: []
        };

        this.noise = {
            x: -1,
            y: -1,
            timer: 0
        };

        this.score = (this.level - 1) * 1000;
    }

    generateMap() {
        this.walls = [];
        this.desks = [];
        this.decorations = [];

        // Border
        for (let i = 0; i < this.cols; i++) {
            this.walls.push({x: i, y: 0});
            this.walls.push({x: i, y: this.rows - 1});
        }
        for (let i = 0; i < this.rows; i++) {
            this.walls.push({x: 0, y: i});
            this.walls.push({x: this.cols - 1, y: i});
        }

        // Teacher's Area (Front of class)
        // Teacher's desk
        this.desks.push({x: 7, y: 2, isTeacherDesk: true});
        this.decorations.push({x: 7, y: 1, type: 'CHAIR', dir: 'DOWN'});
        this.decorations.push({x: 4, y: 1, type: 'BOOKSHELF'});
        this.decorations.push({x: 10, y: 1, type: 'PLANT'});

        // Windows on the left wall
        for (let y = 2; y < this.rows - 2; y += 3) {
            this.decorations.push({x: 0, y: y, type: 'WINDOW'});
        }

        // Procedural Student Desks
        const deskCount = 10 + (this.level * 2);
        let placed = 0;
        let attempts = 0;
        while (placed < deskCount && attempts < 500) {
            attempts++;
            let x = Math.floor(Math.random() * (this.cols - 4)) + 2;
            let y = Math.floor(Math.random() * (this.rows - 4)) + 3;
            
            if (!this.isWall(x, y) && !this.isDesk(x, y)) {
                // Temporarily add desk to check connectivity
                this.desks.push({x, y});
                // Check if (1,1) can still reach a significant portion of the map
                // For simplicity, we just check if it's not blocking the start area too much
                if (x < 3 && y < 4) {
                    this.desks.pop();
                    continue;
                }
                placed++;
            }
        }
    }

    getReachableOpenPos(minDist = 0) {
        let x, y;
        let attempts = 0;
        while (attempts < 1000) {
            attempts++;
            x = Math.floor(Math.random() * (this.cols - 2)) + 1;
            y = Math.floor(Math.random() * (this.rows - 2)) + 1;
            
            const dist = Math.abs(x - 1) + Math.abs(y - 1);
            if (dist < minDist) continue;

            if (!this.isWall(x, y) && !this.isDesk(x, y)) {
                // Check if reachable from player start (1,1)
                if (this.findPath({x: 1, y: 1}, {x, y})) {
                    return {x, y};
                }
            }
        }
        // Fallback to any open pos if pathfinding fails too many times
        return this.getRandomOpenPos(minDist);
    }

    generatePatrolPoints(start) {
        const points = [start];
        for (let i = 0; i < 3; i++) {
            points.push(this.getRandomOpenPos());
        }
        return points;
    }

    getRandomOpenPos(minDist = 0) {
        let x, y;
        let attempts = 0;
        do {
            x = Math.floor(Math.random() * (this.cols - 2)) + 1;
            y = Math.floor(Math.random() * (this.rows - 2)) + 1;
            attempts++;
            const dist = Math.abs(x - 1) + Math.abs(y - 1);
            if (attempts > 200) break;
            if (dist < minDist) continue;
        } while (this.isWall(x, y) || this.isDesk(x, y));
        return {x, y};
    }

    start() {
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);
        this.canvas.addEventListener('click', this.boundClick);
        this.lastTime = performance.now();
        this.update();
    }

    handleClick() {
        if (this.gameState === 'START' || this.gameState === 'CAUGHT') {
            if (this.gameState === 'CAUGHT') this.level = 1;
            this.resetGame();
            this.gameState = 'PLAYING';
        } else if (this.gameState === 'ESCAPED') {
            this.level++;
            this.resetGame();
            this.gameState = 'PLAYING';
        }
    }

    update() {
        const now = performance.now();
        const dt = now - this.lastTime;
        this.lastTime = now;

        if (this.gameState === 'PLAYING') {
            this.handleInput(dt);
            this.updateMonica(dt);
            this.checkCollisions();
            
            if (this.noise.timer > 0) {
                this.noise.timer -= dt;
                if (this.noise.timer <= 0) {
                    this.noise.x = -1;
                    this.noise.y = -1;
                }
            }
        }

        this.draw();
        this.requestId = requestAnimationFrame(() => this.update());
    }

    handleInput(dt) {
        this.player.isCrouching = this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['KeyC'];

        if (this.player.moveCooldown > 0) {
            this.player.moveCooldown -= dt;
            return;
        }

        let dx = 0;
        let dy = 0;

        if (this.keys['ArrowUp'] || this.keys['KeyW']) dy = -1;
        else if (this.keys['ArrowDown'] || this.keys['KeyS']) dy = 1;
        else if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx = -1;
        else if (this.keys['ArrowRight'] || this.keys['KeyD']) dx = 1;

        if (dx !== 0 || dy !== 0) {
            const nextX = this.player.x + dx;
            const nextY = this.player.y + dy;

            if (!this.isWall(nextX, nextY) && !this.isDesk(nextX, nextY)) {
                this.player.x = nextX;
                this.player.y = nextY;
                
                // Crouching is slower but silent
                this.player.moveCooldown = this.player.isCrouching ? 300 : 150;
                
                if (!this.player.isCrouching) {
                    this.noise.x = this.player.x;
                    this.noise.y = this.player.y;
                    this.noise.timer = 1000;
                }
            }
        }
    }

    isWall(x, y) {
        return this.walls.some(w => w.x === x && w.y === y);
    }

    isDesk(x, y) {
        return this.desks.some(d => d.x === x && d.y === y);
    }

    findPath(start, end) {
        const queue = [[start]];
        const visited = new Set();
        visited.add(`${start.x},${start.y}`);

        while (queue.length > 0) {
            const path = queue.shift();
            const pos = path[path.length - 1];

            if (pos.x === end.x && pos.y === end.y) return path;

            const neighbors = [
                {x: pos.x + 1, y: pos.y}, {x: pos.x - 1, y: pos.y},
                {x: pos.x, y: pos.y + 1}, {x: pos.x, y: pos.y - 1}
            ];

            for (const n of neighbors) {
                if (n.x >= 0 && n.x < this.cols && n.y >= 0 && n.y < this.rows &&
                    !this.isWall(n.x, n.y) && !this.isDesk(n.x, n.y) &&
                    !visited.has(`${n.x},${n.y}`)) {
                    visited.add(`${n.x},${n.y}`);
                    queue.push([...path, n]);
                }
            }
        }
        return null;
    }

    updateMonica(dt) {
        this.monica.moveTimer += dt;
        
        // If Monica hears noise, she investigates
        if (this.noise.timer > 0 && !this.monica.investigating) {
            this.monica.investigating = { x: this.noise.x, y: this.noise.y, timer: 3000 };
            this.monica.currentPath = []; // Force recalculate
        }

        if (this.monica.moveTimer > this.monica.moveSpeed) {
            this.monica.moveTimer = 0;

            let target;
            if (this.monica.investigating) {
                target = { x: this.monica.investigating.x, y: this.monica.investigating.y };
                this.monica.investigating.timer -= this.monica.moveSpeed;
                if (this.monica.investigating.timer <= 0 || (this.monica.x === target.x && this.monica.y === target.y)) {
                    this.monica.investigating = null;
                }
            } else {
                target = this.monica.patrolPoints[this.monica.pathIndex];
                if (this.monica.x === target.x && this.monica.y === target.y) {
                    this.monica.pathIndex = (this.monica.pathIndex + 1) % this.monica.patrolPoints.length;
                    target = this.monica.patrolPoints[this.monica.pathIndex];
                }
            }

            // Pathfinding logic
            if (this.monica.currentPath.length === 0 || 
                this.monica.currentPath[this.monica.currentPath.length - 1].x !== target.x ||
                this.monica.currentPath[this.monica.currentPath.length - 1].y !== target.y) {
                this.monica.currentPath = this.findPath({x: this.monica.x, y: this.monica.y}, target) || [];
                if (this.monica.currentPath.length > 0) this.monica.currentPath.shift(); // Remove current pos
            }

            if (this.monica.currentPath.length > 0) {
                const next = this.monica.currentPath.shift();
                const dx = next.x - this.monica.x;
                const dy = next.y - this.monica.y;
                
                this.monica.x = next.x;
                this.monica.y = next.y;

                if (dx === 1) this.monica.dir = 0;
                else if (dx === -1) this.monica.dir = 2;
                else if (dy === 1) this.monica.dir = 1;
                else if (dy === -1) this.monica.dir = 3;
            }
        }
    }

    checkCollisions() {
        this.hallPasses.forEach(p => {
            if (!p.collected && p.x === this.player.x && p.y === this.player.y) {
                p.collected = true;
                this.score += 500;
            }
        });

        if (this.player.x === this.exit.x && this.player.y === this.exit.y) {
            if (this.hallPasses.every(p => p.collected)) {
                this.gameState = 'ESCAPED';
            }
        }

        // Refined Vision Mechanic
        const visionRange = 5;
        let caught = false;
        
        for (let i = 1; i <= visionRange; i++) {
            let vx = this.monica.x;
            let vy = this.monica.y;
            
            if (this.monica.dir === 0) vx += i;
            else if (this.monica.dir === 1) vy += i;
            else if (this.monica.dir === 2) vx -= i;
            else if (this.monica.dir === 3) vy -= i;

            if (this.isWall(vx, vy) || this.isDesk(vx, vy)) break;

            // Main line of sight
            if (this.player.x === vx && this.player.y === vy) caught = true;
            
            // Wider cone at distance
            if (i >= 2) {
                const sides = this.monica.dir % 2 === 0 ? [{x: vx, y: vy-1}, {x: vx, y: vy+1}] : [{x: vx-1, y: vy}, {x: vx+1, y: vy}];
                for (const s of sides) {
                    if (this.player.x === s.x && this.player.y === s.y) caught = true;
                }
            }
            if (caught) break;
        }

        if (caught) this.gameState = 'CAUGHT';
    }

    draw() {
        this.ctx.fillStyle = '#2d2d2d';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Grid
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        for (let i = 0; i < this.cols; i++) {
            for (let j = 0; j < this.rows; j++) {
                this.ctx.strokeRect(i * this.tileSize, j * this.tileSize, this.tileSize, this.tileSize);
            }
        }

        // Decorations (Windows, Bookshelves, etc.)
        this.decorations.forEach(dec => {
            const x = dec.x * this.tileSize;
            const y = dec.y * this.tileSize;
            if (dec.type === 'WINDOW') {
                this.ctx.fillStyle = '#60a5fa';
                this.ctx.fillRect(x, y + 5, 5, this.tileSize - 10);
                this.ctx.strokeStyle = '#fff';
                this.ctx.strokeRect(x, y + 5, 5, this.tileSize - 10);
            } else if (dec.type === 'BOOKSHELF') {
                this.ctx.fillStyle = '#78350f';
                this.ctx.fillRect(x + 5, y + 5, this.tileSize - 10, this.tileSize - 10);
                this.ctx.fillStyle = '#fde68a';
                for (let i = 0; i < 3; i++) {
                    this.ctx.fillRect(x + 8, y + 10 + (i * 8), this.tileSize - 16, 4);
                }
            } else if (dec.type === 'PLANT') {
                this.ctx.fillStyle = '#065f46';
                this.ctx.beginPath();
                this.ctx.arc(x + 20, y + 20, 10, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#92400e';
                this.ctx.fillRect(x + 15, y + 25, 10, 10);
            } else if (dec.type === 'CHAIR') {
                this.ctx.fillStyle = '#451a03';
                this.ctx.fillRect(x + 12, y + 12, 16, 16);
            }
        });

        // Chalkboard (Front wall)
        this.ctx.fillStyle = '#064e3b';
        this.ctx.fillRect(this.tileSize * 3, 5, this.tileSize * 9, 15);
        this.ctx.strokeStyle = '#78350f';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(this.tileSize * 3, 5, this.tileSize * 9, 15);
        this.ctx.lineWidth = 1;

        // Walls
        this.ctx.fillStyle = '#4b5563';
        this.walls.forEach(w => {
            this.ctx.fillRect(w.x * this.tileSize, w.y * this.tileSize, this.tileSize, this.tileSize);
            this.ctx.strokeStyle = '#1f2937';
            this.ctx.strokeRect(w.x * this.tileSize, w.y * this.tileSize, this.tileSize, this.tileSize);
        });

        // Desks
        this.desks.forEach(d => {
            if (d.isTeacherDesk) {
                this.ctx.fillStyle = '#78350f';
                this.ctx.fillRect(d.x * this.tileSize + 2, d.y * this.tileSize + 2, this.tileSize - 4, this.tileSize - 4);
                this.ctx.strokeStyle = '#451a03';
                this.ctx.strokeRect(d.x * this.tileSize + 2, d.y * this.tileSize + 2, this.tileSize - 4, this.tileSize - 4);
            } else {
                this.ctx.fillStyle = '#92400e';
                this.ctx.fillRect(d.x * this.tileSize + 5, d.y * this.tileSize + 5, this.tileSize - 10, this.tileSize - 15);
                this.ctx.fillStyle = '#451a03';
                this.ctx.fillRect(d.x * this.tileSize + 10, d.y * this.tileSize + 30, this.tileSize - 20, 5);
            }
        });

        // Noise Indicator
        if (this.noise.timer > 0) {
            this.ctx.strokeStyle = `rgba(251, 191, 36, ${this.noise.timer / 1000})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.noise.x * this.tileSize + 20, this.noise.y * this.tileSize + 20, 15 + (1000 - this.noise.timer) / 20, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Hall Passes
        this.hallPasses.forEach(p => {
            if (!p.collected) {
                this.ctx.fillStyle = '#fbbf24';
                this.ctx.beginPath();
                this.ctx.arc(p.x * this.tileSize + 20, p.y * this.tileSize + 20, 8, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        // Exit
        const allPasses = this.hallPasses.every(p => p.collected);
        this.ctx.fillStyle = allPasses ? '#10b981' : '#ef4444';
        this.ctx.fillRect(this.exit.x * this.tileSize + 2, this.exit.y * this.tileSize + 2, this.tileSize - 4, this.tileSize - 4);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(allPasses ? 'EXIT' : 'LOCKED', this.exit.x * this.tileSize + 20, this.exit.y * this.tileSize + 25);

        // Monica's Vision
        this.ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        this.ctx.beginPath();
        this.ctx.moveTo(this.monica.x * this.tileSize + 20, this.monica.y * this.tileSize + 20);
        const range = 5 * this.tileSize;
        const startAngle = (this.monica.dir * Math.PI / 2) - Math.PI / 4;
        const endAngle = (this.monica.dir * Math.PI / 2) + Math.PI / 4;
        this.ctx.arc(this.monica.x * this.tileSize + 20, this.monica.y * this.tileSize + 20, range, startAngle, endAngle);
        this.ctx.fill();

        // Monica
        this.ctx.fillStyle = this.monica.investigating ? '#f97316' : '#ef4444';
        this.ctx.beginPath();
        this.ctx.arc(this.monica.x * this.tileSize + 20, this.monica.y * this.tileSize + 20, 15, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 9px Arial';
        this.ctx.fillText(this.monica.investigating ? '?!' : 'MONICA', this.monica.x * this.tileSize + 20, this.monica.y * this.tileSize + 5);

        // Player
        this.ctx.fillStyle = this.player.isCrouching ? '#60a5fa' : '#3b82f6';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x * this.tileSize + 20, this.player.y * this.tileSize + 20, this.player.isCrouching ? 8 : 12, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // HUD
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px "Press Start 2P", cursive';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`LVL: ${this.level}`, 20, 30);
        this.ctx.fillText(`PASS: ${this.hallPasses.filter(p => p.collected).length}/${this.hallPasses.length}`, 20, 50);
        if (this.player.isCrouching) {
            this.ctx.fillStyle = '#60a5fa';
            this.ctx.fillText('CROUCHING (SILENT)', 20, 70);
        }

        if (this.gameState !== 'PLAYING') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.85)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.textAlign = 'center';
            this.ctx.font = 'bold 24px "Press Start 2P", cursive';
            
            if (this.gameState === 'START') {
                this.ctx.fillText('DETENTION ESCAPE', this.width / 2, this.height / 2 - 40);
                this.ctx.font = '12px Arial';
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText('SHIFT/C TO CROUCH (SILENT)', this.width / 2, this.height / 2);
                this.ctx.fillText('NORMAL MOVEMENT MAKES NOISE!', this.width / 2, this.height / 2 + 25);
                this.ctx.fillStyle = '#fbbf24';
                this.ctx.fillText('CLICK TO START', this.width / 2, this.height / 2 + 70);
            } else if (this.gameState === 'CAUGHT') {
                this.ctx.fillStyle = '#ef4444';
                this.ctx.fillText('CAUGHT!', this.width / 2, this.height / 2 - 20);
                this.ctx.font = '14px Arial';
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText('CLICK TO RESTART', this.width / 2, this.height / 2 + 20);
            } else if (this.gameState === 'ESCAPED') {
                this.ctx.fillStyle = '#10b981';
                this.ctx.fillText('LEVEL COMPLETE!', this.width / 2, this.height / 2 - 20);
                this.ctx.font = '14px Arial';
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText('CLICK FOR NEXT LEVEL', this.width / 2, this.height / 2 + 20);
            }
        }
    }

    stop() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);
        this.canvas.removeEventListener('click', this.boundClick);
        this.container.innerHTML = '';
    }
}
