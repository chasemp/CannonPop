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

// Enhanced logging with error tracking and recovery
const logger = {
  log: (...args) => { if (isDev()) console.log('[GAME]', ...args); },
  warn: (...args) => { if (isDev()) console.warn('[GAME]', ...args); },
  error: (...args) => { 
    console.error('[GAME]', ...args);
    // Track errors for debugging
    if (window.gameErrorCount === undefined) window.gameErrorCount = 0;
    window.gameErrorCount++;
  },
  info: (emoji, ...args) => { if (isDev()) console.log('[GAME]', emoji, ...args); }
};

// Error recovery system
const ErrorRecovery = {
  maxRetries: 3,
  retryCount: 0,
  
  handleError(error, context, retryFn) {
    logger.error(`❌ Error in ${context}:`, error);
    
    if (this.retryCount < this.maxRetries && retryFn) {
      this.retryCount++;
      logger.warn(`🔄 Retrying ${context} (attempt ${this.retryCount}/${this.maxRetries})`);
      setTimeout(() => {
        try {
          retryFn();
        } catch (retryError) {
          this.handleError(retryError, context, retryFn);
        }
      }, 1000 * this.retryCount);
    } else {
      logger.error(`💥 Max retries exceeded for ${context}`);
      this.showErrorToUser(context, error);
    }
  },
  
  showErrorToUser(context, error) {
    const container = document.getElementById('game-container');
    if (container) {
      container.innerHTML = `
        <div style="color: #f5f1e8; text-align: center; padding: 20px; background: rgba(0,0,0,0.8); border-radius: 8px;">
          <h3>⚠️ Game Error</h3>
          <p>Something went wrong: ${context}</p>
          <button onclick="location.reload()" style="padding: 8px 16px; margin-top: 10px; background: #8d6e63; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Reload Game
          </button>
        </div>
      `;
    }
  },
  
  reset() {
    this.retryCount = 0;
  }
};

// Mobile-First Responsive Game Configuration
const GAME_CONFIG = {
    type: Phaser.AUTO,
    width: 400,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#fff5e1', // Match UI background (light cream)
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
    
    // Create launcher
    createLauncher.call(this);
    
    // Create aiming line graphics (initialize early for proper depth layering)
    gameState.aimingLine = this.add.graphics();
    gameState.aimingLine.setDepth(15); // Above cannon (10), below bubbles (20)
    
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
    try {
        const oldState = gameState.currentState;
        logger.log(`🔄 State change: ${oldState} → ${newState}`);
        
        // Validate state transition
        if (!isValidStateTransition(oldState, newState)) {
            logger.warn(`⚠️ Invalid state transition: ${oldState} → ${newState}`);
            return;
        }
        
        // Exit old state with cleanup
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
        
    } catch (error) {
        ErrorRecovery.handleError(error, 'changeGameState', () => {
            // Try to recover by resetting to menu state
            gameState.currentState = GAME_STATES.MENU;
            enterState.call(this, GAME_STATES.MENU);
        });
    }
}

/**
 * Validate state transitions
 */
function isValidStateTransition(from, to) {
    const validTransitions = {
        [GAME_STATES.MENU]: [GAME_STATES.PLAYING, GAME_STATES.LOADING],
        [GAME_STATES.LOADING]: [GAME_STATES.MENU, GAME_STATES.PLAYING],
        [GAME_STATES.PLAYING]: [GAME_STATES.PAUSED, GAME_STATES.GAME_OVER, GAME_STATES.LEVEL_COMPLETE],
        [GAME_STATES.PAUSED]: [GAME_STATES.PLAYING, GAME_STATES.MENU],
        [GAME_STATES.GAME_OVER]: [GAME_STATES.MENU, GAME_STATES.PLAYING],
        [GAME_STATES.LEVEL_COMPLETE]: [GAME_STATES.PLAYING, GAME_STATES.MENU]
    };
    
    return validTransitions[from] && validTransitions[from].includes(to);
}

