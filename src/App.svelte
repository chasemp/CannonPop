<script lang="ts">
  import { onMount } from 'svelte';
  import logger from './utils/Logger';
  import EventHelper from './utils/EventHelper';
  
  // PWA State Management
  let gameLoaded = false;
  let score = 0;
  let level = 1;
  let shots = 0;
  let highScore = parseInt(localStorage.getItem('cannonpop_high_score') || '0');
  let gameInstance = null;
  
  // Enhanced Dual Event Handling for Mobile + Desktop
  function addDualEventListener(element: HTMLElement, handler: () => void) {
    // Desktop mouse events
    element.addEventListener('click', handler);
    
    // Enhanced mobile touch events with better UX
    element.addEventListener('touchstart', (e) => {
      e.preventDefault();
      
      // Add visual feedback for touch
      element.style.transform = 'scale(0.95)';
      element.style.transition = 'transform 0.1s ease';
      
      // Haptic feedback if supported
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      handler();
    }, { passive: false });
    
    // Touch end cleanup
    element.addEventListener('touchend', () => {
      element.style.transform = 'scale(1)';
    });
    
    // Prevent double-tap zoom on mobile
    element.addEventListener('touchmove', (e) => {
      e.preventDefault();
    }, { passive: false });
  }
  
  
  // Direct Game Communication (no more postMessage)
  function sendCommandToGame(command: string, data?: any) {
    if (gameInstance && (window as any).gameState) {
      // Direct function calls instead of postMessage
      switch (command) {
        case 'restart':
          if ((window as any).restartGame) {
            (window as any).restartGame();
          }
          break;
        case 'pause':
          if ((window as any).pauseGame) {
            (window as any).pauseGame();
          }
          break;
        case 'resume':
          if ((window as any).resumeGame) {
            (window as any).resumeGame();
          }
          break;
      }
    }
  }
  
  // Game event handlers (called directly from game)
  function handleScoreUpdate(data: any) {
    // Handle both direct score numbers and event objects
    if (typeof data === 'number') {
      score = data;
    } else if (data && typeof data === 'object') {
      // Handle event objects from game
      switch (data.event) {
        case 'scoreUpdate':
          score = data.score;
          if (data.level !== undefined) level = data.level;
          if (data.shots !== undefined) shots = data.shots;
          break;
        case 'newHighScore':
          score = data.score;
          highScore = data.score;
          localStorage.setItem('cannonpop_high_score', highScore.toString());
          break;
        case 'stateChanged':
          // Handle state changes if needed
          logger.info('🎮', `Game state changed: ${data.oldState} → ${data.newState}`);
          break;
        case 'gameStats':
          // Handle comprehensive game stats update
          if (data.score !== undefined) score = data.score;
          if (data.level !== undefined) level = data.level;
          if (data.shots !== undefined) shots = data.shots;
          break;
      }
    }
    
    // Update high score if current score exceeds it
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('cannonpop_high_score', highScore.toString());
    }
  }
  
  function handleGameLoaded() {
    gameLoaded = true;
    logger.info('🎮', 'Game loaded successfully');
  }
  
  // Mobile instructions
  let showInstructions = true;
  
  function hideInstructions() {
    showInstructions = false;
    localStorage.setItem('cannonpop_instructions_shown', 'true');
  }
  
  
  // Initialize Mobile-First PWA
  onMount(() => {
    console.log('🎯 Initializing CannonPop Mobile PWA...');
    
    // Initialize theme system
    if (!(window as any).themeManager) {
      import('./theme.js').then((module) => {
        (window as any).themeManager = module.default;
        console.log('🎨 Theme manager loaded');
      });
    }
    
    // Load Phaser and game code directly
    loadGameScripts().then(() => {
      initializeGame();
    }).catch(error => {
      console.error('Failed to load game:', error);
    });
    
    // Enhanced mobile viewport handling
    setupMobileViewport();
    
    // Set up dual event listeners for all interactive elements
    const interactiveElements = document.querySelectorAll('.nav-tab, .btn');
    interactiveElements.forEach(element => {
      if (element instanceof HTMLElement) {
        // Enhanced mobile touch optimization
        element.style.touchAction = 'manipulation';
        element.style.userSelect = 'none';
        element.style.setProperty('-webkit-user-select', 'none');
        element.style.setProperty('-webkit-touch-callout', 'none');
        element.style.setProperty('-webkit-tap-highlight-color', 'transparent');
        
        // Add mobile-friendly touch targets (minimum 44px)
        const rect = element.getBoundingClientRect();
        if (rect.height < 44 || rect.width < 44) {
          element.style.minHeight = '44px';
          element.style.minWidth = '44px';
          element.style.display = 'flex';
          element.style.alignItems = 'center';
          element.style.justifyContent = 'center';
        }
      }
    });
    
    // Initialize demo data
    initializeDemoData();
    
    // Mobile-specific optimizations
    if (isMobileDevice()) {
      document.body.classList.add('mobile-device');
      
      // Prevent zoom on input focus (mobile Safari)
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
        );
      }
      
      // Add mobile-specific event listeners
      window.addEventListener('orientationchange', handleOrientationChange);
      window.addEventListener('resize', handleMobileResize);
    }
    
    return () => {
      if (isMobileDevice()) {
        window.removeEventListener('orientationchange', handleOrientationChange);
        window.removeEventListener('resize', handleMobileResize);
      }
    };
  });
  
  // Load game scripts dynamically
  async function loadGameScripts() {
    console.log('🔄 Starting to load game scripts...');
    
    // Load Phaser
    if (!(window as any).Phaser) {
      console.log('📦 Loading Phaser...');
      await loadScript('/libs/phaser.min.js');
      console.log('✅ Phaser loaded:', typeof (window as any).Phaser);
    } else {
      console.log('✅ Phaser already loaded');
    }
    
    // Load game code
    console.log('🎮 Loading game code...');
    await import('./game.js');
    console.log('✅ Game code loaded');
  }
  
  // Helper to load scripts
  function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`📥 Loading script: ${src}`);
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        console.log(`✅ Script loaded successfully: ${src}`);
        resolve();
      };
      script.onerror = (error) => {
        console.error(`❌ Failed to load script: ${src}`, error);
        reject(new Error(`Failed to load script: ${src}`));
      };
      document.head.appendChild(script);
    });
  }
  
  // Initialize the game directly
  function initializeGame() {
    console.log('🎯 Initializing game...');
    
    // Make callback functions available globally for the game
    (window as any).handleScoreUpdate = handleScoreUpdate;
    (window as any).handleGameLoaded = handleGameLoaded;
    
    console.log('🔗 Callback functions registered globally');
    console.log('🎮 Game container exists:', !!document.getElementById('game-container'));
    
    // Since we're loading the script dynamically, DOMContentLoaded won't fire
    // We need to manually trigger the game initialization
    setTimeout(() => {
      console.log('🚀 Manually triggering game initialization...');
      console.log('🔍 Available window properties:', Object.keys(window).filter(key => key.includes('game') || key.includes('Game') || key.includes('initialize')));
      console.log('🔍 GAME_CONFIG available:', !!(window as any).GAME_CONFIG);
      console.log('🔍 Phaser available:', !!(window as any).Phaser);
      
      // Call the manual initialization function we added to game-legacy.js
      if ((window as any).initializeCannonPopGame) {
        (window as any).initializeCannonPopGame();
      } else {
        console.error('❌ initializeCannonPopGame function not found');
        
        // Try to manually trigger the DOMContentLoaded event since the function isn't available
        console.log('🔄 Attempting to trigger DOMContentLoaded event manually...');
        const event = new Event('DOMContentLoaded', {
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(event);
      }
    }, 100);
  }
  
  // Mobile device detection
  function isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints !== undefined && navigator.maxTouchPoints > 2);
  }
  
  // Setup mobile viewport optimizations
  function setupMobileViewport() {
    // Prevent pull-to-refresh on mobile
    document.body.style.overscrollBehavior = 'none';
    
    // Optimize for mobile scrolling
    document.documentElement.style.setProperty('-webkit-text-size-adjust', '100%');
    document.documentElement.style.setProperty('text-size-adjust', '100%');
  }
  
  // Handle orientation changes on mobile
  function handleOrientationChange() {
    // Force layout recalculation after orientation change
    setTimeout(() => {
      if (gameIframe) {
        sendMessageToGame({ action: 'resize' });
      }
    }, 100);
  }
  
  // Handle mobile resize events
  function handleMobileResize() {
    // Debounced resize handling for mobile
    clearTimeout((window as any).mobileResizeTimeout);
    (window as any).mobileResizeTimeout = setTimeout(() => {
      if (gameIframe) {
        sendMessageToGame({ action: 'resize' });
      }
    }, 250);
  }
  
  // Demo Data Lifecycle Management
  function initializeDemoData() {
    const demoDataLoaded = localStorage.getItem('cannonpop_demo_data_loaded');
    if (demoDataLoaded === 'true') {
      console.log('🚩 Demo data previously loaded - localStorage is authoritative');
      return;
    }
    
    // First-time user: seed localStorage with demo data
    localStorage.setItem('cannonpop_high_score', '12500');
    localStorage.setItem('cannonpop_settings', JSON.stringify({
      sound: true,
      music: true,
      difficulty: 'normal'
    }));
    localStorage.setItem('cannonpop_demo_data_loaded', 'true');
    
    console.log('🎯 Demo data initialized');
  }
  
  // Initialize demo data on first load
  initializeDemoData();
