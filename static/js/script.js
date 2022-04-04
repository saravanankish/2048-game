const GRID_SIZE = 4
const CELL_SIZE = 15
const CELL_GAP = 2
const secret = "5V)u)LV9[_s_Ht2xY#{~{_smRu'irlv(eS/zJ=U/_^U~B]<TjB3@#$y9i+GLv5N"
let score = 0;
let madeMove = false;

function createCells(grid) {
    const cells = [];
    for (var i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        var cell = document.createElement('div');
        cell.classList.add('cell');
        cells.push(cell);
        grid.appendChild(cell);
    }
    return cells;
}

class Tile {
    #tileEle
    #x
    #y
    #value
    constructor(container, value = Math.random() > 0.5 ? 4 : 2) {
        this.#tileEle = document.createElement('div');
        this.#tileEle.classList.add('tile');
        container.append(this.#tileEle);
        this.value = value;
    }

    set x(value) {
        this.#x = value;
        this.#tileEle.style.setProperty('--x', value)
    }

    set y(value) {
        this.#y = value;
        this.#tileEle.style.setProperty('--y', value)
    }

    set value(v) {
        this.#value = v;
        this.#tileEle.textContent = v;
        const power = Math.log2(v);
        const backgroundLightness = 100 - power * 8;
        this.#tileEle.style.setProperty('--background-lightness', `${backgroundLightness}%`)
        this.#tileEle.style.setProperty('--text-lightness', `${backgroundLightness <= 50 ? 90 : 10}%`)
    }

    get value() {
        return this.#value;
    }

    remove() {
        this.#tileEle.remove();
    }

    waitForTransition(animation = false) {
        return new Promise(resolve => this.#tileEle.addEventListener(animation ? 'animationend' : 'transitionend', resolve, { once: true }))
    }
}

class Cell {
    #cellEle
    #x
    #y
    #tile
    #mergeTile
    constructor(cellEle, x, y) {
        this.#cellEle = cellEle;
        this.#x = x;
        this.#y = y;
    }

    get tile() {
        return this.#tile;
    }

    get x() {
        return this.#x;
    }

    get y() {
        return this.#y;
    }

    get mergeTile() {
        return this.#mergeTile;
    }

    set mergeTile(value) {
        this.#mergeTile = value;
        if (value == null) return;
        this.#mergeTile.x = this.#x;
        this.#mergeTile.y = this.#y;
    }

    set tile(value) {
        this.#tile = value;
        if (value == null) return;
        this.#tile.x = this.#x;
        this.#tile.y = this.#y;
    }

    canAccept(tile) {
        return (this.tile == null || (this.mergeTile == null && this.tile.value === tile.value))
    }

    mergeTiles() {
        if (this.tile == null || this.mergeTile == null) return;
        this.tile.value = this.tile.value + this.mergeTile.value;
        score += this.tile.value
        updateScore();
        this.mergeTile.remove();
        this.mergeTile = null;
    }

}

class Grid {
    #cells
    constructor(gridEle) {
        gridEle.style.setProperty('--grid-size', GRID_SIZE);
        gridEle.style.setProperty('--cell-size', `${CELL_SIZE}vmin`);
        gridEle.style.setProperty('--cell-gap', `${CELL_GAP}vmin`);
        this.#cells = createCells(gridEle).map((cellEle, index) => {
            return new Cell(cellEle, index % GRID_SIZE, Math.floor(index / GRID_SIZE))
        });
    }

    get cells() {
        return this.#cells;
    }

    get #emptyCells() {
        return this.#cells.filter(cell => cell.tile == null);
    }

    randomEmptyCell() {
        const randInd = Math.floor(Math.random() * this.#emptyCells.length)
        return this.#emptyCells[randInd];
    }

    get cellsByColumn() {
        return this.#cells.reduce((cellGrid, cell) => {
            cellGrid[cell.x] = cellGrid[cell.x] || [];
            cellGrid[cell.x][cell.y] = cell;
            return cellGrid;
        }, [])
    }

    get cellsByRow() {
        return this.#cells.reduce((cellGrid, cell) => {
            cellGrid[cell.y] = cellGrid[cell.y] || [];
            cellGrid[cell.y][cell.x] = cell;
            return cellGrid;
        }, [])
    }


}

let board = document.getElementById('game-board');
let grid = new Grid(board);
grid.randomEmptyCell().tile = new Tile(board);
grid.randomEmptyCell().tile = new Tile(board);
handleInput();

function handleInput() {
    window.addEventListener('keydown', handleKeydown, { once: true });
}

