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

        this.barrelSpawnTimer = 0;
        this.barrelSpawnRate = 120; // frames

        this.hammer = {
            active: false,
            timer: 0,
            duration: 300, // 5 seconds at 60fps
            x: 0,
            y: 0,
            width: 20,
            height: 20,
            spawned: false
        };

        this.pauline = {
            x: 0,
            y: 0,
            width: 20,
            height: 30
        };

        this.running = false;
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
        this.platforms = [];
        this.ladders = [];
        this.barrels = [];
        
        // Ground (flat)
        this.platforms.push({ x: 0, y: this.height - 30, w: 600, h: 30, dir: 0, slope: 0 });
        
        const levelHeight = 100;
        const numLevels = 6;
        let lastGapSide = Math.random() > 0.5 ? 'right' : 'left';
        
        for (let i = 1; i <= numLevels; i++) {
            const y = (this.height - 30) - i * levelHeight;
            const gapSide = lastGapSide === 'right' ? 'left' : 'right';
            const slope = gapSide === 'left' ? -0.05 : 0.05; // Slanted platforms
            
            if (gapSide === 'left') {
                this.platforms.push({ x: 60, y: y, w: 540, h: 20, dir: -1, slope: slope });
                this.ladders.push({ x: 520, y: y, w: 30, h: levelHeight + 20 });
            } else {
                this.platforms.push({ x: 0, y: y, w: 540, h: 20, dir: 1, slope: slope });
                this.ladders.push({ x: 50, y: y, w: 30, h: levelHeight + 20 });
            }
            lastGapSide = gapSide;
        }
        
        const goalY = (this.height - 30) - (numLevels + 1) * levelHeight;
        this.platforms.push({ x: 200, y: goalY, w: 200, h: 20, dir: 0, slope: 0 });
        this.ladders.push({ x: 285, y: goalY, w: 30, h: levelHeight + 20 });
        
        this.kong = { x: 210, y: goalY - 50, width: 40, height: 50, frame: 0 };
        this.pauline = { x: 350, y: goalY - 30, width: 20, height: 30 };

        // Spawn Hammer on a random middle platform
        const hammerLevel = Math.floor(Math.random() * (numLevels - 2)) + 2;
        const hp = this.platforms[hammerLevel];
        this.hammer.x = hp.x + hp.w / 2;
        this.hammer.y = hp.y - 25;
        this.hammer.spawned = true;
        this.hammer.active = false;

        this.barrelSpawnTimer = 0;
        this.barrelSpawnRate = 120;
    }

    reset() {
        this.player.x = 50;
        this.player.y = this.height - 60;
        this.player.vx = 0;
        this.player.vy = 0;
        this.hammer.active = false;
        this.hammer.spawned = true;
        this.initLevel();
        this.score = 0;
        this.gameState = 'playing';
    }

    start() {
        this.running = true;
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);
        this.canvas.addEventListener('click', this.boundClick);
        this.update();
    }

    stop() {
        this.running = false;
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);
        this.canvas.removeEventListener('click', this.boundClick);
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }

    update() {
        if (!this.running) return;

        if (this.gameState === 'playing') {
            this.updatePlayer();
            this.updateBarrels();
            this.checkCollisions();
            
            if (this.hammer.active) {
                this.hammer.timer--;
                if (this.hammer.timer <= 0) this.hammer.active = false;
            }
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
                // Calculate platform Y at player's X position for slanted platforms
                const relativeX = (this.player.x + this.player.width / 2) - p.x;
                const platformYAtX = p.y + (p.slope ? relativeX * p.slope : 0);

                if (this.player.vy >= 0 && prevBottom <= platformYAtX + 5 && currentBottom >= platformYAtX) {
                    if (!this.player.climbing || (this.player.climbing && !this.keys['ArrowUp'] && !this.keys['KeyW'])) {
                        this.player.y = platformYAtX - this.player.height;
                        this.player.vy = 0;
                        this.player.onGround = true;
                        this.player.climbing = false;
                    }
                }
            }
        });

        // Hammer pickup
        if (this.hammer.spawned && !this.hammer.active) {
            if (this.player.x < this.hammer.x + this.hammer.width &&
                this.player.x + this.player.width > this.hammer.x &&
                this.player.y < this.hammer.y + this.hammer.height &&
                this.player.y + this.player.height > this.hammer.y) {
                this.hammer.active = true;
                this.hammer.spawned = false;
                this.hammer.timer = this.hammer.duration;
            }
        }

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
                vx: Math.random() > 0.5 ? 2 : -2,
                vy: 0
            });
            this.barrelSpawnTimer = 0;
            this.kong.frame = 30; // Animate Kong
        }
        if (this.kong.frame > 0) this.kong.frame--;

        this.barrels.forEach((b, index) => {
            const bPrevBottom = b.y + b.r;
            b.vy += this.gravity;
            b.x += b.vx;
            b.y += b.vy;
            const bCurrentBottom = b.y + b.r;

            if (b.x - b.r < 0) { b.x = b.r; b.vx = 0; }
            if (b.x + b.r > this.width) { b.x = this.width - b.r; b.vx = 0; }

            let onPlatform = false;
            this.platforms.forEach(p => {
                if (b.x + b.r > p.x && b.x - b.r < p.x + p.w) {
                    const relativeX = b.x - p.x;
                    const platformYAtX = p.y + (p.slope ? relativeX * p.slope : 0);

                    if (b.vy >= 0 && bPrevBottom <= platformYAtX + 5 && bCurrentBottom >= platformYAtX) {
                        b.y = platformYAtX - b.r;
                        b.vy = 0;
                        onPlatform = true;
                        if (p.dir !== 0) b.vx = p.dir * 3;
                    }
                }
            });

            if (b.y > this.height) {
                this.barrels.splice(index, 1);
                this.score += 10;
            }

            // Hammer smash
            if (this.hammer.active) {
                let dx = this.player.x + this.player.width / 2 - b.x;
                let dy = this.player.y + this.player.height / 2 - b.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 40) {
                    this.barrels.splice(index, 1);
                    this.score += 50;
                }
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
            if (p.slope) {
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.x + p.w, p.y + p.w * p.slope);
                this.ctx.lineTo(p.x + p.w, p.y + p.w * p.slope + p.h);
                this.ctx.lineTo(p.x, p.y + p.h);
                this.ctx.closePath();
                this.ctx.fill();
            } else {
                this.ctx.fillRect(p.x, p.y, p.w, p.h);
            }
        });

        // Draw Hammer
        if (this.hammer.spawned) {
            this.ctx.fillStyle = '#facc15';
            this.ctx.fillRect(this.hammer.x, this.hammer.y, this.hammer.width, this.hammer.height);
            this.ctx.fillStyle = '#854d0e';
            this.ctx.fillRect(this.hammer.x + 8, this.hammer.y + 20, 4, 10);
        }

        // Draw Pauline
        this.ctx.fillStyle = '#f472b6';
        this.ctx.fillRect(this.pauline.x, this.pauline.y, this.pauline.width, this.pauline.height);
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(this.pauline.x + 4, this.pauline.y + 5, 4, 4);
        this.ctx.fillRect(this.pauline.x + 12, this.pauline.y + 5, 4, 4);

        // Draw Kong
        this.ctx.fillStyle = '#4b2c20';
        let kongY = this.kong.y + (this.kong.frame > 0 ? -10 : 0);
        this.ctx.fillRect(this.kong.x, kongY, this.kong.width, this.kong.height);
        this.ctx.fillStyle = '#d2b48c';
        this.ctx.fillRect(this.kong.x + 5, kongY + 10, 30, 20);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(this.kong.x + 10, kongY + 15, 5, 5);
        this.ctx.fillRect(this.kong.x + 25, kongY + 15, 5, 5);

        // Draw Player
        this.ctx.fillStyle = this.hammer.active ? '#facc15' : '#ef4444';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        if (this.hammer.active) {
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(this.player.x - 10, this.player.y - 10, 10, 10);
        }
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

        if (this.hammer.active) {
            this.ctx.fillStyle = '#facc15';
            this.ctx.font = '12px "Press Start 2P", cursive';
            this.ctx.fillText(`HAMMER ACTIVE: ${Math.ceil(this.hammer.timer / 60)}s`, 20, 70);
        }

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