</script>

<div class="app-container">
  <!-- Header with Logo and Controls (Blockdoku Pattern) -->
    <header class="header">
      <div class="logo-container">
        <img src="/images/cannon_no_text.png" alt="CannonPop" class="app-logo-img">
        <div class="game-controls">
          <button class="btn btn-primary new-game-btn" on:click={() => sendCommandToGame('restart')}>
            New Game
          </button>
        </div>
      </div>
    <div class="controls">
      <!-- Game Settings button navigates to gamesettings.html page -->
      <button class="btn btn-secondary" title="Game Settings" on:click={() => window.location.href = 'gamesettings.html'}>🎮</button>
      <!-- Settings button navigates to separate settings.html page (not a modal) -->
      <button class="btn btn-secondary" title="Settings" on:click={() => window.location.href = 'settings.html'}>⚙️</button>
    </div>
  </header>
  
  <!-- SCORING BAR: Always visible score, level, and shots display -->
  <div class="game-info">
    <div class="score">
      <span>Score </span>
      <span id="score">{score.toLocaleString()}</span>
    </div>
    <div class="level">
      <span>Level </span>
      <span id="level">{level}</span>
    </div>
    <div class="shots">
      <span>Shots </span>
      <span id="shots">{shots}</span>
    </div>
  </div>
  
  <!-- Main Content -->
  <main class="main">
    <div class="game-container">
      <div class="game-area">
        {#if !gameLoaded}
          <div class="loading">
            <div class="loading-spinner"></div>
            <p>Loading CannonPop...</p>
            <p class="loading-hint">Tap to start playing!</p>
          </div>
        {/if}
        
        <!-- Direct Phaser game container (no iframe) -->
        <div id="game-container" class="phaser-game-container"></div>
        
        <!-- Mobile Game Instructions -->
        {#if gameLoaded && isMobileDevice() && showInstructions}
          <div class="mobile-instructions">
            <div class="instruction-content">
              <h3>🎮 How to Play</h3>
              <p>• Tap and drag to aim</p>
              <p>• Release to shoot</p>
              <p>• Match 3+ bubbles to clear</p>
              <button class="btn btn-primary" on:click={() => hideInstructions()}>
                Got it!
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </main>
  
  <footer class="footer">
    <p>Tap and drag to aim, release to shoot. Match 3+ bubbles to clear them!</p>
  </footer>
</div>

<style>
  /* Import unified theme system */
  @import './theme.css';
  
  /* Blockdoku-inspired styling for CannonPop */
  
  /* Header Styles */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: var(--card-bg, rgba(255, 255, 255, 0.1));
    border-bottom: 2px solid var(--border-color, rgba(255, 255, 255, 0.2));
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .logo-container {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .app-logo-img {
    width: 48px;
    height: 48px;
    object-fit: contain;
    margin-right: 12px;
  }
  
  .header h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-color, #333);
  }
  
  .game-controls {
    display: flex;
    gap: 0.5rem;
  }
  
  .controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.9rem;
  }
  
  .btn-primary {
    background: var(--primary-color, #8d6e63);
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
  
  .btn-primary:hover {
    background: var(--primary-hover, #7a5a50);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  .btn-secondary {
    background: var(--secondary-color, #666);
    color: white;
    font-size: 1.2rem;
    padding: 0.5rem;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .btn-secondary:hover {
    background: var(--secondary-hover, #555);
    transform: translateY(-1px);
  }
  
  /* Game Info Bar (Scoring Bar) */
  .game-info {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--bg-color, rgba(0, 0, 0, 0.05));
    border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
    font-weight: 600;
  }
  
  .game-info > div {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }
  
  .game-info span:first-child {
    font-size: 0.8rem;
    color: var(--text-muted, #666);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .game-info span:last-child {
    font-size: 1.1rem;
    color: var(--text-color, #333);
    font-weight: 700;
  }
  
  /* Main Game Area */
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    min-height: 0;
  }
  
  .game-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  
  .game-area {
    flex: 1;
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    background: #b5978c; /* Match Phaser game board color */
    border: 2px solid var(--border-color, rgba(255, 255, 255, 0.2));
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  /* Direct Phaser game container */
  .phaser-game-container {
    width: 100%;
    height: 100%;
    border-radius: 10px;
    overflow: hidden;
    background: #b5978c; /* Match game board background */
  }
  
  /* Loading State */
  .loading {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--bg-color, #f5f5f5);
    color: var(--text-color, #333);
  }
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--border-color, rgba(255, 255, 255, 0.3));
    border-top: 4px solid var(--primary-color, #8d6e63);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .loading p {
    margin: 0.5rem 0;
    font-weight: 500;
  }
  
  .loading-hint {
    font-size: 14px;
    opacity: 0.7;
    color: var(--primary-color, #8d6e63);
  }
  
  /* Mobile Instructions */
  .mobile-instructions {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .instruction-content {
    background: var(--card-bg, white);
    padding: 2rem;
    border-radius: 12px;
    text-align: center;
    max-width: 300px;
    margin: 1rem;
    border: 2px solid var(--primary-color, #8d6e63);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
  
  .instruction-content h3 {
    margin: 0 0 1rem 0;
    color: var(--primary-color, #8d6e63);
    font-size: 1.3rem;
  }
  
  .instruction-content p {
    margin: 0.5rem 0;
    font-size: 14px;
    text-align: left;
    color: var(--text-color, #333);
  }
  
  /* Footer */
  .footer {
    padding: 1rem;
    text-align: center;
    background: var(--card-bg, rgba(255, 255, 255, 0.1));
    border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
    color: var(--text-muted, #666);
  }
  
  .footer p {
    margin: 0;
    font-size: 0.9rem;
  }
  
  /* App Container */
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--bg-color, #f5f5f5);
    color: var(--text-color, #333);
  }
  
  /* Mobile Optimizations */
  @media (max-width: 768px) {
    .header {
      padding: 0.75rem 1rem;
    }
    
    .logo-container {
      gap: 0.75rem;
    }

    .header h1 {
      font-size: 1.3rem;
    }
    
    .btn {
      padding: 0.4rem 0.8rem;
      font-size: 0.85rem;
    }
    
    .game-info {
      padding: 0.5rem;
    }
    
    .game-info span:first-child {
      font-size: 0.7rem;
    }
    
    .game-info span:last-child {
      font-size: 1rem;
    }
    
    .main {
      padding: 0.75rem;
    }
  }
  
  @media (max-width: 480px) {
    .header {
      padding: 0.5rem 0.75rem;
    }
    
    .logo-container {
      gap: 0.5rem;
    }
    
    .header h1 {
      font-size: 1.1rem;
    }
    
    .btn {
      padding: 0.3rem 0.6rem;
      font-size: 0.8rem;
    }
    
    .btn-secondary {
      padding: 0.4rem;
      min-width: 40px;
      min-height: 40px;
      font-size: 1rem;
    }
    
    .main {
      padding: 0.5rem;
    }
  }
</style>
