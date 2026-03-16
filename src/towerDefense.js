export class TowerDefense {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = 300;
        this.height = 450;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.path = [
            {x: 0, y: 50},
            {x: 250, y: 50},
            {x: 250, y: 200},
            {x: 50, y: 200},
            {x: 50, y: 350},
            {x: 300, y: 350}
        ];

        this.towerTypes = {
            archer: {
                name: 'Archer',
                cost: 50,
                range: 90,
                damage: 10,
                fireRate: 800,
                color: '#fbbf24',
                projectileColor: '#fff',
                splash: 0
            },
            mage: {
                name: 'Mage',
                cost: 100,
                range: 120,
                damage: 25,
                fireRate: 1500,
                color: '#a855f7',
                projectileColor: '#a855f7',
                splash: 0
            },
            cannon: {
                name: 'Cannon',
                cost: 150,
                range: 70,
                damage: 40,
                fireRate: 2500,
                color: '#4b5563',
                projectileColor: '#000',
                splash: 40
            }
        };

        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.gold = 100;
        this.health = 10;
        this.wave = 1;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 2000;
        this.enemiesInWave = 10;
        this.enemiesSpawned = 0;
        
        this.gameOver = false;
        this.requestId = null;
        this.lastTime = 0;

        this.selectedType = 'archer';
        this.selectedTower = null;

        this.boundClick = this.handleClick.bind(this);
        this.init();
    }

    init() {
        this.canvas.addEventListener('click', this.boundClick);
        this.start();
    }

    start() {
        this.gameOver = false;
        this.gold = 100;
        this.health = 10;
        this.wave = 1;
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.enemiesSpawned = 0;
        this.selectedTower = null;
        this.updateUI();

        const inst = document.getElementById('game-instructions');
        if (inst) inst.innerText = 'Select Tower Below • Click Grass to Build or Upgrade';

        this.update();
    }

    updateUI() {
        const el = document.getElementById('game-score');
        if (el) el.innerText = `Gold: ${this.gold} | Health: ${this.health} | Wave: ${this.wave}`;
    }

    handleClick(e) {
        if (this.gameOver) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // UI Selection Area (Bottom 60px)
        if (y > this.height - 60) {
            const slotWidth = this.width / 3;
            if (this.selectedTower) {
                // Upgrade logic if a tower is selected
                const upgradeCost = this.selectedTower.cost * 2;
                if (this.gold >= upgradeCost) {
                    this.gold -= upgradeCost;
                    this.selectedTower.damage *= 2;
                    this.selectedTower.level = (this.selectedTower.level || 1) + 1;
                    this.selectedTower.cost = upgradeCost; // Next upgrade is even more expensive
                    this.selectedTower = null;
                    this.updateUI();
                }
            } else {
                if (x < slotWidth) this.selectedType = 'archer';
                else if (x < slotWidth * 2) this.selectedType = 'mage';
                else this.selectedType = 'cannon';
            }
            return;
        }

        // Check if clicking on an existing tower
        const clickedTower = this.towers.find(t => Math.hypot(t.x - x, t.y - y) < 20);
        if (clickedTower) {
            this.selectedTower = this.selectedTower === clickedTower ? null : clickedTower;
            return;
        }

        // If we click elsewhere, deselect tower
        this.selectedTower = null;

        // Check if clicking on path
        if (this.isNearPath(x, y)) return;

        const type = this.towerTypes[this.selectedType];

        // Check if enough gold
        if (this.gold >= type.cost) {
            // Check if space is occupied
            const occupied = this.towers.some(t => Math.hypot(t.x - x, t.y - y) < 30);
            if (!occupied) {
                this.towers.push({
                    x, y,
                    ...type,
                    level: 1,
                    lastFired: 0
                });
                this.gold -= type.cost;
                this.updateUI();
            }
        }
    }

    isNearPath(x, y) {
        for (let i = 0; i < this.path.length - 1; i++) {
            const p1 = this.path[i];
            const p2 = this.path[i+1];
            
            const dist = this.distToSegment({x, y}, p1, p2);
            if (dist < 25) return true;
        }
        return false;
    }

    distToSegment(p, v, w) {
        const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }

    spawnEnemy() {
        let type = 'soldier';
        const rand = Math.random();
        
        // Difficulty scaling enemy types
        if (this.enemiesSpawned === this.enemiesInWave - 1 && this.wave % 5 === 0) {
            type = 'miniboss';
        } else if (rand < 0.2) {
            type = 'scout';
        } else if (rand < 0.4) {
            type = 'knight';
        }

        const stats = {
            soldier: { hp: 20, speed: 1, reward: 5, color: '#ef4444', size: 10 },
            scout: { hp: 10, speed: 1.8, reward: 3, color: '#f87171', size: 7 },
            knight: { hp: 60, speed: 0.6, reward: 8, color: '#b91c1c', size: 13 },
            miniboss: { hp: 300, speed: 0.4, reward: 50, color: '#7f1d1d', size: 18 }
        };

        const s = stats[type];
        const hpMultiplier = 1 + (this.wave * 0.15);
        const speedMultiplier = 1 + (this.wave * 0.02);

        this.enemies.push({
            x: this.path[0].x,
            y: this.path[0].y,
            pathIndex: 0,
            hp: s.hp * hpMultiplier,
            maxHp: s.hp * hpMultiplier,
            speed: s.speed * speedMultiplier,
            reward: s.reward,
            color: s.color,
            size: s.size,
            type: type
        });
        this.enemiesSpawned++;
    }

    update(time = 0) {
        if (this.gameOver) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        // Wave management
        if (this.enemiesSpawned < this.enemiesInWave) {
            this.enemySpawnTimer += deltaTime;
            if (this.enemySpawnTimer > this.enemySpawnInterval) {
                this.spawnEnemy();
                this.enemySpawnTimer = 0;
            }
        } else if (this.enemies.length === 0) {
            this.wave++;
            this.enemiesSpawned = 0;
            this.enemiesInWave += 2;
            this.enemySpawnInterval = Math.max(300, this.enemySpawnInterval - 50);
            this.updateUI();
        }

        // Update enemies
        this.enemies.forEach((enemy, i) => {
            const target = this.path[enemy.pathIndex + 1];
            if (!target) {
                this.health--;
                this.enemies.splice(i, 1);
                this.updateUI();
                if (this.health <= 0) this.endGame();
                return;
            }

            const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
            enemy.x += Math.cos(angle) * enemy.speed;
            enemy.y += Math.sin(angle) * enemy.speed;

            if (Math.hypot(target.x - enemy.x, target.y - enemy.y) < 2) {
                enemy.pathIndex++;
            }
        });

        // Update towers
        this.towers.forEach(tower => {
            tower.lastFired += deltaTime;
            if (tower.lastFired > tower.fireRate) {
                let nearestEnemy = null;
                let minDist = tower.range;

                this.enemies.forEach(enemy => {
                    const d = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
                    if (d < minDist) {
                        minDist = d;
                        nearestEnemy = enemy;
                    }
                });

                if (nearestEnemy) {
                    this.projectiles.push({
                        x: tower.x,
                        y: tower.y,
                        target: nearestEnemy,
                        speed: tower.type === 'cannon' ? 3 : 6,
                        damage: tower.damage,
                        splash: tower.splash,
                        color: tower.projectileColor
                    });
                    tower.lastFired = 0;
                }
            }
        });

        // Update projectiles
        this.projectiles.forEach((p, i) => {
            const angle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
            p.x += Math.cos(angle) * p.speed;
            p.y += Math.sin(angle) * p.speed;

            if (Math.hypot(p.target.x - p.x, p.target.y - p.y) < 5) {
                if (p.splash > 0) {
                    // Splash damage
                    this.enemies.forEach(e => {
                        if (Math.hypot(e.x - p.x, e.y - p.y) < p.splash) {
                            e.hp -= p.damage;
                        }
                    });
                } else {
                    p.target.hp -= p.damage;
                }
                
                this.projectiles.splice(i, 1);
                
                // Cleanup dead enemies
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    if (this.enemies[j].hp <= 0) {
                        this.gold += this.enemies[j].reward;
                        this.enemies.splice(j, 1);
                        this.updateUI();
                    }
                }
            }
        });

        this.draw();
        this.requestId = requestAnimationFrame(this.update.bind(this));
    }

    draw() {
        // Background
        this.ctx.fillStyle = '#1a2e1a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Path
        this.ctx.strokeStyle = '#3d2b1f';
        this.ctx.lineWidth = 40;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(this.path[0].x, this.path[0].y);
        this.path.forEach(p => this.ctx.lineTo(p.x, p.y));
        this.ctx.stroke();

        // Draw Enemies
        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = enemy.color;
            this.ctx.beginPath();
            this.ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
            this.ctx.fill();

            // HP bar
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(enemy.x - 10, enemy.y - 15, 20, 3);
            this.ctx.fillStyle = '#10b981';
            this.ctx.fillRect(enemy.x - 10, enemy.y - 15, Math.max(0, (enemy.hp / enemy.maxHp) * 20), 3);
        });

        // Draw Towers
        this.towers.forEach(tower => {
            // Range circle (always visible but subtle)
            this.ctx.strokeStyle = this.selectedTower === tower ? 'rgba(251, 191, 36, 0.4)' : 'rgba(251, 191, 36, 0.15)';
            this.ctx.lineWidth = this.selectedTower === tower ? 2 : 1;
            this.ctx.beginPath();
            this.ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
            this.ctx.stroke();

            this.drawMedievalTower(tower.x, tower.y, tower.color, tower === this.selectedTower);
            
            // Level indicator
            if (tower.level > 1) {
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`L${tower.level}`, tower.x, tower.y + 25);
            }
        });

        // Draw Projectiles
        this.projectiles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.splash > 0 ? 5 : 3, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.drawUI();
    }

    drawMedievalTower(x, y, color, isSelected) {
        this.ctx.fillStyle = color;
        this.ctx.shadowBlur = isSelected ? 20 : 10;
        this.ctx.shadowColor = color;
        
        // Base
        this.ctx.fillRect(x - 12, y - 5, 24, 17);
        // Top part (crenels)
        this.ctx.fillRect(x - 15, y - 15, 30, 10);
        
        // Details
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fillRect(x - 15, y - 15, 6, 4);
        this.ctx.fillRect(x - 3, y - 15, 6, 4);
        this.ctx.fillRect(x + 9, y - 15, 6, 4);
        
        this.ctx.shadowBlur = 0;

        if (isSelected) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x - 18, y - 18, 36, 36);
        }
    }

    drawUI() {
        const uiY = this.height - 60;
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, uiY, this.width, 60);
        this.ctx.strokeStyle = '#fbbf24';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, uiY, this.width, 60);

        if (this.selectedTower) {
            // Upgrade UI
            const upgradeCost = this.selectedTower.cost * 2;
            this.ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
            this.ctx.fillRect(0, uiY, this.width, 60);
            
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.font = '12px MedievalSharp';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`${this.selectedTower.name} L${this.selectedTower.level}`, 10, uiY + 25);
            this.ctx.font = '10px MedievalSharp';
            this.ctx.fillText(`Dmg: ${this.selectedTower.damage} -> ${this.selectedTower.damage * 2}`, 10, uiY + 45);

            // Upgrade Button
            const btnX = this.width - 100;
            const btnY = uiY + 10;
            this.ctx.fillStyle = this.gold >= upgradeCost ? '#fbbf24' : '#4b5563';
            this.ctx.fillRect(btnX, btnY, 90, 40);
            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 12px MedievalSharp';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('UPGRADE', btnX + 45, btnY + 20);
            this.ctx.fillText(`${upgradeCost}G`, btnX + 45, btnY + 35);
        } else {
            // Selection UI
            const slotWidth = this.width / 3;
            Object.keys(this.towerTypes).forEach((key, i) => {
                const type = this.towerTypes[key];
                const x = i * slotWidth;
                
                if (this.selectedType === key) {
                    this.ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
                    this.ctx.fillRect(x, uiY, slotWidth, 60);
                }

                this.drawMedievalTower(x + slotWidth/2, uiY + 25, type.color, false);
                
                this.ctx.fillStyle = '#fbbf24';
                this.ctx.font = '10px MedievalSharp';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(type.name, x + slotWidth/2, uiY + 45);
                this.ctx.fillText(`${type.cost}G`, x + slotWidth/2, uiY + 55);
            });
        }
    }

    endGame() {
        this.gameOver = true;
        cancelAnimationFrame(this.requestId);
        setTimeout(() => {
            alert(`DEFEAT! Thy kingdom has fallen at Wave ${this.wave}.`);
            this.start();
        }, 100);
    }

    stop() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        this.canvas.removeEventListener('click', this.boundClick);
        this.container.innerHTML = '';
    }
}
