export class Pong {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = 600;
        this.height = 400;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.paddleWidth = 10;
        this.paddleHeight = 80;
        this.ballSize = 8;

        this.p1 = { y: this.height / 2 - this.paddleHeight / 2, score: 0 };
        this.p2 = { y: this.height / 2 - this.paddleHeight / 2, score: 0 };
        this.ball = { x: this.width / 2, y: this.height / 2, dx: 4, dy: 4, speed: 4 };

        this.mode = null; // 'SINGLE' or 'MULTI'
        this.keys = {};
        this.gameOver = false;
        this.requestId = null;

        this.boundKeyDown = (e) => this.keys[e.code] = true;
        this.boundKeyUp = (e) => this.keys[e.code] = false;
        this.boundClick = this.handleClick.bind(this);
    }

    start() {
        this.p1.score = 0;
        this.p2.score = 0;
        this.resetBall();
        this.mode = null;
        this.gameOver = false;

        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);
        this.canvas.addEventListener('click', this.boundClick);
        
        this.update();
    }

    resetBall() {
        this.ball.x = this.width / 2;
        this.ball.y = this.height / 2;
        this.ball.speed = 4;
        this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * this.ball.speed;
        this.ball.dy = (Math.random() * 2 - 1) * this.ball.speed;
    }

    handleClick(e) {
        if (this.mode === null) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Simple button detection
            if (y > 150 && y < 200) {
                if (x > 150 && x < 450) this.mode = 'SINGLE';
            } else if (y > 220 && y < 270) {
                if (x > 150 && x < 450) this.mode = 'MULTI';
            }
        } else if (this.gameOver) {
            this.start();
        }
    }

    update() {
        if (this.mode === null) {
            this.drawMenu();
            this.requestId = requestAnimationFrame(() => this.update());
            return;
        }

        if (this.gameOver) {
            this.drawGameOver();
            return;
        }

        // P1 Movement (W/S)
        if (this.keys['KeyW'] && this.p1.y > 0) this.p1.y -= 6;
        if (this.keys['KeyS'] && this.p1.y < this.height - this.paddleHeight) this.p1.y += 6;

        // P2 Movement
        if (this.mode === 'MULTI') {
            if (this.keys['ArrowUp'] && this.p2.y > 0) this.p2.y -= 6;
            if (this.keys['ArrowDown'] && this.p2.y < this.height - this.paddleHeight) this.p2.y += 6;
        } else {
            // AI
            const aiSpeed = 4.5;
            const targetY = this.ball.y - this.paddleHeight / 2;
            if (this.p2.y < targetY && this.p2.y < this.height - this.paddleHeight) this.p2.y += aiSpeed;
            if (this.p2.y > targetY && this.p2.y > 0) this.p2.y -= aiSpeed;
        }

        // Ball Movement
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        // Wall Bounce
        if (this.ball.y <= 0 || this.ball.y >= this.height - this.ballSize) {
            this.ball.dy *= -1;
        }

        // Paddle Collision
        if (this.ball.x <= this.paddleWidth) {
            if (this.ball.y + this.ballSize > this.p1.y && this.ball.y < this.p1.y + this.paddleHeight) {
                this.ball.dx *= -1.1; // Speed up
                this.ball.x = this.paddleWidth;
                // Add some vertical variance based on where it hit the paddle
                let deltaY = this.ball.y - (this.p1.y + this.paddleHeight / 2);
                this.ball.dy = deltaY * 0.2;
            } else if (this.ball.x < 0) {
                this.p2.score++;
                this.checkWin();
                this.resetBall();
            }
        }

        if (this.ball.x >= this.width - this.paddleWidth - this.ballSize) {
            if (this.ball.y + this.ballSize > this.p2.y && this.ball.y < this.p2.y + this.paddleHeight) {
                this.ball.dx *= -1.1; // Speed up
                this.ball.x = this.width - this.paddleWidth - this.ballSize;
                let deltaY = this.ball.y - (this.p2.y + this.paddleHeight / 2);
                this.ball.dy = deltaY * 0.2;
            } else if (this.ball.x > this.width) {
                this.p1.score++;
                this.checkWin();
                this.resetBall();
            }
        }

        this.draw();
        this.requestId = requestAnimationFrame(() => this.update());
    }

    checkWin() {
        if (this.p1.score >= 10 || this.p2.score >= 10) {
            this.gameOver = true;
        }
    }

    drawMenu() {
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = '#fbbf24';
        this.ctx.font = 'bold 40px "Press Start 2P", cursive';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PONG', this.width / 2, 100);

        // Buttons
        this.drawButton(150, 150, 300, 50, '1 PLAYER (VS AI)');
        this.drawButton(150, 220, 300, 50, '2 PLAYERS (LOCAL)');

        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('P1: W/S | P2: ARROWS', this.width / 2, 320);
    }

    drawButton(x, y, w, h, text) {
        this.ctx.strokeStyle = '#fbbf24';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, w, h);
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText(text, x + w / 2, y + h / 2 + 5);
    }

    draw() {
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Center Line
        this.ctx.setLineDash([5, 15]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.width / 2, 0);
        this.ctx.lineTo(this.width / 2, this.height);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Paddles
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, this.p1.y, this.paddleWidth, this.paddleHeight);
        this.ctx.fillRect(this.width - this.paddleWidth, this.p2.y, this.paddleWidth, this.paddleHeight);

        // Ball
        this.ctx.fillRect(this.ball.x, this.ball.y, this.ballSize, this.ballSize);

        // Score
        this.ctx.font = 'bold 30px "Press Start 2P", cursive';
        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
        this.ctx.fillText(this.p1.score, this.width / 4, 60);
        this.ctx.fillText(this.p2.score, (this.width / 4) * 3, 60);
    }

    drawGameOver() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.font = 'bold 30px Arial';
        this.ctx.textAlign = 'center';
        const winner = this.p1.score >= 10 ? 'PLAYER 1' : 'PLAYER 2';
        this.ctx.fillText(`${winner} WINS!`, this.width / 2, this.height / 2);
        this.ctx.font = '16px Arial';
        this.ctx.fillText('CLICK TO RESTART', this.width / 2, this.height / 2 + 40);
    }

    stop() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);
        this.canvas.removeEventListener('click', this.boundClick);
        this.container.innerHTML = '';
    }
}
