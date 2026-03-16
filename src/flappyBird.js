export class FlappyBird {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = 320;
        this.height = 480;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.bird = {
            x: 50,
            y: 300,
            width: 34,
            height: 24,
            gravity: 0.25,
            lift: -7,
            velocity: 0
        };

        this.pipes = [];
        this.pipeWidth = 52;
        this.pipeGap = 150;
        this.pipeSpeed = 2;
        this.frame = 0;
        this.score = 0;
        this.gameOver = false;
        this.requestId = null;

        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundClick = this.handleClick.bind(this);
    }

    start() {
        this.bird.y = 300;
        this.bird.velocity = 0;
        this.pipes = [];
        this.frame = 0;
        this.score = 0;
        this.gameOver = false;

        window.addEventListener('keydown', this.boundKeyDown);
        this.canvas.addEventListener('click', this.boundClick);
        
        this.update();
    }

    handleKeyDown(e) {
        if (e.code === 'Space') {
            if (this.gameOver) {
                this.start();
            } else {
                this.flap();
            }
        }
    }

    handleClick() {
        if (this.gameOver) {
            this.start();
        } else {
            this.flap();
        }
    }

    flap() {
        this.bird.velocity = this.bird.lift;
    }

    update() {
        if (this.gameOver) return;

        this.bird.velocity += this.bird.gravity;
        this.bird.y += this.bird.velocity;

        if (this.bird.y + this.bird.height > this.height || this.bird.y < 0) {
            this.gameOver = true;
        }

        if (this.frame % 100 === 0) {
            const minPipeHeight = 50;
            const maxPipeHeight = this.height - this.pipeGap - minPipeHeight;
            const pipeHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
            
            this.pipes.push({
                x: this.width,
                top: pipeHeight,
                bottom: this.height - pipeHeight - this.pipeGap,
                passed: false
            });
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= this.pipeSpeed;

            // Collision detection
            if (
                this.bird.x + this.bird.width > p.x &&
                this.bird.x < p.x + this.pipeWidth &&
                (this.bird.y < p.top || this.bird.y + this.bird.height > this.height - p.bottom)
            ) {
                this.gameOver = true;
            }

            if (!p.passed && p.x + this.pipeWidth < this.bird.x) {
                this.score++;
                p.passed = true;
            }

            if (p.x + this.pipeWidth < 0) {
                this.pipes.splice(i, 1);
            }
        }

        this.frame++;
        this.draw();
        this.requestId = requestAnimationFrame(() => this.update());
    }

    draw() {
        // Sky
        this.ctx.fillStyle = '#70c5ce';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Pipes
        this.ctx.fillStyle = '#75c927';
        this.pipes.forEach(p => {
            // Top pipe
            this.ctx.fillRect(p.x, 0, this.pipeWidth, p.top);
            this.ctx.strokeStyle = '#538123';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(p.x, 0, this.pipeWidth, p.top);

            // Bottom pipe
            this.ctx.fillRect(p.x, this.height - p.bottom, this.pipeWidth, p.bottom);
            this.ctx.strokeRect(p.x, this.height - p.bottom, this.pipeWidth, p.bottom);
        });

        // Bird
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.width / 2, this.bird.y + this.bird.height / 2);
        let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.bird.velocity * 0.1)));
        this.ctx.rotate(rotation);
        
        this.ctx.fillStyle = '#f7d308';
        this.ctx.fillRect(-this.bird.width / 2, -this.bird.height / 2, this.bird.width, this.bird.height);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-this.bird.width / 2, -this.bird.height / 2, this.bird.width, this.bird.height);
        
        // Eye
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(5, -8, 8, 8);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(10, -5, 3, 3);
        
        // Beak
        this.ctx.fillStyle = '#f7931e';
        this.ctx.fillRect(12, 0, 10, 8);
        
        this.ctx.restore();

        // Score
        this.ctx.fillStyle = '#fff';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.font = 'bold 40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.score, this.width / 2, 80);
        this.ctx.strokeText(this.score, this.width / 2, 80);

        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 30px Arial';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 20);
            
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Click or Space to Restart', this.width / 2, this.height / 2 + 30);
        }
    }

    stop() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        window.removeEventListener('keydown', this.boundKeyDown);
        this.canvas.removeEventListener('click', this.boundClick);
        this.container.innerHTML = '';
    }
}
