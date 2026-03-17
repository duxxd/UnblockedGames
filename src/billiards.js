export class Billiards {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = 800;
        this.height = 400;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.ballRadius = 10;
        this.friction = 0.985;
        this.wallBounciness = 0.8;
        
        this.balls = [];
        this.cueBall = null;
        this.pockets = [];
        this.gameState = 'START'; // START, PLAYING, AIMING, MOVING, GAMEOVER
        
        this.mouse = { x: 0, y: 0, isDown: false };
        this.cuePower = 0;
        this.maxCuePower = 100;
        
        this.score = 0;
        this.shots = 0;
        
        this.init();
    }

    init() {
        this.pockets = [
            { x: 0, y: 0 }, { x: this.width / 2, y: 0 }, { x: this.width, y: 0 },
            { x: 0, y: this.height }, { x: this.width / 2, y: this.height }, { x: this.width, y: this.height }
        ];

        this.resetBalls();

        this.boundMouseDown = (e) => this.handleMouseDown(e);
        this.boundMouseMove = (e) => this.handleMouseMove(e);
        this.boundMouseUp = (e) => this.handleMouseUp(e);

        this.canvas.addEventListener('mousedown', this.boundMouseDown);
        this.canvas.addEventListener('mousemove', this.boundMouseMove);
        this.canvas.addEventListener('mouseup', this.boundMouseUp);
    }

    resetBalls() {
        this.balls = [];
        // Cue ball
        this.cueBall = { x: 200, y: this.height / 2, vx: 0, vy: 0, color: '#ffffff', isCue: true };
        this.balls.push(this.cueBall);

        // Rack of balls
        const startX = 550;
        const startY = this.height / 2;
        const rows = 5;
        let ballCount = 1;
        const colors = ['#fbbf24', '#3b82f6', '#ef4444', '#8b5cf6', '#f97316', '#10b981', '#ec4899', '#000000'];

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j <= i; j++) {
                this.balls.push({
                    x: startX + i * (this.ballRadius * 2 * 0.9),
                    y: startY - (i * this.ballRadius) + (j * this.ballRadius * 2.1),
                    vx: 0,
                    vy: 0,
                    color: colors[ballCount % colors.length],
                    isCue: false,
                    number: ballCount++
                });
            }
        }
    }

    updateMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = (e.clientX - rect.left) * (this.width / rect.width);
        this.mouse.y = (e.clientY - rect.top) * (this.height / rect.height);
    }

    handleMouseDown(e) {
        this.updateMousePos(e);
        if (this.gameState === 'START') {
            this.gameState = 'AIMING';
            return;
        }
        if (this.gameState === 'AIMING') {
            this.mouse.isDown = true;
        }
        if (this.gameState === 'GAMEOVER') {
            this.score = 0;
            this.shots = 0;
            this.resetBalls();
            this.gameState = 'AIMING';
        }
    }

    handleMouseMove(e) {
        this.updateMousePos(e);

        if (this.mouse.isDown && this.gameState === 'AIMING') {
            const dx = this.mouse.x - this.cueBall.x;
            const dy = this.mouse.y - this.cueBall.y;
            this.cuePower = Math.min(this.maxCuePower, Math.hypot(dx, dy) / 2);
        }
    }

    handleMouseUp(e) {
        this.updateMousePos(e);
        if (this.mouse.isDown && this.gameState === 'AIMING') {
            if (this.cuePower > 2) {
                const dx = this.mouse.x - this.cueBall.x;
                const dy = this.mouse.y - this.cueBall.y;
                const angle = Math.atan2(dy, dx);
                
                this.cueBall.vx = Math.cos(angle) * (this.cuePower / 5);
                this.cueBall.vy = Math.sin(angle) * (this.cuePower / 5);
                
                this.gameState = 'MOVING';
                this.shots++;
            }
        }
        this.mouse.isDown = false;
        this.cuePower = 0;
    }

    update() {
        if (this.gameState === 'MOVING') {
            let anyMoving = false;

            for (let i = 0; i < this.balls.length; i++) {
                const b = this.balls[i];
                
                b.x += b.vx;
                b.y += b.vy;
                
                b.vx *= this.friction;
                b.vy *= this.friction;

                if (Math.abs(b.vx) < 0.1) b.vx = 0;
                if (Math.abs(b.vy) < 0.1) b.vy = 0;

                if (b.vx !== 0 || b.vy !== 0) anyMoving = true;

                // Wall collisions
                if (b.x < this.ballRadius) { b.x = this.ballRadius; b.vx *= -this.wallBounciness; }
                if (b.x > this.width - this.ballRadius) { b.x = this.width - this.ballRadius; b.vx *= -this.wallBounciness; }
                if (b.y < this.ballRadius) { b.y = this.ballRadius; b.vy *= -this.wallBounciness; }
                if (b.y > this.height - this.ballRadius) { b.y = this.height - this.ballRadius; b.vy *= -this.wallBounciness; }

                // Pocket collisions
                for (const p of this.pockets) {
                    if (Math.hypot(b.x - p.x, b.y - p.y) < this.ballRadius * 2.5) {
                        if (b.isCue) {
                            // Scratch
                            b.x = 200;
                            b.y = this.height / 2;
                            b.vx = 0;
                            b.vy = 0;
                            this.score = Math.max(0, this.score - 50);
                        } else {
                            this.balls.splice(i, 1);
                            i--;
                            this.score += 100;
                            if (this.balls.length === 1) { // Only cue ball left
                                this.gameState = 'GAMEOVER';
                            }
                        }
                        break;
                    }
                }
            }

            // Ball to ball collisions
            for (let i = 0; i < this.balls.length; i++) {
                for (let j = i + 1; j < this.balls.length; j++) {
                    const b1 = this.balls[i];
                    const b2 = this.balls[j];
                    const dx = b2.x - b1.x;
                    const dy = b2.y - b1.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist < this.ballRadius * 2) {
                        // Collision resolution
                        const angle = Math.atan2(dy, dx);
                        const sin = Math.sin(angle);
                        const cos = Math.cos(angle);

                        // Rotate velocities
                        const vx1 = b1.vx * cos + b1.vy * sin;
                        const vy1 = b1.vy * cos - b1.vx * sin;
                        const vx2 = b2.vx * cos + b2.vy * sin;
                        const vy2 = b2.vy * cos - b2.vx * sin;

                        // Swap velocities (elastic collision)
                        const v1Final = vx2;
                        const v2Final = vx1;

                        b1.vx = v1Final * cos - vy1 * sin;
                        b1.vy = vy1 * cos + v1Final * sin;
                        b2.vx = v2Final * cos - vy2 * sin;
                        b2.vy = vy2 * cos + v2Final * sin;

                        // Prevent overlap
                        const overlap = this.ballRadius * 2 - dist;
                        b1.x -= (overlap / 2) * cos;
                        b1.y -= (overlap / 2) * sin;
                        b2.x += (overlap / 2) * cos;
                        b2.y += (overlap / 2) * sin;
                    }
                }
            }

            if (!anyMoving) {
                this.gameState = 'AIMING';
            }
        }
    }

    draw() {
        // Table
        this.ctx.fillStyle = '#064e3b';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Rails
        this.ctx.strokeStyle = '#451a03';
        this.ctx.lineWidth = 20;
        this.ctx.strokeRect(0, 0, this.width, this.height);

        // Pockets
        this.ctx.fillStyle = '#000000';
        for (const p of this.pockets) {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, this.ballRadius * 2, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Balls
        for (const b of this.balls) {
            this.ctx.fillStyle = b.color;
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, this.ballRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Highlight/Shine
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.beginPath();
            this.ctx.arc(b.x - 3, b.y - 3, 3, 0, Math.PI * 2);
            this.ctx.fill();

            if (!b.isCue) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '8px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(b.number, b.x, b.y + 3);
            }
        }

        // Cue
        if (this.gameState === 'AIMING') {
            const dx = this.cueBall.x - this.mouse.x;
            const dy = this.cueBall.y - this.mouse.y;
            const angle = Math.atan2(dy, dx);
            
            this.ctx.save();
            this.ctx.translate(this.cueBall.x, this.cueBall.y);
            this.ctx.rotate(angle);
            
            // Aim line
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(-400, 0);
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // Cue stick
            const offset = 20 + this.cuePower;
            this.ctx.fillStyle = '#78350f';
            this.ctx.fillRect(offset, -3, 200, 6);
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.fillRect(offset, -3, 10, 6);
            
            this.ctx.restore();
        }

        // UI
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 30, 30);
        this.ctx.fillText(`SHOTS: ${this.shots}`, 30, 55);

        if (this.gameState === 'START') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'center';
            this.ctx.font = 'bold 32px Arial';
            this.ctx.fillText('ROYAL BILLIARDS', this.width / 2, this.height / 2 - 20);
            this.ctx.font = '18px Arial';
            this.ctx.fillText('CLICK TO START', this.width / 2, this.height / 2 + 20);
        }

        if (this.gameState === 'GAMEOVER') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.textAlign = 'center';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.fillText('TABLE CLEARED!', this.width / 2, this.height / 2 - 20);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '20px Arial';
            this.ctx.fillText(`FINAL SCORE: ${this.score}`, this.width / 2, this.height / 2 + 20);
            this.ctx.fillText('CLICK TO PLAY AGAIN', this.width / 2, this.height / 2 + 60);
        }
    }

    start() {
        this.loop();
    }

    loop() {
        this.update();
        this.draw();
        this.requestId = requestAnimationFrame(() => this.loop());
    }

    stop() {
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
        }
        this.canvas.removeEventListener('mousedown', this.boundMouseDown);
        this.canvas.removeEventListener('mousemove', this.boundMouseMove);
        this.canvas.removeEventListener('mouseup', this.boundMouseUp);
    }
}
