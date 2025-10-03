/**
 * BustAGroove - Phaser Game Implementation
 * Mobile-first bubble shooter with advanced PWA patterns
 */

// Inline logger for legacy game code (no ES6 modules)
const isDev = () => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname.includes('127.0.0.1') ||
         localStorage.getItem('debug') === 'true';
};

const logger = {
  log: (...args) => { if (isDev()) logger.log(...args); },
  warn: (...args) => { if (isDev()) logger.warn(...args); },
  error: (...args) => { logger.error(...args); }, // Always log errors
  info: (emoji, ...args) => { if (isDev()) logger.log(emoji, ...args); }
};

// Mobile-First Responsive Game Configuration
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

// Audio System for Carnival Theme
class CarnivalAudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.musicEnabled = true;
        this.sfxEnabled = true;
        this.masterVolume = 0.7;
        this.sfxVolume = 0.8;
        this.musicVolume = 0.4;
        
        this.initializeAudio();
    }
    
    initializeAudio() {
        try {
            // Create AudioContext (handles user gesture requirement)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            logger.log('🎵 Carnival Audio System initialized');
        } catch (error) {
            logger.warn('⚠️ Audio not supported:', error);
        }
    }
    
    // Resume AudioContext after user interaction (required by browsers)
    async resumeAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            logger.log('🎵 Audio context resumed');
        }
    }
    
    // Generate carnival-themed sound effects using Web Audio API
    createCannonFireSound() {
        if (!this.audioContext) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Cannon boom sound
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(80, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(20, this.audioContext.currentTime + 0.3);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.4);
        
        return { oscillator, gainNode };
    }
    
    createBubblePopSound() {
        if (!this.audioContext) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Cheerful pop sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.6, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.15);
        
        return { oscillator, gainNode };
    }
    
    createBubbleBounceSound() {
        if (!this.audioContext) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Bouncy sound
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.05);
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.12);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.12);
        
        return { oscillator, gainNode };
    }
    
    createSuccessJingleSound() {
        if (!this.audioContext) return null;
        
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const sounds = [];
        
        notes.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
            
            const startTime = this.audioContext.currentTime + (index * 0.1);
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(this.sfxVolume * this.masterVolume * 0.4, startTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.3);
            
            sounds.push({ oscillator, gainNode });
        });
        
        return sounds;
    }
    
    // Background music system with multiple tracks
    createBackgroundMusic() {
        if (!this.audioContext || !this.musicEnabled) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        const reverb = this.audioContext.createConvolver();
        
        oscillator.connect(filter);
        filter.connect(reverb);
        reverb.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Create a more complex ambient melody
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime); // A3
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, this.audioContext.currentTime);
        filter.Q.setValueAtTime(1, this.audioContext.currentTime);
        
        // Add subtle reverb
        const reverbBuffer = this.createReverbBuffer();
        reverb.buffer = reverbBuffer;
        
        gainNode.gain.setValueAtTime(this.musicVolume * this.masterVolume * 0.08, this.audioContext.currentTime);
        
        oscillator.start();
        
        return { oscillator, gainNode, filter, reverb };
    }
    
    // Create reverb buffer for ambient music
    createReverbBuffer() {
        const length = this.audioContext.sampleRate * 2; // 2 seconds
        const buffer = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        return buffer;
    }
    
    // Create layered background music
    createLayeredMusic() {
        if (!this.audioContext || !this.musicEnabled) return null;
        
        const layers = [];
        
        // Bass layer
        const bassOsc = this.audioContext.createOscillator();
        const bassGain = this.audioContext.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(110, this.audioContext.currentTime); // A2
        bassGain.gain.setValueAtTime(this.musicVolume * this.masterVolume * 0.05, this.audioContext.currentTime);
        bassOsc.connect(bassGain);
        bassGain.connect(this.audioContext.destination);
        bassOsc.start();
        layers.push({ oscillator: bassOsc, gainNode: bassGain });
        
        // Melody layer
        const melodyOsc = this.audioContext.createOscillator();
        const melodyGain = this.audioContext.createGain();
        melodyOsc.type = 'triangle';
        melodyOsc.frequency.setValueAtTime(440, this.audioContext.currentTime); // A4
        melodyGain.gain.setValueAtTime(this.musicVolume * this.masterVolume * 0.03, this.audioContext.currentTime);
        melodyOsc.connect(melodyGain);
        melodyGain.connect(this.audioContext.destination);
        melodyOsc.start();
        layers.push({ oscillator: melodyOsc, gainNode: melodyGain });
        
        return layers;
    }
    
    playBackgroundMusic() {
        if (!this.musicEnabled) return;
        this.resumeAudio();
        
        if (this.backgroundMusic) {
            this.stopBackgroundMusic();
        }
        
        this.backgroundMusic = this.createBackgroundMusic();
    }
    
    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.oscillator.stop();
            this.backgroundMusic = null;
        }
    }
    
    // Public methods for playing sounds
    playCannonFire() {
        if (!this.sfxEnabled) return;
        this.resumeAudio();
        this.createCannonFireSound();
    }
    
    playBubblePop() {
        if (!this.sfxEnabled) return;
        this.resumeAudio();
        this.createBubblePopSound();
    }
    
    playBubbleBounce() {
        if (!this.sfxEnabled) return;
        this.resumeAudio();
        this.createBubbleBounceSound();
    }
    
    playSuccessJingle() {
        if (!this.sfxEnabled) return;
        this.resumeAudio();
        this.createSuccessJingleSound();
    }
    
    // Special bubble sound effects
    playBombSound() {
        if (!this.sfxEnabled) return;
        this.resumeAudio();
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(20, this.audioContext.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume * this.masterVolume * 0.3, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }
    
    playRainbowSound() {
        if (!this.sfxEnabled) return;
        this.resumeAudio();
        
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
        const sounds = [];
        
        notes.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
            
            const startTime = this.audioContext.currentTime + (index * 0.05);
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(this.sfxVolume * this.masterVolume * 0.2, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.4);
            
            sounds.push({ oscillator, gainNode });
        });
        
        return sounds;
    }
    
    playLaserSound() {
        if (!this.sfxEnabled) return;
        this.resumeAudio();
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(400, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume * this.masterVolume * 0.4, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }
    
    playLevelUpSound() {
        if (!this.sfxEnabled) return;
        this.resumeAudio();
        
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5
        const sounds = [];
        
        notes.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
            
            const startTime = this.audioContext.currentTime + (index * 0.08);
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(this.sfxVolume * this.masterVolume * 0.3, startTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.3);
            
            sounds.push({ oscillator, gainNode });
        });
        
        return sounds;
    }
    
    // Settings management
    setSfxEnabled(enabled) {
        this.sfxEnabled = enabled;
        localStorage.setItem('bustagroove_sfx_enabled', enabled.toString());
    }
    
    setMusicEnabled(enabled) {
        this.musicEnabled = enabled;
        localStorage.setItem('bustagroove_music_enabled', enabled.toString());
    }
    
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('bustagroove_master_volume', this.masterVolume.toString());
    }
    
    loadSettings() {
        const sfxEnabled = localStorage.getItem('bustagroove_sfx_enabled');
        const musicEnabled = localStorage.getItem('bustagroove_music_enabled');
        const masterVolume = localStorage.getItem('bustagroove_master_volume');
        
        if (sfxEnabled !== null) this.sfxEnabled = sfxEnabled === 'true';
        if (musicEnabled !== null) this.musicEnabled = musicEnabled === 'true';
        if (masterVolume !== null) this.masterVolume = parseFloat(masterVolume);
    }
}

