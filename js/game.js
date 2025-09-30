/**
 * BustAGroove - Phaser Game Implementation
 * Mobile-first bubble shooter with advanced PWA patterns
 */

// Game Configuration
const GAME_CONFIG = {
    type: Phaser.AUTO,
    width: 400,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#2c1810',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        min: {
            width: 320,
            height: 480
        },
        max: {
            width: 800,
            height: 1200
        }
    }
};

// Game State
let game;
let gameState = {
    score: 0,
    level: 1,
    shotsFired: 0,
    gameActive: false,
    grid: [],
    currentBubble: null,
    nextBubble: null,
    launcher: null,
    bubbleGroup: null
};

// Game Constants
const GRID_WIDTH = 8;
const GRID_HEIGHT = 12;
const BUBBLE_RADIUS = 20;
const BUBBLE_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

/**
 * Phaser Preload Function
 * Load game assets
 */
function preload() {
    // Create simple colored circles for bubbles
    BUBBLE_COLORS.forEach(color => {
        this.add.graphics()
            .fillStyle(getColorHex(color))
            .fillCircle(BUBBLE_RADIUS, BUBBLE_RADIUS, BUBBLE_RADIUS)
            .generateTexture(color + '_bubble', BUBBLE_RADIUS * 2, BUBBLE_RADIUS * 2);
    });
    
    console.log('🎮 Game assets loaded');
}

/**
 * Phaser Create Function
 * Initialize game objects and systems
 */
function create() {
    console.log('🚀 Initializing BustAGroove game...');
    
    // Initialize grid system
    initializeGrid.call(this);
    
    // Create bubble group for physics
    gameState.bubbleGroup = this.physics.add.group();
    
    // Create launcher
    createLauncher.call(this);
    
    // Initialize input handling (mobile + desktop)
    setupInputHandling.call(this);
    
    // Create UI elements
    createUI.call(this);
    
    // Start the game
    startNewGame.call(this);
    
    // Notify parent that game is loaded
    if (window.sendToParent) {
        window.sendToParent({ event: 'gameLoaded' });
    }
    
    console.log('✅ BustAGroove game initialized');
}

/**
 * Phaser Update Function
 * Game loop - runs every frame
 */
function update() {
    // Update game logic here
    if (gameState.gameActive && gameState.currentBubble) {
        updateAiming.call(this);
    }
}

/**
 * Initialize hexagonal grid system
 * Core game mechanic - must be pixel-perfect
 */
function initializeGrid() {
    gameState.grid = [];
    
    for (let row = 0; row < GRID_HEIGHT; row++) {
        gameState.grid[row] = [];
        for (let col = 0; col < GRID_WIDTH; col++) {
            gameState.grid[row][col] = null;
        }
    }
    
    // Populate initial grid with demo pattern
    populateInitialGrid.call(this);
}

/**
 * Grid-to-World coordinate conversion
 * Critical function for hexagonal grid positioning
 */
function gridToWorld(col, row) {
    const offsetX = (row % 2) * (BUBBLE_RADIUS); // Hexagonal offset
    const x = 50 + (col * BUBBLE_RADIUS * 2) + offsetX;
    const y = 50 + (row * BUBBLE_RADIUS * 1.7); // Slightly compressed vertically
    
    return { x, y };
}

/**
 * World-to-Grid coordinate conversion
 * Critical function for bubble snapping
 */
function worldToGrid(x, y) {
    const row = Math.round((y - 50) / (BUBBLE_RADIUS * 1.7));
    const offsetX = (row % 2) * BUBBLE_RADIUS;
    const col = Math.round((x - 50 - offsetX) / (BUBBLE_RADIUS * 2));
    
    // Ensure valid grid bounds
    const validCol = Math.max(0, Math.min(GRID_WIDTH - 1, col));
    const validRow = Math.max(0, Math.min(GRID_HEIGHT - 1, row));
    
    return { col: validCol, row: validRow };
}

/**
 * Populate initial grid with demo pattern
 */
