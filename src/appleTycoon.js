export class AppleTycoon {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = 800;
        this.height = 450;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Balanced starting economy
        this.gold = 200;
        this.debt = 0;
        this.maxDebt = 5000;
        this.loanInterestRate = 0.001; // 0.1% daily interest (Much more realistic)
        
        this.day = 1;
        this.month = 1;
        this.year = 1;
        this.season = 'Winter';
        this.seasons = ['Winter', 'Spring', 'Summer', 'Autumn'];
        
        this.applesInInventory = 0;
        this.storageCapacity = 100;
        this.storageUpgradeCost = 150;
        
        this.juiceInInventory = 0;
        this.juicePriceMultiplier = 3.5;
        this.factoryLevel = 0;
        this.factoryUpgradeCost = 500;
        this.juiceProcessingRate = 0;

        this.workers = 0;
        this.workerCost = 200;
        this.workerWage = 2; // Gold per day per worker
        this.workerHarvestCapacity = 10; // Apples harvested per worker per day

        this.mules = 0;
        this.muleCost = 300;
        this.muleLeaseIncome = 8;

        this.fertilizerEffect = 1.0; 

        this.marketPrice = 2;
        this.marketDemand = 1.0;
        this.marketEvent = 'Normal Market';
        this.weather = 'Clear';
        this.priceHistory = [];

        this.trees = [];
        this.maxTrees = 15;
        this.treeCost = 50;
        this.maintenanceCost = 0.8;
        this.landTax = 10;

        this.activeTab = 'orchard'; 
        
        this.ledger = {
            income: 0,
            expenses: 0,
            history: [] 
        };
        this.dailyStats = { income: 0, expenses: 0 };

        this.workerSprites = [];
        this.factoryBuilding = { x: 650, y: 250, width: 120, height: 100 };

        this.addTree(0);

        this.lastTime = performance.now();
        this.dayTimer = 0;
        this.dayDuration = 1500; // 1.5 seconds per day

        this.requestId = null;
        this.boundClick = this.handleClick.bind(this);
        this.init();
    }

    resetGame() {
        this.gold = 200;
        this.debt = 0;
        this.day = 1;
        this.month = 1;
        this.year = 1;
        this.season = 'Winter';
        this.applesInInventory = 0;
        this.juiceInInventory = 0;
        this.factoryLevel = 0;
        this.juiceProcessingRate = 0;
        this.workers = 0;
        this.mules = 0;
        this.trees = [];
        this.workerSprites = [];
        this.addTree(0);
        this.gameOver = false;
        this.updateUI();
    }

    init() {
        this.canvas.addEventListener('click', this.boundClick);
        this.updateUI();
        this.start();
    }

    start() {
        this.lastTime = performance.now();
        this.update(performance.now());
    }

    addTree(index) {
        if (this.trees.length >= this.maxTrees) return;
        
        const col = index % 5;
        const row = Math.floor(index / 5);
        const x = 80 + col * 160;
        const y = 160 + row * 60;

        this.trees.push({
            x, y,
            growth: 0, 
            apples: 0,
            maxApples: 20, // Increased so player has time to harvest
            health: 100
        });
    }

    updateUI() {}

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Tab Switching
        if (y < 40) {
            const tabWidth = this.width / 3;
            if (x < tabWidth) this.activeTab = 'orchard';
            else if (x < tabWidth * 2) this.activeTab = 'bank';
            else this.activeTab = 'ledger';
            return;
        }

        // UI Area Buttons
        if (y > this.height - 100) {
            const btnWidth = this.width / 5;
            
            if (this.activeTab === 'orchard') {
                if (x < btnWidth) this.sellAll();
                else if (x < btnWidth * 2) this.buyTree();
                else if (x < btnWidth * 3) this.upgradeStorage();
                else if (x < btnWidth * 4) this.hireWorker();
                else this.upgradeFactory();
            } else if (this.activeTab === 'bank') {
                if (x < btnWidth) this.takeLoan(100);
                else if (x < btnWidth * 2) this.takeLoan(500);
                else if (x < btnWidth * 3) this.repayLoan(100);
                else if (x < btnWidth * 4) this.repayLoan(500);
                else this.buyMule();
            }
            return;
        }

        // Tree interaction (Manual Harvest)
        if (this.activeTab === 'orchard') {
            this.trees.forEach(tree => {
                // Click radius check
                if (Math.hypot(tree.x - x, tree.y - (y + 45)) < 40) { // Adjusted y-hitbox for trunk offset
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
    }

    takeLoan(amount) {
        if (this.debt + amount <= this.maxDebt) {
            this.gold += amount;
            this.debt += amount;
            this.updateUI();
        }
    }

    repayLoan(amount) {
        const toPay = Math.min(amount, this.debt, this.gold);
        this.gold -= toPay;
        this.debt -= toPay;
        this.updateUI();
    }

    buyMule() {
        if (this.gold >= this.muleCost) {
            this.gold -= this.muleCost;
            this.mules++;
            this.muleCost = Math.floor(this.muleCost * 1.2); // Slower scaling
            this.updateUI();
        }
    }

    sellAll() {
        let dailyIncome = 0;
        if (this.applesInInventory > 0) {
            const appleValue = this.applesInInventory * this.marketPrice * this.marketDemand;
            this.gold += appleValue;
            dailyIncome += appleValue;
            this.marketPrice *= (1 - (this.applesInInventory / 2000)); // Less extreme market crash
            this.applesInInventory = 0;
        }
        if (this.juiceInInventory > 0) {
            const juiceValue = this.juiceInInventory * this.marketPrice * this.juicePriceMultiplier * this.marketDemand;
            this.gold += juiceValue;
            dailyIncome += juiceValue;
            this.juiceInInventory = 0;
        }
        this.dailyStats.income += dailyIncome;
    }

    buyTree() {
        if (this.gold >= this.treeCost && this.trees.length < this.maxTrees) {
            this.gold -= this.treeCost;
            this.addTree(this.trees.length);
            this.treeCost = Math.floor(this.treeCost * 1.3); // Slower scaling
            this.updateUI();
        }
    }

    upgradeStorage() {
        if (this.gold >= this.storageUpgradeCost) {
            this.gold -= this.storageUpgradeCost;
            this.storageCapacity += 100;
            this.storageUpgradeCost = Math.floor(this.storageUpgradeCost * 1.5);
            this.updateUI();
        }
    }

    hireWorker() {
        if (this.gold >= this.workerCost) {
            this.gold -= this.workerCost;
            this.workers++;
            this.workerCost = Math.floor(this.workerCost * 1.4);
            
            this.workerSprites.push({
                x: Math.random() * this.width,
                y: this.height - 150 + Math.random() * 40,
                targetX: Math.random() * this.width,
                speed: 1 + Math.random()
            });
            this.updateUI();
        }
    }

    upgradeFactory() {
        if (this.gold >= this.factoryUpgradeCost) {
            this.gold -= this.factoryUpgradeCost;
            this.factoryLevel++;
            this.juiceProcessingRate += 5; // More impactful
            this.factoryUpgradeCost = Math.floor(this.factoryUpgradeCost * 1.8);
            this.updateUI();
        }
    }

    update(time = 0) {
        if (this.gameOver) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        this.dayTimer += deltaTime;
        if (this.dayTimer > this.dayDuration) {
            this.nextDay();
            
            // Spoilage
            if (this.applesInInventory > 0) {
                const spoiled = this.applesInInventory * 0.05;
                this.applesInInventory -= spoiled;
            }

            // Factory Processing
            if (this.applesInInventory > 0 && this.juiceProcessingRate > 0) {
                const toProcess = Math.min(this.applesInInventory, this.juiceProcessingRate);
                this.applesInInventory -= toProcess;
                this.juiceInInventory += toProcess * 0.8; 
            }

            // Daily Costs
            const totalDailyCost = (this.trees.length * this.maintenanceCost) + (this.workers * this.workerWage) + this.landTax;
            this.dailyStats.expenses += totalDailyCost;

            if (this.debt > 0) {
                const interest = this.debt * this.loanInterestRate;
                this.debt += interest;
                this.dailyStats.expenses += interest;
            }

            if (this.season === 'Winter' && this.mules > 0) {
                const muleIncome = this.mules * this.muleLeaseIncome;
                this.gold += muleIncome;
                this.dailyStats.income += muleIncome;
            }

            this.gold -= totalDailyCost;
            
            this.ledger.history.push({ ...this.dailyStats, day: this.day, month: this.month });
            if (this.ledger.history.length > 7) this.ledger.history.shift();
            this.dailyStats = { income: 0, expenses: 0 };

            if (this.gold <= 0) {
                this.gameOver = true;
                this.draw(); 
                setTimeout(() => {
                    if (confirm("BANKRUPTCY! You ran out of gold. Restart?")) {
                        this.resetGame();
                        this.start(); // Restart loop properly
                    }
                }, 100);
                return;
            }

            this.dayTimer = 0;
        }

        // Sprite Movement
        this.workerSprites.forEach(s => {
            if (Math.abs(s.x - s.targetX) < 5) s.targetX = Math.random() * this.width;
            s.x += s.x < s.targetX ? s.speed : -s.speed;
        });

        // Spring Growth
        this.trees.forEach(tree => {
            const weatherMod = this.weather === 'Rain' ? 1.5 : (this.weather === 'Drought' ? 0.5 : 1.0);
            if (this.season === 'Spring') {
                tree.growth = Math.min(100, tree.growth + (0.5 * weatherMod));
            }
        });

        this.draw();
        this.requestId = requestAnimationFrame(this.update.bind(this));
    }

    nextDay() {
        this.day++;

        // Apple Production (Grow on tree)
        if (this.season === 'Summer' || this.season === 'Autumn') {
            const weatherMod = this.weather === 'Rain' ? 1.2 : (this.weather === 'Drought' ? 0.6 : 1.0);
            const yieldPerTree = 2 * weatherMod; // Base realistic yield
            
            this.trees.forEach(tree => {
                if (tree.growth >= 100) {
                    tree.apples = Math.min(tree.maxApples, tree.apples + yieldPerTree);
                }
            });

            // Worker Auto-Harvest Logistics
            if (this.workers > 0) {
                let totalHarvestCapacity = this.workers * this.workerHarvestCapacity;
                
                this.trees.forEach(tree => {
                    if (tree.apples > 0 && totalHarvestCapacity > 0) {
                        const spaceLeft = this.storageCapacity - this.applesInInventory;
                        const toCollect = Math.min(tree.apples, totalHarvestCapacity, spaceLeft);
                        
                        this.applesInInventory += toCollect;
                        tree.apples -= toCollect;
                        totalHarvestCapacity -= toCollect;
                    }
                });
            }
        }

        // Calendar Updates
        if (this.day > 30) {
            this.day = 1;
            this.month++;
            if (this.month > 12) {
                this.month = 1;
                this.year++;
            }
            this.season = this.seasons[Math.floor((this.month - 1) / 3)];
            this.updateMarket();
            this.updateWeather();
        }
        this.updateUI();
    }

    updateWeather() {
        const weathers = ['Clear', 'Clear', 'Rain', 'Drought'];
        this.weather = weathers[Math.floor(Math.random() * weathers.length)];
    }

    updateMarket() {
        const basePrices = {
            'Winter': 5,
            'Spring': 3,
            'Summer': 2.5,
            'Autumn': 1.5
        };
        
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
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.width, this.height);

        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        const season = this.season || 'Winter';
        
        if (season === 'Winter') {
            skyGradient.addColorStop(0, '#94a3b8');
            skyGradient.addColorStop(1, '#e2e8f0');
        } else if (season === 'Spring') {
            skyGradient.addColorStop(0, '#7dd3fc');
            skyGradient.addColorStop(1, '#dcfce7');
        } else if (season === 'Summer') {
            skyGradient.addColorStop(0, '#38bdf8');
            skyGradient.addColorStop(1, '#fef9c3');
        } else {
            skyGradient.addColorStop(0, '#f97316');
            skyGradient.addColorStop(1, '#ffedd5');
        }
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = season === 'Winter' ? '#cbd5e1' : (season === 'Autumn' ? '#451a03' : '#064e3b');
        this.ctx.beginPath();
        this.ctx.moveTo(0, 100);
        this.ctx.quadraticCurveTo(200, 50, 400, 100);
        this.ctx.quadraticCurveTo(600, 30, 800, 100);
        this.ctx.lineTo(800, 150);
        this.ctx.lineTo(0, 150);
        this.ctx.fill();

        this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 150);
        this.ctx.lineTo(this.width, 150);
        this.ctx.stroke();

        const groundY = 150; 
        const groundHeight = this.height - groundY - 100;
        
        const groundGradient = this.ctx.createLinearGradient(0, groundY, 0, groundY + groundHeight);
        if (season === 'Winter') {
            groundGradient.addColorStop(0, '#f8fafc');
            groundGradient.addColorStop(1, '#cbd5e1');
        } else if (season === 'Autumn') {
            groundGradient.addColorStop(0, '#78350f');
            groundGradient.addColorStop(1, '#451a03');
        } else {
            groundGradient.addColorStop(0, '#166534');
            groundGradient.addColorStop(1, '#064e3b');
        }
        
        this.ctx.fillStyle = groundGradient;
        this.ctx.fillRect(0, groundY, this.width, groundHeight);
        
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for(let i=0; i<30; i++) {
            const tx = (i * 37) % this.width;
            const ty = groundY + ((i * 13) % groundHeight);
            this.ctx.beginPath();
            this.ctx.ellipse(tx, ty, 15, 3, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }

        if (this.weather === 'Rain') {
            this.ctx.fillStyle = 'rgba(186, 230, 253, 0.4)';
            for (let i = 0; i < 50; i++) {
                this.ctx.fillRect(Math.random() * this.width, Math.random() * this.height, 2, 10);
            }
        }

        if (this.factoryLevel > 0) this.drawFactory();
        this.drawWorkers();

        if (this.activeTab === 'orchard') {
            this.trees.forEach(tree => this.drawTree(tree));
        } else if (this.activeTab === 'bank') {
            this.drawBankScreen();
        } else {
            this.drawLedgerScreen();
        }

        this.drawTabs();
        this.drawStatusBar();
        this.drawGameUI();
    }

    drawStatusBar() {
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        this.ctx.fillRect(0, 40, this.width, 30);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '11px "JetBrains Mono", monospace';
        this.ctx.textAlign = 'left';
        
        const colWidth = 158;
        const yPos = 60;

        this.ctx.fillText(`GOLD:   ${Math.floor(this.gold).toString().padStart(6, ' ')}G`, 10, yPos);
        this.ctx.fillText(`DEBT:   ${Math.floor(this.debt).toString().padStart(6, ' ')}G`, 10 + colWidth, yPos);
        this.ctx.fillText(`APPLES: ${Math.floor(this.applesInInventory).toString().padStart(4, ' ')}/${this.storageCapacity}`, 10 + colWidth * 2, yPos);
        this.ctx.fillText(`JUICE:  ${Math.floor(this.juiceInInventory).toString().padStart(4, ' ')}`, 10 + colWidth * 3, yPos);
        this.ctx.fillText(`DATE:   Y${this.year} M${this.month} D${this.day} (${this.season.toUpperCase()})`, 10 + colWidth * 4 - 20, yPos);
    }

    drawTabs() {
        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(0, 0, this.width, 40);

        const tabWidth = this.width / 3;
        const tabs = ['ORCHARD', 'BANK & LOANS', 'LEDGER'];
        
        tabs.forEach((t, i) => {
            this.ctx.fillStyle = this.activeTab === (i === 0 ? 'orchard' : (i === 1 ? 'bank' : 'ledger')) ? '#3b82f6' : '#475569';
            this.ctx.fillRect(i * tabWidth, 0, tabWidth, 40);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 13px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(t, i * tabWidth + tabWidth / 2, 25);
        });
    }

    drawLedgerScreen() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.fillRect(50, 80, this.width - 100, this.height - 200);
        
        this.ctx.fillStyle = '#1e293b';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('FINANCIAL LEDGER', this.width / 2, 115);
        
        this.ctx.font = '11px "JetBrains Mono", monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('DAY    INCOME    EXPENSES    NET', 80, 150);
        this.ctx.fillText('---------------------------------------', 80, 165);
        
        this.ledger.history.slice().reverse().forEach((entry, i) => {
            const net = entry.income - entry.expenses;
            const line = `D${entry.day.toString().padEnd(2)}    ${entry.income.toFixed(1).padEnd(10)} ${entry.expenses.toFixed(1).padEnd(11)} ${net.toFixed(1)}`;
            this.ctx.fillStyle = net >= 0 ? '#16a34a' : '#dc2626';
            this.ctx.fillText(line, 80, 185 + i * 18);
        });
        
        this.ctx.fillStyle = '#1e293b';
        this.ctx.font = 'bold 13px Arial';
        this.ctx.fillText('DAILY OPERATIONAL COSTS:', 80, 315);
        
        this.ctx.font = '11px Arial';
        this.ctx.fillStyle = '#475569';
        this.ctx.fillText(`• Land Tax: ${this.landTax}G`, 90, 335);
        this.ctx.fillText(`• Tree Maintenance (${this.trees.length}): ${(this.trees.length * this.maintenanceCost).toFixed(1)}G`, 90, 350);
        this.ctx.fillText(`• Worker Wages (${this.workers}): ${(this.workers * this.workerWage).toFixed(1)}G`, 250, 335);
        
        if (this.debt > 0) {
            this.ctx.fillText(`• Loan Interest: ${(this.debt * this.loanInterestRate).toFixed(1)}G`, 250, 350);
        }

        this.ctx.fillStyle = '#1e293b';
        this.ctx.font = 'bold 13px Arial';
        this.ctx.fillText('PROJECTED INCOME:', 450, 315);
        this.ctx.font = '11px Arial';
        this.ctx.fillStyle = '#16a34a';
        if (this.season === 'Winter') {
            this.ctx.fillText(`• Mule Leasing: ${(this.mules * this.muleLeaseIncome)}G`, 460, 335);
        } else if (this.season === 'Summer' || this.season === 'Autumn') {
            this.ctx.fillText(`• Est. Harvest Rate: ~${this.trees.filter(t => t.growth >= 100).length * 2} apples/day`, 460, 335);
        } else {
            this.ctx.fillText('• No active harvest in Spring', 460, 335);
        }
    }

    drawBankScreen() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(50, 60, this.width - 100, this.height - 180);
        
        this.ctx.fillStyle = '#1e293b';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('NATIONAL ORCHARD BANK', this.width / 2, 100);
        
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Current Debt: ${Math.floor(this.debt)}G`, 100, 150);
        this.ctx.fillText(`Max Credit Limit: ${this.maxDebt}G`, 100, 180);
        this.ctx.fillText(`Daily Interest Rate: ${(this.loanInterestRate * 100).toFixed(2)}%`, 100, 210);
        
        this.ctx.fillText(`Mules Owned: ${this.mules}`, 100, 260);
        this.ctx.fillText(`Winter Lease Income: ${this.muleLeaseIncome}G / day per mule`, 100, 290);
        
        if (this.season !== 'Winter') {
            this.ctx.fillStyle = '#ef4444';
            this.ctx.fillText('Mules only generate income during Winter!', 100, 320);
        } else {
            this.ctx.fillStyle = '#10b981';
            this.ctx.fillText(`Generating ${this.mules * this.muleLeaseIncome}G daily from mules.`, 100, 320);
        }
    }

    drawFactory() {
        const f = this.factoryBuilding;
        this.ctx.fillStyle = '#475569';
        this.ctx.fillRect(f.x, f.y, f.width, f.height);
        this.ctx.fillStyle = '#1e293b';
        this.ctx.beginPath();
        this.ctx.moveTo(f.x - 10, f.y);
        this.ctx.lineTo(f.x + f.width / 2, f.y - 30);
        this.ctx.lineTo(f.x + f.width + 10, f.y);
        this.ctx.fill();
        this.ctx.fillStyle = '#334155';
        this.ctx.fillRect(f.x + 20, f.y - 40, 15, 40);
        
        if (this.applesInInventory > 0) {
            this.ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
            for (let i = 0; i < 3; i++) {
                this.ctx.beginPath();
                this.ctx.arc(f.x + 27 + Math.sin(Date.now() / 200 + i) * 5, f.y - 50 - i * 15, 8, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.fillStyle = '#fde047';
        this.ctx.fillRect(f.x + 15, f.y + 20, 20, 20);
        this.ctx.fillRect(f.x + f.width - 35, f.y + 20, 20, 20);
    }

    drawWorkers() {
        this.workerSprites.forEach(s => {
            this.ctx.fillStyle = '#334155';
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y - 25, 6, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillRect(s.x - 2, s.y - 20, 4, 15);
            this.ctx.fillRect(s.x - 8, s.y - 18, 16, 2);
            this.ctx.fillRect(s.x - 5, s.y - 5, 2, 8);
            this.ctx.fillRect(s.x + 3, s.y - 5, 2, 8);
            this.ctx.fillStyle = '#f59e0b';
            this.ctx.fillRect(s.x - 7, s.y - 30, 14, 2);
            this.ctx.fillRect(s.x - 4, s.y - 34, 8, 4);
        });
    }

    drawTree(tree) {
        this.ctx.save();
        const x = tree.x;
        const y = tree.y;

        this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, 20, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();

        const trunkHeight = 45; 
        const trunkWidth = 12;
        this.ctx.fillStyle = '#451a03';
        this.ctx.fillRect(x - trunkWidth/2, y - trunkHeight, trunkWidth, trunkHeight);
        
        this.ctx.fillStyle = '#2d1102';
        this.ctx.fillRect(x - 2, y - trunkHeight, 2, trunkHeight);

        let foliageSize = Math.min(40, 18 + (tree.growth / 100) * 22);
        if (this.season === 'Winter') foliageSize *= 0.7; 
        
        const foliageY = y - trunkHeight - 10;
        const gradient = this.ctx.createRadialGradient(x, foliageY, 5, x, foliageY, foliageSize);
        
        if (this.season === 'Autumn') {
            gradient.addColorStop(0, '#ea580c');
            gradient.addColorStop(1, '#9a3412');
        } else if (this.season === 'Winter') {
            gradient.addColorStop(0, '#e2e8f0');
            gradient.addColorStop(1, '#94a3b8');
        } else {
            gradient.addColorStop(0, '#22c55e');
            gradient.addColorStop(1, '#14532d');
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, foliageY, foliageSize, 0, Math.PI * 2);
        this.ctx.fill();

        if (this.season === 'Winter') {
            this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
            this.ctx.beginPath();
            this.ctx.arc(x, foliageY - foliageSize * 0.4, foliageSize * 0.7, Math.PI, 0);
            this.ctx.fill();
        }

        // Draw physical apples based on how many are actually on the tree
        if (tree.apples > 0 && (this.season === 'Summer' || this.season === 'Autumn')) {
            this.ctx.fillStyle = '#ef4444';
            this.ctx.shadowBlur = 3;
            this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
            
            // Limit visual apples so it doesn't get too cluttered, max 8 visually
            const visualApples = Math.min(8, Math.ceil(tree.apples / 2.5));
            for (let i = 0; i < visualApples; i++) {
                const ax = x + Math.cos(i * 1.5) * (foliageSize * 0.6);
                const ay = foliageY + Math.sin(i * 1.5) * (foliageSize * 0.6);
                this.ctx.beginPath();
                this.ctx.arc(ax, ay, 4.5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.restore();
    }

    drawGameUI() {
        const uiY = this.height - 100;
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, uiY, this.width, 100);

        const btnWidth = this.width / 5;

        if (this.activeTab === 'orchard') {
            this.drawButton(5, uiY + 10, btnWidth - 10, 80, '#10b981', 'SELL ALL', `${((this.applesInInventory * this.marketPrice * this.marketDemand) + (this.juiceInInventory * this.marketPrice * this.juicePriceMultiplier * this.marketDemand)).toFixed(1)}G`);
            this.drawButton(btnWidth + 5, uiY + 10, btnWidth - 10, 80, this.gold >= this.treeCost && this.trees.length < this.maxTrees ? '#3b82f6' : '#475569', 'BUY TREE', `${this.treeCost}G`);
            this.drawButton(btnWidth * 2 + 5, uiY + 10, btnWidth - 10, 80, this.gold >= this.storageUpgradeCost ? '#a855f7' : '#475569', 'STORAGE+', `${this.storageUpgradeCost}G`);
            this.drawButton(btnWidth * 3 + 5, uiY + 10, btnWidth - 10, 80, this.gold >= this.workerCost ? '#f59e0b' : '#475569', 'HIRE WORKER', `${this.workerCost}G`);
            this.drawButton(btnWidth * 4 + 5, uiY + 10, btnWidth - 10, 80, this.gold >= this.factoryUpgradeCost ? '#ec4899' : '#475569', 'FACTORY+', `${this.factoryUpgradeCost}G`);
        } else {
            this.drawButton(5, uiY + 10, btnWidth - 10, 80, this.debt + 100 <= this.maxDebt ? '#10b981' : '#475569', 'LOAN 100', '+100G');
            this.drawButton(btnWidth + 5, uiY + 10, btnWidth - 10, 80, this.debt + 500 <= this.maxDebt ? '#10b981' : '#475569', 'LOAN 500', '+500G');
            this.drawButton(btnWidth * 2 + 5, uiY + 10, btnWidth - 10, 80, this.gold >= 100 && this.debt >= 100 ? '#ef4444' : '#475569', 'REPAY 100', '-100G');
            this.drawButton(btnWidth * 3 + 5, uiY + 10, btnWidth - 10, 80, this.gold >= 500 && this.debt >= 500 ? '#ef4444' : '#475569', 'REPAY 500', '-500G');
            this.drawButton(btnWidth * 4 + 5, uiY + 10, btnWidth - 10, 80, this.gold >= this.muleCost ? '#6366f1' : '#475569', 'BUY MULE', `${this.muleCost}G`);
        }
    }

    drawButton(x, y, w, h, color, text, subtext) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, w, h, 8);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, x + w / 2, y + 35);
        this.ctx.font = '10px Arial';
        this.ctx.fillText(subtext, x + w / 2, y + 60);
    }

    stop() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        this.canvas.removeEventListener('click', this.boundClick);
        this.container.innerHTML = '';
    }
}