// Global audio manager instance
let audioManager;

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

// Special bubble types
const SPECIAL_BUBBLE_TYPES = {
    BOMB: 'bomb',
    RAINBOW: 'rainbow',
    LASER: 'laser',
    MULTI: 'multi'
};

// Power-up effects
const POWER_UP_EFFECTS = {
    BOMB: {
        radius: 3,
        damage: 50,
        color: 0xff0000,
        sound: 'bomb'
    },
    RAINBOW: {
        matchesAny: true,
        color: 0xffffff,
        sound: 'rainbow'
    },
    LASER: {
        pierce: true,
        color: 0x00ff00,
        sound: 'laser'
    }
};

/**
 * Phaser Preload Function
 * Load game assets
 */
function preload() {
    logger.log('🎯 Phaser preload() called');
    logger.log('🔍 Scale dimensions:', this.scale.width, 'x', this.scale.height);
    
    // Create balloon sprites with strings/tails
    BUBBLE_COLORS.forEach(color => {
        createBalloonTexture.call(this, color);
    });
    
    // Create special bubble textures
    createSpecialBubbleTextures.call(this);
    
    logger.log('🎮 Game assets loaded');
}

/**
 * Phaser Create Function
 * Initialize game objects and systems
 */
function create() {
    logger.log('🚀 Initializing BustAGroove game...');
    
    // Initialize audio system
    audioManager = new CarnivalAudioManager();
    
    // Initialize analytics
    if (window.GameAnalytics) {
        analytics = new window.GameAnalytics();
        logger.log('📊 Analytics initialized');
    }
    
    // Initialize social manager
    if (window.SocialManager) {
        socialManager = new window.SocialManager();
        logger.log('👥 Social manager initialized');
    }
    
    // Initialize performance manager
    if (window.PerformanceManager) {
        performanceManager = new window.PerformanceManager();
        logger.log('⚡ Performance manager initialized');
    }
    audioManager.loadSettings();
    
    // Create bubble group for physics BEFORE initializing grid
    gameState.bubbleGroup = this.physics.add.group();
    
    // Initialize grid system
    initializeGrid.call(this);
    
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
    
    logger.log('✅ BustAGroove game initialized');
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
            // Start background music when playing
            if (audioManager) {
                audioManager.playBackgroundMusic();
            }
            // Track game start
            if (analytics) {
                analytics.trackGameStart();
            }
            break;
            
        case GAME_STATES.PAUSED:
            showPauseOverlay.call(this);
            // Pause background music
            if (audioManager) {
                audioManager.stopBackgroundMusic();
            }
            break;
            
        case GAME_STATES.GAME_OVER:
            // Save high score when game ends
            if (gameState.score > 0) {
                saveHighScore(gameState.score, gameState.level);
            }
            showGameOver.call(this, data);
            // Stop background music
            if (audioManager) {
                audioManager.stopBackgroundMusic();
            }
            // Track game end
            if (analytics) {
                analytics.trackGameEnd(gameState.score, gameState.level, 'game_over');
            }
            
            // Check achievements and add to leaderboard
            if (socialManager) {
                const gameStats = {
                    score: gameState.score,
                    level: gameState.level,
                    shotsFired: gameState.shotsFired,
                    bubblesCleared: gameState.bubblesCleared,
                    specialBubblesUsed: gameState.specialBubblesUsed || 0,
                    powerUpsActivated: gameState.powerUpsActivated || 0,
                    accuracy: socialManager.calculateAccuracy ? socialManager.calculateAccuracy() : 0
                };
                
                socialManager.checkAchievements(gameStats);
                socialManager.addToLeaderboard(gameState.score, gameState.level);
            }
            break;
            
        case GAME_STATES.LEVEL_COMPLETE:
            showLevelComplete.call(this, data);
            // Play level complete sound
            if (audioManager) {
                audioManager.playLevelUpSound();
            }
            // Track level complete
            if (analytics) {
                analytics.trackLevelComplete(gameState.level, gameState.score, Date.now() - gameState.levelStartTime);
            }
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
                
                let textureName = color + '_bubble';
                if (isSpecialBubble(color)) {
                    textureName = getSpecialBubbleTexture(color);
                }
                const bubble = this.physics.add.sprite(pos.x, pos.y, textureName);
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
 * Create balloon cannon launcher
 * Replaces generic bubble launcher with themed cannon
 */
function createLauncher() {
    const launcherX = GAME_CONFIG.width / 2;
    const launcherY = GAME_CONFIG.height - 60;
    
    // Create cannon container for grouped elements
    gameState.launcher = this.add.container(launcherX, launcherY);
    
    // Create cannon base (wooden platform)
    const cannonBase = this.add.rectangle(0, 20, 80, 25, 0x8b4513);
    cannonBase.setStrokeStyle(2, 0x654321);
    gameState.launcher.add(cannonBase);
    
    // Create cannon wheels
    const leftWheel = this.add.circle(-25, 32, 12, 0x444444);
    leftWheel.setStrokeStyle(2, 0x222222);
    const rightWheel = this.add.circle(25, 32, 12, 0x444444);
    rightWheel.setStrokeStyle(2, 0x222222);
    gameState.launcher.add([leftWheel, rightWheel]);
    
    // Create cannon barrel (main tube) - store reference for rotation
    gameState.cannonBarrel = this.add.rectangle(0, -5, 60, 20, 0x666666);
    gameState.cannonBarrel.setStrokeStyle(2, 0x444444);
    gameState.cannonBarrel.setOrigin(0.8, 0.5); // Set rotation point near the base
    gameState.launcher.add(gameState.cannonBarrel);
    
    // Create cannon muzzle (darker end)
    const cannonMuzzle = this.add.circle(0, -5, 15, 0x333333);
    cannonMuzzle.setStrokeStyle(2, 0x111111);
    gameState.launcher.add(cannonMuzzle);
    
    // Create decorative cannon details
    const cannonRim = this.add.circle(0, -5, 18, 0x555555, 0);
    cannonRim.setStrokeStyle(3, 0x777777);
    gameState.launcher.add(cannonRim);
    
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
    
    // Set up input handling for cannon aiming
    this.input.on('pointermove', handlePointerMove, this);
    this.input.on('pointerdown', handlePointerDown, this);
}

/**
 * Trigger cannon recoil animation
 * Adds visual feedback when shooting balloons
 */
function triggerCannonRecoil() {
    if (!gameState.launcher) return;
    
    // Recoil effect - move cannon back and forth
    this.tweens.add({
        targets: gameState.launcher,
        y: gameState.cannonOriginalY + 8, // Move down slightly
        duration: 100,
        ease: 'Power2',
        yoyo: true,
        repeat: 0,
        onComplete: () => {
            // Return to original position
            gameState.launcher.y = gameState.cannonOriginalY;
        }
    });
    
    // Add barrel shake for extra effect
    if (gameState.cannonBarrel) {
        this.tweens.add({
            targets: gameState.cannonBarrel,
            scaleX: 1.1,
            scaleY: 0.9,
            duration: 80,
            ease: 'Power2',
            yoyo: true,
            repeat: 0
        });
    }
}

/**
 * Create muzzle flash effect
 * Visual effect when cannon fires
 */
function createMuzzleFlash(x, y) {
    // Create bright flash circle
    const flash = this.add.circle(x, y, 25, 0xffff00, 0.8);
    
    // Add orange outer glow
    const glow = this.add.circle(x, y, 35, 0xff6600, 0.4);
    
    // Animate flash effect
    this.tweens.add({
        targets: [flash, glow],
        scaleX: 1.5,
        scaleY: 1.5,
        alpha: 0,
        duration: 150,
        ease: 'Power2',
        onComplete: () => {
            flash.destroy();
            glow.destroy();
        }
    });
    
    // Add some spark particles
    for (let i = 0; i < 8; i++) {
        const spark = this.add.circle(
            x + (Math.random() - 0.5) * 20,
            y + (Math.random() - 0.5) * 20,
            2,
            0xffaa00
        );
        
        this.tweens.add({
            targets: spark,
            x: spark.x + (Math.random() - 0.5) * 40,
            y: spark.y + (Math.random() - 0.5) * 40,
            alpha: 0,
            duration: 200 + Math.random() * 100,
            ease: 'Power2',
            onComplete: () => spark.destroy()
        });
    }
}

/**
 * Rotate cannon barrel to aim at target
 */
function rotateCannon(angle) {
    if (!gameState.cannonBarrel) return;
    
    // Convert angle to rotation (Phaser uses different coordinate system)
    // Clamp rotation to reasonable limits (-60° to 60°)
    const maxRotation = Phaser.Math.DegToRad(60);
    const minRotation = Phaser.Math.DegToRad(-60);
    
    // Convert world angle to cannon rotation
    let rotation = angle + Math.PI / 2; // Adjust for cannon's default orientation
    rotation = Phaser.Math.Clamp(rotation, minRotation, maxRotation);
    
    // Smooth rotation animation
    this.tweens.add({
        targets: gameState.cannonBarrel,
        rotation: rotation,
        duration: 150,
        ease: 'Power2'
    });
}

/**
 * Handle pointer move for aiming
 */
function handlePointerMove(pointer) {
    if (!gameState.currentBubble) return;
    
    // Calculate angle for cannon aiming
    const launcherX = GAME_CONFIG.width / 2;
    const launcherY = GAME_CONFIG.height - 60;
    
    const angle = Phaser.Math.Angle.Between(launcherX, launcherY - 40, pointer.x, pointer.y);
    
    // Rotate cannon to aim
    rotateCannon.call(this, angle);
    
    // Store angle for shooting
    gameState.currentAimAngle = angle;
}

/**
 * Handle pointer down for shooting
 */
function handlePointerDown(pointer) {
    if (!gameState.currentBubble) return;
    
    // Shoot bubble in the aimed direction
    const launcherX = GAME_CONFIG.width / 2;
    const launcherY = GAME_CONFIG.height - 60;
    
    // Use current aim angle or calculate from pointer
    const angle = gameState.currentAimAngle || 
                  Phaser.Math.Angle.Between(launcherX, launcherY - 40, pointer.x, pointer.y);
    
    // Calculate target position from angle
    const distance = 400;
    const targetX = launcherX + Math.cos(angle) * distance;
    const targetY = launcherY - 40 + Math.sin(angle) * distance;
    
    // Shoot the bubble
    shootBubble.call(this, targetX, targetY);
}

/**
 * Shoot a bubble towards the target position
 */
function shootBubble(targetX, targetY) {
    if (!gameState.currentBubble) return;
    
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
    
    // Add subtle glow effect while in flight
    addBalloonGlow.call(this, gameState.currentBubble);
    
    // Add collision with other bubbles
    this.physics.add.collider(gameState.currentBubble, gameState.bubbleGroup, (bubble, target) => {
        // Handle special bubble effects before normal collision
        if (isSpecialBubble(bubble.bubbleColor)) {
            handleSpecialBubbleEffect.call(this, bubble, target);
        } else {
            // Handle normal bubble collision - snap to grid
            snapBubbleToGrid.call(this, bubble, target);
        }
    });
    
    // Add wall bounce sound
    gameState.currentBubble.on('worldbounds', () => {
        if (audioManager) {
            audioManager.playBubbleBounce();
        }
    });
    
    // Play cannon fire sound
    if (audioManager) {
        audioManager.playCannonFire();
    }
    
    // Track bubble shot
    if (analytics) {
        analytics.trackBubbleShot(gameState.currentAimAngle, 1.0);
    }
    
    // Trigger cannon recoil animation
    triggerCannonRecoil.call(this);
    
    // Create muzzle flash
    createMuzzleFlash.call(this);
    
    // Clear current bubble
    gameState.currentBubble = null;
    
    // Create next bubble after a short delay
    this.time.delayedCall(500, () => {
        createNewBubble.call(this);
    });
}

/**
 * Add subtle glow effect to a balloon while it's in flight
 */
function addBalloonGlow(bubble) {
    // Create a subtle glow effect
    const glow = this.add.circle(bubble.x, bubble.y, BUBBLE_RADIUS + 8, 0xffffff, 0.1);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    
    // Make glow follow the bubble
    bubble.glow = glow;
    
    // Add gentle pulsing animation
    this.tweens.add({
        targets: glow,
        alpha: 0.3,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    // Update glow position to follow the bubble
    bubble.updateGlow = () => {
        if (bubble.glow && bubble.active) {
            bubble.glow.setPosition(bubble.x, bubble.y);
        }
    };
}

/**
 * Remove glow effect when balloon comes to rest
 */
function removeBalloonGlow(bubble) {
    if (bubble.glow) {
        bubble.glow.destroy();
        bubble.glow = null;
    }
}

/**
 * Snap a fired bubble to the grid when it collides
 */
function snapBubbleToGrid(firedBubble, targetBubble) {
    // Calculate grid position
    const gridPos = worldToGrid(firedBubble.x, firedBubble.y);
    
    // Stop the bubble
    firedBubble.setVelocity(0, 0);
    
    // Remove glow effect when balloon comes to rest
    removeBalloonGlow.call(this, firedBubble);
    
    // Snap to exact grid position
    const worldPos = gridToWorld(gridPos.col, gridPos.row);
    firedBubble.setPosition(worldPos.x, worldPos.y);
    
    // Add to grid
    if (gameState.grid[gridPos.row]) {
        gameState.grid[gridPos.row][gridPos.col] = {
            color: firedBubble.texture.key.replace('_bubble', ''),
            sprite: firedBubble
        };
    }
    
    // Check for matches
    checkForMatches.call(this, gridPos.col, gridPos.row);
}

/**
 * Check for matches starting from a position
 */
function checkForMatches(col, row) {
    // Basic match detection - find connected bubbles of same color
    const color = gameState.grid[row][col].color;
    const visited = new Set();
    const matches = [];
    
    function dfs(c, r) {
        const key = `${c},${r}`;
        if (visited.has(key)) return;
        if (!gameState.grid[r] || !gameState.grid[r][c]) return;
        if (gameState.grid[r][c].color !== color) return;
        
        visited.add(key);
        matches.push({col: c, row: r});
        
        // Check all 6 neighbors in hexagonal grid
        const neighbors = [
            {c: c-1, r: r}, {c: c+1, r: r}, // left, right
            {c: c-1, r: r-1}, {c: c, r: r-1}, // top-left, top-right
            {c: c-1, r: r+1}, {c: c, r: r+1}  // bottom-left, bottom-right
        ];
        
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
                gameState.grid[r][c].sprite.destroy();
                gameState.grid[r][c] = null;
            }
        });
        
    // Play success sound
    if (audioManager) {
        audioManager.playSuccessJingle();
    }
    
    // Add bubble pop sound for each bubble
    if (audioManager) {
        audioManager.playBubblePop();
    }
    }
}

