export class DinoJump {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = Math.min(window.innerWidth * 0.8, 700);
        this.height = 400;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.groundY = this.height - 60;
        
        // Upgraded Physics and Double Jump capabilities
        this.dino = {
            x: 80,
            y: this.groundY - 50,
            width: 50,
            height: 50,
            dy: 0,
            jumpForce: -12,
            gravity: 0.8,
            jumpsUsed: 0,
            maxJumps: 2 // DOUBLE JUMP!
        };

        this.clouds = [];
        this.mountains = [];
        this.obstacles = [];
        this.coins = [];
        this.particles = []; // For dust effects
        
        this.score = 0;
        this.gameSpeed = 5;
        this.gameOver = false;
        this.requestId = null;
        this.lastTime = 0;
        this.spawnTimer = 0;
        this.coinTimer = 0;

        // Initialize background
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * this.width,
                y: 50 + Math.random() * 100,
                speed: 0.5 + Math.random() * 0.5,
                size: 30 + Math.random() * 40
            });
        }

        for (let i = 0; i < 3; i++) {
            this.mountains.push({
                x: i * (this.width / 2),
                width: this.width * 0.8,
                height: 150 + Math.random() * 100,
                speed: 1
            });
        }

        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundClick = this.handleClick.bind(this);
        this.init();
    }

    init() {
        window.addEventListener('keydown', this.boundKeyDown);
        this.canvas.addEventListener('click', this.boundClick);
        this.updateUI();
    }

    start() {
        this.gameOver = false;
        this.score = 0;
        this.gameSpeed = 5.5;
        this.obstacles = [];
        this.coins = [];
        this.particles = [];
        this.dino.y = this.groundY - this.dino.height;
        this.dino.dy = 0;
        this.dino.jumpsUsed = 0;
        this.spawnTimer = 0;
        this.coinTimer = 0;
        this.lastTime = performance.now(); // Fix initial delta time spike
        
        this.updateUI();
        
        const inst = document.getElementById('game-instructions');
        if (inst) inst.innerText = 'SPACE/CLICK to Jump • Double Jump in Mid-Air • Collect Coins!';
        
        if (this.requestId) cancelAnimationFrame(this.requestId);
        this.requestId = requestAnimationFrame(this.update.bind(this));
    }

    updateUI() {
        const el = document.getElementById('game-score');
        if (el) el.innerText = `Score: ${Math.floor(this.score)}`;
    }

    handleKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault(); // Stop scrolling
            this.jump();
        }
    }

    handleClick() {
        if (this.gameOver) {
            this.start();
        } else {
            this.jump();
        }
    }

    jump() {
        if (this.gameOver) return;
        
        if (this.dino.jumpsUsed < this.dino.maxJumps) {
            this.dino.dy = this.dino.jumpForce;
            this.dino.jumpsUsed++;
            this.spawnParticles(this.dino.x + 25, this.dino.y + 50, '#e2e8f0', 5); // Jump dust
        }
    }

    spawnObstacle() {
        // 30% chance to spawn a flying obstacle instead of ground
        const isFlying = Math.random() > 0.7; 

        if (isFlying) {
            this.obstacles.push({
                type: 'flying',
                x: this.width,
                y: this.groundY - 80 - Math.random() * 50, // Hovering in the air
                width: 40,
                height: 15,
                color: '#475569'
            });
        } else {
            const height = 30 + Math.random() * 40;
            const width = 20 + Math.random() * 30;
            this.obstacles.push({
                type: 'ground',
                x: this.width,
                y: this.groundY - height,
                width: width,
                height: height,
                color: '#16a34a'
            });
        }
    }

    spawnCoin() {
        this.coins.push({
            x: this.width,
            y: this.groundY - 50 - Math.random() * 100, // Varied heights to encourage double jumping
            radius: 12,
            collected: false
        });
    }

    spawnParticles(x, y, color, count) {
        for(let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                color: color
            });
        }
    }

    update(time) {
        if (this.gameOver) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        // Dino Physics
        this.dino.dy += this.dino.gravity;
        this.dino.y += this.dino.dy;

        // Ground Collision
        if (this.dino.y > this.groundY - this.dino.height) {
            if (this.dino.dy > 0 && this.dino.jumpsUsed > 0) {
                this.spawnParticles(this.dino.x + 25, this.groundY, '#78350f', 8); // Landing dust
            }
            this.dino.y = this.groundY - this.dino.height;
            this.dino.dy = 0;
            this.dino.jumpsUsed = 0; // Reset jumps
        }

        // Background Animation
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed * (this.gameSpeed / 5);
            if (cloud.x + cloud.size < 0) cloud.x = this.width + cloud.size;
        });

        this.mountains.forEach(m => {
            m.x -= m.speed * (this.gameSpeed / 5);
            if (m.x + m.width < 0) m.x = this.width;
        });

        // Obstacles Logistics
        this.spawnTimer += deltaTime;
        const currentSpawnInterval = Math.max(700, 1500 - (this.score * 2)); // Gets faster

        if (this.spawnTimer > currentSpawnInterval) {
            this.spawnObstacle();
            this.spawnTimer = 0;
        }

        // Coin Logistics
        this.coinTimer += deltaTime;
        if (this.coinTimer > 2000) {
            if (Math.random() > 0.4) this.spawnCoin();
            this.coinTimer = 0;
        }

        // Move and Collide Obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            let obs = this.obstacles[i];
            obs.x -= this.gameSpeed;

            // Hitbox forgiveness (slightly smaller than visual size)
            const margin = 8; 
            if (
                this.dino.x + margin < obs.x + obs.width &&
                this.dino.x + this.dino.width - margin > obs.x &&
                this.dino.y + margin < obs.y + obs.height &&
                this.dino.y + this.dino.height - margin > obs.y
            ) {
                this.endGame();
            }

            if (obs.x + obs.width < 0) this.obstacles.splice(i, 1);
        }

        // Move and Collect Coins
        for (let i = this.coins.length - 1; i >= 0; i--) {
            let coin = this.coins[i];
            coin.x -= this.gameSpeed;

            // Circle collision approximation
            const distX = Math.abs((coin.x) - (this.dino.x + this.dino.width/2));
            const distY = Math.abs((coin.y) - (this.dino.y + this.dino.height/2));

            if (!coin.collected && distX < (this.dino.width/2 + coin.radius) && distY < (this.dino.height/2 + coin.radius)) {
                coin.collected = true;
                this.score += 50; // Big score boost!
                this.spawnParticles(coin.x, coin.y, '#fbbf24', 10); // Sparkles
                this.coins.splice(i, 1);
                continue;
            }

            if (coin.x + coin.radius < 0) this.coins.splice(i, 1);
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx - (this.gameSpeed * 0.5); // Move with world
            p.y += p.vy;
            p.life -= 0.05;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        this.score += 0.1;
        this.gameSpeed += 0.001; // Gradual speed increase
        
        // Update UI every few frames to save performance
        if (Math.floor(this.score) % 5 === 0) this.updateUI();

        this.draw();
        this.requestId = requestAnimationFrame(this.update.bind(this));
    }

    draw() {
        // Sky Gradient (Gets darker as you progress)
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        const cycle = Math.min(1, this.score / 2000); 
        
        // Blend from day to dusk based on score
        const rTop = Math.floor(135 - (cycle * 100));
        const gTop = Math.floor(206 - (cycle * 150));
        const bTop = Math.floor(235 - (cycle * 100));
        
        skyGradient.addColorStop(0, `rgb(${rTop}, ${gTop}, ${bTop})`);
        skyGradient.addColorStop(1, cycle < 0.5 ? '#e0f2fe' : '#fca5a5');
        
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Clouds
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.clouds.forEach(c => {
            this.ctx.beginPath();
            this.ctx.arc(c.x, c.y, c.size / 2, 0, Math.PI * 2);
            this.ctx.arc(c.x + c.size / 3, c.y - c.size / 4, c.size / 3, 0, Math.PI * 2);
            this.ctx.arc(c.x - c.size / 3, c.y - c.size / 4, c.size / 3, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Mountains
        this.mountains.forEach(m => {
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.beginPath();
            this.ctx.moveTo(m.x, this.groundY);
            this.ctx.lineTo(m.x + m.width / 2, this.groundY - m.height);
            this.ctx.lineTo(m.x + m.width, this.groundY);
            this.ctx.fill();
        });

        // Ground
        this.ctx.fillStyle = '#78350f';
        this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
        this.ctx.fillStyle = '#16a34a'; // Grass
        this.ctx.fillRect(0, this.groundY, this.width, 10);

        // Particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;

        // Coins
        this.coins.forEach(coin => {
            this.ctx.fillStyle = '#fbbf24'; // Gold
            this.ctx.beginPath();
            this.ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#f59e0b'; // Inner shadow
            this.ctx.beginPath();
            this.ctx.arc(coin.x, coin.y, coin.radius * 0.6, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Obstacles
        this.obstacles.forEach(obs => {
            this.ctx.fillStyle = obs.color;
            
            if (obs.type === 'ground') {
                // Ground Spikes
                const spikeWidth = obs.width / 3;
                for(let j=0; j<3; j++) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(obs.x + j * spikeWidth, obs.y + obs.height);
                    this.ctx.lineTo(obs.x + j * spikeWidth + spikeWidth/2, obs.y);
                    this.ctx.lineTo(obs.x + (j+1) * spikeWidth, obs.y + obs.height);
                    this.ctx.fill();
                }
            } else {
                // Flying Arrow/Dart
                this.ctx.fillRect(obs.x, obs.y + 5, obs.width, 4); // Shaft
                this.ctx.beginPath(); // Tip
                this.ctx.moveTo(obs.x, obs.y - 2);
                this.ctx.lineTo(obs.x - 10, obs.y + 7);
                this.ctx.lineTo(obs.x, obs.y + 16);
                this.ctx.fill();
            }
        });

        // Dragon/Dino
        this.ctx.save();
        this.ctx.translate(this.dino.x, this.dino.y);
        
        // Body
        this.ctx.fillStyle = '#dc2626';
        this.ctx.fillRect(0, 0, this.dino.width, this.dino.height);
        
        // Wings (Flap aggressively when jumping!)
        const wingOffset = this.dino.jumpsUsed > 0 
            ? Math.sin(Date.now() / 50) * 15 // Fast flap
            : Math.sin(Date.now() / 150) * 5; // Idle flutter
            
        this.ctx.fillStyle = '#991b1b';
        this.ctx.beginPath();
        this.ctx.moveTo(10, 15);
        this.ctx.lineTo(-15, 15 + wingOffset);
        this.ctx.lineTo(10, 35);
        this.ctx.fill();

        // Eye
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(35, 10, 8, 8);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(40, 12, 3, 3);

        // Horns
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.beginPath();
        this.ctx.moveTo(5, 0);
        this.ctx.lineTo(10, -15);
        this.ctx.lineTo(15, 0);
        this.ctx.fill();

        this.ctx.restore();

        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.font = 'bold 40px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('CRASH LANDING!', this.width / 2, this.height / 2 - 20);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px sans-serif';
            this.ctx.fillText(`Final Score: ${Math.floor(this.score)}`, this.width / 2, this.height / 2 + 30);
            
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.font = '16px sans-serif';
            this.ctx.fillText('Click or Press SPACE to Try Again', this.width / 2, this.height / 2 + 70);
        }
    }

    endGame() {
        this.gameOver = true;
        this.updateUI(); // Final score update
        cancelAnimationFrame(this.requestId);
    }

    stop() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        window.removeEventListener('keydown', this.boundKeyDown);
        this.canvas.removeEventListener('click', this.boundClick);
        this.container.innerHTML = '';
    }
}