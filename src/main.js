let games = [];
let filteredGames = [];

const gameGrid = document.getElementById('game-grid');
const searchInput = document.getElementById('search-input');
const playerOverlay = document.getElementById('player-overlay');
const gameFrame = document.getElementById('game-frame');
const gameTitle = document.getElementById('game-title');
const closeBtn = document.getElementById('close-btn');
const backBtn = document.getElementById('back-btn');

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
        card.className = 'group relative bg-white/5 rounded-2xl overflow-hidden border border-white/10 cursor-pointer hover:border-emerald-500/50 transition-all hover:shadow-2xl hover:shadow-emerald-500/10 transform hover:-translate-y-1';
        card.innerHTML = `
            <div class="aspect-video relative overflow-hidden">
                <img
                    src="${game.thumbnail}"
                    alt="${game.title}"
                    class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerpolicy="no-referrer"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div class="bg-emerald-500 text-black px-4 py-2 rounded-full font-bold flex items-center gap-2">
                        Play Now
                    </div>
                </div>
            </div>
            <div class="p-4">
                <h3 class="font-semibold text-lg group-hover:text-emerald-400 transition-colors">
                    ${game.title}
                </h3>
            </div>
        `;
        card.onclick = () => openGame(game);
        gameGrid.appendChild(card);
    });
}

function openGame(game) {
    gameTitle.textContent = game.title;
    
    // Show loading state
    gameFrame.style.opacity = '0';
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'game-loading';
    loadingIndicator.className = 'absolute inset-0 flex flex-col items-center justify-center gap-4 text-emerald-500';
    loadingIndicator.innerHTML = `
        <div class="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p class="font-medium animate-pulse">Loading ${game.title}...</p>
    `;
    gameFrame.parentElement.appendChild(loadingIndicator);

    if (game.sandbox) {
        gameFrame.setAttribute('sandbox', game.sandbox);
    } else {
        gameFrame.removeAttribute('sandbox');
    }
    
    gameFrame.src = game.iframeUrl;
    
    gameFrame.onload = () => {
        gameFrame.style.opacity = '1';
        const loader = document.getElementById('game-loading');
        if (loader) loader.remove();
    };

    playerOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeGame() {
    playerOverlay.classList.add('hidden');
    gameFrame.src = '';
    gameFrame.style.opacity = '0';
    gameFrame.removeAttribute('sandbox');
    const loader = document.getElementById('game-loading');
    if (loader) loader.remove();
    document.body.style.overflow = 'auto';
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

init();