/**
 * Create clean balloon texture without flicker
 * Simple, solid design for smooth visual experience
 */
function createBalloonTexture(color) {
    const graphics = this.add.graphics();
    const balloonRadius = BUBBLE_RADIUS;
    const stringLength = 8;
    
    // Create balloon body with solid color - no gradients or complex effects
    const colorHex = getColorHex(color);
    graphics.fillStyle(colorHex, 1);
    graphics.fillEllipse(balloonRadius, balloonRadius - 2, balloonRadius * 2, balloonRadius * 2.1);
    
    // Add very subtle highlight for depth (minimal opacity)
    graphics.fillStyle(0xffffff, 0.1);
    graphics.fillEllipse(balloonRadius - 4, balloonRadius - 5, 4, 6);
    
    // Add simple balloon string
    graphics.lineStyle(1, 0x333333, 0.8);
    graphics.beginPath();
    graphics.moveTo(balloonRadius, balloonRadius * 2 - 2);
    graphics.lineTo(balloonRadius + 1, balloonRadius * 2 + stringLength);
    graphics.strokePath();
    
    // Add small knot at the end
    graphics.fillStyle(0x333333, 0.7);
    graphics.fillCircle(balloonRadius + 1, balloonRadius * 2 + stringLength, 1);
    
    // Generate clean texture
    const textureWidth = balloonRadius * 2 + 4;
    const textureHeight = balloonRadius * 2 + stringLength + 4;
    graphics.generateTexture(color + '_bubble', textureWidth, textureHeight);
    
    // Clean up graphics object
    graphics.destroy();
}

