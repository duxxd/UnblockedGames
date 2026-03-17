export class IsraelClicker {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = 600;
        this.height = 500;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.stars = 0;
        this.totalStarsEarned = 0;
        this.starsPerClick = 1;
        this.autoStarsPerSecond = 0;

        this.starSize = 150;
        this.starPulse = 0;
        this.isClicking = false;

        this.particles = [];
        this.floatingTexts = [];

        this.upgrades = [
            { id: 'candle', name: 'Small Candle', cost: 15, power: 1, count: 0, desc: '+1 star/sec' },
            { id: 'menorah', name: 'Menorah', cost: 100, power: 5, count: 0, desc: '+5 stars/sec' },
            { id: 'scroll', name: 'Ancient Scroll', cost: 1100, power: 25, count: 0, desc: '+25 stars/sec' },
            { id: 'harp', name: 'Golden Harp', cost: 12000, power: 100, count: 0, desc: '+100 stars/sec' },
            { id: 'guard', name: 'Temple Guard', cost: 130000, power: 500, count: 0, desc: '+500 stars/sec' }
        ];

        this.requestId = null;
        this.lastTime = performance.now();

        this.boundClick = this.handleClick.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);
        
        this.init();
    }

    init() {
        this.canvas.addEventListener('mousedown', this.boundClick);
        this.canvas.addEventListener('mousemove', this.boundMouseMove);
        
        // Load save
        const saved = localStorage.getItem('israelClickerSave');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.stars = data.stars || 0;
                this.totalStarsEarned = data.totalStarsEarned || 0;
                data.upgrades?.forEach((u, i) => {
                    if (this.upgrades[i]) {
                        this.upgrades[i].count = u.count;
                        this.upgrades[i].cost = u.cost;
                    }
                });
                this.calculateAutoProduction();
            } catch (e) {
                console.error("Failed to load save", e);
            }
        }
    }

    calculateAutoProduction() {
        this.autoStarsPerSecond = this.upgrades.reduce((acc, u) => acc + (u.power * u.count), 0);
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check star click (center area)
        const dist = Math.sqrt(Math.pow(mouseX - this.width / 3, 2) + Math.pow(mouseY - this.height / 2, 2));
        if (dist < this.starSize / 2 + 20) {
            this.addStars(this.starsPerClick);
            this.createParticles(mouseX, mouseY);
            this.createFloatingText(`+${this.starsPerClick}`, mouseX, mouseY);
            this.starPulse = 15;
        }

        // Check upgrade clicks (right side)
        const shopX = (this.width / 3) * 2;
        if (mouseX > shopX) {
            const itemHeight = 60;
            const index = Math.floor((mouseY - 80) / itemHeight);
            if (index >= 0 && index < this.upgrades.length) {
                this.buyUpgrade(this.upgrades[index]);
            }
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const shopX = (this.width / 3) * 2;
        if (mouseX > shopX) {
            this.canvas.style.cursor = 'pointer';
        } else {
            const dist = Math.sqrt(Math.pow(mouseX - this.width / 3, 2) + Math.pow(mouseY - this.height / 2, 2));
            this.canvas.style.cursor = dist < this.starSize / 2 + 20 ? 'pointer' : 'default';
        }
    }

    buyUpgrade(upgrade) {
        if (this.stars >= upgrade.cost) {
            this.stars -= upgrade.cost;
            upgrade.count++;
            upgrade.cost = Math.ceil(upgrade.cost * 1.15);
            this.calculateAutoProduction();
            this.save();
        }
    }

    addStars(amount) {
        this.stars += amount;
        this.totalStarsEarned += amount;
    }

    createParticles(x, y) {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color: Math.random() > 0.5 ? '#3b82f6' : '#fff'
            });
        }
    }

    createFloatingText(text, x, y) {
        this.floatingTexts.push({
            text, x, y,
            vy: -2,
            life: 1.0
        });
    }

    save() {
        const data = {
            stars: this.stars,
            totalStarsEarned: this.totalStarsEarned,
            upgrades: this.upgrades.map(u => ({ count: u.count, cost: u.cost }))
        };
        localStorage.setItem('israelClickerSave', JSON.stringify(data));
    }

    drawStar(x, y, size, color, glow = false) {
        this.ctx.save();
        this.ctx.translate(x, y);
        
        if (glow) {
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = color;
        }

        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = size / 10;
        this.ctx.lineJoin = 'round';

        // Star of David is two overlapping triangles
        const drawTriangle = (side) => {
            const h = side * (Math.sqrt(3) / 2);
            this.ctx.moveTo(0, -h / 2 * 1.3);
            this.ctx.lineTo(side / 2, h / 2 * 0.7);
            this.ctx.lineTo(-side / 2, h / 2 * 0.7);
            this.ctx.closePath();
        };

        // Upward triangle
        drawTriangle(size);
        this.ctx.stroke();

        // Downward triangle
        this.ctx.rotate(Math.PI);
        this.ctx.beginPath();
        drawTriangle(size);
        this.ctx.stroke();

        this.ctx.restore();
    }

    update(now) {
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        // Auto production
        if (this.autoStarsPerSecond > 0) {
            this.addStars(this.autoStarsPerSecond * dt);
        }

        // Update particles
        this.particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) this.particles.splice(i, 1);
        });

        // Update floating texts
        this.floatingTexts.forEach((t, i) => {
            t.y += t.vy;
            t.life -= 0.015;
            if (t.life <= 0) this.floatingTexts.splice(i, 1);
        });

        if (this.starPulse > 0) this.starPulse -= 1;

        this.draw();
        this.requestId = requestAnimationFrame(this.update.bind(this));
    }

    draw() {
        this.ctx.fillStyle = '#0f172a'; // Dark blue background
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw background grid/pattern
        this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.width; i += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.height);
            this.ctx.stroke();
        }
        for (let i = 0; i < this.height; i += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.width, i);
            this.ctx.stroke();
        }

        // Draw main star
        const pulseSize = this.starSize + this.starPulse;
        this.drawStar(this.width / 3, this.height / 2, pulseSize, '#3b82f6', true);
        this.drawStar(this.width / 3, this.height / 2, pulseSize * 0.8, '#fff');

        // Draw Stats
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px "Press Start 2P", cursive';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(Math.floor(this.stars).toLocaleString(), this.width / 3, 80);
        this.ctx.font = '10px "Press Start 2P", cursive';
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.fillText('STARS', this.width / 3, 105);
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.fillText(`${this.autoStarsPerSecond.toFixed(1)} / SEC`, this.width / 3, 130);

        // Draw Shop
        const shopX = (this.width / 3) * 2;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(shopX, 0, this.width / 3, this.height);
        this.ctx.strokeStyle = '#fbbf24';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(shopX, 0, this.width / 3, this.height);

        this.ctx.fillStyle = '#fbbf24';
        this.ctx.font = '12px "Press Start 2P", cursive';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('UPGRADES', shopX + this.width / 6, 40);

        this.upgrades.forEach((u, i) => {
            const y = 80 + i * 60;
            const isAffordable = this.stars >= u.cost;
            
            this.ctx.fillStyle = isAffordable ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)';
            this.ctx.fillRect(shopX + 5, y, this.width / 3 - 10, 55);
            
            this.ctx.textAlign = 'left';
            this.ctx.fillStyle = isAffordable ? '#fff' : '#475569';
            this.ctx.font = '8px "Press Start 2P", cursive';
            this.ctx.fillText(u.name, shopX + 10, y + 20);
            
            this.ctx.fillStyle = isAffordable ? '#fbbf24' : '#475569';
            this.ctx.fillText(`Cost: ${u.cost}`, shopX + 10, y + 35);
            
            this.ctx.textAlign = 'right';
            this.ctx.fillStyle = '#3b82f6';
            this.ctx.fillText(`x${u.count}`, shopX + this.width / 3 - 10, y + 20);
        });

        // Draw particles
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, 4, 4);
        });
        this.ctx.globalAlpha = 1.0;

        // Draw floating texts
        this.floatingTexts.forEach(t => {
            this.ctx.globalAlpha = t.life;
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px "Press Start 2P", cursive';
            this.ctx.fillText(t.text, t.x, t.y);
        });
        this.ctx.globalAlpha = 1.0;
    }

    start() {
        this.lastTime = performance.now();
        this.update(this.lastTime);
        
        const inst = document.getElementById('game-instructions');
        if (inst) inst.innerText = 'Click the Star of David to earn stars • Buy upgrades to automate production • Progress is saved automatically!';

        // Auto-save every 30 seconds
        this.saveInterval = setInterval(() => this.save(), 30000);
    }

    stop() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        if (this.saveInterval) clearInterval(this.saveInterval);
        this.canvas.removeEventListener('mousedown', this.boundClick);
        this.canvas.removeEventListener('mousemove', this.boundMouseMove);
        this.save();
        this.container.innerHTML = '';
    }
}
