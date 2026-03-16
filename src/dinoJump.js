export class DinoJump {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        // Expanded dimensions
        this.width = Math.min(window.innerWidth * 0.8, 800);
        this.height = 400;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.groundY = this.height - 60;
        this.dino = {
            x: 80,
            y: this.groundY - 50,
            width: 50,
            height: 50,
            dy: 0,
            jumpForce: -14,
            gravity: 0.7,
            isJumping: false,
            frame: 0
        };

        this.clouds = [];
        this.mountains = [];
        this.obstacles = [];
        this.score = 0;
        this.gameSpeed = 5;
        this.gameOver = false;
        this.requestId = null;
        this.lastTime = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 1200;

        // Initialize background elements
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
        this.start();
    }

    start() {
        this.gameOver = false;
        this.score = 0;
        this.gameSpeed = 4;
        this.obstacles = [];
        this.dino.y = this.groundY - this.dino.height;
        this.dino.dy = 0;
        this.dino.isJumping = false;
        this.spawnTimer = 0;
        this.updateUI();
        
        const inst = document.getElementById('game-instructions');
        if (inst) inst.innerText = 'Press SPACE or CLICK to Jump • Avoid the Cacti';
        
        this.update();
    }

    updateUI() {
        const el = document.getElementById('game-score');
        if (el) el.innerText = `Score: ${Math.floor(this.score)}`;
    }

    handleKeyDown(e) {
        if (e.code === 'Space') {
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
        if (!this.dino.isJumping && !this.gameOver) {
            this.dino.dy = this.dino.jumpForce;
            this.dino.isJumping = true;
        }
    }

    spawnObstacle() {
        const height = 30 + Math.random() * 40;
        const width = 20 + Math.random() * 30;
        this.obstacles.push({
            x: this.width,
            y: this.groundY - height,
            width: width,
            height: height,
            color: '#16a34a'
        });
    }

    update(time = 0) {
        if (this.gameOver) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        // Dino Physics
        this.dino.dy += this.dino.gravity;
        this.dino.y += this.dino.dy;

        if (this.dino.y > this.groundY - this.dino.height) {
            this.dino.y = this.groundY - this.dino.height;
            this.dino.dy = 0;
            this.dino.isJumping = false;
        }

        // Background Animation
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed;
            if (cloud.x + cloud.size < 0) cloud.x = this.width + cloud.size;
        });

        this.mountains.forEach(m => {
            m.x -= m.speed;
            if (m.x + m.width < 0) m.x = this.width;
        });

        // Obstacles
        this.spawnTimer += deltaTime;
        if (this.spawnTimer > this.spawnInterval) {
            this.spawnObstacle();
            this.spawnTimer = 0;
            this.spawnInterval = Math.max(600, 1200 - (this.score / 5));
        }

        this.obstacles.forEach((obs, i) => {
            obs.x -= this.gameSpeed;

            // Collision Detection
            if (
                this.dino.x + 5 < obs.x + obs.width - 5 &&
                this.dino.x + this.dino.width - 5 > obs.x + 5 &&
                this.dino.y + 5 < obs.y + obs.height - 5 &&
                this.dino.y + this.dino.height - 5 > obs.y + 5
            ) {
                this.endGame();
            }

            if (obs.x + obs.width < 0) {
                this.obstacles.splice(i, 1);
            }
        });

        this.score += 0.15;
        this.gameSpeed += 0.0015;
        this.updateUI();

        this.draw();
        this.requestId = requestAnimationFrame(this.update.bind(this));
    }

    draw() {
        // Sky Gradient
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        skyGradient.addColorStop(0, '#87ceeb');
        skyGradient.addColorStop(1, '#e0f2fe');
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
            // Snow cap
            this.ctx.fillStyle = '#f8fafc';
            this.ctx.beginPath();
            this.ctx.moveTo(m.x + m.width / 2 - 20, this.groundY - m.height + 40);
            this.ctx.lineTo(m.x + m.width / 2, this.groundY - m.height);
            this.ctx.lineTo(m.x + m.width / 2 + 20, this.groundY - m.height + 40);
            this.ctx.fill();
        });

        // Ground
        this.ctx.fillStyle = '#78350f';
        this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
        this.ctx.fillStyle = '#16a34a';
        this.ctx.fillRect(0, this.groundY, this.width, 10);

        // Dino (Dragon Style)
        this.ctx.save();
        this.ctx.translate(this.dino.x, this.dino.y);
        
        // Body
        this.ctx.fillStyle = '#dc2626';
        this.ctx.fillRect(0, 0, this.dino.width, this.dino.height);
        
        // Wings (simple animation)
        const wingOffset = Math.sin(Date.now() / 100) * 10;
        this.ctx.fillStyle = '#991b1b';
        this.ctx.beginPath();
        this.ctx.moveTo(10, 10);
        this.ctx.lineTo(-10, 10 + wingOffset);
        this.ctx.lineTo(10, 30);
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

        // Obstacles (Spikes/Cacti)
        this.obstacles.forEach(obs => {
            this.ctx.fillStyle = obs.color;
            // Draw as a cluster of spikes
            const spikeWidth = obs.width / 3;
            for(let j=0; j<3; j++) {
                this.ctx.beginPath();
                this.ctx.moveTo(obs.x + j * spikeWidth, obs.y + obs.height);
                this.ctx.lineTo(obs.x + j * spikeWidth + spikeWidth/2, obs.y);
                this.ctx.lineTo(obs.x + (j+1) * spikeWidth, obs.y + obs.height);
                this.ctx.fill();
            }
        });

        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.font = 'bold 40px MedievalSharp';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('THE DRAGON FELL!', this.width / 2, this.height / 2);
            this.ctx.font = '20px MedievalSharp';
            this.ctx.fillText(`Final Score: ${Math.floor(this.score)}`, this.width / 2, this.height / 2 + 50);
            this.ctx.font = '16px MedievalSharp';
            this.ctx.fillText('Click to Try Again', this.width / 2, this.height / 2 + 90);
        }
    }

    endGame() {
        this.gameOver = true;
        cancelAnimationFrame(this.requestId);
    }

    stop() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        window.removeEventListener('keydown', this.boundKeyDown);
        this.canvas.removeEventListener('click', this.boundClick);
        this.container.innerHTML = '';
    }
}