/**
 * Create special bubble textures for power-ups
 */
function createSpecialBubbleTextures() {
    const graphics = this.add.graphics();
    const balloonRadius = BUBBLE_RADIUS;
    const stringLength = 8;
    
    // Bomb bubble
    graphics.fillStyle(0xff0000, 1);
    graphics.fillEllipse(balloonRadius, balloonRadius - 2, balloonRadius * 2, balloonRadius * 2.1);
    graphics.fillStyle(0xffffff, 0.8);
    graphics.fillEllipse(balloonRadius, balloonRadius - 2, balloonRadius * 1.2, balloonRadius * 1.2);
    graphics.fillStyle(0xff0000, 1);
    graphics.fillEllipse(balloonRadius, balloonRadius - 2, balloonRadius * 0.6, balloonRadius * 0.6);
    // Add string
    graphics.lineStyle(1, 0x333333, 0.8);
    graphics.beginPath();
    graphics.moveTo(balloonRadius, balloonRadius * 2 - 2);
    graphics.lineTo(balloonRadius + 1, balloonRadius * 2 + stringLength);
    graphics.strokePath();
    graphics.generateTexture('bomb_bubble', balloonRadius * 2 + 4, balloonRadius * 2 + stringLength + 4);
    
    // Rainbow bubble
    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillEllipse(balloonRadius, balloonRadius - 2, balloonRadius * 2, balloonRadius * 2.1);
    // Add rainbow stripes
    const colors = [0xff0000, 0xff8000, 0xffff00, 0x00ff00, 0x0080ff, 0x8000ff];
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        const x = balloonRadius + Math.cos(angle) * balloonRadius * 0.6;
        const y = balloonRadius - 2 + Math.sin(angle) * balloonRadius * 0.6;
        graphics.fillStyle(colors[i], 0.8);
        graphics.fillCircle(x, y, balloonRadius * 0.15);
    }
    // Add string
    graphics.lineStyle(1, 0x333333, 0.8);
    graphics.beginPath();
    graphics.moveTo(balloonRadius, balloonRadius * 2 - 2);
    graphics.lineTo(balloonRadius + 1, balloonRadius * 2 + stringLength);
    graphics.strokePath();
    graphics.generateTexture('rainbow_bubble', balloonRadius * 2 + 4, balloonRadius * 2 + stringLength + 4);
    
    // Laser bubble
    graphics.clear();
    graphics.fillStyle(0x00ff00, 1);
    graphics.fillEllipse(balloonRadius, balloonRadius - 2, balloonRadius * 2, balloonRadius * 2.1);
    graphics.fillStyle(0xffffff, 0.9);
    graphics.fillRect(balloonRadius - 2, balloonRadius - balloonRadius, 4, balloonRadius * 2);
    graphics.fillRect(balloonRadius - balloonRadius, balloonRadius - 2, balloonRadius * 2, 4);
    // Add string
    graphics.lineStyle(1, 0x333333, 0.8);
    graphics.beginPath();
    graphics.moveTo(balloonRadius, balloonRadius * 2 - 2);
    graphics.lineTo(balloonRadius + 1, balloonRadius * 2 + stringLength);
    graphics.strokePath();
    graphics.generateTexture('laser_bubble', balloonRadius * 2 + 4, balloonRadius * 2 + stringLength + 4);
    
    graphics.destroy();
}