function getBestScore() {
    return JSON.parse(CryptoJS.AES.decrypt(localStorage.getItem('userData'), secret).toString(CryptoJS.enc.Utf8)).highScore;
}

function endGame() {
    score = 0;
    updateScore();
    main();
    updateBestScore();
}

async function handleKeydown(e) {
    switch (e.key) {
        case 'ArrowUp':
            if (!canMoveUp()) {
                handleInput();
                return;
            }
            madeMove = true;
            await moveUp();
            break;
        case 'ArrowDown':
            if (!canMoveDown()) {
                handleInput();
                return;
            }
            madeMove = true;
            await moveDown();
            break;
        case 'ArrowLeft':
            if (!canMoveLeft()) {
                handleInput();
                return;
            }
            madeMove = true;
            await moveLeft();
            break;
        case 'ArrowRight':
            if (!canMoveRight()) {
                handleInput();
                return;
            }
            madeMove = true;
            await moveRight();
            break;
        default:
            handleInput();
            return;
    }

    grid.cells.forEach(cell => cell.mergeTiles())
    const newTile = new Tile(board);
    grid.randomEmptyCell().tile = newTile;

    if (!canMoveUp() && !canMoveDown() && !canMoveLeft() && !canMoveRight()) {
        newTile.waitForTransition(true).then(() => {
            if (parseInt(getBestScore()) < score) {
                const userData = {
                    highScore: score
                }
                localStorage.setItem('userData', CryptoJS.AES.encrypt(JSON.stringify(userData), secret).toString());
            }
            endGame();
            alert('You lose');
        })
        return;
    }

    handleInput();
}

function moveUp() {
    return slideTiles(grid.cellsByColumn);
}

function moveDown() {
    return slideTiles(grid.cellsByColumn.map(column => [...column].reverse()));
}

function moveLeft() {
    return slideTiles(grid.cellsByRow);
}

function moveRight() {
    return slideTiles(grid.cellsByRow.map(row => [...row].reverse()));
}

function slideTiles(cells) {
    return Promise.all(
        cells.flatMap(group => {
            const promises = []
            for (let i = 1; i < group.length; i++) {
                const cell = group[i];
                if (cell.tile == null) continue;
                let lastCell;
                for (let j = i - 1; j >= 0; j--) {
                    const moveTo = group[j];
                    if (!moveTo.canAccept(cell.tile)) break;
                    lastCell = moveTo;
                }
                if (lastCell != null) {
                    promises.push(cell.tile.waitForTransition())
                    if (lastCell.tile != null) {
                        lastCell.mergeTile = cell.tile;
                    } else {
                        lastCell.tile = cell.tile;
                    }
                    cell.tile = null;
                }
            }
            return promises;
        })
    )
}

function canMoveUp() {
    return canMove(grid.cellsByColumn);
}

function canMoveDown() {
    return canMove(grid.cellsByColumn.map(column => [...column].reverse()));
}

function canMoveLeft() {
    return canMove(grid.cellsByRow);
}

function canMoveRight() {
    return canMove(grid.cellsByRow.map(row => [...row].reverse()));
}

function canMove(cells) {
    return cells.some(group => {
        return group.some((cell, index) => {
            if (index === 0 || cell.tile == null) return false;
            const moveTo = group[index - 1];
            return moveTo.canAccept(cell.tile);
        })
    })
}

function updateScore() {
    document.querySelector('#current-score').innerText = score;
}

function main() {
    score = 0;
    updateScore();
    madeMove = false;
    document.getElementById('game-board').innerHTML = "";
    board = document.getElementById('game-board');
    grid = new Grid(board);
    grid.randomEmptyCell().tile = new Tile(board);
    grid.randomEmptyCell().tile = new Tile(board);
    handleInput();
}

function init() {
    if (!localStorage.getItem('userData')) {
        let data = JSON.stringify({
            highScore: 0
        })
        var encrypt = CryptoJS.AES.encrypt(data, secret);
        localStorage.setItem('userData', encrypt);
        updateBestScore();
    }
}

function updateBestScore() {
    document.querySelector('#best-score').innerText = getBestScore();
}


document.querySelector('#new-game').addEventListener('click', () => {
    confirm('Your progress will be lost. Continue leaving?') && main();
});

document.querySelector('#reset').addEventListener('click', () => {
    let result = confirm('You want to reset your data? Your data will be lost forever!');
    if (result) {
        localStorage.removeItem('userData');
        init();
    }
});

window.onbeforeunload = function () {
    if (madeMove)
        return "Data will be lost if you leave the page, are you sure?";
};

init();
main();
updateBestScore();