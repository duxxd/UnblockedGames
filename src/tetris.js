export class Tetris {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.gridSize = 25;
        this.cols = 10;
        this.rows = 20;
        
        this.canvas.width = this.cols * this.gridSize;
        this.canvas.height = this.rows * this.gridSize;

        this.colors = [
            null,
            '#FF0D72', // T
            '#0DC2FF', // I
            '#0DFF72', // S
            '#F538FF', // Z
            '#FF8E0D', // L
            '#FFE138', // O
            '#3877FF', // J
        ];

        this.pieces = 'ILJOTSZ';
        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.lastTime = 0;

        this.arena = this.createMatrix(this.cols, this.rows);
        this.player = {
            pos: {x: 0, y: 0},
            matrix: null,
            score: 0,
        };

        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.requestId = null;
        this.isPaused = false;
    }

    createMatrix(w, h) {
        const matrix = [];
        while (h--) {
            matrix.push(new Array(w).fill(0));
        }
        return matrix;
    }

    createPiece(type) {
        if (type === 'I') {
            return [
                [0, 1, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 0, 0],
            ];
        } else if (type === 'L') {
            return [
                [0, 2, 0],
                [0, 2, 0],
                [0, 2, 2],
            ];
        } else if (type === 'J') {
            return [
                [0, 3, 0],
                [0, 3, 0],
                [3, 3, 0],
            ];
        } else if (type === 'O') {
            return [
                [4, 4],
                [4, 4],
            ];
        } else if (type === 'Z') {
            return [
                [5, 5, 0],
                [0, 5, 5],
                [0, 0, 0],
            ];
        } else if (type === 'S') {
            return [
                [0, 6, 6],
                [6, 6, 0],
                [0, 0, 0],
            ];
        } else if (type === 'T') {
            return [
                [0, 7, 0],
                [7, 7, 7],
                [0, 0, 0],
            ];
        }
    }

    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawMatrix(this.arena, {x: 0, y: 0});
        this.drawMatrix(this.player.matrix, this.player.pos);
    }

    drawMatrix(matrix, offset) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.ctx.fillStyle = this.colors[value];
                    this.ctx.fillRect((x + offset.x) * this.gridSize,
                                     (y + offset.y) * this.gridSize,
                                     this.gridSize - 1, this.gridSize - 1);
                    
                    // Add subtle arcade glow effect
                    this.ctx.shadowBlur = 5;
                    this.ctx.shadowColor = this.colors[value];
                }
            });
        });
        this.ctx.shadowBlur = 0;
    }

    merge(arena, player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    arena[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
    }

    rotate(matrix, dir) {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [
                    matrix[x][y],
                    matrix[y][x],
                ] = [
                    matrix[y][x],
                    matrix[x][y],
                ];
            }
        }
        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            matrix.reverse();
        }
    }

    playerDrop() {
        this.player.pos.y++;
        if (this.collide(this.arena, this.player)) {
            this.player.pos.y--;
            this.merge(this.arena, this.player);
            this.playerReset();
            this.arenaSweep();
            this.updateScore();
        }
        this.dropCounter = 0;
    }

    playerMove(offset) {
        this.player.pos.x += offset;
        if (this.collide(this.arena, this.player)) {
            this.player.pos.x -= offset;
        }
    }

    playerReset() {
        this.player.matrix = this.createPiece(this.pieces[this.pieces.length * Math.random() | 0]);
        this.player.pos.y = 0;
        this.player.pos.x = (this.arena[0].length / 2 | 0) -
                           (this.player.matrix[0].length / 2 | 0);
        if (this.collide(this.arena, this.player)) {
            this.arena.forEach(row => row.fill(0));
            this.player.score = 0;
            this.updateScore();
        }
    }

    playerRotate(dir) {
        const pos = this.player.pos.x;
        let offset = 1;
        this.rotate(this.player.matrix, dir);
        while (this.collide(this.arena, this.player)) {
            this.player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > this.player.matrix[0].length) {
                this.rotate(this.player.matrix, -dir);
                this.player.pos.x = pos;
                return;
            }
        }
    }

    collide(arena, player) {
        const [m, o] = [player.matrix, player.pos];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                   (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    arenaSweep() {
        let rowCount = 1;
        outer: for (let y = this.arena.length - 1; y > 0; --y) {
            for (let x = 0; x < this.arena[y].length; ++x) {
                if (this.arena[y][x] === 0) {
                    continue outer;
                }
            }

            const row = this.arena.splice(y, 1)[0].fill(0);
            this.arena.unshift(row);
            ++y;

            this.player.score += rowCount * 10;
            rowCount *= 2;
        }
    }

    update(time = 0) {
        if (this.isPaused) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        this.dropCounter += deltaTime;
        if (this.dropCounter > this.dropInterval) {
            this.playerDrop();
        }

        this.draw();
        this.requestId = requestAnimationFrame(this.update.bind(this));
    }

    updateScore() {
        const scoreElement = document.getElementById('tetris-score');
        if (scoreElement) {
            scoreElement.innerText = `Score: ${this.player.score}`;
        }
    }

    handleKeyDown(event) {
        if (event.keyCode === 37) {
            this.playerMove(-1);
        } else if (event.keyCode === 39) {
            this.playerMove(1);
        } else if (event.keyCode === 40) {
            this.playerDrop();
        } else if (event.keyCode === 81) {
            this.playerRotate(-1);
        } else if (event.keyCode === 87) {
            this.playerRotate(1);
        } else if (event.keyCode === 38) {
            this.playerRotate(1);
        }
    }

    start() {
        this.playerReset();
        this.updateScore();
        this.update();
        document.addEventListener('keydown', this.boundKeyDown);
    }

    stop() {
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
        }
        document.removeEventListener('keydown', this.boundKeyDown);
        this.container.innerHTML = '';
    }
}
