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
        this.lives = 3;
        this.bonus = 5000;
        this.bonusTimer = 0;
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
            climbing: false,
            hasHammer: false,
            hammerTime: 0
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
        this.platforms = [];
        this.ladders = [];
        this.barrels = [];
        this.fireballs = [];
        this.hammers = [];
        
        // Ground
        this.platforms.push({ x: 0, y: this.height - 30, w: 600, h: 30, dir: 0 });
        
        // Oil Drum at bottom left
        this.oilDrum = { x: 40, y: this.height - 80, width: 40, height: 50 };
        
        this.kong = { x: 0, y: 0, width: 60, height: 70 };
        this.pauline = { x: 0, y: 0, width: 20, height: 30 };
        
        const levelHeight = 100;
        const numLevels = 6;
        let lastGapSide = Math.random() > 0.5 ? 'right' : 'left';
        
        for (let i = 1; i <= numLevels; i++) {
            const y = (this.height - 30) - i * levelHeight;
            const gapSide = lastGapSide === 'right' ? 'left' : 'right';
            
            if (gapSide === 'left') {
                this.platforms.push({ x: 60, y: y, w: 540, h: 20, dir: -1 });
                this.ladders.push({ x: 520, y: y, w: 30, h: levelHeight + 20 });
                if (i === 2 || i === 5) {
                    this.hammers.push({ x: 400, y: y - 25, w: 15, h: 25, active: true });
                }
            } else {
                this.platforms.push({ x: 0, y: y, w: 540, h: 20, dir: 1 });
                this.ladders.push({ x: 50, y: y, w: 30, h: levelHeight + 20 });
                if (i === 3) {
                    this.hammers.push({ x: 150, y: y - 25, w: 15, h: 25, active: true });
                }
            }
            lastGapSide = gapSide;
        }
        
        // Goal area
        const goalY = (this.height - 30) - (numLevels + 1) * levelHeight;
        // Pauline's platform
        this.platforms.push({ x: 250, y: goalY, w: 100, h: 20, dir: 0 });
        // Kong's platform
        this.platforms.push({ x: 50, y: goalY + 40, w: 150, h: 20, dir: 0 });
        
        // Top ladder to Pauline
        this.ladders.push({ x: 285, y: goalY, w: 30, h: 60 });
        
        this.kong.y = goalY + 40 - this.kong.height;
        this.kong.x = 70;

        this.pauline.y = goalY - this.pauline.height;
        this.pauline.x = 290;

        this.barrelSpawnTimer = 0;
        this.barrelSpawnRate = 120;
        this.fireballSpawnTimer = 0;
        this.fireballSpawnRate = 400; // Slower natural spawn, mostly from barrels
        this.bonus = 5000;
        this.bonusTimer = 0;
    }

    reset() {
        this.player.x = 50;
        this.player.y = this.height - 60;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.hasHammer = false;
        this.player.hammerTime = 0;
        this.lives = 3;
        this.score = 0;
        this.initLevel();
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
            this.bonusTimer++;
            if (this.bonusTimer >= 60) {
                this.bonus = Math.max(0, this.bonus - 100);
                this.bonusTimer = 0;
            }

            if (this.player.hasHammer) {
                this.player.hammerTime--;
                if (this.player.hammerTime <= 0) {
                    this.player.hasHammer = false;
                }
            }

            this.updatePlayer();
            this.updateBarrels();
            this.updateFireballs();
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

            // Barrel hits oil drum? Transform to fireball
            if (b.x > this.oilDrum.x && b.x < this.oilDrum.x + this.oilDrum.width &&
                b.y + b.r > this.oilDrum.y && b.y < this.oilDrum.y + this.oilDrum.height) {
                this.barrels.splice(index, 1);
                this.spawnFireball();
                return;
            }

            // Remove off-screen barrels
            if (b.y > this.height) {
                this.barrels.splice(index, 1);
                this.score += 10;
            }
        });
    }

    spawnFireball() {
        this.fireballs.push({
            x: this.oilDrum.x + this.oilDrum.width / 2,
            y: this.oilDrum.y,
            r: 8,
            vx: Math.random() > 0.5 ? 2 : -2,
            vy: -5, // Jump out of drum
            climbChance: 0.02
        });
    }

    updateFireballs() {
        this.fireballSpawnTimer++;
        if (this.fireballSpawnTimer > this.fireballSpawnRate) {
            this.spawnFireball();
            this.fireballSpawnTimer = 0;
        }

        this.fireballs.forEach((f, index) => {
            const fPrevBottom = f.y + f.r;
            f.vy += this.gravity;
            f.x += f.vx;
            f.y += f.vy;
            const fCurrentBottom = f.y + f.r;

            if (f.x - f.r < 0 || f.x + f.r > this.width) f.vx *= -1;

            let onPlatform = false;
            this.platforms.forEach(p => {
                if (f.x + f.r > p.x && f.x - f.r < p.x + p.w) {
                    if (f.vy >= 0 && fPrevBottom <= p.y && fCurrentBottom >= p.y) {
                        f.y = p.y - f.r;
                        f.vy = 0;
                        onPlatform = true;
                    }
                }
            });

            // Fireballs can climb ladders
            this.ladders.forEach(l => {
                if (f.x > l.x && f.x < l.x + l.w && Math.random() < f.climbChance) {
                    f.vy = -2;
                }
            });
        });
    }

    checkCollisions() {
        // Hammer collection
        this.hammers.forEach(h => {
            if (h.active && 
                this.player.x < h.x + h.w &&
                this.player.x + this.player.width > h.x &&
                this.player.y < h.y + h.h &&
                this.player.y + this.player.height > h.y) {
                h.active = false;
                this.player.hasHammer = true;
                this.player.hammerTime = 600; // 10 seconds
            }
        });

        // Barrel collision
        this.barrels.forEach((b, index) => {
            let dx = this.player.x + this.player.width / 2 - b.x;
            let dy = this.player.y + this.player.height / 2 - b.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < (this.player.width / 2 + b.r)) {
                if (this.player.hasHammer) {
                    this.barrels.splice(index, 1);
                    this.score += 500;
                } else {
                    this.die();
                }
            }

            // Jump over barrel score
            if (!this.player.onGround && !this.player.climbing && 
                Math.abs(this.player.x - b.x) < 10 && 
                this.player.y + this.player.height < b.y) {
                if (!b.scored) {
                    this.score += 100;
                    b.scored = true;
                }
            }
        });

        // Fireball collision
        this.fireballs.forEach((f, index) => {
            let dx = this.player.x + this.player.width / 2 - f.x;
            let dy = this.player.y + this.player.height / 2 - f.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < (this.player.width / 2 + f.r)) {
                if (this.player.hasHammer) {
                    this.fireballs.splice(index, 1);
                    this.score += 800;
                } else {
                    this.die();
                }
            }
        });

        // Pauline collision (Win)
        if (this.player.x < this.pauline.x + this.pauline.width &&
            this.player.x + this.player.width > this.pauline.x &&
            this.player.y < this.pauline.y + this.pauline.height &&
            this.player.y + this.player.height > this.pauline.y) {
            this.score += this.bonus;
            this.gameState = 'won';
        }
    }

    die() {
        this.lives--;
        if (this.lives <= 0) {
            this.gameState = 'gameover';
        } else {
            this.player.x = 50;
            this.player.y = this.height - 60;
            this.player.vx = 0;
            this.player.vy = 0;
            this.player.hasHammer = false;
            this.player.hammerTime = 0;
        }
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

        // Draw Oil Drum
        this.ctx.fillStyle = '#3b82f6';
        this.ctx.fillRect(this.oilDrum.x, this.oilDrum.y, this.oilDrum.width, this.oilDrum.height);
        this.ctx.fillStyle = '#1d4ed8';
        this.ctx.fillRect(this.oilDrum.x + 5, this.oilDrum.y + 5, 30, 10);
        this.ctx.fillStyle = '#ef4444'; // Fire in drum
        if (Math.random() > 0.5) {
            this.ctx.fillRect(this.oilDrum.x + 10, this.oilDrum.y - 10, 20, 10);
        }

        // Draw Hammers
        this.ctx.fillStyle = '#9ca3af';
        this.hammers.forEach(h => {
            if (h.active) {
                this.ctx.fillRect(h.x, h.y, h.w, h.h);
                this.ctx.fillStyle = '#4b5563';
                this.ctx.fillRect(h.x - 5, h.y, 25, 10);
            }
        });

        // Draw Kong
        this.ctx.fillStyle = '#4b2c20';
        this.ctx.fillRect(this.kong.x, this.kong.y, this.kong.width, this.kong.height);
        this.ctx.fillStyle = '#d2b48c';
        this.ctx.fillRect(this.kong.x + 5, this.kong.y + 10, 30, 20);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(this.kong.x + 10, this.kong.y + 15, 5, 5);
        this.ctx.fillRect(this.kong.x + 25, this.kong.y + 15, 5, 5);

        // Draw Pauline
        this.ctx.fillStyle = '#f472b6';
        this.ctx.fillRect(this.pauline.x, this.pauline.y, this.pauline.width, this.pauline.height);
        this.ctx.fillStyle = '#fdf2f8';
        this.ctx.fillRect(this.pauline.x + 4, this.pauline.y + 5, 12, 10);

        // Draw Player
        this.ctx.fillStyle = this.player.hasHammer ? '#fbbf24' : '#ef4444';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        if (this.player.hasHammer) {
            this.ctx.fillStyle = '#9ca3af';
            this.ctx.fillRect(this.player.x + (this.player.vx >= 0 ? 20 : -10), this.player.y + 5, 10, 20);
        }
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

        // Draw Fireballs
        this.ctx.fillStyle = '#f97316';
        this.fireballs.forEach(f => {
            this.ctx.beginPath();
            this.ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.beginPath();
            this.ctx.arc(f.x, f.y, f.r / 2, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // UI
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.font = '16px "Press Start 2P", cursive';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 40);
        this.ctx.fillText(`LIVES: ${this.lives}`, 20, 70);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`BONUS: ${this.bonus}`, this.width - 20, 40);
        if (this.player.hasHammer) {
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.fillText(`HAMMER: ${Math.ceil(this.player.hammerTime / 60)}s`, this.width - 20, 70);
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
