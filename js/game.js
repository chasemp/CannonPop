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

// Game State Management
let game;
let gameState = {
    // Core game state
    currentState: 'MENU', // MENU, PLAYING, PAUSED, GAME_OVER, LEVEL_COMPLETE, LOADING
    score: 0,
    level: 1,
    shotsFired: 0,
    shotsUntilCeilingDrop: 6,
    
    // Game objects
    grid: [],
    currentBubble: null,
    nextBubble: null,
    launcher: null,
    bubbleGroup: null,
    
    // UI elements
    scoreText: null,
    levelText: null,
    shotsText: null,
    stateText: null,
    menuContainer: null,
    gameOverContainer: null,
    
    // Game progression
    bubblesCleared: 0,
    totalBubbles: 0,
    ceilingRow: 0,
    
    // Performance tracking
    startTime: null,
    lastShotTime: null
};

// Game State Constants
const GAME_STATES = {
    MENU: 'MENU',
    PLAYING: 'PLAYING', 
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER',
    LEVEL_COMPLETE: 'LEVEL_COMPLETE',
    LOADING: 'LOADING'
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
    
    // Start with menu state
    changeGameState.call(this, GAME_STATES.MENU);
    
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
    // Update based on current game state
    switch (gameState.currentState) {
        case GAME_STATES.PLAYING:
            if (gameState.currentBubble) {
                updateAiming.call(this);
            }
            checkWinCondition.call(this);
            checkLoseCondition.call(this);
            break;
            
        case GAME_STATES.PAUSED:
            // Game is paused - no updates
            break;
            
        case GAME_STATES.MENU:
        case GAME_STATES.GAME_OVER:
        case GAME_STATES.LEVEL_COMPLETE:
            // UI states - handle input for state transitions
            break;
    }
}

/**
 * Game State Management Functions
 */

/**
 * Change game state with proper cleanup and initialization
 */
function changeGameState(newState, data = {}) {
    const oldState = gameState.currentState;
    console.log(`🔄 State change: ${oldState} → ${newState}`);
    
    // Exit old state
    exitState.call(this, oldState);
    
    // Update state
    gameState.currentState = newState;
    
    // Enter new state
    enterState.call(this, newState, data);
    
    // Notify parent app
    if (window.sendToParent) {
        window.sendToParent({
            event: 'stateChanged',
            oldState: oldState,
            newState: newState,
            data: data
        });
    }
}

/**
 * Exit current state - cleanup
 */
function exitState(state) {
    switch (state) {
        case GAME_STATES.MENU:
            hideMenu.call(this);
            break;
            
        case GAME_STATES.PLAYING:
            // Pause any ongoing animations
            break;
            
        case GAME_STATES.GAME_OVER:
            hideGameOver.call(this);
            break;
            
        case GAME_STATES.LEVEL_COMPLETE:
            hideLevelComplete.call(this);
            break;
    }
}

/**
 * Enter new state - initialization
 */
