export class Minesweeper {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        
        // Difficulty presets
        this.difficulties = {
            easy: { size: 8, mines: 10 },
            medium: { size: 10, mines: 15 },
            hard: { size: 16, mines: 40 },
            impossible: { size: 24, mines: 99 }
        };
        
        // Default to medium
        this.currentDifficulty = 'medium';
        this.gridSize = this.difficulties.medium.size;
        this.minesCount = this.difficulties.medium.mines;
        
        this.board = [];
        this.flags = 0;
        this.gameOver = false;
        this.timer = 0;
        this.timerInterval = null;
        this.isFirstClick = true;

        this.init();
    }

    init() {
        // Block the right-click menu on the entire game container to prevent accidental popups
        this.container.innerHTML = `
            <div class="flex flex-col items-center gap-2 w-full max-w-[650px] mx-auto" oncontextmenu="return false;">
                
                <div class="flex justify-between items-center w-full font-arcade text-gold-500 px-2">
                    <select id="ms-difficulty" class="bg-black border border-gold-500 text-gold-500 font-arcade text-[10px] uppercase px-2 py-1 outline-none cursor-pointer">
                        <option value="easy">Easy</option>
                        <option value="medium" selected>Medium</option>
                        <option value="hard">Hard</option>
                        <option value="impossible">Impossible</option>
                    </select>
                    <button id="minesweeper-reset" class="bg-gold-500 text-black px-4 py-1 font-arcade text-[10px] uppercase hover:bg-gold-400 transition-colors">Reset</button>
                </div>

                <div class="flex justify-between w-full font-arcade text-gold-500 text-sm arcade-glow px-4 py-2 bg-black/50 border-t border-b border-gold-500/30">
                    <div id="mine-count">Mines: ${this.minesCount}</div>
                    <div id="minesweeper-timer">Time: 0</div>
                </div>
                
                <div class="relative w-full aspect-square bg-gold-500/10 medieval-border">
                    <div id="minesweeper-grid" class="grid w-full h-full border-t border-l border-gold-500/30"></div>
                    
                    <div id="ms-overlay" class="absolute inset-0 bg-black/85 flex flex-col items-center justify-center hidden z-10">
                        <h2 id="ms-overlay-title" class="text-3xl md:text-5xl font-arcade mb-2 tracking-widest text-center"></h2>
                        <p id="ms-overlay-sub" class="text-white font-arcade text-xs mb-6"></p>
                        <button id="ms-overlay-btn" class="bg-gold-500 text-black px-6 py-2 font-arcade uppercase hover:bg-gold-400 transition-colors">Play Again</button>
                    </div>
                </div>
            </div>
        `;

        this.gridElement = document.getElementById('minesweeper-grid');
        this.overlay = document.getElementById('ms-overlay');
        this.overlayTitle = document.getElementById('ms-overlay-title');
        this.overlaySub = document.getElementById('ms-overlay-sub');
        
        // Event Listeners
        document.getElementById('minesweeper-reset').onclick = () => this.start();
        document.getElementById('ms-overlay-btn').onclick = () => this.start();
        
        const diffSelect = document.getElementById('ms-difficulty');
        diffSelect.onchange = (e) => {
            this.setDifficulty(e.target.value);
        };
    }

    setDifficulty(level) {
        if (!this.difficulties[level]) return;
        this.currentDifficulty = level;
        this.gridSize = this.difficulties[level].size;
        this.minesCount = this.difficulties[level].mines;
        this.start();
    }

    start() {
        this.gameOver = false;
        this.isFirstClick = true;
        this.timer = 0;
        this.flags = 0;
        clearInterval(this.timerInterval);
        
        // Hide overlay
        this.overlay.classList.add('hidden');
        
        // Strictly constrain grid tracks to fractions, ignoring content size completely
        this.gridElement.style.gridTemplateColumns = `repeat(${this.gridSize}, minmax(0, 1fr))`;
        this.gridElement.style.gridTemplateRows = `repeat(${this.gridSize}, minmax(0, 1fr))`;
        
        this.updateTimer();
        this.updateMineCount();
        this.createEmptyBoard();
        this.render();
    }

    createEmptyBoard() {
        this.board = [];
        for (let r = 0; r < this.gridSize; r++) {
            let row = [];
            for (let c = 0; c < this.gridSize; c++) {
                row.push({
                    r, c,
                    mine: false,
                    revealed: false,
                    flagged: false,
                    neighborMines: 0
                });
            }
            this.board.push(row);
        }
    }

    placeMines(firstR, firstC) {
        let minesPlaced = 0;
        
        // Place mines randomly, but avoid the 3x3 area around the first click
        while (minesPlaced < this.minesCount) {
            let r = Math.floor(Math.random() * this.gridSize);
            let c = Math.floor(Math.random() * this.gridSize);
            
            let isSafeZone = Math.abs(r - firstR) <= 1 && Math.abs(c - firstC) <= 1;

            if (!this.board[r][c].mine && !isSafeZone) {
                this.board[r][c].mine = true;
                minesPlaced++;
            }
        }

        // Calculate neighbors
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.board[r][c].mine) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        let nr = r + dr;
                        let nc = c + dc;
                        if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
                            if (this.board[nr][nc].mine) count++;
                        }
                    }
                }
                this.board[r][c].neighborMines = count;
            }
        }
    }

    render() {
        this.gridElement.innerHTML = '';
        
        const fontSize = this.gridSize > 15 ? 'text-[8px] md:text-[10px]' : 'text-[10px] md:text-sm';
        const iconSize = this.gridSize > 15 ? 'text-[10px]' : 'text-base';

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const cell = this.board[r][c];
                const btn = document.createElement('div');
                
                // Changed border logic to just right and bottom (border-b border-r) to prevent double borders
                btn.className = `w-full h-full flex items-center justify-center cursor-pointer font-arcade transition-all border-b border-r border-gold-500/30 select-none overflow-hidden leading-none ${fontSize}`;
                
                if (cell.revealed) {
                    btn.classList.add('bg-black/80');
                    if (cell.mine) {
                        btn.innerHTML = `<span class="${iconSize} leading-none">💣</span>`;
                        btn.classList.add('bg-red-500/40');
                    } else if (cell.neighborMines > 0) {
                        btn.innerText = cell.neighborMines;
                        const colors = [null, '#3877FF', '#0DFF72', '#FF0D72', '#3877FF', '#FF8E0D', '#0DC2FF', '#000', '#888'];
                        btn.style.color = colors[cell.neighborMines];
                    }
                } else {
                    btn.classList.add('bg-gold-500/10', 'hover:bg-gold-500/40');
                    if (cell.flagged) {
                        btn.innerHTML = `<span class="${iconSize} leading-none">🚩</span>`;
                    }
                }

                btn.oncontextmenu = (e) => {
                    e.preventDefault();
                    this.toggleFlag(r, c);
                };

                btn.onmousedown = (e) => {
                    if (e.button === 0) {
                        this.reveal(r, c);
                    }
                };
                
                this.gridElement.appendChild(btn);
            }
        }
    }

    reveal(r, c) {
        if (this.gameOver || this.board[r][c].revealed || this.board[r][c].flagged) return;

        if (this.isFirstClick) {
            this.isFirstClick = false;
            this.placeMines(r, c);
            
            this.timerInterval = setInterval(() => {
                this.timer++;
                this.updateTimer();
            }, 1000);
        }

        this.board[r][c].revealed = true;

        if (this.board[r][c].mine) {
            this.endGame(false);
            return;
        }

        if (this.board[r][c].neighborMines === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    let nr = r + dr;
                    let nc = c + dc;
                    if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
                        this.reveal(nr, nc);
                    }
                }
            }
        }

        this.render();
        this.checkWin();
    }

    toggleFlag(r, c) {
        if (this.gameOver || this.board[r][c].revealed) return;
        this.board[r][c].flagged = !this.board[r][c].flagged;
        this.flags += this.board[r][c].flagged ? 1 : -1;
        this.updateMineCount();
        this.render();
    }

    updateTimer() {
        const el = document.getElementById('minesweeper-timer');
        if (el) el.innerText = `Time: ${this.timer}`;
    }

    updateMineCount() {
        const el = document.getElementById('mine-count');
        if (el) el.innerText = `Mines: ${this.minesCount - this.flags}`;
    }

    checkWin() {
        let revealedCount = 0;
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.board[r][c].revealed) revealedCount++;
            }
        }
        if (revealedCount === (this.gridSize * this.gridSize) - this.minesCount) {
            this.endGame(true);
        }
    }

    endGame(win) {
        this.gameOver = true;
        clearInterval(this.timerInterval);
        
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.board[r][c].mine) this.board[r][c].revealed = true;
            }
        }
        this.render();

        setTimeout(() => {
            this.overlayTitle.innerText = win ? 'VICTORY' : 'DEFEAT';
            this.overlayTitle.className = `text-4xl md:text-5xl font-arcade mb-2 tracking-widest text-center ${win ? 'text-green-500' : 'text-red-600'}`;
            this.overlaySub.innerText = win 
                ? `Cleared on ${this.currentDifficulty.toUpperCase()} in ${this.timer} seconds!`
                : `You hit a mine after ${this.timer} seconds.`;
            
            this.overlay.classList.remove('hidden');
        }, 300);
    }

    stop() {
        clearInterval(this.timerInterval);
        this.container.innerHTML = '';
    }
}