export class TowerClimber {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = 600;
        this.height = 800; // Expanded height
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.gravity = 0.5;
        this.friction = 0.8;
        this.score = 0;
        this.gameState = 'playing';

        this.player = {
            x: 50,
            y: 740,
            width: 20,
            height: 30,
            vx: 0,
            vy: 0,
            speed: 4,
            jumpForce: -7,
            onGround: false,
            climbing: false
        };

        this.initLevel();

        this.keys = {};
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.boundClick = this.handleClick.bind(this);
    }

    handleKeyDown(e) {
        this.keys[e.code] = true;
    }

    handleKeyUp(e) {
        this.keys[e.code] = false;
    }

    handleClick(e) {
        if (this.gameState !== 'playing') {
            this.reset();
        }
    }

    initLevel() {
        // Clear existing arrays to prevent "new map under old map" bug
        this.platforms = [];
        this.ladders = [];
        this.barrels = [];
        
        // Ground
        this.platforms.push({ x: 0, y: this.height - 30, w: 600, h: 30, dir: 0 });
        
        this.kong = { x: 0, y: 0, width: 40, height: 50 };
        
        const levelHeight = 100;
        const numLevels = 6;
        let lastGapSide = Math.random() > 0.5 ? 'right' : 'left';
        
        for (let i = 1; i <= numLevels; i++) {
            const y = (this.height - 30) - i * levelHeight;
            const gapSide = lastGapSide === 'right' ? 'left' : 'right';
            
            if (gapSide === 'left') {
                // Gap on left, roll left
                this.platforms.push({ x: 60, y: y, w: 540, h: 20, dir: -1 });
                this.ladders.push({ x: 520, y: y, w: 30, h: levelHeight + 20 });
            } else {
                // Gap on right, roll right
                this.platforms.push({ x: 0, y: y, w: 540, h: 20, dir: 1 });
                this.ladders.push({ x: 50, y: y, w: 30, h: levelHeight + 20 });
            }
            lastGapSide = gapSide;
        }
        
        // Goal platform at the very top
        const goalY = (this.height - 30) - (numLevels + 1) * levelHeight;
        this.platforms.push({ x: 250, y: goalY, w: 100, h: 20, dir: 0 });
        this.ladders.push({ x: 285, y: goalY, w: 30, h: levelHeight + 20 });
        
        this.kong.y = goalY - this.kong.height;
        this.kong.x = 280;

        this.barrelSpawnTimer = 0;
        this.barrelSpawnRate = 120;
    }

    reset() {
        this.player.x = 50;
        this.player.y = this.height - 60;
        this.player.vx = 0;
        this.player.vy = 0;
        this.initLevel();
        this.score = 0;
        this.gameState = 'playing';
    }

    start() {
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);
        this.canvas.addEventListener('click', this.boundClick);
        this.update();
    }

    stop() {
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);
        this.canvas.removeEventListener('click', this.boundClick);
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }

    update() {
        if (this.gameState === 'playing') {
            this.updatePlayer();
            this.updateBarrels();
            this.checkCollisions();
        }

        this.draw();
        this.animationId = requestAnimationFrame(() => this.update());
    }

    updatePlayer() {
        const prevY = this.player.y;
        const prevBottom = prevY + this.player.height;

        // Horizontal movement
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.player.vx = -this.player.speed;
        } else if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.player.vx = this.player.speed;
        } else {
            this.player.vx *= this.friction;
        }

        // Climbing check
        let onLadder = this.ladders.some(l => 
            this.player.x + this.player.width > l.x &&
            this.player.x < l.x + l.w &&
            this.player.y + this.player.height > l.y &&
            this.player.y < l.y + l.h
        );

        if (onLadder) {
            if (this.keys['ArrowUp'] || this.keys['KeyW']) {
                this.player.vy = -3;
                this.player.climbing = true;
            } else if (this.keys['ArrowDown'] || this.keys['KeyS']) {
                this.player.vy = 3;
                this.player.climbing = true;
            } else {
                this.player.vy = 0;
                this.player.climbing = true; // Stay on ladder
            }
        } else {
            this.player.climbing = false;
        }

        // Gravity
        if (!this.player.climbing) {
            this.player.vy += this.gravity;
        }

        // Apply velocities
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;

        // Boundary checks
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > this.width) this.player.x = this.width - this.player.width;

        // Platform collision
        const currentBottom = this.player.y + this.player.height;
        this.player.onGround = false;

        this.platforms.forEach(p => {
            if (this.player.x + this.player.width > p.x && this.player.x < p.x + p.w) {
                // Check if player's feet passed through the platform top
                if (this.player.vy >= 0 && prevBottom <= p.y && currentBottom >= p.y) {
                    if (!this.player.climbing || (this.player.climbing && !this.keys['ArrowUp'] && !this.keys['KeyW'])) {
                        this.player.y = p.y - this.player.height;
                        this.player.vy = 0;
                        this.player.onGround = true;
                        this.player.climbing = false;
                    }
                }
            }
        });

        // Jump
        if ((this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW']) && this.player.onGround && !this.player.climbing) {
            this.player.vy = this.player.jumpForce;
            this.player.onGround = false;
        }

        // Win condition
        if (this.player.y < 50) {
            this.gameState = 'won';
        }
    }

    updateBarrels() {
        this.barrelSpawnTimer++;
        if (this.barrelSpawnTimer > this.barrelSpawnRate) {
            this.barrels.push({
                x: this.kong.x + this.kong.width / 2,
                y: this.kong.y + this.kong.height - 10,
                r: 10,
                vx: Math.random() > 0.5 ? 2 : -2, // Initial push
                vy: 0
            });
            this.barrelSpawnTimer = 0;
        }

        this.barrels.forEach((b, index) => {
            const bPrevBottom = b.y + b.r;
            b.vy += this.gravity;
            b.x += b.vx;
            b.y += b.vy;
            const bCurrentBottom = b.y + b.r;

            // Wall constraints (no bounce)
            if (b.x - b.r < 0) {
                b.x = b.r;
                b.vx = 0;
            }
            if (b.x + b.r > this.width) {
                b.x = this.width - b.r;
                b.vx = 0;
            }

            let onPlatform = false;
            this.platforms.forEach(p => {
                if (b.x + b.r > p.x && b.x - b.r < p.x + p.w) {
                    if (b.vy >= 0 && bPrevBottom <= p.y && bCurrentBottom >= p.y) {
                        b.y = p.y - b.r;
                        b.vy = 0;
                        onPlatform = true;
                        
                        // Follow platform direction
                        if (p.dir !== 0) {
                            b.vx = p.dir * 3;
                        }
                    }
                }
            });

            // Remove off-screen barrels
            if (b.y > this.height) {
                this.barrels.splice(index, 1);
                this.score += 10;
            }
        });
    }

    checkCollisions() {
        this.barrels.forEach(b => {
            let dx = this.player.x + this.player.width / 2 - b.x;
            let dy = this.player.y + this.player.height / 2 - b.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < (this.player.width / 2 + b.r)) {
                this.gameState = 'gameover';
            }
        });
    }

    draw() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Ladders
        this.ctx.fillStyle = '#8b4513';
        this.ladders.forEach(l => {
            this.ctx.fillRect(l.x, l.y, l.w, l.h);
            // Rungs
            this.ctx.strokeStyle = '#5d2e0a';
            this.ctx.lineWidth = 2;
            for (let i = 0; i < l.h; i += 10) {
                this.ctx.beginPath();
                this.ctx.moveTo(l.x, l.y + i);
                this.ctx.lineTo(l.x + l.w, l.y + i);
                this.ctx.stroke();
            }
        });

        // Draw Platforms
        this.ctx.fillStyle = '#fbbf24';
        this.platforms.forEach(p => {
            this.ctx.fillRect(p.x, p.y, p.w, p.h);
        });

        // Draw Kong
        this.ctx.fillStyle = '#4b2c20';
        this.ctx.fillRect(this.kong.x, this.kong.y, this.kong.width, this.kong.height);
        // Kong's face
        this.ctx.fillStyle = '#d2b48c';
        this.ctx.fillRect(this.kong.x + 5, this.kong.y + 10, 30, 20);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(this.kong.x + 10, this.kong.y + 15, 5, 5);
        this.ctx.fillRect(this.kong.x + 25, this.kong.y + 15, 5, 5);

        // Draw Player
        this.ctx.fillStyle = '#ef4444';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        // Eyes
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(this.player.x + 4, this.player.y + 5, 4, 4);
        this.ctx.fillRect(this.player.x + 12, this.player.y + 5, 4, 4);

        // Draw Barrels
        this.ctx.fillStyle = '#d97706';
        this.barrels.forEach(b => {
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#92400e';
            this.ctx.stroke();
        });

        // UI
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.font = '20px "Press Start 2P", cursive';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 40);

        if (this.gameState === 'won') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.textAlign = 'center';
            this.ctx.font = '30px "Press Start 2P", cursive';
            this.ctx.fillText('YOU REACHED THE TOP!', this.width / 2, this.height / 2);
            this.ctx.font = '15px "Press Start 2P", cursive';
            this.ctx.fillText('CLICK TO RESTART', this.width / 2, this.height / 2 + 50);
        } else if (this.gameState === 'gameover') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#ef4444';
            this.ctx.textAlign = 'center';
            this.ctx.font = '40px "Press Start 2P", cursive';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2);
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.font = '15px "Press Start 2P", cursive';
            this.ctx.fillText('CLICK TO RESTART', this.width / 2, this.height / 2 + 50);
        }
    }
}