function populateInitialGrid() {
    // Create a demo level pattern
    const pattern = [
        ['red', 'blue', 'red', 'blue', 'red', 'blue', 'red', 'blue'],
        ['blue', 'green', 'blue', 'green', 'blue', 'green', 'blue'],
        ['green', 'yellow', 'green', 'yellow', 'green', 'yellow', 'green', 'yellow'],
        ['yellow', 'purple', 'yellow', 'purple', 'yellow', 'purple', 'yellow'],
        ['purple', 'red', 'purple', 'red', 'purple', 'red', 'purple', 'red']
    ];
    
    for (let row = 0; row < pattern.length; row++) {
        for (let col = 0; col < pattern[row].length; col++) {
            if (pattern[row][col] && col < GRID_WIDTH) {
                const color = pattern[row][col];
                const pos = gridToWorld(col, row);
                
                const bubble = this.physics.add.sprite(pos.x, pos.y, color + '_bubble');
                bubble.setCircle(BUBBLE_RADIUS);
                bubble.setImmovable(true);
                bubble.color = color;
                bubble.gridCol = col;
                bubble.gridRow = row;
                
                gameState.bubbleGroup.add(bubble);
                gameState.grid[row][col] = bubble;
            }
        }
    }
}

/**
 * Create bubble launcher
 */
function createLauncher() {
    const launcherX = GAME_CONFIG.width / 2;
    const launcherY = GAME_CONFIG.height - 60;
    
    // Create launcher base
    gameState.launcher = this.add.circle(launcherX, launcherY, 30, 0x8d6e63);
    
    // Create current bubble
    createNewBubble.call(this);
    
    // Create next bubble preview
    createNextBubble.call(this);
}

/**
 * Create new bubble for shooting
 */
function createNewBubble() {
    if (gameState.currentBubble) {
        gameState.currentBubble.destroy();
    }
    
    // Use next bubble if available, otherwise random
    const color = gameState.nextBubble ? gameState.nextBubble.color : getRandomBubbleColor();
    
    const launcherX = GAME_CONFIG.width / 2;
    const launcherY = GAME_CONFIG.height - 60;
    
    gameState.currentBubble = this.physics.add.sprite(launcherX, launcherY - 40, color + '_bubble');
    gameState.currentBubble.setCircle(BUBBLE_RADIUS);
    gameState.currentBubble.color = color;
    
    // Create next bubble
    createNextBubble.call(this);
}

/**
 * Create next bubble preview
 */
function createNextBubble() {
    if (gameState.nextBubble) {
        gameState.nextBubble.destroy();
    }
    
    const color = getRandomBubbleColor();
    const previewX = GAME_CONFIG.width - 60;
    const previewY = GAME_CONFIG.height - 60;
    
    gameState.nextBubble = this.add.sprite(previewX, previewY, color + '_bubble');
    gameState.nextBubble.setScale(0.7);
    gameState.nextBubble.color = color;
}

/**
 * Setup input handling for mobile and desktop
 * Implements dual event handling from PWA lessons
 */
function setupInputHandling() {
    // Touch/Mouse input for aiming and shooting
    this.input.on('pointerdown', handlePointerDown.bind(this));
    this.input.on('pointermove', handlePointerMove.bind(this));
    
    // Keyboard input for desktop
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
}

/**
 * Handle pointer down events (shooting)
 */
function handlePointerDown(pointer) {
    if (!gameState.gameActive || !gameState.currentBubble) return;
    
    shootBubble.call(this, pointer.x, pointer.y);
}

/**
 * Handle pointer move events (aiming)
 */
function handlePointerMove(pointer) {
    if (!gameState.gameActive || !gameState.currentBubble) return;
    
    // Update aiming visual feedback here
}

/**
 * Update aiming system
 */
function updateAiming() {
    // Implement aiming line/trajectory preview
}

/**
 * Shoot bubble towards target
 */
function shootBubble(targetX, targetY) {
    if (!gameState.currentBubble) return;
    
    const bubble = gameState.currentBubble;
    const launcherX = GAME_CONFIG.width / 2;
    const launcherY = GAME_CONFIG.height - 60;
    
    // Calculate trajectory
    const angle = Phaser.Math.Angle.Between(launcherX, launcherY - 40, targetX, targetY);
    const velocity = 400; // Bubble speed
    
    // Set bubble velocity
    bubble.setVelocity(
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity
    );
    
    // Enable world bounds collision with bounce
    bubble.setCollideWorldBounds(true);
    bubble.setBounce(1, 1);
    
    // Set up collision detection
    this.physics.add.overlap(bubble, gameState.bubbleGroup, handleBubbleCollision.bind(this));
    
    // Clear current bubble reference
    gameState.currentBubble = null;
    gameState.shotsFired++;
    
    console.log(`🎯 Bubble shot! Angle: ${angle.toFixed(2)}, Shots: ${gameState.shotsFired}`);
}

