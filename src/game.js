/**
 * CannonPop - Phaser Game Implementation
 * Mobile-first bubble shooter with advanced PWA patterns
 * Updated: 2024-10-03 4:50 PM - MOVED TO SRC FOLDER FOR PROPER BUILD PROCESSING
 */

// FIXED: Inline logger for legacy game code (no ES6 modules)
const isDev = () => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname.includes('127.0.0.1') ||
         localStorage.getItem('debug') === 'true';
};

// CRITICAL FIX: Use console.log directly to prevent infinite recursion
const logger = {
  log: (...args) => { if (isDev()) console.log('[GAME]', ...args); },
  warn: (...args) => { if (isDev()) console.warn('[GAME]', ...args); },
  error: (...args) => { console.error('[GAME]', ...args); }, // Always log errors
  info: (emoji, ...args) => { if (isDev()) console.log('[GAME]', emoji, ...args); }
};

// Mobile-First Responsive Game Configuration
const GAME_CONFIG = {
    type: Phaser.AUTO,
    width: 400,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#b5978c', // Lighter warm brown for better contrast
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
        width: 400,
        height: 600,
        min: {
            width: 320,
            height: 480
        },
        max: {
            width: 500,  // Optimized for mobile screens
            height: 800
        }
    },
    // Enhanced mobile input handling
    input: {
        activePointers: 3,
        touch: {
            capture: true
        }
    },
    // Mobile performance optimizations
    render: {
        antialias: false,
        pixelArt: false,
        roundPixels: true
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
    
    // Input management
    canShoot: false, // Prevents shooting immediately after state change
    lastStateChangeTime: 0,
    
    // Power-ups and special features
    powerUps: {
        bomb: 0,
        rainbow: 0,
        laser: 0
    },
    specialBubbles: [],
    activePowerUp: null,
    
    // Game objects
    grid: [],
    currentBubble: null,
    nextBubble: null,
    launcher: null,
    cannonBarrel: null,
    bubbleGroup: null,
    
    // Aiming system
    isAiming: false,
    aimingLine: null,
    currentAimAngle: 0,
    
    // UI elements
    scoreText: null,
    levelText: null,
    shotsText: null,
    stateText: null,
    powerUpUI: null,
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
const BUBBLE_COLORS = ['blue', 'red', 'yellow', 'cream', 'green', 'purple'];

/**
 * Phaser Preload Function
 * Load game assets
 */
function preload() {
    logger.log('🎯 Phaser preload() called');
    logger.log('🔍 Scale dimensions:', this.scale.width, 'x', this.scale.height);
    
    // Load splash logo image
    this.load.image('splash-logo', '/images/cannon_with_text.png');
    
    // Create balloon sprites with strings/tails
    BUBBLE_COLORS.forEach(color => {
        createBalloonTexture.call(this, color);
    });
    
    logger.log('🎮 Game assets loaded');
}

/**
 * Phaser Create Function
 * Initialize game objects and systems
 */
function create() {
    logger.log('🚀 Initializing CannonPop game...');
    
    // Create bubble group for physics BEFORE initializing grid
    gameState.bubbleGroup = this.physics.add.group();
    
    // Initialize grid system
    initializeGrid.call(this);
    
    // Create playable area border
    createPlayAreaBorder.call(this);
    
    // Create launcher
    createLauncher.call(this);
    
    // Initialize input handling (mobile + desktop)
    setupInputHandling.call(this);
    
    // Start with menu state
    changeGameState.call(this, GAME_STATES.MENU);
    
    // Notify parent that game is loaded
    if (window.handleGameLoaded) {
        window.handleGameLoaded();
    }
    
    logger.log('✅ CannonPop game initialized');
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
    logger.log(`🔄 State change: ${oldState} → ${newState}`);
    
    // Exit old state
    exitState.call(this, oldState);
    
    // Update state
    gameState.currentState = newState;
    gameState.lastStateChangeTime = Date.now();
    
    // Disable shooting temporarily to prevent accidental shots
    gameState.canShoot = false;
    
    // Re-enable shooting after a short delay when entering PLAYING state
    if (newState === GAME_STATES.PLAYING) {
        setTimeout(() => {
            gameState.canShoot = true;
        }, 300); // 300ms delay
    }
    
    // Enter new state
    enterState.call(this, newState, data);
    
    // Notify parent app
    if (window.handleScoreUpdate) {
        window.handleScoreUpdate({
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
 * Grid offset for centering the play area
 */
const GRID_OFFSET_X = 60; // Center horizontally in 400px canvas
const GRID_OFFSET_Y = 30; // Top margin

/**
 * Grid-to-World coordinate conversion
 * Critical function for hexagonal grid positioning
 */
function gridToWorld(col, row) {
    const offsetX = (row % 2) * (BUBBLE_RADIUS); // Hexagonal offset
    const x = GRID_OFFSET_X + (col * BUBBLE_RADIUS * 2) + offsetX;
    const y = GRID_OFFSET_Y + (row * BUBBLE_RADIUS * 1.7); // Slightly compressed vertically
    
    return { x, y };
}

/**
 * World-to-Grid coordinate conversion
 * Critical function for bubble snapping
 */
function worldToGrid(x, y) {
    const row = Math.round((y - GRID_OFFSET_Y) / (BUBBLE_RADIUS * 1.7));
    const offsetX = (row % 2) * BUBBLE_RADIUS;
    const col = Math.round((x - GRID_OFFSET_X - offsetX) / (BUBBLE_RADIUS * 2));
    
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
                bubble.setDepth(20); // Bubbles above everything else
                bubble.gridCol = col;
                bubble.gridRow = row;
                
                gameState.bubbleGroup.add(bubble);
                gameState.grid[row][col] = bubble;
            }
        }
    }
}

/**
 * Create border around the playable area
 */
function createPlayAreaBorder() {
    // Calculate the actual play area dimensions
    const gridWidth = GRID_WIDTH * BUBBLE_RADIUS * 2;
    const gridHeight = GRID_HEIGHT * BUBBLE_RADIUS * 1.7;
    
    // Border rectangle position (centered)
    const borderX = GRID_OFFSET_X - BUBBLE_RADIUS;
    const borderY = GRID_OFFSET_Y - BUBBLE_RADIUS;
    const borderWidth = gridWidth + BUBBLE_RADIUS * 2;
    const borderHeight = gridHeight + BUBBLE_RADIUS * 2;
    
    // Create graphics object for the border
    const graphics = this.add.graphics();
    
    // Draw outer border (darker frame)
    graphics.lineStyle(4, 0x5d4e42, 1); // Dark brown
    graphics.strokeRect(borderX, borderY, borderWidth, borderHeight);
    
    // Draw inner highlight (lighter accent)
    graphics.lineStyle(2, 0x8d7e72, 0.6); // Lighter brown
    graphics.strokeRect(borderX + 4, borderY + 4, borderWidth - 8, borderHeight - 8);
    
    // Set depth to be below bubbles but above background
    graphics.setDepth(5);
    
    // Store reference for potential cleanup
    gameState.playAreaBorder = graphics;
}

/**
 * Create cannon launcher (redesigned from car-like to proper cannon)
 */
function createLauncher() {
    const launcherX = GAME_CONFIG.width / 2;
    const launcherY = GAME_CONFIG.height - 60;
    
    // Create cannon container for grouped elements
    gameState.launcher = this.add.container(launcherX, launcherY);
    // Set cannon depth to 10 (below aiming line at 15, below bubbles at 20)
    gameState.launcher.setDepth(10);
    
    // Create cannon base (sturdy platform instead of wheels)
    const cannonBase = this.add.rectangle(0, 20, 90, 30, 0x444444);
    cannonBase.setStrokeStyle(3, 0x222222);
    gameState.launcher.add(cannonBase);
    
    // Create cannon support legs (instead of wheels)
    const leftLeg = this.add.rectangle(-30, 35, 15, 20, 0x333333);
    leftLeg.setStrokeStyle(2, 0x111111);
    const rightLeg = this.add.rectangle(30, 35, 15, 20, 0x333333);
    rightLeg.setStrokeStyle(2, 0x111111);
    gameState.launcher.add([leftLeg, rightLeg]);
    
    // Add base detail
    const baseDetail = this.add.rectangle(0, 15, 70, 8, 0x555555);
    baseDetail.setStrokeStyle(1, 0x333333);
    gameState.launcher.add(baseDetail);
    
    // Create cannon barrel (main tube) - store reference for rotation
    gameState.cannonBarrel = this.add.rectangle(0, -5, 70, 18, 0x555555);
    gameState.cannonBarrel.setStrokeStyle(2, 0x333333);
    gameState.cannonBarrel.setOrigin(0.8, 0.5); // Set rotation point near the base
    gameState.launcher.add(gameState.cannonBarrel);
    
    // Create cannon muzzle (darker end)
    const cannonMuzzle = this.add.circle(-25, -5, 12, 0x222222);
    cannonMuzzle.setStrokeStyle(3, 0x111111);
    gameState.launcher.add(cannonMuzzle);
    
    // Add cannon bands for detail
    const band1 = this.add.rectangle(-10, -5, 4, 22, 0x444444);
    const band2 = this.add.rectangle(5, -5, 4, 22, 0x444444);
    gameState.launcher.add([band1, band2]);
    
    // Add cannon pivot point
    const cannonPivot = this.add.circle(15, -5, 8, 0x333333);
    cannonPivot.setStrokeStyle(2, 0x111111);
    gameState.launcher.add(cannonPivot);
    
    // Add carnival-style decorations
    const leftFlag = this.add.triangle(-35, -10, 0, 0, 8, -12, 0, -8, 0xff6b35);
    const rightFlag = this.add.triangle(35, -10, 0, 0, -8, -12, 0, -8, 0xff6b35);
    gameState.launcher.add([leftFlag, rightFlag]);
    
    // Store original position for recoil animation
    gameState.cannonOriginalY = launcherY;
    
    // Store barrel reference in game state for rotation
    gameState.cannonBarrel = gameState.cannonBarrel;
    
    // Create current bubble
    createNewBubble.call(this);
    
    // Create next bubble preview
    createNextBubble.call(this);
}

/**
 * Create new bubble for shooting (NO FLASHING)
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
    gameState.currentBubble.setDepth(20); // Bubbles above everything else
    
    // NO GLOW EFFECT - Disabled to prevent flashing
    // addBalloonGlow.call(this, gameState.currentBubble);
    
    // Create next bubble
    createNextBubble.call(this);
}

/**
 * Create next bubble preview (NO FLASHING)
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
    gameState.nextBubble.setDepth(20); // Above aiming line
    
    // NO GLOW EFFECT - Disabled to prevent flashing
}

/**
 * Setup input handling for mobile and desktop
 */
function setupInputHandling() {
    // Enhanced touch/mouse input for aiming and shooting
    this.input.on('pointerdown', handlePointerDown.bind(this));
    this.input.on('pointermove', handlePointerMove.bind(this));
    this.input.on('pointerup', handlePointerUp.bind(this));
    
    // Mobile-specific touch optimizations
    this.input.addPointer(2); // Support multi-touch
    this.input.topOnly = false; // Allow interaction with overlapping elements
}

/**
 * Handle pointer down events
 */
function handlePointerDown(pointer) {
    // Add haptic feedback for mobile devices (if supported)
    if (navigator.vibrate && pointer.event && pointer.event.touches) {
        navigator.vibrate(50); // Short vibration for touch feedback
    }
    
    // Store touch start position for gesture detection
    gameState.touchStartX = pointer.x;
    gameState.touchStartY = pointer.y;
    gameState.touchStartTime = Date.now();
    
    switch (gameState.currentState) {
        case GAME_STATES.MENU:
            handleMenuClick.call(this, pointer.x, pointer.y);
            break;
            
        case GAME_STATES.PLAYING:
            if (gameState.currentBubble) {
                startAiming.call(this, pointer.x, pointer.y);
            }
            break;
            
        case GAME_STATES.PAUSED:
            handlePauseClick.call(this, pointer.x, pointer.y);
            break;
            
        case GAME_STATES.GAME_OVER:
            handleGameOverClick.call(this, pointer.x, pointer.y);
            break;
            
        case GAME_STATES.LEVEL_COMPLETE:
            handleLevelCompleteClick.call(this, pointer.x, pointer.y);
            break;
    }
}

/**
 * Handle pointer move events (aiming)
 */
function handlePointerMove(pointer) {
    if (gameState.currentState !== GAME_STATES.PLAYING || !gameState.currentBubble) return;
    
    // Update aiming trajectory
    updateAimingTrajectory.call(this, pointer.x, pointer.y);
    
    // Update visual aiming feedback
    if (gameState.aimingLine) {
        updateAimingVisuals.call(this, pointer.x, pointer.y);
    }
}

/**
 * Handle pointer up events (release shooting)
 */
function handlePointerUp(pointer) {
    if (gameState.currentState !== GAME_STATES.PLAYING || !gameState.currentBubble) return;
    
    // Check if we're allowed to shoot (prevents accidental shots after state change)
    if (!gameState.canShoot) {
        logger.log('🚫 Shooting blocked - too soon after state change');
        stopAiming.call(this);
        return;
    }
    
    // Calculate touch duration for gesture recognition
    const touchDuration = Date.now() - gameState.touchStartTime;
    const touchDistance = Phaser.Math.Distance.Between(
        gameState.touchStartX, gameState.touchStartY,
        pointer.x, pointer.y
    );
    
    // Determine if this was a tap or drag gesture
    if (touchDuration < 200 && touchDistance < 20) {
        // Quick tap - shoot immediately
        shootBubble.call(this, pointer.x, pointer.y);
    } else if (gameState.isAiming) {
        // Drag release - shoot with current aim
        shootBubble.call(this, pointer.x, pointer.y);
    }
    
    // Clean up aiming state
    stopAiming.call(this);
}

/**
 * Shoot a bubble towards the target position
 */
function shootBubble(targetX, targetY) {
    if (!gameState.currentBubble) return;
    
    // Increment shots counter
    gameState.shotsFired++;
    
    // Get launcher position
    const launcherX = GAME_CONFIG.width / 2;
    const launcherY = GAME_CONFIG.height - 60;
    
    // Calculate velocity based on target
    const angle = Phaser.Math.Angle.Between(launcherX, launcherY - 40, targetX, targetY);
    const speed = 300;
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;
    
    // Set bubble physics
    gameState.currentBubble.setVelocity(velocityX, velocityY);
    gameState.currentBubble.setBounce(0.8, 0.8);
    gameState.currentBubble.setCollideWorldBounds(true);
    
    // Mark bubble as "in flight" to prevent multiple collision handling
    gameState.currentBubble.setData('inFlight', true);
    
    // Use overlap instead of collider to have more control
    this.physics.add.overlap(gameState.currentBubble, gameState.bubbleGroup, (bubble, target) => {
        // Only handle collision once
        if (bubble.getData('inFlight')) {
            bubble.setData('inFlight', false);
            snapBubbleToGrid.call(this, bubble, target);
        }
    }, null, this);
    
    // Clear current bubble reference
    gameState.currentBubble = null;
    
    // Notify parent of shot fired (update shots counter)
    if (window.handleScoreUpdate) {
        window.handleScoreUpdate({
            event: 'gameStats',
            score: gameState.score,
            level: gameState.level,
            shots: gameState.shotsFired
        });
    }
    
    // Create next bubble after a short delay
    this.time.delayedCall(500, () => {
        createNewBubble.call(this);
    });
}

/**
 * Snap a fired bubble to the grid when it collides
 */
function snapBubbleToGrid(firedBubble, targetBubble) {
    // Immediately disable physics to prevent passing through
    firedBubble.setVelocity(0, 0);
    firedBubble.body.enable = false;
    
    // Get the target bubble's grid position
    const targetGridPos = worldToGrid(targetBubble.x, targetBubble.y);
    
    // Find the nearest empty neighbor to the target, closest to fired bubble's position
    const emptyPos = findNearestEmptyNeighbor(targetGridPos.col, targetGridPos.row, firedBubble.x, firedBubble.y);
    
    if (!emptyPos) {
        // Fallback: try the fired bubble's current position
        const firedGridPos = worldToGrid(firedBubble.x, firedBubble.y);
        if (isValidGridPosition(firedGridPos.col, firedGridPos.row) && 
            !gameState.grid[firedGridPos.row][firedGridPos.col]) {
            const worldPos = gridToWorld(firedGridPos.col, firedGridPos.row);
            firedBubble.setPosition(worldPos.x, worldPos.y);
            
            // Add to bubble group and grid
            gameState.bubbleGroup.add(firedBubble);
            gameState.grid[firedGridPos.row][firedGridPos.col] = {
                color: firedBubble.texture.key.replace('_bubble', ''),
                sprite: firedBubble
            };
            
            checkForMatches.call(this, firedGridPos.col, firedGridPos.row);
            return;
        }
        
        // Last resort: try to find ANY empty position near the collision
        const anyEmpty = findAnyEmptyPosition(firedBubble.x, firedBubble.y);
        if (anyEmpty) {
            const worldPos = gridToWorld(anyEmpty.col, anyEmpty.row);
            firedBubble.setPosition(worldPos.x, worldPos.y);
            
            gameState.bubbleGroup.add(firedBubble);
            gameState.grid[anyEmpty.row][anyEmpty.col] = {
                color: firedBubble.texture.key.replace('_bubble', ''),
                sprite: firedBubble
            };
            
            checkForMatches.call(this, anyEmpty.col, anyEmpty.row);
            return;
        }
        
        // No position available at all
        logger.warn('⚠️ No valid position found, destroying bubble');
        firedBubble.destroy();
        return;
    }
    
    // Snap to the empty grid position next to the collision
    const worldPos = gridToWorld(emptyPos.col, emptyPos.row);
    firedBubble.setPosition(worldPos.x, worldPos.y);
    
    // Add to bubble group and grid
    gameState.bubbleGroup.add(firedBubble);
    if (gameState.grid[emptyPos.row]) {
        gameState.grid[emptyPos.row][emptyPos.col] = {
            color: firedBubble.texture.key.replace('_bubble', ''),
            sprite: firedBubble
        };
    }
    
    // Check for matches
    checkForMatches.call(this, emptyPos.col, emptyPos.row);
}

/**
 * Find nearest empty neighbor position (prioritizes position closest to fired bubble)
 */
function findNearestEmptyNeighbor(col, row, firedX, firedY) {
    const isEvenRow = row % 2 === 0;
    let neighbors;
    
    if (isEvenRow) {
        neighbors = [
            {c: col-1, r: row},     // left
            {c: col+1, r: row},     // right
            {c: col-1, r: row-1},   // top-left
            {c: col, r: row-1},     // top-right
            {c: col-1, r: row+1},   // bottom-left
            {c: col, r: row+1}      // bottom-right
        ];
    } else {
        neighbors = [
            {c: col-1, r: row},     // left
            {c: col+1, r: row},     // right
            {c: col, r: row-1},     // top-left
            {c: col+1, r: row-1},   // top-right
            {c: col, r: row+1},     // bottom-left
            {c: col+1, r: row+1}    // bottom-right
        ];
    }
    
    // Filter to only valid empty positions
    const validNeighbors = neighbors.filter(({c, r}) => 
        isValidGridPosition(c, r) && !gameState.grid[r][c]
    );
    
    if (validNeighbors.length === 0) {
        return null;
    }
    
    // Sort by distance from fired bubble if position provided
    if (firedX !== undefined && firedY !== undefined) {
        validNeighbors.sort((a, b) => {
            const aPos = gridToWorld(a.c, a.r);
            const bPos = gridToWorld(b.c, b.r);
            const aDist = Phaser.Math.Distance.Between(firedX, firedY, aPos.x, aPos.y);
            const bDist = Phaser.Math.Distance.Between(firedX, firedY, bPos.x, bPos.y);
            return aDist - bDist;
        });
    }
    
    return {col: validNeighbors[0].c, row: validNeighbors[0].r};
}

/**
 * Find any empty position in the grid near given world coordinates
 */
function findAnyEmptyPosition(x, y) {
    const centerPos = worldToGrid(x, y);
    const searchRadius = 3;
    
    // Search in expanding circles
    for (let radius = 0; radius <= searchRadius; radius++) {
        for (let row = Math.max(0, centerPos.row - radius); 
             row <= Math.min(GRID_HEIGHT - 1, centerPos.row + radius); row++) {
            for (let col = Math.max(0, centerPos.col - radius); 
                 col <= Math.min(GRID_WIDTH - 1, centerPos.col + radius); col++) {
                if (isValidGridPosition(col, row) && !gameState.grid[row][col]) {
                    return {col, row};
                }
            }
        }
    }
    
    return null;
}

/**
 * Check if a grid position is valid (within bounds)
 */
function isValidGridPosition(col, row) {
    return row >= 0 && row < GRID_HEIGHT && col >= 0 && col < GRID_WIDTH;
}

/**
 * Check for matches starting from a position
 */
function checkForMatches(col, row) {
    // Get the bubble at this position
    const gridItem = gameState.grid[row][col];
    if (!gridItem) return;
    
    // Handle both storage formats for getting color
    let color;
    if (gridItem.color) {
        // New format: {color, sprite} or direct sprite with .color property
        color = gridItem.color;
    } else if (gridItem.texture && gridItem.texture.key) {
        // Direct sprite format - extract color from texture key
        color = gridItem.texture.key.replace('_bubble', '');
    } else {
        return; // Can't determine color
    }
    
    const visited = new Set();
    const matches = [];
    
    function dfs(c, r) {
        const key = `${c},${r}`;
        if (visited.has(key)) return;
        if (!gameState.grid[r] || !gameState.grid[r][c]) return;
        
        // Get color for comparison (handle both formats)
        const currentGridItem = gameState.grid[r][c];
        let currentColor;
        if (currentGridItem.color) {
            currentColor = currentGridItem.color;
        } else if (currentGridItem.texture && currentGridItem.texture.key) {
            currentColor = currentGridItem.texture.key.replace('_bubble', '');
        } else {
            return;
        }
        
        if (currentColor !== color) return;
        
        visited.add(key);
        matches.push({col: c, row: r});
        
        // Hexagonal grid neighbors depend on whether row is even or odd
        const isEvenRow = r % 2 === 0;
        let neighbors;
        
        if (isEvenRow) {
            // Even rows
            neighbors = [
                {c: c-1, r: r},     // left
                {c: c+1, r: r},     // right
                {c: c-1, r: r-1},   // top-left
                {c: c, r: r-1},     // top-right
                {c: c-1, r: r+1},   // bottom-left
                {c: c, r: r+1}      // bottom-right
            ];
        } else {
            // Odd rows
            neighbors = [
                {c: c-1, r: r},     // left
                {c: c+1, r: r},     // right
                {c: c, r: r-1},     // top-left
                {c: c+1, r: r-1},   // top-right
                {c: c, r: r+1},     // bottom-left
                {c: c+1, r: r+1}    // bottom-right
            ];
        }
        
        neighbors.forEach(({c: nc, r: nr}) => {
            if (nc >= 0 && nc < GRID_WIDTH && nr >= 0 && nr < GRID_HEIGHT) {
                dfs(nc, nr);
            }
        });
    }
    
    dfs(col, row);
    
    // If we found 3 or more matches, remove them
    if (matches.length >= 3) {
        matches.forEach(({col: c, row: r}) => {
            if (gameState.grid[r] && gameState.grid[r][c]) {
                const gridItem = gameState.grid[r][c];
                
                // Handle both storage formats: direct sprite or {color, sprite} object
                let sprite = null;
                if (gridItem.sprite) {
                    // New format: {color, sprite}
                    sprite = gridItem.sprite;
                } else if (gridItem.destroy) {
                    // Old format: direct sprite
                    sprite = gridItem;
                }
                
                // Create pop animation before destroying
                if (sprite && sprite.x !== undefined && sprite.y !== undefined) {
                    createBubblePopEffect.call(this, sprite.x, sprite.y, sprite);
                }
                
                // Safely destroy the sprite after a short delay (let animation play)
                if (sprite && sprite.destroy && typeof sprite.destroy === 'function') {
                    this.time.delayedCall(150, () => {
                        if (sprite.active) {
                            sprite.destroy();
                        }
                    });
                }
                
                gameState.grid[r][c] = null;
            }
        });
        
        // Update score
        updateScore(matches.length * 10);
        
        // Check for and remove floating bubbles (not connected to ceiling)
        removeFloatingBubbles.call(this);
    }
}

/**
 * Find all bubbles connected to the ceiling (row 0)
 */
function findConnectedBubbles() {
    const connected = new Set();
    
    function bfs(col, row) {
        const key = `${col},${row}`;
        if (connected.has(key)) return;
        if (!gameState.grid[row] || !gameState.grid[row][col]) return;
        
        connected.add(key);
        
        // Get neighbors based on hexagonal grid
        const isEvenRow = row % 2 === 0;
        let neighbors;
        
        if (isEvenRow) {
            neighbors = [
                {c: col-1, r: row},     // left
                {c: col+1, r: row},     // right
                {c: col-1, r: row-1},   // top-left
                {c: col, r: row-1},     // top-right
                {c: col-1, r: row+1},   // bottom-left
                {c: col, r: row+1}      // bottom-right
            ];
        } else {
            neighbors = [
                {c: col-1, r: row},     // left
                {c: col+1, r: row},     // right
                {c: col, r: row-1},     // top-left
                {c: col+1, r: row-1},   // top-right
                {c: col, r: row+1},     // bottom-left
                {c: col+1, r: row+1}    // bottom-right
            ];
        }
        
        neighbors.forEach(({c: nc, r: nr}) => {
            if (nc >= 0 && nc < GRID_WIDTH && nr >= 0 && nr < GRID_HEIGHT) {
                bfs(nc, nr);
            }
        });
    }
    
    // Start BFS from all bubbles in the top row (ceiling)
    for (let col = 0; col < GRID_WIDTH; col++) {
        if (gameState.grid[0][col]) {
            bfs(col, 0);
        }
    }
    
    return connected;
}

/**
 * Remove bubbles that are not connected to the ceiling
 */
function removeFloatingBubbles() {
    const connected = findConnectedBubbles();
    const floating = [];
    
    // Find all floating bubbles
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (gameState.grid[row][col]) {
                const key = `${col},${row}`;
                if (!connected.has(key)) {
                    floating.push({col, row});
                }
            }
        }
    }
    
    // Remove floating bubbles with falling animation
    if (floating.length > 0) {
        logger.log(`💧 Dropping ${floating.length} floating bubble(s)`);
        
        floating.forEach(({col, row}) => {
            const gridItem = gameState.grid[row][col];
            let sprite = null;
            
            if (gridItem.sprite) {
                sprite = gridItem.sprite;
            } else if (gridItem.destroy) {
                sprite = gridItem;
            }
            
            if (sprite && sprite.destroy && typeof sprite.destroy === 'function') {
                // Animate falling
                this.tweens.add({
                    targets: sprite,
                    y: GAME_CONFIG.height + 100,
                    angle: Math.random() * 360,
                    alpha: 0.5,
                    duration: 800 + Math.random() * 400,
                    ease: 'Quad.easeIn',
                    onComplete: () => {
                        if (sprite.active) {
                            sprite.destroy();
                        }
                    }
                });
            }
            
            gameState.grid[row][col] = null;
        });
        
        // Bonus points for floating bubbles
        updateScore(floating.length * 20);
    }
}

