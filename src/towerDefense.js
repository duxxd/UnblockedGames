export class TowerDefense {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = 500; 
        this.height = 550; 
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.path = [
            {x: 0, y: 250}, {x: 120, y: 250}, {x: 120, y: 80},
            {x: 380, y: 80}, {x: 380, y: 420}, {x: 500, y: 420}
        ];

        this.towerTypes = {
            archer: { name: 'ARCHER', cost: 60, range: 120, damage: 15, fireRate: 800, color: '#fbbf24', pColor: '#ffffff', pType: 'arrow', splash: 0 },
            wizard: { name: 'WIZARD', cost: 130, range: 160, damage: 45, fireRate: 1500, color: '#a855f7', pColor: '#e9d5ff', pType: 'magic', splash: 45 },
            catapult: { name: 'CATAPULT', cost: 200, range: 100, damage: 70, fireRate: 2500, color: '#4b5563', pColor: '#94a3b8', pType: 'stone', splash: 65 },
            crossbow: { name: 'CROSSBOW', cost: 250, range: 250, damage: 120, fireRate: 3500, color: '#3b82f6', pColor: '#bfdbfe', pType: 'arrow', splash: 0 }
        };

        this.gameState = 'START';
        this.resetGameData();
        this.decor = this.generateDecor();
        this.lastTime = 0;

        this.init();
    }

    resetGameData() {
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.particles = [];
        this.gold = 100;
        this.health = 25;
        this.mana = 0;
        this.wave = 1;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 2200;
        this.enemiesInWave = 10;
        this.enemiesSpawned = 0;
        this.waveInProgress = true;
        this.selectedType = null;
        this.selectedTower = null;
    }

    // Helper to find which enemy is closest to the exit
    getDistanceToFinish(enemy) {
        let distance = 0;
        // Distance from current position to its next waypoint
        const nextWaypoint = this.path[enemy.pathIndex + 1];
        if (nextWaypoint) {
            distance += Math.hypot(nextWaypoint.x - enemy.x, nextWaypoint.y - enemy.y);
        }
        // Add distances of all remaining path segments
        for (let i = enemy.pathIndex + 1; i < this.path.length - 1; i++) {
            const p1 = this.path[i];
            const p2 = this.path[i + 1];
            distance += Math.hypot(p2.x - p1.x, p2.y - p1.y);
        }
        return distance;
    }

    generateDecor() {
        let items = [];
        for(let i=0; i<40; i++) {
            items.push({
                x: Math.random() * this.width,
                y: Math.random() * (this.height - 100),
                size: 2 + Math.random() * 3,
                type: Math.random() > 0.6 ? 'grass' : 'stone'
            });
        }
        return items;
    }

    init() {
        this.canvas.addEventListener('mousedown', (e) => this.handleClick(e));
    }

    start() {
        this.gameState = 'PLAYING';
        this.resetGameData();
        this.lastTime = performance.now();
        this.update(performance.now());
    }

    updateUI() {
        const scoreEl = document.getElementById('game-score');
        if (scoreEl && this.gameState === 'PLAYING') {
            scoreEl.innerText = `GOLD: ${this.gold} | HEALTH: ${this.health} | MANA: ${Math.floor(this.mana)} | WAVE: ${this.wave}`;
        }
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.gameState === 'START' || this.gameState === 'GAMEOVER') {
            const btnW = 200; const btnH = 60;
            const btnX = (this.width - btnW) / 2;
            const btnY = (this.height - btnH) / 2 + 50;
            if (x > btnX && x < btnX + btnW && y > btnY && y < btnY + btnH) {
                this.resetGameData();
                this.gameState = 'PLAYING';
            }
            return;
        }

        if (y > this.height - 100) {
            const slotW = this.width / 5;
            if (this.selectedTower) {
                if (x < slotW) this.selectedTower = null;
                else if (x > 2*slotW && x < 3*slotW) {
                    this.gold += Math.floor(this.selectedTower.invested * 0.5);
                    this.towers = this.towers.filter(t => t !== this.selectedTower);
                    this.selectedTower = null;
                }
                else if (x > 3*slotW && x < 5*slotW && this.selectedTower.level < 5) {
                    const cost = Math.floor(this.selectedTower.cost * 1.6 * this.selectedTower.level);
                    if (this.gold >= cost) {
                        this.gold -= cost;
                        this.selectedTower.level++;
                        this.selectedTower.damage = Math.floor(this.selectedTower.damage * 1.5);
                        this.selectedTower.range += 15;
                        this.selectedTower.invested += cost;
                    }
                }
            } else {
                if (x < slotW * 4) {
                    const idx = Math.floor(x / slotW);
                    const typeKey = Object.keys(this.towerTypes)[idx];
                    this.selectedType = (this.selectedType === typeKey) ? null : typeKey;
                } else if (this.mana >= 80) {
                    this.mana -= 80;
                    this.enemies.forEach(e => { e.hp -= 50; this.createEffect(e.x, e.y, '#ef4444', 8); });
                }
            }
            this.updateUI();
            return;
        }

        const clickedTower = this.towers.find(t => Math.hypot(t.x - x, t.y - y) < 30);
        if (clickedTower) {
            this.selectedTower = clickedTower;
            this.selectedType = null;
            return;
        }

        if (this.selectedTower) { this.selectedTower = null; return; }

        if (this.selectedType) {
            const type = this.towerTypes[this.selectedType];
            if (this.gold >= type.cost && !this.isNearPath(x, y)) {
                if (!this.towers.some(t => Math.hypot(t.x - x, t.y - y) < 45)) {
                    this.towers.push({ 
                        ...JSON.parse(JSON.stringify(type)), 
                        towerKey: this.selectedType,
                        x, y, level: 1, lastFired: 0, invested: type.cost 
                    });
                    this.gold -= type.cost;
                    this.selectedType = null;
                    this.updateUI();
                }
            }
        }
    }

    isNearPath(x, y) {
        return this.path.some((p, i) => {
            if (i === this.path.length - 1) return false;
            const p2 = this.path[i+1];
            const l2 = Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2);
            let t = Math.max(0, Math.min(1, ((x - p.x) * (p2.x - p.x) + (y - p.y) * (p2.y - p.y)) / l2));
            return Math.hypot(x - (p.x + t * (p2.x - p.x)), y - (p.y + t * (p2.y - p.y))) < 40;
        });
    }

    createEffect(x, y, color, count, life = 1.0) {
        for(let i=0; i<count; i++) {
            this.particles.push({
                x, y, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, life, color
            });
        }
    }

    update(time = 0) {
        const dt = time - this.lastTime;
        this.lastTime = time;

        if (this.gameState === 'PLAYING') {
            this.mana = Math.min(100, this.mana + (dt * 0.0025));

            if (this.enemiesSpawned < this.enemiesInWave) {
                this.enemySpawnTimer += dt;
                if (this.enemySpawnTimer > this.enemySpawnInterval) {
                    this.spawnEnemy();
                    this.enemySpawnTimer = 0;
                }
            } else if (this.enemies.length === 0 && this.waveInProgress) {
                const waveReward = Math.floor(60 * Math.pow(1.25, this.wave - 1));
                this.gold += waveReward;
                this.waveInProgress = false;
                setTimeout(() => {
                    this.wave++; this.enemiesSpawned = 0; this.enemiesInWave += 5;
                    this.enemySpawnInterval = Math.max(150, this.enemySpawnInterval * 0.95);
                    this.waveInProgress = true;
                    this.updateUI();
                }, 2000);
            }

            this.enemies.forEach((en, i) => {
                if (en.type === 'medic') {
                    en.healTimer += dt;
                    if (en.healTimer >= 5000) {
                        this.enemies.forEach(target => {
                            if (Math.hypot(en.x - target.x, en.y - target.y) < 100)
                                target.hp = Math.min(target.maxHp, target.hp + (target.maxHp * 0.15));
                        });
                        this.createEffect(en.x, en.y, '#22c55e', 10, 0.5);
                        en.healTimer = 0;
                    }
                }
                const target = this.path[en.pathIndex + 1];
                if (!target) {
                    this.health--;
                    this.enemies.splice(i, 1);
                    if (this.health <= 0) this.gameState = 'GAMEOVER';
                    this.updateUI();
                    return;
                }
                const angle = Math.atan2(target.y - en.y, target.x - en.x);
                en.x += Math.cos(angle) * en.speed;
                en.y += Math.sin(angle) * en.speed;
                if (Math.hypot(target.x - en.x, target.y - en.y) < 3) en.pathIndex++;
            });

            this.towers.forEach(t => {
                t.lastFired += dt;
                if (t.lastFired > t.fireRate) {
                    // TARGETING LOGIC: Find all enemies in range
                    const inRange = this.enemies.filter(e => Math.hypot(e.x - t.x, e.y - t.y) < t.range);
                    
                    if (inRange.length > 0) {
                        // Sort by distance to finish (ascending: smallest distance first)
                        inRange.sort((a, b) => this.getDistanceToFinish(a) - this.getDistanceToFinish(b));
                        const target = inRange[0];

                        this.projectiles.push({ 
                            x: t.x, y: t.y - 10, target, speed: 12, 
                            pType: t.pType, firedBy: t.towerKey, 
                            damage: t.damage, pColor: t.pColor, splash: t.splash 
                        });
                        t.lastFired = 0;
                    }
                }
            });

            this.projectiles.forEach((p, i) => {
                const angle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
                p.x += Math.cos(angle) * p.speed;
                p.y += Math.sin(angle) * p.speed;

                if (Math.hypot(p.target.x - p.x, p.target.y - p.y) < 10) {
                    const processDamage = (en, dmg, source) => {
                        let finalDmg = dmg;
                        if (en.type === 'knight' && source === 'archer') finalDmg *= 0.8;
                        en.hp -= finalDmg;
                    };

                    if (p.splash > 0) {
                        this.createEffect(p.x, p.y, p.pColor, 15, 0.5); 
                        this.enemies.forEach(e => {
                            if (Math.hypot(e.x - p.x, e.y - p.y) < p.splash) processDamage(e, p.damage, p.firedBy);
                        });
                    } else { processDamage(p.target, p.damage, p.firedBy); }
                    this.projectiles.splice(i, 1);
                }
            });

            this.enemies = this.enemies.filter(e => {
                if (e.hp <= 0) { this.gold += e.reward; this.createEffect(e.x, e.y, e.color, 4); return false; }
                return true;
            });

            this.particles.forEach((p, i) => {
                p.x += p.vx; p.y += p.vy; p.life -= 0.02;
                if (p.life <= 0) this.particles.splice(i, 1);
            });
        }

        this.draw();
        this.requestId = requestAnimationFrame((t) => this.update(t));
    }

    spawnEnemy() {
        const hpMult = Math.pow(1.2, this.wave - 1);
        let pool = [{ type: 'soldier', hp: 40, speed: 1.4, reward: 2, color: '#ef4444', size: 10 }];
        if (this.wave >= 2) pool.push({ type: 'scout', hp: 25, speed: 2.2, reward: 1, color: '#f87171', size: 8 });
        if (this.wave >= 4) pool.push({ type: 'knight', hp: 180, speed: 0.8, reward: 5, color: '#991b1b', size: 14 });
        if (this.wave >= 6) pool.push({ type: 'medic', hp: 100, speed: 1.1, reward: 8, color: '#22c55e', size: 12, healTimer: 0 });

        let base = (this.wave % 10 === 0 && this.enemiesSpawned === this.enemiesInWave - 1) 
            ? { type: 'titan', hp: 1500, speed: 0.5, reward: 50, color: '#450a0a', size: 30, isBoss: true }
            : pool[Math.floor(Math.random() * pool.length)];

        this.enemies.push({
            ...base, x: this.path[0].x, y: this.path[0].y, pathIndex: 0,
            hp: base.hp * hpMult, maxHp: base.hp * hpMult
        });
        this.enemiesSpawned++;
    }

    draw() {
        this.ctx.fillStyle = '#064e3b';
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (this.gameState === 'START') {
            this.drawOverlay("ROYAL DEFENSE", "CHALLENGE THE TIDES OF WAR", "PLAY GAME");
            return;
        }

        if (this.gameState === 'GAMEOVER') {
            this.drawOverlay("YOU DIED", `THE KINGDOM FELL AT WAVE ${this.wave}`, "PLAY AGAIN");
            return;
        }

        this.decor.forEach(d => {
            this.ctx.fillStyle = d.type === 'stone' ? '#64748b' : '#166534';
            this.ctx.beginPath(); this.ctx.arc(d.x, d.y, d.size, 0, Math.PI*2); this.ctx.fill();
        });
        this.ctx.strokeStyle = '#78350f'; this.ctx.lineWidth = 55; this.ctx.lineJoin = 'round';
        this.ctx.beginPath(); this.ctx.moveTo(this.path[0].x, this.path[0].y);
        this.path.forEach(p => this.ctx.lineTo(p.x, p.y));
        this.ctx.stroke();

        this.enemies.forEach(e => {
            this.ctx.fillStyle = e.color;
            this.ctx.beginPath(); this.ctx.arc(e.x, e.y, e.size, 0, Math.PI*2); this.ctx.fill();
            if (e.isBoss) { this.ctx.strokeStyle = '#fbbf24'; this.ctx.lineWidth = 4; this.ctx.stroke(); }
            this.ctx.fillStyle = '#064e3b'; this.ctx.fillRect(e.x - 20, e.y - 25, 40, 5);
            this.ctx.fillStyle = e.type === 'medic' ? '#4ade80' : '#ef4444'; 
            this.ctx.fillRect(e.x - 20, e.y - 25, (e.hp/e.maxHp)*40, 5);
        });

        this.towers.forEach(t => this.drawTower(t));
        this.projectiles.forEach(p => {
            if (p.pType === 'arrow') this.drawArrow(p);
            else { this.ctx.fillStyle = p.pColor; this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 5, 0, Math.PI*2); this.ctx.fill(); }
        });
        this.particles.forEach(p => { this.ctx.globalAlpha = p.life; this.ctx.fillStyle = p.color; this.ctx.fillRect(p.x, p.y, 4, 4); });
        this.ctx.globalAlpha = 1;
        
        if (!this.waveInProgress) {
            this.ctx.fillStyle = '#fbbf24'; this.ctx.textAlign = 'center'; this.ctx.font = 'bold 20px monospace';
            this.ctx.fillText(`WAVE COMPLETE: +${Math.floor(60 * Math.pow(1.25, this.wave - 1))}G`, this.width/2, this.height/2);
        }
        this.drawUI();
    }

    drawOverlay(title, subtitle, btnText) {
        this.ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#ef4444';
        this.ctx.font = 'bold 48px monospace';
        this.ctx.fillText(title, this.width/2, this.height/2 - 60);
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = '16px monospace';
        this.ctx.fillText(subtitle, this.width/2, this.height/2 - 20);
        const btnW = 200; const btnH = 60;
        this.ctx.fillStyle = '#166534';
        this.ctx.fillRect((this.width - btnW)/2, (this.height - btnH)/2 + 50, btnW, btnH);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 20px monospace';
        this.ctx.fillText(btnText, this.width/2, (this.height - btnH)/2 + 88);
    }

    drawArrow(p) {
        const angle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
        this.ctx.save(); this.ctx.translate(p.x, p.y); this.ctx.rotate(angle);
        this.ctx.strokeStyle = '#d1d5db'; this.ctx.lineWidth = 2;
        this.ctx.beginPath(); this.ctx.moveTo(-10, 0); this.ctx.lineTo(5, 0); this.ctx.stroke();
        this.ctx.fillStyle = p.pColor; this.ctx.beginPath(); this.ctx.moveTo(-10, 0); this.ctx.lineTo(-14, -4); this.ctx.lineTo(-14, 4); this.ctx.fill();
        this.ctx.restore();
    }

    drawTower(t) {
        const isSelected = this.selectedTower === t;
        if (isSelected) {
            this.ctx.strokeStyle = 'rgba(255,255,255,0.4)'; this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath(); this.ctx.arc(t.x, t.y, t.range, 0, Math.PI*2); this.ctx.stroke(); this.ctx.setLineDash([]);
        }
        this.ctx.fillStyle = t.color;
        this.ctx.fillRect(t.x - 18, t.y - 5, 36, 25); this.ctx.fillRect(t.x - 22, t.y - 15, 44, 12); 
        this.ctx.fillStyle = '#fff';
        for(let i=0; i<t.level; i++) { this.ctx.beginPath(); this.ctx.arc(t.x - 15 + (i*8), t.y + 10, 2, 0, Math.PI*2); this.ctx.fill(); }
        if (isSelected) { this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 2; this.ctx.strokeRect(t.x-25, t.y-20, 50, 55); }
    }

    drawUI() {
        const uiY = this.height - 100;
        this.ctx.fillStyle = '#020617'; this.ctx.fillRect(0, uiY, this.width, 100);
        const slotW = this.width / 5;
        this.ctx.font = 'bold 11px monospace';

        if (this.selectedTower) {
            const t = this.selectedTower;
            const upCost = Math.floor(t.cost * 1.6 * t.level);
            this.ctx.fillStyle = '#1e293b'; this.ctx.fillRect(10, uiY+20, slotW-20, 60);
            this.ctx.fillStyle = '#fff'; this.ctx.textAlign = 'center'; this.ctx.fillText('BACK', slotW/2, uiY+55);
            this.ctx.textAlign = 'left'; this.ctx.fillText(`LVL ${t.level} ${t.name}`, slotW + 10, uiY + 30);
            this.ctx.fillStyle = '#94a3b8'; this.ctx.fillText(`DMG: ${t.damage} RNG: ${t.range}`, slotW + 10, uiY + 55);
            this.ctx.fillStyle = '#7f1d1d'; this.ctx.fillRect(2*slotW + 10, uiY+20, slotW-20, 60);
            this.ctx.fillStyle = '#fff'; this.ctx.textAlign = 'center'; this.ctx.fillText('SELL', 2.5*slotW, uiY+45);
            this.ctx.fillText(`${Math.floor(t.invested*0.5)}G`, 2.5*slotW, uiY+65);
            if (t.level < 5) {
                this.ctx.fillStyle = this.gold >= upCost ? '#166534' : '#334155';
                this.ctx.fillRect(3*slotW + 10, uiY+20, slotW*2 - 20, 60);
                this.ctx.fillStyle = '#fff'; this.ctx.fillText(`UPGRADE LVL ${t.level+1}`, 4*slotW, uiY+45);
                this.ctx.fillText(`${upCost} GOLD`, 4*slotW, uiY+65);
            } else {
                this.ctx.fillStyle = '#3f6212'; this.ctx.fillRect(3*slotW + 10, uiY+20, slotW*2 - 20, 60);
                this.ctx.fillStyle = '#fff'; this.ctx.fillText('MAX LEVEL', 4*slotW, uiY+55);
            }
        } else {
            Object.keys(this.towerTypes).forEach((key, i) => {
                const type = this.towerTypes[key];
                const x = i * slotW;
                if (this.selectedType === key) { this.ctx.fillStyle = '#1e293b'; this.ctx.fillRect(x, uiY, slotW, 100); }
                this.ctx.fillStyle = type.color; this.ctx.fillRect(x + slotW/2 - 12, uiY + 20, 24, 24);
                this.ctx.fillStyle = '#f1f5f9'; this.ctx.textAlign = 'center';
                this.ctx.fillText(type.name, x + slotW/2, uiY + 65); this.ctx.fillText(`${type.cost}G`, x + slotW/2, uiY + 85);
            });
            const abX = 4 * slotW; this.ctx.fillStyle = this.mana >= 80 ? '#b91c1c' : '#334155';
            this.ctx.fillRect(abX + 10, uiY + 15, slotW - 20, 70);
            this.ctx.fillStyle = '#fff'; this.ctx.fillText('FIRESTORM', abX + slotW/2, uiY + 45); this.ctx.fillText('80 MP', abX + slotW/2, uiY + 65);
        }
    }

    stop() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        if (this.canvas) this.canvas.removeEventListener('click', this.boundClick);
        this.container.innerHTML = '';
    }
}