/**
 * Handle bubble collision with grid
 */
function handleBubbleCollision(movingBubble, staticBubble) {
    // Stop the moving bubble
    movingBubble.setVelocity(0, 0);
    
    // Find nearest grid position
    const gridPos = worldToGrid(movingBubble.x, movingBubble.y);
    
    // Snap to grid
    const worldPos = gridToWorld(gridPos.col, gridPos.row);
    movingBubble.setPosition(worldPos.x, worldPos.y);
    
    // Add to grid
    gameState.grid[gridPos.row][gridPos.col] = movingBubble;
    movingBubble.gridCol = gridPos.col;
    movingBubble.gridRow = gridPos.row;
    movingBubble.setImmovable(true);
    
    // Check for matches
    checkForMatches.call(this, gridPos.col, gridPos.row);
    
    // Create next bubble
    setTimeout(() => {
        createNewBubble.call(this);
    }, 500);
    
    console.log(`💥 Bubble collision at grid (${gridPos.col}, ${gridPos.row})`);
}

/**
 * Check for matching bubble clusters
 * Core game logic - implements BFS/DFS algorithm
 */
function checkForMatches(col, row) {
    const bubble = gameState.grid[row][col];
    if (!bubble) return;
    
    const matchingBubbles = findConnectedBubbles(col, row, bubble.color);
    
    if (matchingBubbles.length >= 3) {
        // Remove matching cluster
        removeBubbles.call(this, matchingBubbles);
        
        // Check for floating bubbles
        checkForFloatingBubbles.call(this);
        
        // Update score
        updateScore(matchingBubbles.length * 10);
        
        console.log(`🎉 Match found! Removed ${matchingBubbles.length} bubbles`);
    }
}

/**
 * Find connected bubbles of the same color
 * Implements graph traversal algorithm
 */
function findConnectedBubbles(startCol, startRow, color) {
    const visited = new Set();
    const toVisit = [{col: startCol, row: startRow}];
    const connected = [];
    
    while (toVisit.length > 0) {
        const {col, row} = toVisit.pop();
        const key = `${col},${row}`;
        
        if (visited.has(key)) continue;
        if (row < 0 || row >= GRID_HEIGHT || col < 0 || col >= GRID_WIDTH) continue;
        
        const bubble = gameState.grid[row][col];
        if (!bubble || bubble.color !== color) continue;
        
        visited.add(key);
        connected.push({col, row, bubble});
        
        // Add neighbors (hexagonal grid has 6 neighbors)
        const neighbors = getHexagonalNeighbors(col, row);
        neighbors.forEach(neighbor => {
            const neighborKey = `${neighbor.col},${neighbor.row}`;
            if (!visited.has(neighborKey)) {
                toVisit.push(neighbor);
            }
        });
    }
    
    return connected;
}

/**
 * Get hexagonal grid neighbors
 */
function getHexagonalNeighbors(col, row) {
    const neighbors = [];
    const isEvenRow = row % 2 === 0;
    
    // Hexagonal neighbor offsets depend on whether row is even or odd
    const offsets = isEvenRow ? [
        [-1, -1], [0, -1], [-1, 0], [1, 0], [-1, 1], [0, 1]
    ] : [
        [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1], [1, 1]
    ];
    
    offsets.forEach(([deltaCol, deltaRow]) => {
        neighbors.push({
            col: col + deltaCol,
            row: row + deltaRow
        });
    });
    
    return neighbors;
}

/**
 * Remove bubbles from grid and scene
 */
function removeBubbles(bubblesToRemove) {
    bubblesToRemove.forEach(({col, row, bubble}) => {
        if (bubble) {
            gameState.bubbleGroup.remove(bubble);
            bubble.destroy();
            gameState.grid[row][col] = null;
        }
    });
}

/**
 * Check for floating bubbles (not connected to ceiling)
 */