function enterState(state, data) {
    switch (state) {
        case GAME_STATES.MENU:
            showMenu.call(this);
            break;
            
        case GAME_STATES.PLAYING:
            startGameplay.call(this, data);
            break;
            
        case GAME_STATES.PAUSED:
            showPauseOverlay.call(this);
            break;
            
        case GAME_STATES.GAME_OVER:
            // Save high score when game ends
            if (gameState.score > 0) {
                saveHighScore(gameState.score, gameState.level);
            }
            showGameOver.call(this, data);
            break;
            
        case GAME_STATES.LEVEL_COMPLETE:
            showLevelComplete.call(this, data);
            break;
    }
    
    updateStateUI.call(this);
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
 * Handle pointer down events (shooting and UI interaction)
 */
function handlePointerDown(pointer) {
    switch (gameState.currentState) {
        case GAME_STATES.MENU:
            // Check for menu button clicks
            handleMenuClick.call(this, pointer.x, pointer.y);
            break;
            
        case GAME_STATES.PLAYING:
            if (gameState.currentBubble) {
                shootBubble.call(this, pointer.x, pointer.y);
            }
            break;
            
        case GAME_STATES.PAUSED:
            // Check for resume button
            handlePauseClick.call(this, pointer.x, pointer.y);
            break;
            
        case GAME_STATES.GAME_OVER:
            // Check for restart/menu buttons
            handleGameOverClick.call(this, pointer.x, pointer.y);
            break;
            
        case GAME_STATES.LEVEL_COMPLETE:
            // Check for next level/menu buttons
            handleLevelCompleteClick.call(this, pointer.x, pointer.y);
            break;
    }
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
    gameState.shotsUntilCeilingDrop--;
    
    // Check for ceiling drop
    if (gameState.shotsUntilCeilingDrop <= 0) {
        setTimeout(() => {
            dropCeiling.call(this);
        }, 1000); // Drop ceiling after bubble settles
    }
    
    console.log(`🎯 Bubble shot! Angle: ${angle.toFixed(2)}, Shots: ${gameState.shotsFired}, Until drop: ${gameState.shotsUntilCeilingDrop}`);
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
    
    // Auto-save game state
    setTimeout(() => {
        saveGameState.call(this);
    }, 100);
    
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
    
    // Ceiling drop counter
    gameState.dropText = this.add.text(16, 88, 'Until Drop: 6', {
        fontSize: '14px',
        fill: '#ff6b35',
        fontFamily: 'Arial'
    });
}

/**
 * UI State Management Functions
 */

/**
 * Show main menu
 */
function showMenu() {
    if (gameState.menuContainer) {
        gameState.menuContainer.setVisible(true);
        return;
    }
    
    // Create menu container
    gameState.menuContainer = this.add.container(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2);
    
    // Menu background
    const menuBg = this.add.rectangle(0, 0, GAME_CONFIG.width - 40, GAME_CONFIG.height - 100, 0x000000, 0.8);
    menuBg.setStrokeStyle(2, 0x8d6e63);
    
    // Title
    const title = this.add.text(0, -150, '🎮 BustAGroove', {
        fontSize: '32px',
        fill: '#f5f1e8',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Subtitle
    const subtitle = this.add.text(0, -100, 'Bubble Shooter PWA', {
        fontSize: '16px',
        fill: '#8d6e63',
        fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // Start button
    const startButton = this.add.rectangle(0, -20, 200, 50, 0x8d6e63);
    startButton.setStrokeStyle(2, 0xf5f1e8);
    startButton.setInteractive({ useHandCursor: true });
    
    const startText = this.add.text(0, -20, 'Start Game', {
        fontSize: '18px',
        fill: '#f5f1e8',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Instructions
    const instructions = this.add.text(0, 50, 'Aim and shoot bubbles\nMatch 3+ to clear\nClear all bubbles to win!', {
        fontSize: '14px',
        fill: '#f5f1e8',
        fontFamily: 'Arial',
        align: 'center'
    }).setOrigin(0.5);
    
    // Add all to container
    gameState.menuContainer.add([menuBg, title, subtitle, startButton, startText, instructions]);
    
    // Store button reference for click handling
    startButton.buttonType = 'start';
}

/**
 * Hide main menu
 */
function hideMenu() {
    if (gameState.menuContainer) {
        gameState.menuContainer.setVisible(false);
    }
}

/**
 * Show game over screen
 */
function showGameOver(data) {
    if (gameState.gameOverContainer) {
        gameState.gameOverContainer.setVisible(true);
        return;
    }
    
    // Create game over container
    gameState.gameOverContainer = this.add.container(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2);
    
    // Background
    const gameOverBg = this.add.rectangle(0, 0, GAME_CONFIG.width - 40, GAME_CONFIG.height - 100, 0x000000, 0.9);
    gameOverBg.setStrokeStyle(2, 0xff4444);
    
    // Game Over text
    const gameOverText = this.add.text(0, -120, '💥 Game Over', {
        fontSize: '28px',
        fill: '#ff4444',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Final score
    const finalScore = this.add.text(0, -70, `Final Score: ${gameState.score.toLocaleString()}`, {
        fontSize: '18px',
        fill: '#f5f1e8',
        fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // Level reached
    const levelReached = this.add.text(0, -40, `Level Reached: ${gameState.level}`, {
        fontSize: '16px',
        fill: '#8d6e63',
        fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // Restart button
    const restartButton = this.add.rectangle(0, 20, 180, 45, 0x8d6e63);
    restartButton.setStrokeStyle(2, 0xf5f1e8);
    restartButton.setInteractive({ useHandCursor: true });
    
    const restartText = this.add.text(0, 20, 'Play Again', {
        fontSize: '16px',
        fill: '#f5f1e8',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Menu button
    const menuButton = this.add.rectangle(0, 80, 140, 40, 0x5d4e75);
    menuButton.setStrokeStyle(2, 0xf5f1e8);
    menuButton.setInteractive({ useHandCursor: true });
    
    const menuText = this.add.text(0, 80, 'Main Menu', {
        fontSize: '14px',
        fill: '#f5f1e8',
        fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // Add all to container
    gameState.gameOverContainer.add([gameOverBg, gameOverText, finalScore, levelReached, restartButton, restartText, menuButton, menuText]);
    
    // Store button references
    restartButton.buttonType = 'restart';
    menuButton.buttonType = 'menu';
}

/**
 * Hide game over screen
 */
function hideGameOver() {
    if (gameState.gameOverContainer) {
        gameState.gameOverContainer.setVisible(false);
    }
}

/**
 * Show level complete screen
 */
function showLevelComplete(data) {
    if (gameState.levelCompleteContainer) {
        gameState.levelCompleteContainer.setVisible(true);
        return;
    }
    
    // Create level complete container
    gameState.levelCompleteContainer = this.add.container(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2);
    
    // Background
    const completeBg = this.add.rectangle(0, 0, GAME_CONFIG.width - 40, GAME_CONFIG.height - 100, 0x000000, 0.9);
    completeBg.setStrokeStyle(2, 0x4caf50);
    
    // Level Complete text
    const completeText = this.add.text(0, -140, '🎉 Level Complete!', {
        fontSize: '24px',
        fill: '#4caf50',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Score breakdown
    const scoreBreakdown = this.add.text(0, -90, 
        `Score: ${data.totalScore.toLocaleString()}\n` +
        `Bonus: ${data.bonusPoints} pts\n` +
        `Time Bonus: ${data.timeBonus} pts`, {
        fontSize: '14px',
        fill: '#f5f1e8',
        fontFamily: 'Arial',
        align: 'center'
    }).setOrigin(0.5);
    
    // Next level info
    const nextLevelText = this.add.text(0, -20, `Ready for Level ${data.nextLevel}?`, {
        fontSize: '16px',
        fill: '#8d6e63',
        fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // Continue button
    const continueButton = this.add.rectangle(0, 30, 200, 45, 0x4caf50);
    continueButton.setStrokeStyle(2, 0xf5f1e8);
    continueButton.setInteractive({ useHandCursor: true });
    
    const continueText = this.add.text(0, 30, 'Continue Playing', {
        fontSize: '16px',
        fill: '#f5f1e8',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Menu button
    const menuButton = this.add.rectangle(0, 90, 140, 40, 0x5d4e75);
    menuButton.setStrokeStyle(2, 0xf5f1e8);
    menuButton.setInteractive({ useHandCursor: true });
    
    const menuText = this.add.text(0, 90, 'Main Menu', {
        fontSize: '14px',
        fill: '#f5f1e8',
        fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // Add all to container
    gameState.levelCompleteContainer.add([
        completeBg, completeText, scoreBreakdown, nextLevelText, 
        continueButton, continueText, menuButton, menuText
    ]);
    
    // Store button references
    continueButton.buttonType = 'continue';
    menuButton.buttonType = 'menu';
    
    console.log('🎉 Level Complete screen shown!', data);
}

/**
 * Hide level complete screen
 */
function hideLevelComplete() {
    if (gameState.levelCompleteContainer) {
        gameState.levelCompleteContainer.setVisible(false);
    }
}

/**
 * Show pause overlay
 */
function showPauseOverlay() {
    // Simple pause overlay
    if (!gameState.pauseOverlay) {
        gameState.pauseOverlay = this.add.container(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2);
        
        const pauseBg = this.add.rectangle(0, 0, 200, 100, 0x000000, 0.8);
        pauseBg.setStrokeStyle(2, 0x8d6e63);
        
        const pauseText = this.add.text(0, -10, '⏸️ Paused', {
            fontSize: '20px',
            fill: '#f5f1e8',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        const resumeText = this.add.text(0, 20, 'Tap to resume', {
            fontSize: '12px',
            fill: '#8d6e63',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        gameState.pauseOverlay.add([pauseBg, pauseText, resumeText]);
    }
    
    gameState.pauseOverlay.setVisible(true);
}

/**
 * Click Handlers for Different States
 */

/**
 * Handle menu clicks
 */
function handleMenuClick(x, y) {
    if (gameState.menuContainer && gameState.menuContainer.visible) {
        // Check if click is on start button area
        const centerX = GAME_CONFIG.width / 2;
        const centerY = GAME_CONFIG.height / 2;
        const buttonY = centerY - 20;
        
        if (x >= centerX - 100 && x <= centerX + 100 && y >= buttonY - 25 && y <= buttonY + 25) {
            changeGameState.call(this, GAME_STATES.PLAYING);
        }
    }
}

/**
 * Handle game over clicks
 */
function handleGameOverClick(x, y) {
    if (gameState.gameOverContainer && gameState.gameOverContainer.visible) {
        const centerX = GAME_CONFIG.width / 2;
        const centerY = GAME_CONFIG.height / 2;
        
        // Check restart button
        const restartY = centerY + 20;
        if (x >= centerX - 90 && x <= centerX + 90 && y >= restartY - 22 && y <= restartY + 22) {
            changeGameState.call(this, GAME_STATES.PLAYING);
            return;
        }
        
        // Check menu button
        const menuY = centerY + 80;
        if (x >= centerX - 70 && x <= centerX + 70 && y >= menuY - 20 && y <= menuY + 20) {
            changeGameState.call(this, GAME_STATES.MENU);
            return;
        }
    }
}

/**
 * Handle pause clicks
 */
function handlePauseClick(x, y) {
    changeGameState.call(this, GAME_STATES.PLAYING);
}

/**
 * Handle level complete clicks
 */
function handleLevelCompleteClick(x, y) {
    if (gameState.levelCompleteContainer && gameState.levelCompleteContainer.visible) {
        const centerX = GAME_CONFIG.width / 2;
        const centerY = GAME_CONFIG.height / 2;
        
        // Check continue button
        const continueY = centerY + 30;
        if (x >= centerX - 100 && x <= centerX + 100 && y >= continueY - 22 && y <= continueY + 22) {
            changeGameState.call(this, GAME_STATES.PLAYING);
            return;
        }
        
        // Check menu button
        const menuY = centerY + 90;
        if (x >= centerX - 70 && x <= centerX + 70 && y >= menuY - 20 && y <= menuY + 20) {
            changeGameState.call(this, GAME_STATES.MENU);
            return;
        }
    }
}

/**
 * Game Condition Checking
 */

/**
 * Check win condition
 */
function checkWinCondition() {
    // Count remaining bubbles
    let remainingBubbles = 0;
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (gameState.grid[row][col]) {
                remainingBubbles++;
            }
        }
    }
    
    if (remainingBubbles === 0) {
        // Level complete!
        const bonusPoints = Math.max(0, (gameState.shotsUntilCeilingDrop * 100));
        const timeBonus = Math.max(0, Math.floor((60000 - (Date.now() - gameState.startTime)) / 1000) * 10);
        
        updateScore(bonusPoints + timeBonus);
        
        // Advance to next level
        advanceToNextLevel.call(this);
        
        changeGameState.call(this, GAME_STATES.LEVEL_COMPLETE, {
            bonusPoints: bonusPoints,
            timeBonus: timeBonus,
            totalScore: gameState.score,
            nextLevel: gameState.level
        });
    }
}

/**
 * Check lose condition
 */
function checkLoseCondition() {
    // Check if any bubble has reached the bottom deadline
    const deadlineRow = GRID_HEIGHT - 2;
    
    for (let col = 0; col < GRID_WIDTH; col++) {
        if (gameState.grid[deadlineRow] && gameState.grid[deadlineRow][col]) {
            // Game over!
            changeGameState.call(this, GAME_STATES.GAME_OVER, {
                reason: 'Bubbles reached the bottom',
                finalScore: gameState.score,
                level: gameState.level
            });
            return;
        }
    }
}

/**
 * Start gameplay
 */
function startGameplay(data) {
    // Initialize or reset game state
    if (!data || data.restart) {
        gameState.score = 0;
        gameState.level = 1;
        gameState.shotsFired = 0;
        gameState.shotsUntilCeilingDrop = 6;
        gameState.ceilingRow = 0;
        gameState.startTime = Date.now();
        
        // Clear and reinitialize grid
        clearGrid.call(this);
        initializeGrid.call(this);
        populateInitialGrid.call(this);
    }
    
    // Create new bubble if needed
    if (!gameState.currentBubble) {
        createNewBubble.call(this);
    }
    
    updateUI();
    console.log('🎮 Gameplay started!');
}

/**
 * Clear the grid
 */
function clearGrid() {
    if (gameState.bubbleGroup) {
        gameState.bubbleGroup.clear(true, true);
    }
    
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            gameState.grid[row][col] = null;
        }
    }
}

/**
 * Update state-specific UI
 */
function updateStateUI() {
    if (gameState.stateText) {
        gameState.stateText.setText(`State: ${gameState.currentState}`);
    }
}

/**
 * Level Progression and Ceiling Drop Mechanics
 */

/**
 * Drop the ceiling by one row
 */
function dropCeiling() {
    console.log('⬇️ Dropping ceiling...');
    
    // Move all bubbles down one row
    const newGrid = [];
    for (let row = 0; row < GRID_HEIGHT; row++) {
        newGrid[row] = [];
        for (let col = 0; col < GRID_WIDTH; col++) {
            newGrid[row][col] = null;
        }
    }
    
    // Copy existing bubbles down one row
    for (let row = GRID_HEIGHT - 2; row >= 0; row--) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (gameState.grid[row][col]) {
                const bubble = gameState.grid[row][col];
                const newRow = row + 1;
                
                if (newRow < GRID_HEIGHT) {
                    newGrid[newRow][col] = bubble;
                    bubble.gridRow = newRow;
                    
                    // Update visual position
                    const newPos = gridToWorld(col, newRow);
                    bubble.setPosition(newPos.x, newPos.y);
                } else {
                    // Bubble would go off screen - game over condition
                    bubble.destroy();
                }
            }
        }
    }
    
    // Add new row at the top
    addNewCeilingRow.call(this, newGrid);
    
    // Update grid reference
    gameState.grid = newGrid;
    gameState.ceilingRow++;
    
    // Reset shots until next drop (gets faster as game progresses)
    const baseShots = Math.max(3, 6 - Math.floor(gameState.level / 3));
    gameState.shotsUntilCeilingDrop = baseShots;
    
    // Check lose condition after ceiling drop
    setTimeout(() => {
        checkLoseCondition.call(this);
    }, 500);
    
    console.log(`📊 Ceiling dropped to row ${gameState.ceilingRow}, next drop in ${gameState.shotsUntilCeilingDrop} shots`);
}

/**
 * Add new row of bubbles at the top
 */
function addNewCeilingRow(grid) {
    // Generate pattern for new row
    const pattern = generateCeilingRowPattern();
    
    for (let col = 0; col < GRID_WIDTH; col++) {
        if (pattern[col] && Math.random() < 0.7) { // 70% chance for bubble
            const color = getRandomBubbleColor();
            const pos = gridToWorld(col, 0);
            
            const bubble = this.physics.add.sprite(pos.x, pos.y, color + '_bubble');
            bubble.setCircle(BUBBLE_RADIUS);
            bubble.setImmovable(true);
            bubble.color = color;
            bubble.gridCol = col;
            bubble.gridRow = 0;
            
            gameState.bubbleGroup.add(bubble);
            grid[0][col] = bubble;
        }
    }
}

/**
 * Generate pattern for new ceiling row
 */
function generateCeilingRowPattern() {
    const pattern = new Array(GRID_WIDTH).fill(true);
    
    // Create some gaps for strategy
    const gaps = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < gaps; i++) {
        const gapPos = Math.floor(Math.random() * GRID_WIDTH);
        pattern[gapPos] = false;
    }
    
    return pattern;
}

/**
 * Advance to next level
 */
function advanceToNextLevel() {
    gameState.level++;
    
    // Level-specific adjustments
    const levelConfig = getLevelConfiguration(gameState.level);
    
    // Clear grid and populate with new level
    clearGrid.call(this);
    initializeGrid.call(this);
    populateLevelGrid.call(this, levelConfig);
    
    // Reset level-specific state
    gameState.shotsFired = 0;
    gameState.ceilingRow = 0;
    gameState.shotsUntilCeilingDrop = levelConfig.shotsUntilDrop;
    
    console.log(`🆙 Advanced to level ${gameState.level}`);
    
    // Notify parent
    if (window.sendToParent) {
        window.sendToParent({
            event: 'levelAdvanced',
            level: gameState.level,
            score: gameState.score
        });
    }
}

/**
 * Get configuration for specific level
 */
function getLevelConfiguration(level) {
    return {
        shotsUntilDrop: Math.max(3, 8 - Math.floor(level / 2)),
        bubbleColors: Math.min(6, 3 + Math.floor(level / 3)),
        initialRows: Math.min(8, 4 + Math.floor(level / 4)),
        difficulty: level <= 3 ? 'easy' : level <= 6 ? 'medium' : 'hard'
    };
}

/**
 * Populate grid for specific level
 */
function populateLevelGrid(config) {
    const colors = BUBBLE_COLORS.slice(0, config.bubbleColors);
    
    for (let row = 0; row < config.initialRows; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (Math.random() < 0.8) { // 80% chance for bubble
                const color = colors[Math.floor(Math.random() * colors.length)];
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
 * Update score and notify parent
 */
function updateScore(points) {
    gameState.score += points;
    updateUI();
    
    // Check for new high score
    const currentHighScore = parseInt(localStorage.getItem('bustagroove_high_score') || '0');
    if (gameState.score > currentHighScore) {
        localStorage.setItem('bustagroove_high_score', gameState.score.toString());
        
        // Notify parent of new high score
        if (window.sendToParent) {
            window.sendToParent({
                event: 'newHighScore',
                score: gameState.score,
                previousHigh: currentHighScore
            });
        }
    }
    
    // Notify parent Svelte app
    if (window.sendToParent) {
        window.sendToParent({
            event: 'scoreUpdate',
            score: gameState.score
        });
    }
}

/**
 * Local Storage Management
 */

/**
 * Save game state to localStorage
 */
function saveGameState() {
    const saveData = {
        version: '1.0.0',
        timestamp: Date.now(),
        gameState: {
            score: gameState.score,
            level: gameState.level,
            shotsFired: gameState.shotsFired,
            shotsUntilCeilingDrop: gameState.shotsUntilCeilingDrop,
            ceilingRow: gameState.ceilingRow,
            startTime: gameState.startTime
        },
        grid: serializeGrid(),
        currentBubbleColor: gameState.currentBubble?.color,
        nextBubbleColor: gameState.nextBubble?.color
    };
    
    try {
        localStorage.setItem('bustagroove_save_state', JSON.stringify(saveData));
        console.log('💾 Game state saved');
    } catch (error) {
        console.error('❌ Failed to save game state:', error);
    }
}

/**
 * Load game state from localStorage
 */
function loadGameState() {
    try {
        const saveDataStr = localStorage.getItem('bustagroove_save_state');
        if (!saveDataStr) return null;
        
        const saveData = JSON.parse(saveDataStr);
        console.log('📂 Game state loaded');
        return saveData;
    } catch (error) {
        console.error('❌ Failed to load game state:', error);
        return null;
    }
}

/**
 * Clear saved game state
 */
function clearSavedGameState() {
    localStorage.removeItem('bustagroove_save_state');
    console.log('🗑️ Saved game state cleared');
}

/**
 * Serialize grid for saving
 */
function serializeGrid() {
    const serializedGrid = [];
    for (let row = 0; row < GRID_HEIGHT; row++) {
        serializedGrid[row] = [];
        for (let col = 0; col < GRID_WIDTH; col++) {
            const bubble = gameState.grid[row][col];
            serializedGrid[row][col] = bubble ? {
                color: bubble.color,
                col: col,
                row: row
            } : null;
        }
    }
    return serializedGrid;
}

/**
 * Deserialize grid from saved data
 */
function deserializeGrid(serializedGrid) {
    // Clear existing grid
    clearGrid.call(this);
    initializeGrid.call(this);
    
    // Restore bubbles from serialized data
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            const bubbleData = serializedGrid[row][col];
            if (bubbleData) {
                const pos = gridToWorld(col, row);
                
                const bubble = this.physics.add.sprite(pos.x, pos.y, bubbleData.color + '_bubble');
                bubble.setCircle(BUBBLE_RADIUS);
                bubble.setImmovable(true);
                bubble.color = bubbleData.color;
                bubble.gridCol = col;
                bubble.gridRow = row;
                
                gameState.bubbleGroup.add(bubble);
                gameState.grid[row][col] = bubble;
            }
        }
    }
}

/**
 * Save high score list
 */
function saveHighScore(score, level) {
    try {
        const highScores = getHighScores();
        
        const newEntry = {
            score: score,
            level: level,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };
        
        highScores.push(newEntry);
        
        // Sort by score (descending) and keep top 10
        highScores.sort((a, b) => b.score - a.score);
        const topScores = highScores.slice(0, 10);
        
        localStorage.setItem('bustagroove_high_scores', JSON.stringify(topScores));
        console.log(`🏆 High score saved: ${score.toLocaleString()}`);
        
        return topScores;
    } catch (error) {
        console.error('❌ Failed to save high score:', error);
        return [];
    }
}

/**
 * Get high scores list
 */
function getHighScores() {
    try {
        const scoresStr = localStorage.getItem('bustagroove_high_scores');
        return scoresStr ? JSON.parse(scoresStr) : [];
    } catch (error) {
        console.error('❌ Failed to load high scores:', error);
        return [];
    }
}

/**
 * Save game settings
 */
function saveSettings(settings) {
    try {
        localStorage.setItem('bustagroove_settings', JSON.stringify(settings));
        console.log('⚙️ Settings saved');
    } catch (error) {
        console.error('❌ Failed to save settings:', error);
    }
}

/**
 * Load game settings
 */
function loadSettings() {
    try {
        const settingsStr = localStorage.getItem('bustagroove_settings');
        return settingsStr ? JSON.parse(settingsStr) : {
            sound: true,
            music: true,
            difficulty: 'normal',
            showAimingLine: true
        };
    } catch (error) {
        console.error('❌ Failed to load settings:', error);
        return { sound: true, music: true, difficulty: 'normal', showAimingLine: true };
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
    if (gameState.dropText) {
        const color = gameState.shotsUntilCeilingDrop <= 2 ? '#ff4444' : '#ff6b35';
        gameState.dropText.setColor(color);
        gameState.dropText.setText(`Until Drop: ${gameState.shotsUntilCeilingDrop}`);
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
