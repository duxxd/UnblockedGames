export class AppleTycoon {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = 300;
        this.height = 450;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.gold = 100;
        this.day = 1;
        this.month = 1;
        this.year = 1;
        this.season = 'Winter';
        this.seasons = ['Winter', 'Spring', 'Summer', 'Autumn'];
        
        this.applesInInventory = 0;
        this.storageCapacity = 50;
        this.storageUpgradeCost = 100;
        
        this.marketPrice = 2;
        this.marketDemand = 1.0;
        this.marketTrend = 'stable'; // 'rising', 'falling', 'stable'
        this.marketEvent = 'Normal Market';

        this.trees = [];
        this.maxTrees = 9;
        this.treeCost = 50;

        // Initialize with one tree
        this.addTree(0);

        this.lastTime = 0;
        this.dayTimer = 0;
        this.dayDuration = 2000; // 2 seconds per day

        this.requestId = null;
        this.boundClick = this.handleClick.bind(this);
        this.init();
    }

    init() {
        this.canvas.addEventListener('click', this.boundClick);
        this.updateUI();
        this.start();
    }

    start() {
        this.update();
    }

    addTree(index) {
        if (this.trees.length >= this.maxTrees) return;
        
        const row = Math.floor(index / 3);
        const col = index % 3;
        const x = 50 + col * 100;
        const y = 80 + row * 100;

        this.trees.push({
            x, y,
            growth: 0, // 0 to 100
            apples: 0,
            maxApples: 5,
            health: 100
        });
    }

    updateUI() {
        const el = document.getElementById('game-score');
        if (el) el.innerText = `Gold: ${Math.floor(this.gold)} | Apples: ${Math.floor(this.applesInInventory)}/${this.storageCapacity} | ${this.season} Day ${this.day}`;
        
        const inst = document.getElementById('game-instructions');
        if (inst) inst.innerText = `[${this.marketEvent}] Price: ${this.marketPrice.toFixed(2)}G | Demand: ${(this.marketDemand * 100).toFixed(0)}%`;
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // UI Area (Bottom)
        if (y > this.height - 80) {
            const btnWidth = this.width / 3;
            if (x < btnWidth) {
                // Sell all apples
                this.sellApples();
            } else if (x < btnWidth * 2) {
                // Buy tree
                this.buyTree();
            } else {
                // Upgrade storage
                this.upgradeStorage();
            }
            return;
        }

        // Tree interaction
        this.trees.forEach(tree => {
            if (Math.hypot(tree.x - x, tree.y - y) < 30) {
                if (tree.apples > 0) {
                    const spaceLeft = this.storageCapacity - this.applesInInventory;
                    const toCollect = Math.min(tree.apples, spaceLeft);
                    this.applesInInventory += toCollect;
                    tree.apples -= toCollect;
                    this.updateUI();
                }
            }
        });
    }

    sellApples() {
        if (this.applesInInventory > 0) {
            const totalValue = this.applesInInventory * this.marketPrice * this.marketDemand;
            this.gold += totalValue;
            this.applesInInventory = 0;
            this.updateUI();
        }
    }

    buyTree() {
        if (this.gold >= this.treeCost && this.trees.length < this.maxTrees) {
            this.gold -= this.treeCost;
            this.addTree(this.trees.length);
            this.treeCost = Math.floor(this.treeCost * 1.8);
            this.updateUI();
        }
    }

    upgradeStorage() {
        if (this.gold >= this.storageUpgradeCost) {
            this.gold -= this.storageUpgradeCost;
            this.storageCapacity += 50;
            this.storageUpgradeCost = Math.floor(this.storageUpgradeCost * 2.2);
            this.updateUI();
        }
    }

    update(time = 0) {
        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        this.dayTimer += deltaTime;
        // Spoilage logic
        if (this.dayTimer > this.dayDuration) {
            this.nextDay();
            // Spoilage: 5% of inventory rots every day
            if (this.applesInInventory > 0) {
                const spoiled = this.applesInInventory * 0.05;
                this.applesInInventory -= spoiled;
            }
            this.dayTimer = 0;
        }

        // Growth logic
        this.trees.forEach(tree => {
            if (this.season === 'Spring') {
                tree.growth = Math.min(100, tree.growth + 0.5);
            } else if (this.season === 'Summer') {
                if (tree.growth >= 100 && tree.apples < tree.maxApples) {
                    tree.apples += 0.01;
                }
            } else if (this.season === 'Autumn') {
                // Apples ripen faster or fall?
                if (tree.growth >= 100 && tree.apples < tree.maxApples) {
                    tree.apples += 0.02;
                }
            } else if (this.season === 'Winter') {
                // Trees go dormant
                tree.apples = Math.max(0, tree.apples - 0.005);
            }
        });

        this.draw();
        this.requestId = requestAnimationFrame(this.update.bind(this));
    }

    nextDay() {
        this.day++;
        if (this.day > 30) {
            this.day = 1;
            this.month++;
            if (this.month > 12) {
                this.month = 1;
                this.year++;
            }
            this.season = this.seasons[Math.floor((this.month - 1) / 3)];
            this.updateMarket();
        }
        this.updateUI();
    }

    updateMarket() {
        const basePrices = {
            'Winter': 5,
            'Spring': 3,
            'Summer': 2.5,
            'Autumn': 1.5
        };
        
        // Random Market Events
        const events = [
            { name: 'Normal Market', priceMod: 1.0, demandMod: 1.0 },
            { name: 'Apple Festival', priceMod: 1.5, demandMod: 2.0 },
            { name: 'Bumper Crop', priceMod: 0.6, demandMod: 1.2 },
            { name: 'Apple Blight', priceMod: 2.5, demandMod: 0.5 },
            { name: 'Healthy Trend', priceMod: 1.2, demandMod: 1.8 },
            { name: 'Economic Slump', priceMod: 0.8, demandMod: 0.6 }
        ];

        const event = events[Math.floor(Math.random() * events.length)];
        this.marketEvent = event.name;
        
        this.marketPrice = (basePrices[this.season] * event.priceMod) + (Math.random() * 0.5 - 0.25);
        this.marketDemand = event.demandMod * (0.8 + Math.random() * 0.4);
    }

    draw() {
        // Background based on season
        const seasonColors = {
            'Winter': '#e2e8f0',
            'Spring': '#dcfce7',
            'Summer': '#fef9c3',
            'Autumn': '#ffedd5'
        };
        this.ctx.fillStyle = seasonColors[this.season];
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Trees
        this.trees.forEach(tree => {
            this.drawTree(tree);
        });

        // Draw UI
        this.drawGameUI();
    }

    drawTree(tree) {
        const x = tree.x;
        const y = tree.y;

        // Trunk
        this.ctx.fillStyle = '#78350f';
        this.ctx.fillRect(x - 5, y, 10, 20);

        // Foliage
        const foliageSize = 20 + (tree.growth / 100) * 20;
        this.ctx.fillStyle = this.season === 'Autumn' ? '#b45309' : (this.season === 'Winter' ? '#94a3b8' : '#15803d');
        this.ctx.beginPath();
        this.ctx.arc(x, y - 10, foliageSize, 0, Math.PI * 2);
        this.ctx.fill();

        // Apples
        const appleCount = Math.floor(tree.apples);
        this.ctx.fillStyle = '#ef4444';
        for (let i = 0; i < appleCount; i++) {
            const ax = x + Math.cos(i * 1.2) * (foliageSize - 10);
            const ay = y - 10 + Math.sin(i * 1.2) * (foliageSize - 10);
            this.ctx.beginPath();
            this.ctx.arc(ax, ay, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawGameUI() {
        const uiY = this.height - 80;
        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(0, uiY, this.width, 80);

        const btnWidth = this.width / 3;

        // Sell Button
        this.ctx.fillStyle = '#10b981';
        this.ctx.fillRect(5, uiY + 10, btnWidth - 10, 60);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SELL ALL', btnWidth / 2, uiY + 35);
        this.ctx.font = '9px Arial';
        this.ctx.fillText(`${(this.applesInInventory * this.marketPrice * this.marketDemand).toFixed(1)}G`, btnWidth / 2, uiY + 55);

        // Buy Button
        this.ctx.fillStyle = this.gold >= this.treeCost && this.trees.length < this.maxTrees ? '#3b82f6' : '#475569';
        this.ctx.fillRect(btnWidth + 5, uiY + 10, btnWidth - 10, 60);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillText('BUY TREE', btnWidth * 1.5, uiY + 35);
        this.ctx.font = '9px Arial';
        this.ctx.fillText(`${this.treeCost}G`, btnWidth * 1.5, uiY + 55);

        // Upgrade Storage Button
        this.ctx.fillStyle = this.gold >= this.storageUpgradeCost ? '#a855f7' : '#475569';
        this.ctx.fillRect(btnWidth * 2 + 5, uiY + 10, btnWidth - 10, 60);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillText('STORAGE+', btnWidth * 2.5, uiY + 35);
        this.ctx.font = '9px Arial';
        this.ctx.fillText(`${this.storageUpgradeCost}G`, btnWidth * 2.5, uiY + 55);
    }

    stop() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        this.canvas.removeEventListener('click', this.boundClick);
        this.container.innerHTML = '';
    }
}
