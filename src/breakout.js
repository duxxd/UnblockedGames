export class Breakout {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = 480;
        this.height = 400;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.ballRadius = 8;
        this.x = this.width / 2;
        this.y = this.height - 30;
        this.dx = 3;
        this.dy = -3;

        this.paddleHeight = 12;
        this.paddleWidth = 85;
        this.paddleX = (this.width - this.paddleWidth) / 2;
        this.paddleSpeed = 6;

        this.rightPressed = false;
        this.leftPressed = false;

        this.brickRowCount = 5;
        this.brickColumnCount = 5;
        this.brickWidth = 75;
        this.brickHeight = 20;
        this.brickPadding = 10;
        this.brickOffsetTop = 50;
        this.brickOffsetLeft = 30;

        this.bricks = [];
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.requestId = null;

        this.boundKeyDown = this.keyDownHandler.bind(this);
        this.boundKeyUp = this.keyUpHandler.bind(this);
        this.boundMouseMove = this.mouseMoveHandler.bind(this);
        this.boundTouchMove = this.touchMoveHandler.bind(this);

        this.initBricks();
    }

    initBricks() {
        this.bricks = [];
        for (let c = 0; c < this.brickColumnCount; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < this.brickRowCount; r++) {
                this.bricks[c][r] = { x: 0, y: 0, status: 1, color: this.getBrickColor(r) };
            }
        }
    }

    getBrickColor(row) {
        const colors = ['#ef4444', '#f97316', '#fbbf24', '#10b981', '#3b82f6'];
        return colors[row % colors.length];
    }

    keyDownHandler(e) {
        if (e.key === "Right" || e.key === "ArrowRight") {
            this.rightPressed = true;
        } else if (e.key === "Left" || e.key === "ArrowLeft") {
            this.leftPressed = true;
        }
    }

    keyUpHandler(e) {
        if (e.key === "Right" || e.key === "ArrowRight") {
            this.rightPressed = false;
        } else if (e.key === "Left" || e.key === "ArrowLeft") {
            this.leftPressed = false;
        }
    }

    mouseMoveHandler(e) {
        const rect = this.canvas.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        if (relativeX > 0 && relativeX < this.width) {
            this.paddleX = relativeX - this.paddleWidth / 2;
        }
    }

    touchMoveHandler(e) {
        if (e.touches.length > 0) {
            const rect = this.canvas.getBoundingClientRect();
            const relativeX = e.touches[0].clientX - rect.left;
            if (relativeX > 0 && relativeX < this.width) {
                this.paddleX = relativeX - this.paddleWidth / 2;
            }
            e.preventDefault();
        }
    }

    collisionDetection() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                const b = this.bricks[c][r];
                if (b.status === 1) {
                    if (this.x > b.x && this.x < b.x + this.brickWidth && this.y > b.y && this.y < b.y + this.brickHeight) {
                        this.dy = -this.dy;
                        b.status = 0;
                        this.score++;
                        if (this.score === this.brickRowCount * this.brickColumnCount) {
                            this.win();
                        }
                    }
                }
            }
        }
    }

    drawBall() {
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.ballRadius, 0, Math.PI * 2);
        
        // Add a glow effect
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = "#fbbf24";
        this.ctx.fillStyle = "#fbbf24";
        this.ctx.fill();
        this.ctx.shadowBlur = 0; // Reset shadow
        this.ctx.closePath();
    }

    drawPaddle() {
        this.ctx.beginPath();
        // Stone slab look
        const x = this.paddleX;
        const y = this.height - this.paddleHeight;
        const w = this.paddleWidth;
        const h = this.paddleHeight;
        const r = 4;

        if (this.ctx.roundRect) {
            this.ctx.roundRect(x, y, w, h, r);
        } else {
            this.ctx.rect(x, y, w, h);
        }
        
        this.ctx.fillStyle = "#4b5563"; // Slate gray
        this.ctx.fill();
        this.ctx.strokeStyle = "#fbbf24"; // Gold border
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.closePath();
    }

    drawBricks() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                if (this.bricks[c][r].status === 1) {
                    const brickX = (c * (this.brickWidth + this.brickPadding)) + this.brickOffsetLeft;
                    const brickY = (r * (this.brickHeight + this.brickPadding)) + this.brickOffsetTop;
                    this.bricks[c][r].x = brickX;
                    this.bricks[c][r].y = brickY;
                    
                    this.ctx.beginPath();
                    if (this.ctx.roundRect) {
                        this.ctx.roundRect(brickX, brickY, this.brickWidth, this.brickHeight, 2);
                    } else {
                        this.ctx.rect(brickX, brickY, this.brickWidth, this.brickHeight);
                    }
                    this.ctx.fillStyle = this.bricks[c][r].color;
                    this.ctx.fill();
                    
                    // Add brick detail (cracks/lines)
                    this.ctx.strokeStyle = "rgba(0,0,0,0.3)";
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(brickX, brickY, this.brickWidth, this.brickHeight);
                    
                    // Highlight top/left for 3D effect
                    this.ctx.strokeStyle = "rgba(255,255,255,0.2)";
                    this.ctx.beginPath();
                    this.ctx.moveTo(brickX, brickY + this.brickHeight);
                    this.ctx.lineTo(brickX, brickY);
                    this.ctx.lineTo(brickX + this.brickWidth, brickY);
                    this.ctx.stroke();
                    
                    this.ctx.closePath();
                }
            }
        }
    }

    drawScore() {
        this.ctx.font = "12px 'Press Start 2P', cursive";
        this.ctx.fillStyle = "#fbbf24";
        this.ctx.textAlign = "left"; // Explicitly set to fix inheritance bug
        this.ctx.fillText("SCORE: " + this.score, 15, 30);
    }

    drawLives() {
        this.ctx.font = "12px 'Press Start 2P', cursive";
        this.ctx.fillStyle = "#fbbf24";
        this.ctx.textAlign = "right"; // Explicitly set to fix inheritance bug
        this.ctx.fillText("LIVES: " + this.lives, this.width - 15, 30);
    }

    win() {
        this.gameOver = true;
        this.drawMessage("VICTORY!", "#10b981");
    }

    lose() {
        this.gameOver = true;
        this.drawMessage("GAME OVER", "#ef4444");
    }

    drawMessage(text, color) {
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.font = "32px 'Press Start 2P', cursive";
        this.ctx.fillStyle = color;
        this.ctx.textAlign = "center";
        this.ctx.fillText(text, this.width / 2, this.height / 2);
        this.ctx.font = "16px 'Press Start 2P', cursive";
        this.ctx.fillStyle = "#fff";
        this.ctx.fillText("Click to Play Again", this.width / 2, this.height / 2 + 50);
    }

    draw() {
        if (this.gameOver) return;

        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw background pattern (castle wall)
        this.ctx.fillStyle = "#1a1a1a";
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.strokeStyle = "rgba(251, 191, 36, 0.05)";
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.width; i += 40) {
            for (let j = 0; j < this.height; j += 20) {
                this.ctx.strokeRect(i + (j % 40 === 0 ? 0 : 20), j, 40, 20);
            }
        }

        this.drawBricks();
        this.drawBall();
        this.drawPaddle();
        this.drawScore();
        this.drawLives();
        this.collisionDetection();

        if (this.x + this.dx > this.width - this.ballRadius || this.x + this.dx < this.ballRadius) {
            this.dx = -this.dx;
        }
        if (this.y + this.dy < this.ballRadius) {
            this.dy = -this.dy;
        } else if (this.y + this.dy > this.height - this.ballRadius) {
            if (this.x > this.paddleX && this.x < this.paddleX + this.paddleWidth) {
                this.dy = -this.dy;
                // Add some angle variety
                this.dx = 8 * ((this.x - (this.paddleX + this.paddleWidth / 2)) / this.paddleWidth);
            } else {
                this.lives--;
                if (!this.lives) {
                    this.lose();
                } else {
                    this.x = this.width / 2;
                    this.y = this.height - 30;
                    this.dx = 3;
                    this.dy = -3;
                    this.paddleX = (this.width - this.paddleWidth) / 2;
                }
            }
        }

        if (this.rightPressed && this.paddleX < this.width - this.paddleWidth) {
            this.paddleX += this.paddleSpeed;
        } else if (this.leftPressed && this.paddleX > 0) {
            this.paddleX -= this.paddleSpeed;
        }

        this.x += this.dx;
        this.y += this.dy;

        this.requestId = requestAnimationFrame(this.draw.bind(this));
    }

    start() {
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.x = this.width / 2;
        this.y = this.height - 30;
        this.dx = 3;
        this.dy = -3;
        this.paddleX = (this.width - this.paddleWidth) / 2;
        this.initBricks();

        document.addEventListener("keydown", this.boundKeyDown, false);
        document.addEventListener("keyup", this.boundKeyUp, false);
        this.canvas.addEventListener("click", () => {
            if (this.gameOver) this.start();
        });

        const inst = document.getElementById('game-instructions');
        if (inst) inst.innerText = 'Use LEFT and RIGHT ARROW keys to move the paddle • Break all the bricks to win!';

        if (this.requestId) cancelAnimationFrame(this.requestId);
        this.draw();
    }

    stop() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        document.removeEventListener("keydown", this.boundKeyDown);
        document.removeEventListener("keyup", this.boundKeyUp);
        this.container.innerHTML = '';
    }
}
