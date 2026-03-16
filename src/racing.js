export class Racing {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        
        this.width = 300;
        this.height = 450;
        this.laneWidth = this.width / 3;
        
        this.player = this.getDefaultPlayer();
        this.obstacles = [];
        this.coins = [];
        this.decorations = [];
        this.score = 0;
        this.gold = 0;
        this.gameOver = false;
        this.requestId = null;
        this.keys = {};

        // Event binding bindings so they can be removed later
        this.boundKeyDown = (e) => this.handleKeyDown(e);
        this.boundKeyUp = (e) => this.keys[e.code] = false;
        this.boundPointerDown = (e) => this.handlePointerDown(e);

        this.lastTime = 0;
        this.obstacleTimer = 0;
        this.obstacleInterval = 1200;
        this.gameSpeed = 5;

        this.init();
    }

    getDefaultPlayer() {
        return {
            lane: 1, // 0, 1, 2
            x: this.laneWidth + (this.laneWidth / 2) - 15,
            y: this.height - 90,
            w: 30,
            h: 55,
            targetX: this.laneWidth + (this.laneWidth / 2) - 15
        };
    }

    init() {
        // Set up the HTML structure with an integrated overlay
        this.container.innerHTML = `
            <div class="relative mx-auto w-[${this.width}px] h-[${this.height}px] border-[3px] border-gold-500/50 rounded-md overflow-hidden shadow-lg select-none">
                <canvas id="${this.containerId}-canvas" width="${this.width}" height="${this.height}" class="block w-full h-full touch-none cursor-pointer"></canvas>
                
                <div id="${this.containerId}-overlay" class="absolute inset-0 bg-black/85 flex-col items-center justify-center hidden z-10 p-4 text-center">
                    <h2 class="text-4xl font-arcade text-red-500 mb-2 tracking-widest">CRASH!</h2>
                    <div id="${this.containerId}-stats" class="text-white font-arcade text-xs mb-6 space-y-2 leading-relaxed"></div>
                    <button id="${this.containerId}-restart" class="bg-gold-500 text-black px-6 py-2 font-arcade uppercase hover:bg-gold-400 transition-colors">Drive Again</button>
                </div>
            </div>
        `;

        this.canvas = document.getElementById(`${this.containerId}-canvas`);
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById(`${this.containerId}-overlay`);
        this.statsEl = document.getElementById(`${this.containerId}-stats`);
        
        document.getElementById(`${this.containerId}-restart`).onclick = () => this.start();

        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('keyup', this.boundKeyUp);
        this.canvas.addEventListener('pointerdown', this.boundPointerDown); // Supports touch and mouse

        this.start();
    }

    start() {
        this.gameOver = false;
        this.score = 0;
        this.gold = 0;
        this.obstacles = [];
        this.coins = [];
        this.decorations = [];
        this.gameSpeed = 5;
        this.obstacleInterval = 1200;
        this.player = this.getDefaultPlayer();
        this.lastTime = performance.now();
        
        this.overlay.classList.add('hidden');
        this.overlay.classList.remove('flex');
        
        this.updateScore();
        this.update(performance.now());
    }

    handleKeyDown(e) {
        if (this.gameOver) return;
        this.keys[e.code] = true;
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.movePlayer(-1);
        if (e.code === 'ArrowRight' || e.code === 'KeyD') this.movePlayer(1);
    }

    handlePointerDown(e) {
        if (this.gameOver) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        // Click left half of screen to go left, right half to go right
        if (x < this.width / 2) {
            this.movePlayer(-1);
        } else {
            this.movePlayer(1);
        }
    }

    movePlayer(dir) {
        if (this.gameOver) return;
        this.player.lane = Math.max(0, Math.min(2, this.player.lane + dir));
        this.player.targetX = this.player.lane * this.laneWidth + (this.laneWidth / 2) - (this.player.w / 2);
    }

    updateScore() {
        const el = document.getElementById('game-score');
        if (el) el.innerText = `Gold: ${this.gold} | Dist: ${Math.floor(this.score)}m`;
    }

    spawnObstacle() {
        const lane = Math.floor(Math.random() * 3);
        
        // Prevent impossible walls by checking if lane is recently occupied
        const tooClose = this.obstacles.some(o => o.lane === lane && o.y < 150);
        if (tooClose) return;

        this.obstacles.push({
            lane,
            x: lane * this.laneWidth + (this.laneWidth / 2) - 15,
            y: -80,
            w: 30,
            h: 55
        });
    }

    spawnCoin() {
        const lane = Math.floor(Math.random() * 3);
        
        // Don't spawn a coin inside an obstacle
        const overlapping = this.obstacles.some(o => o.lane === lane && o.y < 0);
        if (overlapping) return;

        this.coins.push({
            x: lane * this.laneWidth + (this.laneWidth / 2) - 10,
            y: -30,
            w: 20,
            h: 20
        });
    }

    update(time) {
        if (this.gameOver) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        // Snappy but smooth player movement
        const dx = this.player.targetX - this.player.x;
        this.player.x += dx * 0.25;

        // Spawning logic
        this.obstacleTimer += deltaTime;
        if (this.obstacleTimer > this.obstacleInterval) {
            this.spawnObstacle();
            if (Math.random() > 0.4) this.spawnCoin();
            
            this.obstacleTimer = 0;
            
            // Gradually increase difficulty, but cap it so it remains playable
            if (this.gameSpeed < 12) {
                this.gameSpeed += 0.05;
                this.obstacleInterval = Math.max(500, this.obstacleInterval - 10);
            }
        }

        // Update coins
        for (let i = this.coins.length - 1; i >= 0; i--) {
            let coin = this.coins[i];
            coin.y += this.gameSpeed;
            
            // Collection collision
            if (
                this.player.x < coin.x + coin.w &&
                this.player.x + this.player.w > coin.x &&
                this.player.y < coin.y + coin.h &&
                this.player.y + this.player.h > coin.y
            ) {
                this.gold += 10;
                this.coins.splice(i, 1);
                this.updateScore();
                continue;
            }
            if (coin.y > this.height) this.coins.splice(i, 1);
        }

        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            let obs = this.obstacles[i];
            obs.y += this.gameSpeed * 0.8; // Enemies drive slightly slower than you
            
            // Fair collision (4px margin so grazing isn't instant death)
            const margin = 4;
            if (
                this.player.x + margin < obs.x + obs.w - margin &&
                this.player.x + this.player.w - margin > obs.x + margin &&
                this.player.y + margin < obs.y + obs.h - margin &&
                this.player.y + this.player.h - margin > obs.y + margin
            ) {
                this.endGame();
                return; // Stop updating immediately
            }

            if (obs.y > this.height) {
                this.obstacles.splice(i, 1);
                this.score += 5;
                this.updateScore();
            }
        }

        this.score += this.gameSpeed * 0.02;
        this.updateScore();

        this.draw();
        this.requestId = requestAnimationFrame(this.update.bind(this));
    }

    draw() {
        // Background (Grass)
        this.ctx.fillStyle = '#064e3b';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Road (Centered, leaving grass on the edges)
        const roadMargin = 15;
        this.ctx.fillStyle = '#1f2937';
        this.ctx.fillRect(roadMargin, 0, this.width - (roadMargin * 2), this.height);

        // Road shoulder lines
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.fillRect(roadMargin + 2, 0, 2, this.height);
        this.ctx.fillRect(this.width - roadMargin - 4, 0, 2, this.height);

        // Moving Lane markers
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.setLineDash([20, 20]);
        // The dash offset moves based on score/speed to create the illusion of forward motion
        this.ctx.lineDashOffset = -this.score * 15; 
        this.ctx.lineWidth = 2;
        
        for (let i = 1; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.laneWidth, 0);
            this.ctx.lineTo(i * this.laneWidth, this.height);
            this.ctx.stroke();
        }
        this.ctx.setLineDash([]);

        // Draw Coins
        this.ctx.fillStyle = '#fbbf24';
        this.coins.forEach(coin => {
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = '#fbbf24';
            this.ctx.beginPath();
            // Pulse effect based on time
            const pulse = Math.sin(this.lastTime / 150) * 2;
            this.ctx.arc(coin.x + 10, coin.y + 10, 8 + pulse, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });

        // Draw Enemies
        this.obstacles.forEach(obs => {
            this.drawCar(obs.x, obs.y, obs.w, obs.h, '#ef4444', false);
        });

        // Draw Player
        this.drawCar(this.player.x, this.player.y, this.player.w, this.player.h, '#0ea5e9', true);
    }

    drawCar(x, y, w, h, color, isPlayer) {
        this.ctx.fillStyle = color;
        if (isPlayer) {
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
        }
        
        // Main body
        this.ctx.fillRect(x, y, w, h);
        
        // Wheels
        this.ctx.fillStyle = '#000';
        this.ctx.shadowBlur = 0;
        this.ctx.fillRect(x - 3, y + 8, 3, 14);
        this.ctx.fillRect(x + w, y + 8, 3, 14);
        this.ctx.fillRect(x - 3, y + h - 22, 3, 14);
        this.ctx.fillRect(x + w, y + h - 22, 3, 14);

        // Windshield
        this.ctx.fillStyle = '#0f172a';
        if (isPlayer) {
            this.ctx.fillRect(x + 4, y + 12, w - 8, 12); // Front windshield (facing up)
            this.ctx.fillRect(x + 4, y + h - 10, w - 8, 6); // Rear windshield
        } else {
            this.ctx.fillRect(x + 4, y + h - 24, w - 8, 12); // Front windshield (facing down)
        }

        // Headlights
        this.ctx.fillStyle = isPlayer ? '#fef08a' : '#ef4444';
        const lightY = isPlayer ? y - 2 : y + h - 2;
        this.ctx.fillRect(x + 3, lightY, 6, 4);
        this.ctx.fillRect(x + w - 9, lightY, 6, 4);

        // Engine Exhaust flames for player
        if (isPlayer && Math.random() > 0.5) {
            this.ctx.fillStyle = '#f97316';
            this.ctx.fillRect(x + 6, y + h, 4, Math.random() * 8 + 4);
            this.ctx.fillRect(x + w - 10, y + h, 4, Math.random() * 8 + 4);
        }
    }

    endGame() {
        this.gameOver = true;
        cancelAnimationFrame(this.requestId);
        
        // Populate and show the overlay
        this.statsEl.innerHTML = `
            <div>DISTANCE: <span class="text-white">${Math.floor(this.score)}m</span></div>
            <div>GOLD SECURED: <span class="text-fbbf24">${this.gold}</span></div>
        `;
        this.overlay.classList.remove('hidden');
        this.overlay.classList.add('flex');
    }

    stop() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        document.removeEventListener('keydown', this.boundKeyDown);
        document.removeEventListener('keyup', this.boundKeyUp);
        if (this.canvas) this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
        this.container.innerHTML = '';
    }
}