/**
 * Main game update loop
 */
function update() {
    // Performance monitoring
    if (performanceManager) {
        performanceManager.startProfile('gameUpdate');
    }
    
    // Update glow effects for any moving bubbles
    if (gameState.currentBubble && gameState.currentBubble.updateGlow) {
        gameState.currentBubble.updateGlow();
    }
    
    // End performance monitoring
    if (performanceManager) {
        performanceManager.endProfile('gameUpdate', performance.now());
    }
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
    
    let textureName = color + '_bubble';
    if (isSpecialBubble(color)) {
        textureName = getSpecialBubbleTexture(color);
    }
    gameState.currentBubble = this.physics.add.sprite(launcherX, launcherY - 40, textureName);
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
    
    let textureName = color + '_bubble';
    if (isSpecialBubble(color)) {
        textureName = getSpecialBubbleTexture(color);
    }
    gameState.nextBubble = this.add.sprite(previewX, previewY, textureName);
    gameState.nextBubble.setScale(0.7);
    gameState.nextBubble.color = color;
}

/**
 * Setup input handling for mobile and desktop
 * Implements dual event handling from PWA lessons with mobile optimizations
 */
function setupInputHandling() {
    // Enhanced touch/mouse input for aiming and shooting
    this.input.on('pointerdown', handlePointerDown.bind(this));
    this.input.on('pointermove', handlePointerMove.bind(this));
    this.input.on('pointerup', handlePointerUp.bind(this));
    
    // Mobile-specific touch optimizations
    this.input.addPointer(2); // Support multi-touch
    this.input.topOnly = false; // Allow interaction with overlapping elements
    
    // Enhanced mobile gesture support
    this.input.on('drag', handleDrag.bind(this));
    this.input.on('dragstart', handleDragStart.bind(this));
    this.input.on('dragend', handleDragEnd.bind(this));
    
    // Keyboard input for desktop (graceful degradation)
    if (this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
    
    // Add visual feedback for touch targets
    setupTouchFeedback.call(this);
}

/**
 * Handle pointer down events (shooting and UI interaction)
 * Enhanced for mobile with touch feedback and gesture recognition
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
            // Check for menu button clicks with larger touch targets
            handleMenuClick.call(this, pointer.x, pointer.y);
            break;
            
        case GAME_STATES.PLAYING:
            if (gameState.currentBubble) {
                // Enhanced aiming for touch devices
                startAiming.call(this, pointer.x, pointer.y);
            }
            break;
            
        case GAME_STATES.PAUSED:
            // Check for resume button with mobile-friendly hit areas
            handlePauseClick.call(this, pointer.x, pointer.y);
            break;
            
        case GAME_STATES.GAME_OVER:
            // Check for restart/menu buttons with enhanced touch targets
            handleGameOverClick.call(this, pointer.x, pointer.y);
            break;
            
        case GAME_STATES.LEVEL_COMPLETE:
            // Check for next level/menu buttons with mobile optimization
            handleLevelCompleteClick.call(this, pointer.x, pointer.y);
            break;
    }
}

/**
 * Handle pointer move events (aiming)
 * Enhanced for mobile with smooth trajectory preview
 */
function handlePointerMove(pointer) {
    if (gameState.currentState !== GAME_STATES.PLAYING || !gameState.currentBubble) return;
    
    // Update aiming trajectory with mobile-optimized smoothing
    updateAimingTrajectory.call(this, pointer.x, pointer.y);
    
    // Update visual aiming feedback
    if (gameState.aimingLine) {
        updateAimingVisuals.call(this, pointer.x, pointer.y);
    }
}

/**
 * Update aiming system
 */
function updateAiming() {
    // Implement aiming line/trajectory preview
}

/**
 * Shoot bubble towards target with cannon recoil animation
 */
function shootBubble(targetX, targetY) {
    if (!gameState.currentBubble) return;
    
    const bubble = gameState.currentBubble;
    const launcherX = GAME_CONFIG.width / 2;
    const launcherY = GAME_CONFIG.height - 60;
    
    // Trigger cannon recoil animation
    triggerCannonRecoil.call(this);
    
    // Create muzzle flash effect
    createMuzzleFlash.call(this, launcherX, launcherY - 40);
    
    // Play cannon fire sound effect
    if (audioManager) {
        audioManager.playCannonFire();
    }
    
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
    
    logger.log(`🎯 Bubble shot! Angle: ${angle.toFixed(2)}, Shots: ${gameState.shotsFired}, Until drop: ${gameState.shotsUntilCeilingDrop}`);
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
    
    logger.log(`💥 Bubble collision at grid (${gridPos.col}, ${gridPos.row})`);
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
        
        logger.log(`🎉 Match found! Removed ${matchingBubbles.length} bubbles`);
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
        
        logger.log(`🎈 Removed ${floatingBubbles.length} floating bubbles`);
        
        // Play floating bubble sound
        if (audioManager) {
            audioManager.playBubblePop();
        }
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
    
    logger.log('🎉 Level Complete screen shown!', data);
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
 * Level Progression and Ceiling Drop Mechanics
 */

/**
 * Drop the ceiling by one row
 */
function dropCeiling() {
    logger.log('⬇️ Dropping ceiling...');
    
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
    
    logger.log(`📊 Ceiling dropped to row ${gameState.ceilingRow}, next drop in ${gameState.shotsUntilCeilingDrop} shots`);
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
    
    logger.log(`🆙 Advanced to level ${gameState.level}`);
    
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
                
                let textureName = color + '_bubble';
                if (isSpecialBubble(color)) {
                    textureName = getSpecialBubbleTexture(color);
                }
                const bubble = this.physics.add.sprite(pos.x, pos.y, textureName);
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
        logger.log('💾 Game state saved');
    } catch (error) {
        logger.error('❌ Failed to save game state:', error);
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
        logger.log('📂 Game state loaded');
        return saveData;
    } catch (error) {
        logger.error('❌ Failed to load game state:', error);
        return null;
    }
}

/**
 * Clear saved game state
 */
function clearSavedGameState() {
    localStorage.removeItem('bustagroove_save_state');
    logger.log('🗑️ Saved game state cleared');
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
        const scoresStr = localStorage.getItem('bustagroove_high_scores');
        return scoresStr ? JSON.parse(scoresStr) : [];
    } catch (error) {
        logger.error('❌ Failed to load high scores:', error);
        return [];
    }
}