function checkForFloatingBubbles() {
    const connectedToCeiling = new Set();
    
    // Start from top row
    for (let col = 0; col < GRID_WIDTH; col++) {
        if (gameState.grid[0][col]) {
            findConnectedToCeiling(col, 0, connectedToCeiling);
        }
    }
    
    // Remove bubbles not connected to ceiling
    const floatingBubbles = [];
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            const bubble = gameState.grid[row][col];
            if (bubble && !connectedToCeiling.has(`${col},${row}`)) {
                floatingBubbles.push({col, row, bubble});
            }
        }
    }
    
    if (floatingBubbles.length > 0) {
        removeBubbles.call(this, floatingBubbles);
        
        // Bonus points for floating bubbles
        let bonus = 20;
        floatingBubbles.forEach(() => {
            updateScore(bonus);
            bonus *= 2; // Exponential scoring
        });
        
        console.log(`🎈 Removed ${floatingBubbles.length} floating bubbles`);
    }
}

/**
 * Find all bubbles connected to ceiling
 */
function findConnectedToCeiling(startCol, startRow, connected) {
    const toVisit = [{col: startCol, row: startRow}];
    
    while (toVisit.length > 0) {
        const {col, row} = toVisit.pop();
        const key = `${col},${row}`;
        
        if (connected.has(key)) continue;
        if (row < 0 || row >= GRID_HEIGHT || col < 0 || col >= GRID_WIDTH) continue;
        if (!gameState.grid[row][col]) continue;
        
        connected.add(key);
        
        const neighbors = getHexagonalNeighbors(col, row);
        neighbors.forEach(neighbor => {
            const neighborKey = `${neighbor.col},${neighbor.row}`;
            if (!connected.has(neighborKey)) {
                toVisit.push(neighbor);
            }
        });
    }
}

/**
 * Create UI elements
 */
function createUI() {
    // Score display
    gameState.scoreText = this.add.text(16, 16, 'Score: 0', {
        fontSize: '18px',
        fill: '#f5f1e8',
        fontFamily: 'Arial'
    });
    
    // Level display
    gameState.levelText = this.add.text(16, 40, 'Level: 1', {
        fontSize: '16px',
        fill: '#f5f1e8',
        fontFamily: 'Arial'
    });
    
    // Shots counter
    gameState.shotsText = this.add.text(16, 64, 'Shots: 0', {
        fontSize: '14px',
        fill: '#f5f1e8',
        fontFamily: 'Arial'
    });
}

/**
 * Start new game
 */
function startNewGame() {
    gameState.gameActive = true;
    gameState.score = 0;
    gameState.level = 1;
    gameState.shotsFired = 0;
    
    updateUI();
    
    console.log('🎮 New game started!');
}

/**
 * Update score and notify parent
 */
function updateScore(points) {
    gameState.score += points;
    updateUI();
    
    // Notify parent Svelte app
    if (window.sendToParent) {
        window.sendToParent({
            event: 'scoreUpdate',
            score: gameState.score
        });
    }
}

/**
 * Update UI elements
 */
function updateUI() {
    if (gameState.scoreText) {
        gameState.scoreText.setText(`Score: ${gameState.score.toLocaleString()}`);
    }
    if (gameState.levelText) {
        gameState.levelText.setText(`Level: ${gameState.level}`);
    }
    if (gameState.shotsText) {
        gameState.shotsText.setText(`Shots: ${gameState.shotsFired}`);
    }
}

/**
 * Get random bubble color
 */
function getRandomBubbleColor() {
    return BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
}

/**
 * Convert color name to hex value
 */
function getColorHex(colorName) {
    const colors = {
        red: 0xff4444,
        blue: 0x4444ff,
        green: 0x44ff44,
        yellow: 0xffff44,
        purple: 0xff44ff,
        orange: 0xff8844
    };
    return colors[colorName] || 0xffffff;
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Initializing Phaser game...');
    
    // Remove loading message
    const loading = document.querySelector('.loading');
    if (loading) {
        loading.style.display = 'none';
    }
    
    // Create Phaser game instance
    game = new Phaser.Game(GAME_CONFIG);
    window.gameInstance = game;
    
    console.log('✅ Phaser game created');
});

// Export for global access
window.gameState = gameState;
window.GAME_CONFIG = GAME_CONFIG;
