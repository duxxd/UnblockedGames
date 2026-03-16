export class AppleTycoon {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = 700;
        this.height = 400;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.timeSpeed = 1; 
        this.openModal = null; 
        this.hitboxes = []; 
        this.gameOver = false;
        
        this.gold = 500;
        this.debt = 0;
        this.maxDebt = 5000;
        this.loanInterestRate = 0.001; 
        
        this.day = 1;
        this.month = 4; // Start in Spring
        this.year = 1;
        this.season = 'Spring';
        this.seasons = ['Winter', 'Spring', 'Summer', 'Autumn'];
        
        this.applesInInventory = 0;
        this.storageCapacity = 200;
        this.storageUpgradeCost = 150;
        
        this.juiceInInventory = 0;
        this.juicePriceMultiplier = 4.0;
        this.factoryLevel = 0;
        this.factoryUpgradeCost = 500;
        this.juiceProcessingRate = 0;

        this.workers = 0;
        this.workerCost = 200;
        this.workerWage = 2; 
        this.workerHarvestCapacity = 10; 

        this.mules = 0;
        this.muleCost = 300;
        this.muleLeaseIncome = 8;

        this.marketPrice = 2;
        this.marketDemand = 1.0;
        this.marketEvent = 'Normal Market';
        this.weather = 'Clear';

        this.trees = [];
        this.maxTrees = 15;
        this.treeCost = 50;
        this.maintenanceCost = 0.4;
        this.landTax = 5;
        
        this.ledger = { income: 0, expenses: 0, history: [] };
        this.dailyStats = { income: 0, expenses: 0 };

        this.workerSprites = [];
        this.factoryBuilding = { x: 650, y: 250, width: 120, height: 100 };

        this.lastTime = performance.now();
        this.dayTimer = 0;
        this.dayDuration = 1500; 

        this.requestId = null;
        this.boundClick = this.handleClick.bind(this);
        this.updateBound = this.update.bind(this); // Optimized binding
        
        this.init();
    }

    init() {
        if (!this.loadGame()) {
            this.addTree(0, 100); // Start with one fully grown tree
            this.addTree(1, 20);  // and one sapling
        }
        this.canvas.addEventListener('click', this.boundClick);
    }

    // --- SAVE / LOAD SYSTEM ---
    saveGame() {
        const saveData = {
            gold: this.gold, debt: this.debt, day: this.day, month: this.month, year: this.year,
            season: this.season, weather: this.weather, applesInInventory: this.applesInInventory,
            juiceInInventory: this.juiceInInventory, storageCapacity: this.storageCapacity,
            storageUpgradeCost: this.storageUpgradeCost, factoryLevel: this.factoryLevel,
            factoryUpgradeCost: this.factoryUpgradeCost, juiceProcessingRate: this.juiceProcessingRate,
            workers: this.workers, workerCost: this.workerCost, mules: this.mules, muleCost: this.muleCost,
            treeCost: this.treeCost, marketPrice: this.marketPrice, marketDemand: this.marketDemand,
            marketEvent: this.marketEvent, trees: this.trees, ledger: this.ledger
        };
        localStorage.setItem('appleTycoonSave', JSON.stringify(saveData));
    }

    loadGame() {
        const saved = localStorage.getItem('appleTycoonSave');
        if (saved) {
            try {
                Object.assign(this, JSON.parse(saved));
                this.workerSprites = Array.from({length: this.workers}, () => ({
                    x: Math.random() * this.width, y: this.height - 150 + Math.random() * 40, targetX: Math.random() * this.width, speed: 1 + Math.random()
                }));
                return true;
            } catch (e) { return false; }
        }
        return false;
    }

    resetGame() {
        localStorage.removeItem('appleTycoonSave');
        
        // Manual reset to bypass strict iframe/sandbox rules
        this.gold = 500; this.debt = 0; this.day = 1; this.month = 4; this.year = 1;
        this.season = 'Spring'; this.applesInInventory = 0; this.juiceInInventory = 0;
        this.storageCapacity = 200; this.storageUpgradeCost = 150; this.factoryLevel = 0;
        this.factoryUpgradeCost = 500; this.juiceProcessingRate = 0; this.workers = 0;
        this.workerCost = 200; this.mules = 0; this.muleCost = 300; this.treeCost = 50;
        this.trees = []; this.workerSprites = [];
        this.ledger = { income: 0, expenses: 0, history: [] };
        this.dailyStats = { income: 0, expenses: 0 };
        this.gameOver = false;
        this.timeSpeed = 1;
        this.openModal = null;
        
        this.addTree(0, 100);
        this.addTree(1, 20);
        
        // Jumpstart the engine again
        this.lastTime = performance.now();
        if (this.requestId) cancelAnimationFrame(this.requestId);
        this.updateBound(performance.now());
    }

    start() {
        this.lastTime = performance.now();
        this.setInstructions();
        this.updateBound(performance.now());
    }

    setInstructions() {
        const inst = document.getElementById('game-instructions');
        if (inst) inst.innerText = 'Click trees to harvest • Manage your orchard via the menu';
    }

    addTree(index, initialGrowth = 0) {
        if (this.trees.length >= this.maxTrees) return;
        const col = index % 5, row = Math.floor(index / 5);
        this.trees.push({ 
            x: 80 + col * 160, 
            y: 160 + row * 60, 
            growth: initialGrowth, 
            apples: 0, 
            maxApples: 20, 
            health: 100 
        });
    }

    // --- INTERACTION & LOGIC ---
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        // CSS Scaling Fix: Ensures clicks map perfectly to the canvas
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        if (this.gameOver) {
            this.resetGame();
            return;
        }

        // 1. Check dynamic UI hitboxes first
        for (let i = this.hitboxes.length - 1; i >= 0; i--) {
            const box = this.hitboxes[i];
            if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
                this.handleAction(box.action);
                return; 
            }
        }

        // 2. Click background to close modals
        if (this.openModal) {
            this.openModal = null;
            return;
        }

        // 3. Harvest clicking
        if (!this.openModal) {
            this.trees.forEach(tree => {
                if (Math.hypot(tree.x - x, tree.y - (y + 45)) < 40 && tree.apples > 0) { 
                    const spaceLeft = this.storageCapacity - this.applesInInventory;
                    const toCollect = Math.min(tree.apples, spaceLeft);
                    this.applesInInventory += toCollect;
                    tree.apples -= toCollect;
                }
            });
        }
    }

    handleAction(action) {
        switch(action) {
            case 'speed_pause': this.timeSpeed = 0; break;
            case 'speed_1x': this.timeSpeed = 1; break;
            case 'speed_3x': this.timeSpeed = 3; break;
            
            case 'menu_market': this.openModal = 'market'; break;
            case 'menu_management': this.openModal = 'management'; break;
            case 'menu_bank': this.openModal = 'bank'; break;
            case 'menu_ledger': this.openModal = 'ledger'; break;
            case 'close_modal': this.openModal = null; break;

            case 'sell_all': this.sellAll(); break;
            case 'buy_tree': this.buyTree(); break;
            case 'upgrade_storage': this.upgradeStorage(); break;
            case 'hire_worker': this.hireWorker(); break;
            case 'upgrade_factory': this.upgradeFactory(); break;
            case 'loan_100': this.takeLoan(100); break;
            case 'loan_500': this.takeLoan(500); break;
            case 'repay_100': this.repayLoan(100); break;
            case 'repay_500': this.repayLoan(500); break;
            case 'buy_mule': this.buyMule(); break;
        }
    }

    takeLoan(amount) { if (this.debt + amount <= this.maxDebt) { this.gold += amount; this.debt += amount; } }
    repayLoan(amount) { const toPay = Math.min(amount, this.debt, this.gold); this.gold -= toPay; this.debt -= toPay; }
    buyMule() { if (this.gold >= this.muleCost) { this.gold -= this.muleCost; this.mules++; this.muleCost = Math.floor(this.muleCost * 1.2); } }
    buyTree() { if (this.gold >= this.treeCost && this.trees.length < this.maxTrees) { this.gold -= this.treeCost; this.addTree(this.trees.length); this.treeCost = Math.floor(this.treeCost * 1.3); } }
    upgradeStorage() { if (this.gold >= this.storageUpgradeCost) { this.gold -= this.storageUpgradeCost; this.storageCapacity += 100; this.storageUpgradeCost = Math.floor(this.storageUpgradeCost * 1.5); } }
    hireWorker() { if (this.gold >= this.workerCost) { this.gold -= this.workerCost; this.workers++; this.workerCost = Math.floor(this.workerCost * 1.4); this.workerSprites.push({ x: Math.random() * this.width, y: this.height - 150 + Math.random() * 40, targetX: Math.random() * this.width, speed: 1 + Math.random() }); } }
    upgradeFactory() { if (this.gold >= this.factoryUpgradeCost) { this.gold -= this.factoryUpgradeCost; this.factoryLevel++; this.juiceProcessingRate += 5; this.factoryUpgradeCost = Math.floor(this.factoryUpgradeCost * 1.8); } }
    
    sellAll() {
        let income = 0;
        if (this.applesInInventory > 0) { income += this.applesInInventory * this.marketPrice * this.marketDemand; this.marketPrice *= (1 - (this.applesInInventory / 2000)); this.applesInInventory = 0; }
        if (this.juiceInInventory > 0) { income += this.juiceInInventory * this.marketPrice * this.juicePriceMultiplier * this.marketDemand; this.juiceInInventory = 0; }
        this.gold += income;
        this.dailyStats.income += income;
    }

    update(time = 0) {
        if (this.gameOver) return;
        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        if (this.timeSpeed > 0) {
            this.dayTimer += (deltaTime * this.timeSpeed);
            
            if (this.dayTimer > this.dayDuration) {
                this.nextDay();
                
                if (this.applesInInventory > 0) this.applesInInventory -= this.applesInInventory * 0.05; 
                if (this.applesInInventory > 0 && this.juiceProcessingRate > 0) {
                    const toProcess = Math.min(this.applesInInventory, this.juiceProcessingRate);
                    this.applesInInventory -= toProcess;
                    this.juiceInInventory += toProcess * 0.8; 
                }

                const dailyCost = (this.trees.length * this.maintenanceCost) + (this.workers * this.workerWage) + this.landTax;
                this.dailyStats.expenses += dailyCost;

                if (this.debt > 0) { const interest = this.debt * this.loanInterestRate; this.debt += interest; this.dailyStats.expenses += interest; }
                if (this.season === 'Winter' && this.mules > 0) { const mInc = this.mules * this.muleLeaseIncome; this.gold += mInc; this.dailyStats.income += mInc; }

                this.gold -= dailyCost;
                this.ledger.history.push({ ...this.dailyStats, day: this.day, month: this.month });
                if (this.ledger.history.length > 7) this.ledger.history.shift();
                this.dailyStats = { income: 0, expenses: 0 };

                if (this.gold <= 0) {
                    this.gameOver = true;
                    this.draw(); // Final render
                    return;
                }
                this.dayTimer = 0;
            }

            this.workerSprites.forEach(s => {
                if (Math.abs(s.x - s.targetX) < 5) s.targetX = Math.random() * this.width;
                s.x += (s.x < s.targetX ? s.speed : -s.speed) * this.timeSpeed;
            });
        }

        this.draw();
        this.requestId = requestAnimationFrame(this.updateBound);
    }

    nextDay() {
        this.day++;
        
        // Tree Growth Logic
        const growthRate = this.season === 'Spring' ? 2 : (this.season === 'Summer' ? 1 : (this.season === 'Autumn' ? 0.5 : 0.1));
        this.trees.forEach(t => {
            if (t.growth < 100) {
                t.growth = Math.min(100, t.growth + growthRate);
            }
        });

        if (this.season === 'Summer' || this.season === 'Autumn') {
            const wMod = this.weather === 'Rain' ? 1.5 : (this.weather === 'Drought' ? 0.5 : 1.0);
            this.trees.forEach(t => { if (t.growth >= 100) t.apples = Math.min(t.maxApples, t.apples + (4 * wMod)); });

            if (this.workers > 0) {
                let capacity = this.workers * this.workerHarvestCapacity;
                this.trees.forEach(t => {
                    if (t.apples > 0 && capacity > 0) {
                        const amt = Math.min(t.apples, capacity, this.storageCapacity - this.applesInInventory);
                        this.applesInInventory += amt; t.apples -= amt; capacity -= amt;
                    }
                });
            }
        }
        if (this.day > 30) {
            this.day = 1; this.month++;
            if (this.month > 12) { this.month = 1; this.year++; }
            this.season = this.seasons[Math.floor((this.month - 1) / 3)];
            this.updateMarket(); this.updateWeather();
        }
        this.saveGame();
    }

    updateWeather() { this.weather = ['Clear', 'Clear', 'Rain', 'Drought'][Math.floor(Math.random() * 4)]; }
    updateMarket() {
        const base = {'Winter': 5, 'Spring': 3, 'Summer': 2.5, 'Autumn': 1.5}[this.season];
        this.marketPrice = base + (Math.random() * 0.5 - 0.25);
        this.marketDemand = 0.8 + Math.random() * 0.4;
    }

    // --- DRAWING ---
    draw() {
        this.hitboxes = []; 

        this.drawBackground();
        if (this.factoryLevel > 0) this.drawFactory();
        this.drawWorkers();
        this.trees.forEach(t => this.drawTree(t));

        this.drawTopUI();
        this.drawBottomNav();

        if (this.openModal) this.drawModal();

        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#ef4444';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('BANKRUPTCY!', this.width / 2, this.height / 2 - 20);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px Arial';
            this.ctx.fillText('You ran out of gold to maintain the orchard.', this.width / 2, this.height / 2 + 20);
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.fillText('Click anywhere to restart', this.width / 2, this.height / 2 + 60);
        }
    }

    drawTopUI() {
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        this.ctx.fillRect(0, 0, this.width, 40);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px "JetBrains Mono", monospace';
        this.ctx.textAlign = 'left';
        
        const info = `GOLD: ${Math.floor(this.gold)}G | DEBT: ${Math.floor(this.debt)}G | APPLES: ${Math.floor(this.applesInInventory)}/${this.storageCapacity} | JUICE: ${Math.floor(this.juiceInInventory)} | DATE: Y${this.year} M${this.month} D${this.day} (${this.season})`;
        this.ctx.fillText(info, 15, 25);

        this.drawButton(660, 8, 30, 24, this.timeSpeed === 0 ? '#3b82f6' : '#475569', '||', '', 'speed_pause');
        this.drawButton(700, 8, 30, 24, this.timeSpeed === 1 ? '#3b82f6' : '#475569', '>', '', 'speed_1x');
        this.drawButton(740, 8, 40, 24, this.timeSpeed === 3 ? '#3b82f6' : '#475569', '>>', '', 'speed_3x');
    }

    drawBottomNav() {
        const uiY = this.height - 50;
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, uiY, this.width, 50);

        const bw = 150;
        const startX = (this.width - (bw * 4 + 30)) / 2; 

        this.drawButton(startX, uiY + 8, bw, 34, '#10b981', '🛒 MARKET', '', 'menu_market');
        this.drawButton(startX + bw + 10, uiY + 8, bw, 34, '#f59e0b', '🛠️ MANAGEMENT', '', 'menu_management');
        this.drawButton(startX + bw*2 + 20, uiY + 8, bw, 34, '#6366f1', '🏦 BANK', '', 'menu_bank');
        this.drawButton(startX + bw*3 + 30, uiY + 8, bw, 34, '#64748b', '📊 LEDGER', '', 'menu_ledger');
    }

    drawModal() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const mw = 500, mh = 300;
        const mx = (this.width - mw) / 2;
        const my = (this.height - mh) / 2;

        this.ctx.fillStyle = '#1e293b';
        this.ctx.beginPath(); 
        
        // Safety check for older browsers
        if (this.ctx.roundRect) this.ctx.roundRect(mx, my, mw, mh, 10);
        else this.ctx.rect(mx, my, mw, mh);
        
        this.ctx.fill();
        this.ctx.strokeStyle = '#334155'; this.ctx.lineWidth = 3; this.ctx.stroke();

        this.drawButton(mx + mw - 40, my + 10, 30, 30, '#ef4444', 'X', '', 'close_modal');

        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        
        if (this.openModal === 'market') {
            this.ctx.font = 'bold 24px Arial'; this.ctx.fillText('FARMER\'S MARKET', mx + mw/2, my + 40);
            this.ctx.font = '14px Arial';
            this.ctx.fillText(`Market Event: ${this.marketEvent}`, mx + mw/2, my + 70);
            this.ctx.fillText(`Apple Value: ${(this.marketPrice * this.marketDemand).toFixed(2)}G | Juice Value: ${(this.marketPrice * this.juicePriceMultiplier * this.marketDemand).toFixed(2)}G`, mx + mw/2, my + 90);
            
            const totalVal = ((this.applesInInventory * this.marketPrice * this.marketDemand) + (this.juiceInInventory * this.marketPrice * this.juicePriceMultiplier * this.marketDemand)).toFixed(1);
            this.drawButton(mx + 150, my + 150, 200, 50, '#10b981', 'SELL ALL GOODS', `Earn ${totalVal}G`, 'sell_all');
        } 
        else if (this.openModal === 'management') {
            this.ctx.font = 'bold 24px Arial'; this.ctx.fillText('ORCHARD MANAGEMENT', mx + mw/2, my + 40);
            
            this.drawButton(mx + 40, my + 80, 200, 60, this.gold >= this.treeCost && this.trees.length < this.maxTrees ? '#3b82f6' : '#475569', 'PLANT TREE', `Cost: ${this.treeCost}G`, 'buy_tree');
            this.drawButton(mx + 260, my + 80, 200, 60, this.gold >= this.storageUpgradeCost ? '#a855f7' : '#475569', 'UPGRADE BARN', `Cost: ${this.storageUpgradeCost}G`, 'upgrade_storage');
            this.drawButton(mx + 40, my + 160, 200, 60, this.gold >= this.workerCost ? '#f59e0b' : '#475569', 'HIRE WORKER', `Cost: ${this.workerCost}G`, 'hire_worker');
            this.drawButton(mx + 260, my + 160, 200, 60, this.gold >= this.factoryUpgradeCost ? '#ec4899' : '#475569', 'JUICE FACTORY', `Cost: ${this.factoryUpgradeCost}G`, 'upgrade_factory');
        }
        else if (this.openModal === 'bank') {
            this.ctx.font = 'bold 24px Arial'; this.ctx.fillText('NATIONAL BANK', mx + mw/2, my + 40);
            
            this.drawButton(mx + 40, my + 80, 130, 50, this.debt + 100 <= this.maxDebt ? '#10b981' : '#475569', 'LOAN 100G', '+100G', 'loan_100');
            this.drawButton(mx + 185, my + 80, 130, 50, this.debt + 500 <= this.maxDebt ? '#10b981' : '#475569', 'LOAN 500G', '+500G', 'loan_500');
            this.drawButton(mx + 40, my + 140, 130, 50, this.gold >= 100 && this.debt >= 100 ? '#ef4444' : '#475569', 'REPAY 100G', '-100G', 'repay_100');
            this.drawButton(mx + 185, my + 140, 130, 50, this.gold >= 500 && this.debt >= 500 ? '#ef4444' : '#475569', 'REPAY 500G', '-500G', 'repay_500');
            
            this.ctx.fillStyle = '#94a3b8'; this.ctx.fillRect(mx + 330, my + 80, 2, 110);
            
            this.drawButton(mx + 345, my + 110, 130, 50, this.gold >= this.muleCost ? '#6366f1' : '#475569', 'BUY MULE', `Cost: ${this.muleCost}G`, 'buy_mule');
            this.ctx.fillStyle = '#fff'; this.ctx.font = '12px Arial'; this.ctx.fillText(`Mules Owned: ${this.mules}`, mx + 410, my + 180);
        }
        else if (this.openModal === 'ledger') {
            this.ctx.font = 'bold 24px Arial'; this.ctx.fillText('FINANCIAL LEDGER', mx + mw/2, my + 40);
            this.ctx.font = '12px "JetBrains Mono", monospace'; this.ctx.textAlign = 'left';
            this.ctx.fillText('DAY    INCOME    EXPENSES    NET', mx + 50, my + 80);
            this.ctx.fillText('---------------------------------------', mx + 50, my + 90);
            
            this.ledger.history.slice().reverse().forEach((entry, i) => {
                const net = entry.income - entry.expenses;
                const line = `D${entry.day.toString().padEnd(2)}    ${entry.income.toFixed(1).padEnd(10)} ${entry.expenses.toFixed(1).padEnd(11)} ${net.toFixed(1)}`;
                this.ctx.fillStyle = net >= 0 ? '#10b981' : '#ef4444';
                this.ctx.fillText(line, mx + 50, my + 110 + i * 20);
            });
        }
    }

    drawButton(x, y, w, h, color, text, subtext = '', action = null) {
        if (action) this.hitboxes.push({ x, y, w, h, action }); 

        this.ctx.fillStyle = color;
        this.ctx.beginPath(); 
        
        // Safety check for older browsers
        if (this.ctx.roundRect) this.ctx.roundRect(x, y, w, h, 6);
        else this.ctx.rect(x, y, w, h);
        
        this.ctx.fill();
        
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        
        if (subtext) {
            this.ctx.font = 'bold 13px Arial';
            this.ctx.fillText(text, x + w / 2, y + h / 2 - 2);
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
            this.ctx.fillText(subtext, x + w / 2, y + h / 2 + 12);
        } else {
            this.ctx.font = 'bold 12px Arial';
            this.ctx.fillText(text, x + w / 2, y + h / 2 + 4);
        }
    }

    drawBackground() {
        const skyG = this.ctx.createLinearGradient(0, 0, 0, this.height);
        skyG.addColorStop(0, this.season === 'Winter' ? '#94a3b8' : this.season === 'Spring' ? '#7dd3fc' : this.season === 'Summer' ? '#38bdf8' : '#f97316');
        skyG.addColorStop(1, this.season === 'Winter' ? '#e2e8f0' : this.season === 'Spring' ? '#dcfce7' : this.season === 'Summer' ? '#fef9c3' : '#ffedd5');
        this.ctx.fillStyle = skyG; this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = this.season === 'Winter' ? '#cbd5e1' : (this.season === 'Autumn' ? '#451a03' : '#064e3b');
        this.ctx.beginPath(); this.ctx.moveTo(0, 100); this.ctx.quadraticCurveTo(400, 50, 800, 100); this.ctx.lineTo(800, 150); this.ctx.lineTo(0, 150); this.ctx.fill();
        
        const gG = this.ctx.createLinearGradient(0, 150, 0, this.height);
        gG.addColorStop(0, this.season === 'Winter' ? '#f8fafc' : this.season === 'Autumn' ? '#78350f' : '#166534');
        gG.addColorStop(1, this.season === 'Winter' ? '#cbd5e1' : this.season === 'Autumn' ? '#451a03' : '#064e3b');
        this.ctx.fillStyle = gG; this.ctx.fillRect(0, 150, this.width, this.height - 150);
    }

    drawTree(t) {
        this.ctx.fillStyle = '#451a03'; this.ctx.fillRect(t.x - 6, t.y - 45, 12, 45);
        let fSize = Math.min(40, 18 + (t.growth / 100) * 22);
        if (this.season === 'Winter') fSize *= 0.7;
        
        this.ctx.fillStyle = this.season === 'Autumn' ? '#ea580c' : (this.season === 'Winter' ? '#e2e8f0' : '#22c55e');
        this.ctx.beginPath(); this.ctx.arc(t.x, t.y - 55, fSize, 0, Math.PI * 2); this.ctx.fill();
        
        if (t.apples > 0 && (this.season === 'Summer' || this.season === 'Autumn')) {
            this.ctx.fillStyle = '#ef4444';
            for (let i = 0; i < Math.min(8, Math.ceil(t.apples / 2.5)); i++) {
                this.ctx.beginPath(); this.ctx.arc(t.x + Math.cos(i*1.5)*fSize*0.6, t.y - 55 + Math.sin(i*1.5)*fSize*0.6, 4.5, 0, Math.PI*2); this.ctx.fill();
            }
        }
    }

    drawFactory() { const f = this.factoryBuilding; this.ctx.fillStyle = '#475569'; this.ctx.fillRect(f.x, f.y, f.width, f.height); this.ctx.fillStyle = '#1e293b'; this.ctx.beginPath(); this.ctx.moveTo(f.x - 10, f.y); this.ctx.lineTo(f.x + f.width / 2, f.y - 30); this.ctx.lineTo(f.x + f.width + 10, f.y); this.ctx.fill(); }
    drawWorkers() { this.workerSprites.forEach(s => { this.ctx.fillStyle = '#334155'; this.ctx.fillRect(s.x - 4, s.y - 20, 8, 15); this.ctx.fillStyle = '#f59e0b'; this.ctx.beginPath(); this.ctx.arc(s.x, s.y - 25, 6, 0, Math.PI*2); this.ctx.fill(); }); }

    stop() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        this.canvas.removeEventListener('click', this.boundClick);
        this.container.innerHTML = '';
    }
}