/**
 * Save game settings
 */
function saveSettings(settings) {
    try {
        localStorage.setItem('bustagroove_settings', JSON.stringify(settings));
        logger.log('⚙️ Settings saved');
    } catch (error) {
        logger.error('❌ Failed to save settings:', error);
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
        logger.error('❌ Failed to load settings:', error);
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
 * Generate next bubble color with special bubble chance
 * @returns {string} Random bubble color or special type
 */
function getNextBubbleColor() {
    // 10% chance for special bubble
    if (Math.random() < 0.1) {
        const specialTypes = Object.values(SPECIAL_BUBBLE_TYPES);
        return specialTypes[Math.floor(Math.random() * specialTypes.length)];
    }
    return BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
}

/**
 * Check if bubble is special type
 * @param {string} color - Bubble color/type
 * @returns {boolean} True if special bubble
 */
function isSpecialBubble(color) {
    return Object.values(SPECIAL_BUBBLE_TYPES).includes(color);
}

/**
 * Get special bubble texture name
 * @param {string} type - Special bubble type
 * @returns {string} Texture name
 */
function getSpecialBubbleTexture(type) {
    return `${type}_bubble`;
}

/**
 * Handle special bubble effects
 * @param {Phaser.GameObjects.Sprite} bubble - The special bubble
 * @param {Phaser.GameObjects.Sprite} target - The target bubble
 */
function handleSpecialBubbleEffect(bubble, target) {
    const bubbleType = bubble.bubbleColor;
    
    switch (bubbleType) {
        case SPECIAL_BUBBLE_TYPES.BOMB:
            handleBombEffect.call(this, bubble, target);
            break;
        case SPECIAL_BUBBLE_TYPES.RAINBOW:
            handleRainbowEffect.call(this, bubble, target);
            break;
        case SPECIAL_BUBBLE_TYPES.LASER:
            handleLaserEffect.call(this, bubble, target);
            break;
        default:
            // Fallback to normal collision
            snapBubbleToGrid.call(this, bubble, target);
    }
}

/**
 * Handle bomb bubble effect
 * @param {Phaser.GameObjects.Sprite} bubble - The bomb bubble
 * @param {Phaser.GameObjects.Sprite} target - The target bubble
 */
function handleBombEffect(bubble, target) {
    const bombRadius = POWER_UP_EFFECTS.BOMB.radius;
    const bombX = bubble.x;
    const bombY = bubble.y;
    
    // Create explosion effect
    createExplosionEffect.call(this, bombX, bombY, POWER_UP_EFFECTS.BOMB.color);
    
    // Find all bubbles within explosion radius
    const bubblesToDestroy = [];
    for (let r = 0; r < GRID_HEIGHT; r++) {
        for (let c = 0; c < GRID_WIDTH; c++) {
            if (gameState.grid[r][c]) {
                const bubble = gameState.grid[r][c];
                const distance = Math.sqrt(
                    Math.pow(bubble.x - bombX, 2) + Math.pow(bubble.y - bombY, 2)
                );
                
                if (distance <= bombRadius * BUBBLE_RADIUS * 2) {
                    bubblesToDestroy.push({ row: r, col: c, bubble: bubble });
                }
            }
        }
    }
    
    // Destroy bubbles in explosion radius
    bubblesToDestroy.forEach(({ row, col, bubble }) => {
        if (bubble && bubble.sprite) {
            bubble.sprite.destroy();
            gameState.grid[row][col] = null;
            updateScore(50); // Bonus points for bomb
        }
    });
    
    // Play bomb sound
    if (audioManager) {
        audioManager.playBombSound();
    }
    
    // Track special bubble usage
    if (analytics) {
        analytics.trackSpecialBubbleUsed('bomb', 'explosion');
    }
    
    // Remove the bomb bubble
    bubble.destroy();
    
    // Check for floating bubbles after explosion
    setTimeout(() => {
        removeFloatingBubbles.call(this);
    }, 100);
}

/**
 * Handle rainbow bubble effect
 * @param {Phaser.GameObjects.Sprite} bubble - The rainbow bubble
 * @param {Phaser.GameObjects.Sprite} target - The target bubble
 */
function handleRainbowEffect(bubble, target) {
    // Rainbow bubble matches any color
    const targetColor = target.bubbleColor;
    
    // Find all bubbles of the target color
    const matchingBubbles = [];
    for (let r = 0; r < GRID_HEIGHT; r++) {
        for (let c = 0; c < GRID_WIDTH; c++) {
            if (gameState.grid[r][c] && gameState.grid[r][c].bubbleColor === targetColor) {
                matchingBubbles.push({ row: r, col: c, bubble: gameState.grid[r][c] });
            }
        }
    }
    
    // Destroy all matching bubbles
    matchingBubbles.forEach(({ row, col, bubble }) => {
        if (bubble && bubble.sprite) {
            bubble.sprite.destroy();
            gameState.grid[row][col] = null;
            updateScore(30); // Bonus points for rainbow
        }
    });
    
    // Play rainbow sound
    if (audioManager) {
        audioManager.playRainbowSound();
    }
    
    // Track special bubble usage
    if (analytics) {
        analytics.trackSpecialBubbleUsed('rainbow', 'color_match');
    }
    
    // Remove the rainbow bubble
    bubble.destroy();
    
    // Check for floating bubbles
    setTimeout(() => {
        removeFloatingBubbles.call(this);
    }, 100);
}

/**
 * Handle laser bubble effect
 * @param {Phaser.GameObjects.Sprite} bubble - The laser bubble
 * @param {Phaser.GameObjects.Sprite} target - The target bubble
 */
function handleLaserEffect(bubble, target) {
    // Laser pierces through bubbles in a line
    const laserAngle = bubble.rotation;
    const laserX = bubble.x;
    const laserY = bubble.y;
    
    // Create laser beam effect
    createLaserBeamEffect.call(this, laserX, laserY, laserAngle);
    
    // Find bubbles in laser path
    const bubblesToDestroy = [];
    const laserLength = 300; // Laser range
    const stepSize = 10;
    
    for (let i = 0; i < laserLength; i += stepSize) {
        const checkX = laserX + Math.cos(laserAngle) * i;
        const checkY = laserY + Math.sin(laserAngle) * i;
        
        // Check if laser hits any bubble
        for (let r = 0; r < GRID_HEIGHT; r++) {
            for (let c = 0; c < GRID_WIDTH; c++) {
                if (gameState.grid[r][c]) {
                    const bubble = gameState.grid[r][c];
                    const distance = Math.sqrt(
                        Math.pow(bubble.x - checkX, 2) + Math.pow(bubble.y - checkY, 2)
                    );
                    
                    if (distance <= BUBBLE_RADIUS) {
                        bubblesToDestroy.push({ row: r, col: c, bubble: bubble });
                    }
                }
            }
        }
    }
    
    // Destroy bubbles hit by laser
    bubblesToDestroy.forEach(({ row, col, bubble }) => {
        if (bubble && bubble.sprite) {
            bubble.sprite.destroy();
            gameState.grid[row][col] = null;
            updateScore(40); // Bonus points for laser
        }
    });
    
    // Play laser sound
    if (audioManager) {
        audioManager.playLaserSound();
    }
    
    // Track special bubble usage
    if (analytics) {
        analytics.trackSpecialBubbleUsed('laser', 'pierce');
    }
    
    // Remove the laser bubble
    bubble.destroy();
    
    // Check for floating bubbles
    setTimeout(() => {
        removeFloatingBubbles.call(this);
    }, 100);
}

/**
 * Create explosion effect
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} color - Explosion color
 */
function createExplosionEffect(x, y, color) {
    const particles = this.add.particles(x, y, 'sparkle', {
        speed: { min: 50, max: 150 },
        scale: { start: 0.5, end: 0 },
        lifespan: 600,
        quantity: 20,
        tint: color
    });
    
    // Remove particles after animation
    this.time.delayedCall(600, () => {
        particles.destroy();
    });
}

/**
 * Create laser beam effect
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} angle - Laser angle
 */
function createLaserBeamEffect(x, y, angle) {
    const graphics = this.add.graphics();
    const laserLength = 300;
    
    // Draw laser beam
    graphics.lineStyle(4, 0x00ff00, 0.8);
    graphics.beginPath();
    graphics.moveTo(x, y);
    graphics.lineTo(
        x + Math.cos(angle) * laserLength,
        y + Math.sin(angle) * laserLength
    );
    graphics.strokePath();
    
    // Add glow effect
    graphics.lineStyle(8, 0x00ff00, 0.3);
    graphics.beginPath();
    graphics.moveTo(x, y);
    graphics.lineTo(
        x + Math.cos(angle) * laserLength,
        y + Math.sin(angle) * laserLength
    );
    graphics.strokePath();
    
    // Remove laser after short time
    this.time.delayedCall(200, () => {
        graphics.destroy();
    });
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

/**
 * Mobile-Specific Touch Handling Functions
 * Enhanced input for mobile gameplay
 */

/**
 * Handle pointer up events (release shooting)
 */
function handlePointerUp(pointer) {
    if (gameState.currentState !== GAME_STATES.PLAYING || !gameState.currentBubble) return;
    
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
 * Start aiming mode for mobile
 */
function startAiming(targetX, targetY) {
    gameState.isAiming = true;
    
    // Create or update aiming line
    if (!gameState.aimingLine) {
        gameState.aimingLine = this.add.graphics();
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
 * Setup touch feedback visual elements
 */
function setupTouchFeedback() {
    // Create touch ripple effect container
    gameState.touchEffects = this.add.container();
}

/**
 * Handle drag events for mobile gestures
 */
function handleDrag(pointer, gameObject, dragX, dragY) {
    // Could be used for future gesture-based controls
}

/**
 * Handle drag start for mobile gestures
 */
function handleDragStart(pointer, gameObject) {
    // Visual feedback for drag start
}

/**
 * Handle drag end for mobile gestures
 */
function handleDragEnd(pointer, gameObject) {
    // Cleanup drag visuals
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
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
});

// Initialize Analytics, Social, and Performance
let analytics = null;
let socialManager = null;
let performanceManager = null;

// Export for global access
window.gameState = gameState;
window.GAME_CONFIG = GAME_CONFIG;
window.audioManager = audioManager;
window.analytics = analytics;
window.socialManager = socialManager;
window.performanceManager = performanceManager;
