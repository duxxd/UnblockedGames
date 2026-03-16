export class Minesweeper {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.gridSize = 10;
        this.minesCount = 15;
        this.board = [];
        this.flags = 0;
        this.gameOver = false;
        this.timer = 0;
        this.timerInterval = null;

        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="flex flex-col items-center gap-4">
                <div class="flex justify-between w-full font-arcade text-gold-500 text-sm arcade-glow px-4">
                    <div id="mine-count">Mines: ${this.minesCount}</div>
                    <div id="minesweeper-timer">Time: 0</div>
                </div>
                <div id="minesweeper-grid" class="grid gap-1 bg-gold-500/20 p-1 medieval-border"></div>
                <button id="minesweeper-reset" class="bg-gold-500 text-black px-4 py-1 font-arcade text-[10px] uppercase hover:bg-gold-400 transition-colors">Reset</button>
            </div>
        `;

        this.gridElement = document.getElementById('minesweeper-grid');
        this.gridElement.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
        
        this.resetBtn = document.getElementById('minesweeper-reset');
        this.resetBtn.onclick = () => this.start();

        this.start();
    }

    start() {
        this.gameOver = false;
        this.timer = 0;
        this.flags = 0;
        clearInterval(this.timerInterval);
        this.updateTimer();
        this.updateMineCount();
        this.createBoard();
        this.render();
        
        const inst = document.getElementById('game-instructions');
        if (inst) inst.innerText = 'Left Click: Reveal • Right Click: Flag';

        this.timerInterval = setInterval(() => {
            this.timer++;
            this.updateTimer();
        }, 1000);
    }

    createBoard() {
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

        // Place mines
        let minesPlaced = 0;
        while (minesPlaced < this.minesCount) {
            let r = Math.floor(Math.random() * this.gridSize);
            let c = Math.floor(Math.random() * this.gridSize);
            if (!this.board[r][c].mine) {
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
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const cell = this.board[r][c];
                const btn = document.createElement('div');
                btn.className = 'w-8 h-8 md:w-10 md:h-10 flex items-center justify-center cursor-pointer font-arcade text-[10px] transition-all border border-gold-500/30';
                
                if (cell.revealed) {
                    btn.classList.add('bg-black/60');
                    if (cell.mine) {
                        btn.innerHTML = '💣';
                        btn.classList.add('bg-red-500/40');
                    } else if (cell.neighborMines > 0) {
                        btn.innerText = cell.neighborMines;
                        const colors = [null, '#3877FF', '#0DFF72', '#FF0D72', '#3877FF', '#FF8E0D', '#0DC2FF', '#000', '#888'];
                        btn.style.color = colors[cell.neighborMines];
                    }
                } else {
                    btn.classList.add('bg-gold-500/10', 'hover:bg-gold-500/30');
                    if (cell.flagged) {
                        btn.innerHTML = '🚩';
                    }
                }

                btn.onclick = () => this.reveal(r, c);
                btn.oncontextmenu = (e) => {
                    e.preventDefault();
                    this.toggleFlag(r, c);
                };
                
                this.gridElement.appendChild(btn);
            }
        }
    }

    reveal(r, c) {
        if (this.gameOver || this.board[r][c].revealed || this.board[r][c].flagged) return;

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
        const scoreEl = document.getElementById('game-score');
        if (scoreEl) scoreEl.innerText = `Time: ${this.timer}`;
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
        
        // Reveal all mines
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.board[r][c].mine) this.board[r][c].revealed = true;
            }
        }
        this.render();

        setTimeout(() => {
            alert(win ? 'VICTORY! The field is clear.' : 'BOOM! Game Over.');
        }, 100);
    }

    stop() {
        clearInterval(this.timerInterval);
        this.container.innerHTML = '';
    }
}