/**
 * Create bubble pop effect with particles and animation
 */
function createBubblePopEffect(x, y, sprite) {
    // Get the bubble color for particle effect
    let color = 0xffffff;
    if (sprite.texture && sprite.texture.key) {
        const colorName = sprite.texture.key.replace('_bubble', '');
        color = getColorHex(colorName);
    }
    
    // Scale out animation - bubble grows and fades
    this.tweens.add({
        targets: sprite,
        scaleX: 1.3,
        scaleY: 1.3,
        alpha: 0,
        duration: 150,
        ease: 'Power2'
    });
    
    // Create particle burst effect
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const distance = 30 + Math.random() * 20;
        const endX = x + Math.cos(angle) * distance;
        const endY = y + Math.sin(angle) * distance;
        
        // Create particle circle
        const particle = this.add.circle(x, y, 3 + Math.random() * 3, color, 0.8);
        
        // Animate particle outward and fade
        this.tweens.add({
            targets: particle,
            x: endX,
            y: endY,
            alpha: 0,
            scaleX: 0.5,
            scaleY: 0.5,
            duration: 200 + Math.random() * 100,
            ease: 'Power2',
            onComplete: () => particle.destroy()
        });
    }
    
    // Create a quick flash effect at the center
    const flash = this.add.circle(x, y, BUBBLE_RADIUS, 0xffffff, 0.6);
    this.tweens.add({
        targets: flash,
        scaleX: 1.5,
        scaleY: 1.5,
        alpha: 0,
        duration: 150,
        ease: 'Power2',
        onComplete: () => flash.destroy()
    });
    
    // Add score popup text
    const scoreText = this.add.text(x, y, '+10', {
        fontSize: '16px',
        fill: '#ffff00',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5);
    
    this.tweens.add({
        targets: scoreText,
        y: y - 30,
        alpha: 0,
        duration: 400,
        ease: 'Power2',
        onComplete: () => scoreText.destroy()
    });
}

