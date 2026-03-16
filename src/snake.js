export class Snake {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = 500;
        this.height = 350;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.gridSize = 20;
        this.cols = this.width / this.gridSize;
        this.rows = this.height / this.gridSize;

        this.snake = [];
        this.food = null;
        this.direction = 'RIGHT';
        this.nextDirection = 'RIGHT';
        this.score = 0;
        this.gameOver = false;
        this.gameSpeed = 150;
        this.lastTime = 0;
        this.requestId = null;

        this.boundKeyDown = this.handleKeyDown.bind(this);
    }

    start() {
        this.snake = [
            { x: 5, y: 10 },
            { x: 4, y: 10 },
            { x: 3, y: 10 }
        ];
        this.direction = 'RIGHT';
        this.nextDirection = 'RIGHT';
        this.score = 0;
        this.gameOver = false;
        this.gameSpeed = 150;
        this.spawnFood();
        
        window.addEventListener('keydown', this.boundKeyDown);
        this.lastTime = performance.now();
        this.update(performance.now());
    }

    spawnFood() {
        let newFood;
        while (true) {
            newFood = {
                x: Math.floor(Math.random() * this.cols),
                y: Math.floor(Math.random() * this.rows)
            };
            // Ensure food doesn't spawn on snake
            const onSnake = this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
            if (!onSnake) break;
        }
        this.food = newFood;
    }

    handleKeyDown(e) {
        if (this.gameOver) {
            if (e.code === 'Space' || e.code === 'Enter') {
                this.start();
            }
            return;
        }

        const key = e.code;
        if (key === 'ArrowUp' && this.direction !== 'DOWN') this.nextDirection = 'UP';
        if (key === 'ArrowDown' && this.direction !== 'UP') this.nextDirection = 'DOWN';
        if (key === 'ArrowLeft' && this.direction !== 'RIGHT') this.nextDirection = 'LEFT';
        if (key === 'ArrowRight' && this.direction !== 'LEFT') this.nextDirection = 'RIGHT';
    }

    update(time) {
        if (this.gameOver) return;

        const dt = time - this.lastTime;
        if (dt > this.gameSpeed) {
            this.lastTime = time;
            this.move();
        }

        this.draw();
        this.requestId = requestAnimationFrame((t) => this.update(t));
    }

    move() {
        this.direction = this.nextDirection;
        const head = { ...this.snake[0] };

        if (this.direction === 'UP') head.y--;
        if (this.direction === 'DOWN') head.y++;
        if (this.direction === 'LEFT') head.x--;
        if (this.direction === 'RIGHT') head.x++;

        // Wall collision
        if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) {
            this.gameOver = true;
            return;
        }

        // Self collision
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.gameOver = true;
            return;
        }

        this.snake.unshift(head);

        // Food collision
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.gameSpeed = Math.max(50, 150 - Math.floor(this.score / 50) * 5);
            this.spawnFood();
        } else {
            this.snake.pop();
        }
    }

    draw() {
        // Background
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Grid (subtle)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= this.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        // Food
        this.ctx.fillStyle = '#ef4444';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#ef4444';
        this.ctx.beginPath();
        this.ctx.arc(
            this.food.x * this.gridSize + this.gridSize / 2,
            this.food.y * this.gridSize + this.gridSize / 2,
            this.gridSize / 2 - 2,
            0, Math.PI * 2
        );
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // Snake
        this.snake.forEach((segment, i) => {
            const isHead = i === 0;
            this.ctx.fillStyle = isHead ? '#10b981' : '#059669';
            
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            const size = this.gridSize - 2;
            
            this.ctx.beginPath();
            if (this.ctx.roundRect) {
                this.ctx.roundRect(x + 1, y + 1, size, size, isHead ? 6 : 4);
            } else {
                this.ctx.rect(x + 1, y + 1, size, size);
            }
            this.ctx.fill();

            // Eyes for head
            if (isHead) {
                this.ctx.fillStyle = '#fff';
                let eyeX1, eyeY1, eyeX2, eyeY2;
                if (this.direction === 'RIGHT') {
                    eyeX1 = x + 14; eyeY1 = y + 5; eyeX2 = x + 14; eyeY2 = y + 13;
                } else if (this.direction === 'LEFT') {
                    eyeX1 = x + 4; eyeY1 = y + 5; eyeX2 = x + 4; eyeY2 = y + 13;
                } else if (this.direction === 'UP') {
                    eyeX1 = x + 5; eyeY1 = y + 4; eyeX2 = x + 13; eyeY2 = y + 4;
                } else {
                    eyeX1 = x + 5; eyeY1 = y + 14; eyeX2 = x + 13; eyeY2 = y + 14;
                }
                this.ctx.fillRect(eyeX1, eyeY1, 2, 2);
                this.ctx.fillRect(eyeX2, eyeY2, 2, 2);
            }
        });

        // UI
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px "JetBrains Mono", monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 15, 30);

        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            this.ctx.fillStyle = '#ef4444';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 20);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px Arial';
            this.ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2 + 20);
            
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('Press SPACE or ENTER to Restart', this.width / 2, this.height / 2 + 60);
        }
    }

    stop() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        window.removeEventListener('keydown', this.boundKeyDown);
        this.container.innerHTML = '';
    }
}