/**
 * Clean up resources and prevent memory leaks
 */
function cleanupResources() {
    try {
        // Clean up tweens
        if (this.tweens) {
            this.tweens.killAll();
        }
        
        // Clean up physics groups
        if (gameState.bubbleGroup) {
            gameState.bubbleGroup.clear(true, true);
        }
        
        // Clean up UI elements
        if (gameState.menuContainer) {
            gameState.menuContainer.destroy();
            gameState.menuContainer = null;
        }
        
        if (gameState.gameOverContainer) {
            gameState.gameOverContainer.destroy();
            gameState.gameOverContainer = null;
        }
        
        // Clean up aiming line
        if (gameState.aimingLine) {
            gameState.aimingLine.clear();
        }
        
        // Reset error recovery
        ErrorRecovery.reset();
        
        logger.log('🧹 Resources cleaned up');
        
    } catch (error) {
        logger.error('❌ Error during cleanup:', error);
    }
}

/**
 * Exit current state - cleanup
 */
function exitState(state) {
    try {
        switch (state) {
            case GAME_STATES.MENU:
                hideMenu.call(this);
                break;
                
            case GAME_STATES.PLAYING:
                // Pause any ongoing animations
                if (this.tweens) {
                    this.tweens.pauseAll();
                }
                break;
                
            case GAME_STATES.GAME_OVER:
                hideGameOver.call(this);
                break;
                
            case GAME_STATES.LEVEL_COMPLETE:
                hideLevelComplete.call(this);
                break;
                
            case GAME_STATES.PAUSED:
                // Resume tweens when exiting pause
                if (this.tweens) {
                    this.tweens.resumeAll();
                }
                break;
        }
        
        // Always clean up resources when exiting any state
        cleanupResources.call(this);
        
    } catch (error) {
        logger.error(`❌ Error exiting state ${state}:`, error);
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
const GRID_OFFSET_X = 60; // Center horizontally in 400px canvas (grid is ~320px wide)
const GRID_OFFSET_Y = 60; // Center vertically (more space from top)

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
 * Shoot a bubble towards the target position with comprehensive validation
 */
function shootBubble(targetX, targetY) {
    try {
        // Validate game state
        if (!validateGameState(GAME_STATES.PLAYING)) {
            logger.warn('⚠️ Cannot shoot - invalid game state');
            return;
        }
        
        // Validate shooting is allowed
        if (!gameState.canShoot) {
            logger.warn('⚠️ Cannot shoot - shooting disabled');
            return;
        }
        
        // Validate current bubble exists
        if (!gameState.currentBubble || !gameState.currentBubble.active) {
            logger.warn('⚠️ Cannot shoot - no current bubble');
            return;
        }
        
        // Validate and clamp input coordinates
        const validatedCoords = validateInputCoordinates(targetX, targetY);
        targetX = validatedCoords.x;
        targetY = validatedCoords.y;
        
        // Throttle shooting to prevent rapid-fire
        if (gameState.lastShotTime && Date.now() - gameState.lastShotTime < 200) {
            logger.warn('⚠️ Shooting too fast - throttled');
            return;
        }
        
        // Increment shots counter
        gameState.shotsFired++;
        gameState.lastShotTime = Date.now();
        
        // Get launcher position
        const launcherX = GAME_CONFIG.width / 2;
        const launcherY = GAME_CONFIG.height - 60;
        
        // Calculate velocity based on target
        const angle = Phaser.Math.Angle.Between(launcherX, launcherY - 40, targetX, targetY);
        const speed = 300;
        const velocityX = Math.cos(angle) * speed;
        const velocityY = Math.sin(angle) * speed;
        
        // Validate velocity is reasonable
        if (isNaN(velocityX) || isNaN(velocityY) || Math.abs(velocityX) > 1000 || Math.abs(velocityY) > 1000) {
            logger.error('❌ Invalid velocity calculated:', velocityX, velocityY);
            return;
        }
        
        // Set bubble physics
        gameState.currentBubble.setVelocity(velocityX, velocityY);
        gameState.currentBubble.setBounce(0.8, 0.8);
        gameState.currentBubble.setCollideWorldBounds(true);
        
        // Mark bubble as "in flight" to prevent multiple collision handling
        gameState.currentBubble.setData('inFlight', true);
        
        // Use continuous collision detection for precise placement
        this.physics.add.overlap(gameState.currentBubble, gameState.bubbleGroup, (bubble, target) => {
            // Only handle collision once
            if (bubble.getData('inFlight')) {
                bubble.setData('inFlight', false);
                handleBubbleCollision.call(this, bubble, target);
            }
        }, null, this);
        
        // Also check for wall collisions
        this.physics.add.collider(gameState.currentBubble, this.physics.world.bounds, (bubble) => {
            if (bubble.getData('inFlight')) {
                bubble.setData('inFlight', false);
                handleWallCollision.call(this, bubble);
            }
        });
        
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
        
    } catch (error) {
        ErrorRecovery.handleError(error, 'shootBubble', () => {
            // Retry by creating a new bubble
            createNewBubble.call(this);
        });
    }
}

/**
 * Handle collision between fired bubble and existing bubble
 */
function handleBubbleCollision(firedBubble, targetBubble) {
    // Stop the bubble immediately
    firedBubble.setVelocity(0, 0);
    firedBubble.body.enable = false;
    
    // Calculate precise collision point and find best grid position
    const collisionPoint = calculateCollisionPoint(firedBubble, targetBubble);
    const gridPos = findBestGridPosition(collisionPoint.x, collisionPoint.y);
    
    if (gridPos) {
        placeBubbleOnGrid(firedBubble, gridPos.col, gridPos.row);
    } else {
        // No valid position found - destroy the bubble
        logger.warn('⚠️ No valid grid position found, destroying bubble');
        firedBubble.destroy();
    }
}

/**
 * Handle collision with wall (top or sides)
 */
function handleWallCollision(firedBubble) {
    // Stop the bubble
    firedBubble.setVelocity(0, 0);
    firedBubble.body.enable = false;
    
    // Find the best grid position near the wall collision
    const gridPos = findBestGridPosition(firedBubble.x, firedBubble.y);
    
    if (gridPos) {
        placeBubbleOnGrid(firedBubble, gridPos.col, gridPos.row);
    } else {
        // No valid position found - destroy the bubble
        logger.warn('⚠️ No valid grid position found for wall collision, destroying bubble');
        firedBubble.destroy();
    }
}

/**
 * Calculate the precise collision point between two bubbles
 */
function calculateCollisionPoint(bubble1, bubble2) {
    // Calculate the point where the bubbles would touch
    const dx = bubble2.x - bubble1.x;
    const dy = bubble2.y - bubble1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize the direction vector
    const normalizedX = dx / distance;
    const normalizedY = dy / distance;
    
    // Calculate the collision point (where bubbles touch)
    const touchDistance = BUBBLE_RADIUS * 2;
    const collisionX = bubble2.x - (normalizedX * touchDistance);
    const collisionY = bubble2.y - (normalizedY * touchDistance);
    
    return { x: collisionX, y: collisionY };
}

/**
 * Find the best grid position for a bubble at given world coordinates
 */
function findBestGridPosition(worldX, worldY) {
    // Convert world position to grid coordinates
    const gridPos = worldToGrid(worldX, worldY);
    
    // Check if the calculated position is valid and empty
    if (isValidGridPosition(gridPos.col, gridPos.row) && 
        !gameState.grid[gridPos.row][gridPos.col]) {
        return gridPos;
    }
    
    // If not, find the nearest empty position
    return findNearestEmptyPosition(gridPos.col, gridPos.row);
}

/**
 * Find the nearest empty position using BFS
 */
function findNearestEmptyPosition(startCol, startRow) {
    const visited = new Set();
    const queue = [{ col: startCol, row: startRow, distance: 0 }];
    visited.add(`${startCol},${startRow}`);
    
    while (queue.length > 0) {
        const { col, row, distance } = queue.shift();
        
        // Check if this position is empty
        if (isValidGridPosition(col, row) && !gameState.grid[row][col]) {
            return { col, row };
        }
        
        // If we've searched too far, stop
        if (distance >= 3) continue;
        
        // Add neighbors to queue
        const neighbors = getHexagonalNeighbors(col, row);
        for (const neighbor of neighbors) {
            const key = `${neighbor.c},${neighbor.r}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push({ col: neighbor.c, row: neighbor.r, distance: distance + 1 });
            }
        }
    }
    
    return null; // No empty position found
}

/**
 * Get hexagonal neighbors for a given position
 */
function getHexagonalNeighbors(col, row) {
    const isEvenRow = row % 2 === 0;
    
    if (isEvenRow) {
        return [
            {c: col-1, r: row},     // left
            {c: col+1, r: row},     // right
            {c: col-1, r: row-1},   // top-left
            {c: col, r: row-1},     // top-right
            {c: col-1, r: row+1},   // bottom-left
            {c: col, r: row+1}      // bottom-right
        ];
    } else {
        return [
            {c: col-1, r: row},     // left
            {c: col+1, r: row},     // right
            {c: col, r: row-1},     // top-left
            {c: col+1, r: row-1},   // top-right
            {c: col, r: row+1},     // bottom-left
            {c: col+1, r: row+1}    // bottom-right
        ];
    }
}

/**
 * Place a bubble on the grid at the specified position
 */
function placeBubbleOnGrid(bubble, col, row) {
    // Snap to exact grid position
    const worldPos = gridToWorld(col, row);
    bubble.setPosition(worldPos.x, worldPos.y);
    
    // Add to bubble group
    gameState.bubbleGroup.add(bubble);
    
    // Add to grid
    if (gameState.grid[row]) {
        gameState.grid[row][col] = {
            color: bubble.texture.key.replace('_bubble', ''),
            sprite: bubble
        };
    }
    
    // Check for matches
    checkForMatches.call(this, col, row);
}


/**
 * Check if a grid position is valid (within bounds)
 */
function isValidGridPosition(col, row) {
    return row >= 0 && row < GRID_HEIGHT && col >= 0 && col < GRID_WIDTH;
}

/**
 * Validate input coordinates and clamp to valid ranges
 */
function validateInputCoordinates(x, y) {
    // Clamp coordinates to game bounds
    const clampedX = Math.max(0, Math.min(GAME_CONFIG.width, x));
    const clampedY = Math.max(0, Math.min(GAME_CONFIG.height, y));
    
    // Check if coordinates are valid numbers
    if (isNaN(clampedX) || isNaN(clampedY)) {
        logger.warn('⚠️ Invalid input coordinates:', x, y);
        return { x: GAME_CONFIG.width / 2, y: GAME_CONFIG.height / 2 };
    }
    
    return { x: clampedX, y: clampedY };
}

/**
 * Validate game state before operations
 */
function validateGameState(requiredState = null) {
    if (!gameState) {
        logger.error('❌ Game state is null');
        return false;
    }
    
    if (requiredState && gameState.currentState !== requiredState) {
        logger.warn(`⚠️ Invalid state for operation. Required: ${requiredState}, Current: ${gameState.currentState}`);
        return false;
    }
    
    if (!gameState.grid || !Array.isArray(gameState.grid)) {
        logger.error('❌ Grid is not properly initialized');
        return false;
    }
    
    return true;
}

/**
 * Throttle function to prevent rapid-fire input
 */
function throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    
    return function (...args) {
        const currentTime = Date.now();
        
        if (currentTime - lastExecTime > delay) {
            func.apply(this, args);
            lastExecTime = currentTime;
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
                lastExecTime = Date.now();
            }, delay - (currentTime - lastExecTime));
        }
    };
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
 * Find all bubbles connected to the ceiling (row 0) using flood-fill
 */
function findConnectedBubbles() {
    const connected = new Set();
    const queue = [];
    
    // Start flood-fill from all bubbles in the top row (ceiling)
    for (let col = 0; col < GRID_WIDTH; col++) {
        if (gameState.grid[0] && gameState.grid[0][col]) {
            const key = `${col},0`;
            connected.add(key);
            queue.push({col, row: 0});
        }
    }
    
    // Flood-fill using BFS
    while (queue.length > 0) {
        const {col, row} = queue.shift();
        
        // Check all hexagonal neighbors
        const neighbors = getHexagonalNeighbors(col, row);
        for (const neighbor of neighbors) {
            const {c, r} = neighbor;
            const key = `${c},${r}`;
            
            // Skip if already processed or out of bounds
            if (connected.has(key)) continue;
            if (!isValidGridPosition(c, r)) continue;
            if (!gameState.grid[r] || !gameState.grid[r][c]) continue;
            
            // Add to connected set and queue for further processing
            connected.add(key);
            queue.push({col: c, row: r});
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
        if (!gameState.grid[row]) continue;
        
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
            if (!gridItem) return;
            
            let sprite = null;
            if (gridItem.sprite) {
                sprite = gridItem.sprite;
            } else if (gridItem.destroy) {
                sprite = gridItem;
            }
            
            if (sprite && sprite.destroy && typeof sprite.destroy === 'function') {
                // Remove from bubble group
                if (gameState.bubbleGroup && gameState.bubbleGroup.contains(sprite)) {
                    gameState.bubbleGroup.remove(sprite);
                }
                
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
            
            // Clear grid position
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
    
    // Tagline - positioned below the logo
    const tagline = this.add.text(0, 80, 'Shoot cannons, pop balloons.', {
        fontSize: '18px',
        fill: '#f5f1e8',
        fontFamily: 'Arial',
        fontStyle: 'italic',
        align: 'center'
    }).setOrigin(0.5);
    
    // Instructions - positioned below tagline
    const instructions = this.add.text(0, 110, 'Match 3+ to clear • Clear all to win!', {
        fontSize: '13px',
        fill: '#d5d1c8',
        fontFamily: 'Arial',
        align: 'center'
    }).setOrigin(0.5);
    
    // Start button - positioned below instructions
    const startButton = this.add.rectangle(0, 160, 200, 50, 0x8d6e63);
    startButton.setStrokeStyle(2, 0xf5f1e8);
    startButton.setInteractive({ useHandCursor: true });
    
    const startText = this.add.text(0, 160, 'Start Game', {
        fontSize: '18px',
        fill: '#f5f1e8',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Add all to container
    gameState.menuContainer.add([menuBg, titleContainer, tagline, instructions, startButton, startText]);
    
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
    
    // Aiming line already created during initialization with proper depth
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

// Global game control functions
window.restartGame = function() {
    logger.log('🔄 Restart game requested');
    if (window.gameInstance && window.gameInstance.scene.scenes[0]) {
        const scene = window.gameInstance.scene.scenes[0];
        // Reset game state and restart
        changeGameState.call(scene, GAME_STATES.PLAYING, { restart: true });
        logger.log('✅ Game restarted');
    }
};

window.pauseGame = function() {
    logger.log('⏸️ Pause game requested');
    if (window.gameInstance && window.gameInstance.scene.scenes[0]) {
        const scene = window.gameInstance.scene.scenes[0];
        changeGameState.call(scene, GAME_STATES.PAUSED);
        logger.log('✅ Game paused');
    }
};

window.resumeGame = function() {
    logger.log('▶️ Resume game requested');
    if (window.gameInstance && window.gameInstance.scene.scenes[0]) {
        const scene = window.gameInstance.scene.scenes[0];
        changeGameState.call(scene, GAME_STATES.PLAYING);
        logger.log('✅ Game resumed');
    }
};
