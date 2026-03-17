export class CorrnaGame {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = 800;
        this.height = 600;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.score = 0;
        this.timeLeft = 20;
        this.gameState = 'START'; // START, PLAYING, GAMEOVER
        
        this.corvinas = [];
        this.corvinaImg = new Image();
        this.corvinaImg.src = 'https://www.pescadoscastellon.es/wp-content/uploads/19443-2.jpg';
        
        this.init();
    }

    init() {
        this.boundClick = (e) => this.handleClick(e);
        this.canvas.addEventListener('mousedown', this.boundClick);
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.width / rect.width);
        const y = (e.clientY - rect.top) * (this.height / rect.height);

        if (this.gameState === 'START') {
            this.startGame();
            return;
        }

        if (this.gameState === 'GAMEOVER') {
            this.startGame();
            return;
        }

        if (this.gameState === 'PLAYING') {
            for (let i = this.corvinas.length - 1; i >= 0; i--) {
                const c = this.corvinas[i];
                const dx = x - c.x;
                const dy = y - c.y;
                const dist = Math.hypot(dx, dy);
                
                if (dist < c.radius) {
                    this.corvinas.splice(i, 1);
                    this.score++;
                    this.spawnCorvina(); // Spawn the next one immediately
                    break;
                }
            }
        }
    }

    startGame() {
        this.score = 0;
        this.timeLeft = 20;
        this.corvinas = [];
        this.gameState = 'PLAYING';
        this.lastTime = performance.now();
        this.spawnCorvina(); // Spawn the first one
    }

    spawnCorvina() {
        const radius = 40 + Math.random() * 30;
        this.corvinas.push({
            x: radius + Math.random() * (this.width - radius * 2),
            y: radius + Math.random() * (this.height - radius * 2),
            radius: radius,
            rotation: Math.random() * Math.PI * 2,
            scale: 0,
            targetScale: 1
        });
    }

    update(currentTime) {
        if (this.gameState === 'PLAYING') {
            const dt = currentTime - this.lastTime;
            this.lastTime = currentTime;
            
            this.timeLeft -= dt / 1000;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.gameState = 'GAMEOVER';
            }

            for (let i = this.corvinas.length - 1; i >= 0; i--) {
                const c = this.corvinas[i];
                if (c.scale < c.targetScale) {
                    c.scale += 0.1;
                    if (c.scale > c.targetScale) c.scale = c.targetScale;
                }
            }
        }
    }

    draw() {
        // Background
        const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#0ea5e9');
        grad.addColorStop(1, '#0369a1');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Corvinas
        for (const c of this.corvinas) {
            this.ctx.save();
            this.ctx.translate(c.x, c.y);
            this.ctx.rotate(c.rotation);
            this.ctx.scale(c.scale, c.scale);
            
            // Draw image
            const size = c.radius * 2.5;
            this.ctx.drawImage(this.corvinaImg, -size/2, -size/2, size, size);
            
            this.ctx.restore();
        }

        // UI
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 40);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`TIME: ${Math.ceil(this.timeLeft)}s`, this.width - 20, 40);

        if (this.gameState === 'START') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.fillText('CORRNA CLICKER', this.width / 2, this.height / 2 - 20);
            this.ctx.font = '20px Arial';
            this.ctx.fillText('CLICK THE CORRNA TO SPAWN THE NEXT ONE', this.width / 2, this.height / 2 + 20);
            this.ctx.fillText('CLICK TO START', this.width / 2, this.height / 2 + 60);
        }

        if (this.gameState === 'GAMEOVER') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.textAlign = 'center';
            this.ctx.font = 'bold 50px Arial';
            this.ctx.fillText('TIME\'S UP!', this.width / 2, this.height / 2 - 40);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '30px Arial';
            this.ctx.fillText(`FINAL SCORE: ${this.score}`, this.width / 2, this.height / 2 + 20);
            this.ctx.font = '20px Arial';
            this.ctx.fillText('CLICK TO RESTART', this.width / 2, this.height / 2 + 80);
        }
    }

    start() {
        this.loop();
    }

    loop(time = 0) {
        this.update(time);
        this.draw();
        this.requestId = requestAnimationFrame((t) => this.loop(t));
    }

    stop() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        this.canvas.removeEventListener('mousedown', this.boundClick);
    }
}