/**
 * Create clean balloon texture without flicker
 */
function createBalloonTexture(color) {
    const graphics = this.add.graphics();
    const balloonRadius = BUBBLE_RADIUS;
    
    // Create balloon body with solid color - no gradients or complex effects
    const colorHex = getColorHex(color);
    graphics.fillStyle(colorHex, 1);
    graphics.fillEllipse(balloonRadius, balloonRadius - 2, balloonRadius * 2, balloonRadius * 2.1);
    
    // Add very subtle highlight for depth (minimal opacity)
    graphics.fillStyle(0xffffff, 0.1);
    graphics.fillEllipse(balloonRadius - 4, balloonRadius - 5, 4, 6);
    
    // Generate clean texture (no string!)
    const textureWidth = balloonRadius * 2 + 4;
    const textureHeight = balloonRadius * 2 + 4;
    graphics.generateTexture(color + '_bubble', textureWidth, textureHeight);
    
    // Clean up graphics object
    graphics.destroy();
}

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
    
    // Title with logo image
    const titleContainer = this.add.container(0, -100);
    
    // Add logo image - scaled to fit the game board
    const logoImage = this.add.image(0, 0, 'splash-logo');
    
    // Scale the logo to fit within the game board width (leave some padding)
    const maxWidth = GAME_CONFIG.width * 0.8; // 80% of game width
    const maxHeight = 200; // Max height for the logo
    
    // Calculate scale to fit
    const scaleX = maxWidth / logoImage.width;
    const scaleY = maxHeight / logoImage.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
    
    logoImage.setScale(scale);
    titleContainer.add(logoImage);
    
    // Subtitle - positioned below the logo
    const subtitle = this.add.text(0, 80, 'Tap and shoot bubbles\nMatch 3+ to clear\nClear all bubbles to win!', {
        fontSize: '14px',
        fill: '#f5f1e8',
        fontFamily: 'Arial',
        align: 'center'
    }).setOrigin(0.5);
    
    // Start button - positioned below subtitle
    const startButton = this.add.rectangle(0, 150, 200, 50, 0x8d6e63);
    startButton.setStrokeStyle(2, 0xf5f1e8);
    startButton.setInteractive({ useHandCursor: true });
    
    const startText = this.add.text(0, 150, 'Start Game', {
        fontSize: '18px',
        fill: '#f5f1e8',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Add all to container
    gameState.menuContainer.add([menuBg, titleContainer, subtitle, startButton, startText]);
    
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
    // Implementation for level complete screen
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
    // Simple pause overlay implementation
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
        const buttonY = centerY + 150; // Button is at position 150 relative to center
        
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
    // Implementation for level complete clicks
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
        
        changeGameState.call(this, GAME_STATES.LEVEL_COMPLETE, {
            bonusPoints: bonusPoints,
            timeBonus: timeBonus,
            totalScore: gameState.score,
            nextLevel: gameState.level + 1
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
    
    logger.log('🎮 Gameplay started!');
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
 * Update score and notify parent
 */
function updateScore(points) {
    gameState.score += points;
    
    // Check for new high score
    const currentHighScore = parseInt(localStorage.getItem('cannonpop_high_score') || '0');
    if (gameState.score > currentHighScore) {
        localStorage.setItem('cannonpop_high_score', gameState.score.toString());
        
        // Notify parent of new high score
        if (window.handleScoreUpdate) {
            window.handleScoreUpdate({
                event: 'newHighScore',
                score: gameState.score,
                previousHigh: currentHighScore
            });
        }
    }
    
    // Notify parent Svelte app with comprehensive game stats
    if (window.handleScoreUpdate) {
        window.handleScoreUpdate({
            event: 'gameStats',
            score: gameState.score,
            level: gameState.level,
            shots: gameState.shotsFired
        });
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
        
        localStorage.setItem('cannonpop_high_scores', JSON.stringify(topScores));
        logger.log(`🏆 High score saved: ${score.toLocaleString()}`);
        
        return topScores;
    } catch (error) {
        logger.error('❌ Failed to save high score:', error);
        return [];
    }
}

/**
 * Get high scores list
 */
function getHighScores() {
    try {
        const scoresStr = localStorage.getItem('cannonpop_high_scores');
        return scoresStr ? JSON.parse(scoresStr) : [];
    } catch (error) {
        logger.error('❌ Failed to load high scores:', error);
        return [];
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
 * Using color palette: Blue #134686, Red #ED3F27, Yellow #FEB21A, Cream #FDF4E3
 */
function getColorHex(colorName) {
    const colors = {
        blue: 0x134686,      // rgb(19, 70, 134)
        red: 0xED3F27,       // rgb(237, 63, 39)
        yellow: 0xFEB21A,    // rgb(254, 178, 26)
        cream: 0xFDF4E3,     // rgb(253, 244, 227)
        green: 0x44bb44,     // keeping green as accent
        purple: 0xbb44bb     // keeping purple as accent
    };
    return colors[colorName] || 0xffffff;
}

/**
 * Mobile-Specific Touch Handling Functions
 */

/**
 * Start aiming mode for mobile
 */
function startAiming(targetX, targetY) {
    gameState.isAiming = true;
    
    // Create or update aiming line
    if (!gameState.aimingLine) {
        gameState.aimingLine = this.add.graphics();
        // Set depth above cannon (10) but below bubbles (20)
        gameState.aimingLine.setDepth(15);
    }
    
    updateAimingVisuals.call(this, targetX, targetY);
}

/**
 * Stop aiming mode
 */
function stopAiming() {
    gameState.isAiming = false;
    
    if (gameState.aimingLine) {
        gameState.aimingLine.clear();
    }
}

/**
 * Update aiming trajectory calculation
 */
function updateAimingTrajectory(targetX, targetY) {
    if (!gameState.currentBubble) return;
    
    const launcherX = GAME_CONFIG.width / 2;
    const launcherY = GAME_CONFIG.height - 60;
    
    // Calculate angle with mobile-friendly constraints
    let angle = Phaser.Math.Angle.Between(launcherX, launcherY - 40, targetX, targetY);
    
    // Limit aiming angle for better mobile UX (prevent shooting backwards)
    const maxAngle = Math.PI * 0.8; // 144 degrees
    const minAngle = Math.PI * 0.2; // 36 degrees
    
    if (angle > maxAngle) angle = maxAngle;
    if (angle < minAngle) angle = minAngle;
    
    gameState.currentAimAngle = angle;
}

/**
 * Update visual aiming feedback
 */
function updateAimingVisuals(targetX, targetY) {
    if (!gameState.aimingLine) return;
    
    const launcherX = GAME_CONFIG.width / 2;
    const launcherY = GAME_CONFIG.height - 60;
    
    gameState.aimingLine.clear();
    gameState.aimingLine.lineStyle(3, 0xffffff, 0.7);
    
    // Draw aiming line with trajectory preview
    const lineLength = 150;
    const endX = launcherX + Math.cos(gameState.currentAimAngle) * lineLength;
    const endY = launcherY + Math.sin(gameState.currentAimAngle) * lineLength;
    
    gameState.aimingLine.moveTo(launcherX, launcherY - 40);
    gameState.aimingLine.lineTo(endX, endY);
    
    // Add trajectory dots for better mobile feedback
    for (let i = 1; i <= 5; i++) {
        const dotX = launcherX + Math.cos(gameState.currentAimAngle) * (lineLength * i / 5);
        const dotY = launcherY + Math.sin(gameState.currentAimAngle) * (lineLength * i / 5);
        gameState.aimingLine.fillStyle(0xffffff, 0.5);
        gameState.aimingLine.fillCircle(dotX, dotY, 2);
    }
}

/**
 * Update aiming system
 */
function updateAiming() {
    // Implement aiming line/trajectory preview
}

// Global initialization function for manual triggering
window.initializeCannonPopGame = function() {
    if (window.gameInstance) {
        logger.log('🎮 Game already initialized');
        return;
    }
    
    logger.log('🚀 Manual game initialization triggered');
    
    if (document.readyState !== 'loading') {
        logger.log('🎯 Initializing Mobile-Optimized Phaser game...');
        logger.log('🔍 DOM loaded, Phaser available:', typeof Phaser !== 'undefined');
        logger.log('🔍 Game container exists:', !!document.getElementById('game-container'));
        
        // Remove loading message
        const loading = document.querySelector('.loading');
        if (loading) {
            logger.log('🔍 Removing loading message');
            loading.style.display = 'none';
        }
        
        try {
            // Create Phaser game instance with mobile optimizations
            logger.log('🔍 Creating Phaser game with config:', GAME_CONFIG);
            game = new Phaser.Game(GAME_CONFIG);
            window.gameInstance = game;
            
            logger.log('✅ Mobile-optimized Phaser game created successfully');
            
            // Add game ready event listener
            game.events.on('ready', () => {
                logger.log('🎮 Phaser game is ready and running!');
            });
            
        } catch (error) {
            logger.error('❌ Error creating Phaser game:', error);
            
            // Show error message in the game container
            const container = document.getElementById('game-container');
            if (container) {
                container.innerHTML = `
                    <div style="color: #f5f1e8; text-align: center; padding: 20px;">
                        <h3>Game Loading Error</h3>
                        <p>Failed to initialize the game engine.</p>
                        <p style="font-size: 12px; opacity: 0.7;">Check console for details.</p>
                    </div>
                `;
            }
        }
    }
};

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    logger.log('🎯 DOM loaded - calling manual initialization...');
    window.initializeCannonPopGame();
});

// Export for global access
window.gameState = gameState;
window.GAME_CONFIG = GAME_CONFIG;
