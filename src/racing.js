export class Racing {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = 300;
        this.height = 450;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.laneWidth = this.width / 3;
        this.player = {
            lane: 1, // 0, 1, 2
            x: this.laneWidth + (this.laneWidth / 2) - 15,
            y: this.height - 80,
            w: 30,
            h: 55,
            targetX: this.laneWidth + (this.laneWidth / 2) - 15,
            speed: 15
        };

        this.obstacles = [];
        this.coins = [];
        this.decorations = [];
        this.score = 0;
        this.gold = 0;
        this.gameOver = false;
        this.requestId = null;
        this.keys = {};

        this.boundKeyDown = (e) => {
            this.keys[e.code] = true;
            if (e.code === 'ArrowLeft') this.movePlayer(-1);
            if (e.code === 'ArrowRight') this.movePlayer(1);
        };
        this.boundKeyUp = (e) => this.keys[e.code] = false;

        this.lastTime = 0;
        this.obstacleTimer = 0;
        this.obstacleInterval = 1200;
        this.gameSpeed = 5;

        this.init();
    }

    init() {
        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('keyup', this.boundKeyUp);
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
        this.updateScore();
        this.update();
    }

    movePlayer(dir) {
        if (this.gameOver) return;
        this.player.lane = Math.max(0, Math.min(2, this.player.lane + dir));
        this.player.targetX = this.player.lane * this.laneWidth + (this.laneWidth / 2) - this.player.w / 2;
    }

    updateScore() {
        const el = document.getElementById('tetris-score');
        if (el) el.innerText = `Gold: ${this.gold} | Dist: ${Math.floor(this.score)}m`;
    }

    spawnObstacle() {
        const lane = Math.floor(Math.random() * 3);
        // Check if lane is already occupied recently to avoid overlap
        const tooClose = this.obstacles.some(o => o.lane === lane && o.y < 100);
        if (tooClose) return;

        this.obstacles.push({
            lane,
            x: lane * this.laneWidth + (this.laneWidth / 2) - 15,
            y: -100,
            w: 30,
            h: 55,
            type: Math.random() > 0.3 ? 'carriage' : 'knight'
        });
    }

    spawnCoin() {
        const lane = Math.floor(Math.random() * 3);
        this.coins.push({
            x: lane * this.laneWidth + (this.laneWidth / 2) - 10,
            y: -50,
            w: 20,
            h: 20
        });
    }

    spawnDecoration() {
        const side = Math.random() > 0.5 ? -40 : this.width + 10;
        this.decorations.push({
            x: side,
            y: -100,
            type: Math.random() > 0.5 ? 'tree' : 'rock',
            size: 20 + Math.random() * 30
        });
    }

    update(time = 0) {
        if (this.gameOver) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        // Smooth player movement
        const dx = this.player.targetX - this.player.x;
        this.player.x += dx * 0.2;

        // Spawning logic
        this.obstacleTimer += deltaTime;
        if (this.obstacleTimer > this.obstacleInterval) {
            this.spawnObstacle();
            if (Math.random() > 0.5) this.spawnCoin();
            if (Math.random() > 0.3) this.spawnDecoration();
            this.obstacleTimer = 0;
            this.gameSpeed += 0.05;
            this.obstacleInterval = Math.max(400, this.obstacleInterval - 5);
        }

        // Update decorations
        this.decorations.forEach((dec, i) => {
            dec.y += this.gameSpeed;
            if (dec.y > this.height) this.decorations.splice(i, 1);
        });

        // Update coins
        this.coins.forEach((coin, i) => {
            coin.y += this.gameSpeed;
            if (
                this.player.x < coin.x + coin.w &&
                this.player.x + this.player.w > coin.x &&
                this.player.y < coin.y + coin.h &&
                this.player.y + this.player.h > coin.y
            ) {
                this.gold += 10;
                this.coins.splice(i, 1);
                this.updateScore();
            }
            if (coin.y > this.height) this.coins.splice(i, 1);
        });

        // Update obstacles
        this.obstacles.forEach((obs, i) => {
            obs.y += this.gameSpeed * 0.8;
            
            // Collision
            if (
                this.player.x < obs.x + obs.w &&
                this.player.x + this.player.w > obs.x &&
                this.player.y < obs.y + obs.h &&
                this.player.y + this.player.h > obs.y
            ) {
                this.endGame();
            }

            if (obs.y > this.height) {
                this.obstacles.splice(i, 1);
                this.score += 5;
                this.updateScore();
            }
        });

        this.score += this.gameSpeed * 0.01;
        this.updateScore();

        this.draw();
        this.requestId = requestAnimationFrame(this.update.bind(this));
    }

    draw() {
        // Grass/Background
        this.ctx.fillStyle = '#1a2e1a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Road
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Lane markers
        this.ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
        this.ctx.setLineDash([30, 30]);
        this.ctx.lineDashOffset = -this.score * 50;
        this.ctx.lineWidth = 2;
        for (let i = 1; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.laneWidth, 0);
            this.ctx.lineTo(i * this.laneWidth, this.height);
            this.ctx.stroke();
        }
        this.ctx.setLineDash([]);

        // Decorations
        this.decorations.forEach(dec => {
            if (dec.type === 'tree') {
                this.ctx.fillStyle = '#064e3b';
                this.ctx.beginPath();
                this.ctx.moveTo(dec.x + dec.size/2, dec.y);
                this.ctx.lineTo(dec.x, dec.y + dec.size);
                this.ctx.lineTo(dec.x + dec.size, dec.y + dec.size);
                this.ctx.fill();
            } else {
                this.ctx.fillStyle = '#4b5563';
                this.ctx.fillRect(dec.x, dec.y, dec.size, dec.size/1.5);
            }
        });

        // Coins
        this.ctx.fillStyle = '#fbbf24';
        this.coins.forEach(coin => {
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#fbbf24';
            this.ctx.beginPath();
            this.ctx.arc(coin.x + 10, coin.y + 10, 8, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });

        // Obstacles
        this.obstacles.forEach(obs => {
            this.drawCar(obs.x, obs.y, obs.w, obs.h, '#ef4444', false);
        });

        // Player
        this.drawCar(this.player.x, this.player.y, this.player.w, this.player.h, '#fbbf24', true);
    }

    drawCar(x, y, w, h, color, isPlayer) {
        this.ctx.fillStyle = color;
        if (isPlayer) {
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = color;
        }
        
        // Main body
        this.ctx.fillRect(x, y, w, h);
        
        // Wheels
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x - 4, y + 5, 4, 12);
        this.ctx.fillRect(x + w, y + 5, 4, 12);
        this.ctx.fillRect(x - 4, y + h - 17, 4, 12);
        this.ctx.fillRect(x + w, y + h - 17, 4, 12);

        // Roof/Windshield
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(x + 4, y + 10, w - 8, h / 2.5);

        // Headlights
        if (isPlayer) {
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(x + 2, y - 2, 6, 4);
            this.ctx.fillRect(x + w - 8, y - 2, 6, 4);
        } else {
            this.ctx.fillStyle = '#7f1d1d';
            this.ctx.fillRect(x + 2, y + h - 2, 6, 4);
            this.ctx.fillRect(x + w - 8, y + h - 2, 6, 4);
        }

        this.ctx.shadowBlur = 0;
    }

    endGame() {
        this.gameOver = true;
        cancelAnimationFrame(this.requestId);
        setTimeout(() => {
            alert(`CRASH! Thy loot: ${this.gold} gold. Distance: ${Math.floor(this.score)}m.`);
            this.start();
        }, 100);
    }

    stop() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        document.removeEventListener('keydown', this.boundKeyDown);
        document.removeEventListener('keyup', this.boundKeyUp);
        this.container.innerHTML = '';
    }
}

