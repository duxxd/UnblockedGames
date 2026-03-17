export class DartsGame {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = 600;
        this.height = 600;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.boardRadius = 250;

        this.score = 0;
        this.dartsLeft = 3;
        this.gameState = 'aiming'; // 'aiming', 'throwing', 'result'
        
        this.mouseX = this.centerX;
        this.mouseY = this.centerY;
        
        this.oscillationAngle = 0;
        this.oscillationSpeed = 0.08;
        this.oscillationRange = 200;

        this.darts = [];
        this.lastHit = null;

        this.sectors = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

        this.boundClick = this.handleClick.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);
    }

    start() {
        this.canvas.addEventListener('click', this.boundClick);
        this.canvas.addEventListener('mousemove', this.boundMouseMove);
        this.update();
    }

    stop() {
        this.canvas.removeEventListener('click', this.boundClick);
        this.canvas.removeEventListener('mousemove', this.boundMouseMove);
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }

    handleMouseMove(e) {
        if (this.gameState === 'aiming') {
            const rect = this.canvas.getBoundingClientRect();
            // Only control Y axis with mouse, X is oscillating
            this.mouseY = e.clientY - rect.top;
        }
    }

    handleClick(e) {
        if (this.gameState === 'aiming' && this.dartsLeft > 0) {
            this.throwDart();
        } else if (this.gameState === 'result' || this.dartsLeft === 0) {
            this.reset();
        }
    }

    throwDart() {
        this.gameState = 'throwing';
        
        // Add some "wobble" or skill factor based on mouse position
        const wobble = 30; // Increased wobble
        const targetX = this.mouseX + (Math.random() - 0.5) * wobble;
        const targetY = this.mouseY + (Math.random() - 0.5) * wobble;

        const scoreInfo = this.calculateScore(targetX, targetY);
        
        this.darts.push({
            x: targetX,
            y: targetY,
            score: scoreInfo.points,
            label: scoreInfo.label
        });

        this.score += scoreInfo.points;
        this.dartsLeft--;
        this.lastHit = scoreInfo;

        setTimeout(() => {
            if (this.dartsLeft > 0) {
                this.gameState = 'aiming';
            } else {
                this.gameState = 'result';
            }
        }, 1000);
    }

    calculateScore(x, y) {
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > this.boardRadius) return { points: 0, label: 'MISS' };

        // Bullseye
        if (dist < 10) return { points: 50, label: 'BULLSEYE!' };
        if (dist < 25) return { points: 25, label: 'OUTER BULL' };

        // Sectors
        let angle = Math.atan2(dy, dx) + Math.PI / 2;
        if (angle < 0) angle += Math.PI * 2;
        
        const sectorAngle = (Math.PI * 2) / 20;
        const sectorIndex = Math.floor((angle + sectorAngle / 2) / sectorAngle) % 20;
        const basePoints = this.sectors[sectorIndex];

        // Multipliers
        // Double ring: 160-170 radius
        // Triple ring: 100-110 radius
        if (dist > 235 && dist < 250) return { points: basePoints * 2, label: `DOUBLE ${basePoints}` };
        if (dist > 140 && dist < 155) return { points: basePoints * 3, label: `TRIPLE ${basePoints}` };

        return { points: basePoints, label: `${basePoints}` };
    }

    reset() {
        this.score = 0;
        this.dartsLeft = 3;
        this.darts = [];
        this.gameState = 'aiming';
        this.lastHit = null;
    }

    update() {
        if (this.gameState === 'aiming') {
            this.oscillationAngle += this.oscillationSpeed;
            this.mouseX = this.centerX + Math.sin(this.oscillationAngle) * this.oscillationRange;
        }
        this.draw();
        this.animationId = requestAnimationFrame(() => this.update());
    }

    draw() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.drawBoard();
        this.drawDarts();
        this.drawUI();

        if (this.gameState === 'aiming') {
            this.drawCrosshair();
        }
    }

    drawBoard() {
        const rings = [
            { r: 250, color1: '#111', color2: '#eee', isSector: true },
            { r: 235, color1: '#2a2', color2: '#e22', isSector: true }, // Double
            { r: 220, color1: '#111', color2: '#eee', isSector: true },
            { r: 155, color1: '#2a2', color2: '#e22', isSector: true }, // Triple
            { r: 140, color1: '#111', color2: '#eee', isSector: true },
            { r: 25, color: '#2a2' }, // Outer bull
            { r: 10, color: '#e22' }  // Bullseye
        ];

        rings.forEach((ring, i) => {
            if (ring.isSector) {
                const sectorAngle = (Math.PI * 2) / 20;
                for (let s = 0; s < 20; s++) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.centerX, this.centerY);
                    const startAngle = s * sectorAngle - sectorAngle / 2 - Math.PI / 2;
                    const endAngle = (s + 1) * sectorAngle - sectorAngle / 2 - Math.PI / 2;
                    this.ctx.arc(this.centerX, this.centerY, ring.r, startAngle, endAngle);
                    this.ctx.fillStyle = s % 2 === 0 ? ring.color1 : ring.color2;
                    this.ctx.fill();
                    this.ctx.strokeStyle = '#333';
                    this.ctx.stroke();
                }
            } else {
                this.ctx.beginPath();
                this.ctx.arc(this.centerX, this.centerY, ring.r, 0, Math.PI * 2);
                this.ctx.fillStyle = ring.color;
                this.ctx.fill();
                this.ctx.strokeStyle = '#333';
                this.ctx.stroke();
            }
        });

        // Numbers
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const sectorAngle = (Math.PI * 2) / 20;
        this.sectors.forEach((num, i) => {
            const angle = i * sectorAngle - Math.PI / 2;
            const x = this.centerX + Math.cos(angle) * 275;
            const y = this.centerY + Math.sin(angle) * 275;
            this.ctx.fillText(num, x, y);
        });
    }

    drawDarts() {
        this.darts.forEach(dart => {
            this.ctx.beginPath();
            this.ctx.arc(dart.x, dart.y, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = '#f0f';
            this.ctx.fill();
            this.ctx.strokeStyle = 'white';
            this.ctx.stroke();
        });
    }

    drawCrosshair() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.mouseX - 20, this.mouseY);
        this.ctx.lineTo(this.mouseX + 20, this.mouseY);
        this.ctx.moveTo(this.mouseX, this.mouseY - 20);
        this.ctx.lineTo(this.mouseX, this.mouseY + 20);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(this.mouseX, this.mouseY, 10, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawUI() {
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.font = '24px "Press Start 2P", cursive';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 40);
        this.ctx.fillText(`DARTS: ${this.dartsLeft}`, 20, 80);

        if (this.lastHit && this.gameState === 'throwing') {
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px "Press Start 2P", cursive';
            this.ctx.fillText(this.lastHit.label, this.centerX, this.height - 50);
        }

        if (this.gameState === 'result') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.textAlign = 'center';
            this.ctx.font = '40px "Press Start 2P", cursive';
            this.ctx.fillText('FINAL SCORE', this.width / 2, this.height / 2 - 40);
            this.ctx.font = '60px "Press Start 2P", cursive';
            this.ctx.fillText(this.score, this.width / 2, this.height / 2 + 40);
            this.ctx.font = '20px "Press Start 2P", cursive';
            this.ctx.fillText('CLICK TO REPLAY', this.width / 2, this.height / 2 + 120);
        }
    }
}
