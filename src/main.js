import { Tetris } from './tetris.js';
import { Minesweeper } from './minesweeper.js';
import { Racing } from './racing.js';
import { TowerDefense } from './towerDefense.js';
import { AppleTycoon } from './appleTycoon.js';
import { DinoJump } from './dinoJump.js';
import { Snake } from './snake.js';
import { FlappyBird } from './flappyBird.js';
import { Pong } from './pong.js';

let games = [];
let filteredGames = [];
let currentGame = null;
let activeInternalGame = null;

const gameGrid = document.getElementById('game-grid');
const searchInput = document.getElementById('search-input');
const playerOverlay = document.getElementById('player-overlay');
const gameFrame = document.getElementById('game-frame');
const iframeContainer = document.getElementById('iframe-container');
const internalContainer = document.getElementById('internal-game-container');
const gameTitle = document.getElementById('game-title');
const closeBtn = document.getElementById('close-btn');
const backBtn = document.getElementById('back-btn');
const externalBtn = document.getElementById('external-btn');

// Fetch games data
async function init() {
    try {
        const response = await fetch('./src/games.json');
        games = await response.json();
        filteredGames = [...games];
        renderGames();
    } catch (error) {
        console.error('Error loading games:', error);
    }
}

function renderGames() {
    gameGrid.innerHTML = '';
    
    if (filteredGames.length === 0) {
        gameGrid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-20 text-white/40">
                <p class="text-lg">No games found matching your search</p>
            </div>
        `;
        return;
    }

    filteredGames.forEach(game => {
        const card = document.createElement('div');
        card.className = 'group relative bg-black/40 rounded-none overflow-hidden border-4 border-gold-500/30 cursor-pointer hover:border-gold-500 transition-all hover:shadow-[0_0_20px_rgba(251,191,36,0.2)] transform hover:-translate-y-1';
        card.innerHTML = `
            <div class="aspect-video relative overflow-hidden border-b-4 border-gold-500/30 group-hover:border-gold-500 transition-colors">
                <img
                    src="${game.thumbnail}"
                    alt="${game.title}"
                    class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                    referrerpolicy="no-referrer"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80"></div>
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div class="bg-gold-500 text-black px-6 py-2 font-arcade text-[10px] uppercase tracking-widest shadow-lg">
                        START GAME
                    </div>
                </div>
            </div>
            <div class="p-5">
                <h3 class="font-medieval font-bold text-xl text-gold-500 uppercase tracking-wider group-hover:arcade-glow transition-all">
                    ${game.title}
                </h3>
            </div>
        `;
        card.onclick = () => openGame(game);
        gameGrid.appendChild(card);
    });
}

function openGame(game) {
    // Stop any currently active internal game
    if (activeInternalGame) {
        if (typeof activeInternalGame.stop === 'function') {
            activeInternalGame.stop();
        }
        activeInternalGame = null;
    }

    currentGame = game;
    gameTitle.textContent = game.title;
    
    // Reset views
    iframeContainer.classList.add('hidden');
    internalContainer.classList.add('hidden');
    externalBtn.classList.remove('hidden');

    if (game.type === 'internal') {
        externalBtn.classList.add('hidden');
        internalContainer.classList.remove('hidden');
        
        if (game.class === 'Tetris') {
            activeInternalGame = new Tetris('game-canvas-wrapper');
        } else if (game.class === 'Minesweeper') {
            activeInternalGame = new Minesweeper('game-canvas-wrapper');
        } else if (game.class === 'Racing') {
            activeInternalGame = new Racing('game-canvas-wrapper');
        } else if (game.class === 'TowerDefense') {
            activeInternalGame = new TowerDefense('game-canvas-wrapper');
        } else if (game.class === 'AppleTycoon') {
            activeInternalGame = new AppleTycoon('game-canvas-wrapper');
        } else if (game.class === 'DinoJump') {
            activeInternalGame = new DinoJump('game-canvas-wrapper');
        } else if (game.class === 'Snake') {
            activeInternalGame = new Snake('game-canvas-wrapper');
        } else if (game.class === 'FlappyBird') {
            activeInternalGame = new FlappyBird('game-canvas-wrapper');
        } else if (game.class === 'Pong') {
            activeInternalGame = new Pong('game-canvas-wrapper');
        }

        if (activeInternalGame && typeof activeInternalGame.start === 'function') {
            activeInternalGame.start();
        }
    } else {
        iframeContainer.classList.remove('hidden');
        // Show loading state
        gameFrame.style.opacity = '0';
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'game-loading';
        loadingIndicator.className = 'absolute inset-0 flex flex-col items-center justify-center gap-4 text-gold-500';
        loadingIndicator.innerHTML = `
            <div class="w-12 h-12 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin"></div>
            <p class="font-medieval font-medium animate-pulse">Summoning ${game.title}...</p>
        `;
        gameFrame.parentElement.appendChild(loadingIndicator);

        if (game.sandbox) {
            gameFrame.setAttribute('sandbox', game.sandbox);
        } else {
            gameFrame.removeAttribute('sandbox');
        }
        
        // Set referrerpolicy to no-referrer to help with some blocked embeds
        gameFrame.setAttribute('referrerpolicy', 'no-referrer');
        
        gameFrame.src = game.iframeUrl;
        
        gameFrame.onload = () => {
            gameFrame.style.opacity = '1';
            const loader = document.getElementById('game-loading');
            if (loader) loader.remove();
        };

        gameFrame.onerror = () => {
            const loader = document.getElementById('game-loading');
            if (loader) {
                loader.innerHTML = `
                    <div class="text-red-500 font-medieval text-center p-4 max-w-md">
                        <p class="font-bold text-2xl mb-2 uppercase">The Summoning Failed</p>
                        <p class="text-sm opacity-80 mb-6">The magical gates are barred or the scroll is missing.</p>
                        <button onclick="window.open('${game.iframeUrl}', '_blank')" class="bg-gold-500 text-black px-6 py-2 font-bold uppercase tracking-widest hover:bg-gold-400 transition-colors shadow-lg">
                            Open in New Tab
                        </button>
                    </div>
                `;
            }
        };
    }

    playerOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeGame() {
    playerOverlay.classList.add('hidden');
    
    if (activeInternalGame) {
        if (typeof activeInternalGame.stop === 'function') {
            activeInternalGame.stop();
        }
        activeInternalGame = null;
    }

    gameFrame.src = '';
    gameFrame.style.opacity = '0';
    gameFrame.removeAttribute('sandbox');
    gameFrame.removeAttribute('referrerpolicy');
    const loader = document.getElementById('game-loading');
    if (loader) loader.remove();
    document.body.style.overflow = 'auto';
    currentGame = null;
}

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    filteredGames = games.filter(game => 
        game.title.toLowerCase().includes(query)
    );
    renderGames();
});

closeBtn.onclick = closeGame;
backBtn.onclick = closeGame;
externalBtn.onclick = () => {
    if (currentGame) {
        window.open(currentGame.iframeUrl, '_blank');
    }
};

init();
