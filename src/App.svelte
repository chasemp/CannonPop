<script lang="ts">
  import { onMount } from 'svelte';
  import logger from './utils/Logger';
  import EventHelper from './utils/EventHelper';
  
  // PWA State Management
  let currentTab = 'game';
  let gameIframe: HTMLIFrameElement;
  let gameLoaded = false;
  let score = 0;
  let highScore = parseInt(localStorage.getItem('bustagroove_high_score') || '0');
  
  // Navigation Stack for complex PWA flows
  let navigationStack: Array<{
    container: string;
    scrollPosition: number;
    returnTab: string;
    timestamp: number;
  }> = [];
  
  // Tab Management
  const tabs = [
    { id: 'game', label: 'Game', icon: '🎮' },
    { id: 'scores', label: 'Scores', icon: '🏆' },
    { id: 'achievements', label: 'Achievements', icon: '🏅' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '👑' }
  ];
  
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
  
  // Tab Navigation
  function switchTab(tabId: string) {
    currentTab = tabId;
    
    // Load social features when switching to those tabs
    if (tabId === 'achievements') {
      setTimeout(() => loadAchievements(), 100);
    } else if (tabId === 'leaderboard') {
      setTimeout(() => loadLeaderboard(), 100);
    }
    
    // Send message to game if switching away from game tab
    if (tabId !== 'game' && gameIframe) {
      sendMessageToGame({ action: 'pause' });
    } else if (tabId === 'game' && gameIframe) {
      sendMessageToGame({ action: 'resume' });
    }
  }
  
  // PostMessage Communication with Game
  function sendMessageToGame(data: any) {
    if (gameIframe && gameIframe.contentWindow) {
      gameIframe.contentWindow.postMessage(data, '*');
    }
  }
  
  // Listen for messages from game
  function handleGameMessage(event: MessageEvent) {
    if (event.origin !== window.location.origin) return;
    
    logger.info('📱', 'App received message from game:', event.data);
    
    switch (event.data.event) {
      case 'gameLoaded':
        gameLoaded = true;
        // Send current settings to game when it loads
        sendSettingsToGame();
        break;
      case 'scoreUpdate':
        score = event.data.score;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem('bustagroove_high_score', highScore.toString());
        }
        break;
      case 'gameOver':
        // Handle game over
        break;
    }
  }
  
  // Send settings to game
  function sendSettingsToGame() {
    try {
      const settings = JSON.parse(localStorage.getItem('bustagroove_settings') || '{}');
      sendMessageToGame({ action: 'updateSettings', settings: settings });
    } catch (error) {
      console.error('Failed to load settings for game:', error);
    }
  }
  
  // Mobile instructions
  let showInstructions = true;
  
  function hideInstructions() {
    showInstructions = false;
    localStorage.setItem('bustagroove_instructions_shown', 'true');
  }
  
  // Social Features
  function shareTopScore() {
    if ((window as any).socialManager && highScore > 0) {
      (window as any).socialManager.shareScore(highScore, 1, 0, 0);
    }
  }
  
  function loadAchievements() {
    if ((window as any).socialManager) {
      const achievements = (window as any).socialManager.achievements;
      const grid = document.getElementById('achievements-grid');
      if (grid) {
        grid.innerHTML = achievements.map((achievement: any) => `
          <div class="achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
              <h4>${achievement.name}</h4>
              <p>${achievement.description}</p>
              ${achievement.unlocked ? `<small>Unlocked ${new Date(achievement.unlockedAt).toLocaleDateString()}</small>` : ''}
            </div>
          </div>
        `).join('');
      }
    }
  }
  
  function loadLeaderboard() {
    if ((window as any).socialManager) {
      const leaderboard = (window as any).socialManager.getTopScores(10);
      const list = document.getElementById('leaderboard-list');
      if (list) {
        list.innerHTML = leaderboard.map((entry: any, index: number) => `
          <div class="leaderboard-item">
            <span class="rank">#${index + 1}</span>
            <span class="player">${entry.playerName}</span>
            <span class="score">${entry.score.toLocaleString()}</span>
            <span class="level">L${entry.level}</span>
            <span class="date">${new Date(entry.date).toLocaleDateString()}</span>
          </div>
        `).join('');
      }
    }
  }
  
  // Initialize Mobile-First PWA
  onMount(() => {
    console.log('🎈 Initializing BustAGroove Mobile PWA...');
    
    // Listen for game messages
    window.addEventListener('message', handleGameMessage);
    
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
      window.removeEventListener('message', handleGameMessage);
      if (isMobileDevice()) {
        window.removeEventListener('orientationchange', handleOrientationChange);
        window.removeEventListener('resize', handleMobileResize);
      }
    };
  });
  
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
    const demoDataLoaded = localStorage.getItem('bustagroove_demo_data_loaded');
    if (demoDataLoaded === 'true') {
      console.log('🚩 Demo data previously loaded - localStorage is authoritative');
      return;
    }
    
    // First-time user: seed localStorage with demo data
    localStorage.setItem('bustagroove_high_score', '12500');
    localStorage.setItem('bustagroove_settings', JSON.stringify({
      sound: true,
      music: true,
      difficulty: 'normal'
    }));
    localStorage.setItem('bustagroove_demo_data_loaded', 'true');
    
    console.log('🎯 Demo data initialized');
  }
  
  // Initialize demo data on first load
  initializeDemoData();
</script>

<div class="app-container">
  <!-- Header with Logo and Controls (Blockdoku Pattern) -->
  <header class="header">
    <div class="logo-container">
      <div class="app-logo">🎈</div>
      <h1>BustAGroove</h1>
      <button class="btn btn-primary new-game-btn" on:click={() => sendMessageToGame({ action: 'restart' })}>
        New Game
      </button>
    </div>
    <div class="controls">
      <div class="score-display">
        High: {highScore.toLocaleString()}
      </div>
      <button class="btn btn-secondary" on:click={() => sendMessageToGame({ action: 'pause' })}>
        ⏸️
      </button>
        <button class="btn btn-secondary" on:click={() => window.location.href = 'settings.html'}>
          ⚙️
        </button>
    </div>
  </header>
  
  <!-- Tab Navigation (Mobile-First) -->
  <nav class="nav-container">
    <div class="nav-tabs">
      {#each tabs as tab}
        <button 
          class="nav-tab {currentTab === tab.id ? 'active' : ''}"
          on:click={() => switchTab(tab.id)}
        >
          <span class="tab-icon">{tab.icon}</span>
          <span class="tab-label">{tab.label}</span>
        </button>
      {/each}
    </div>
  </nav>
  
  <!-- Main Content -->
  <main class="main-content">
    <!-- Game Tab -->
    <div class="tab-content {currentTab === 'game' ? 'active' : ''}">
      <div class="game-container">
        {#if !gameLoaded}
          <div class="loading">
            <div class="loading-spinner"></div>
            <p>Loading BustAGroove...</p>
            <p class="loading-hint">Tap to start playing!</p>
          </div>
        {/if}
        
        <iframe 
          bind:this={gameIframe}
          class="game-iframe"
          src="game.html"
          title="BustAGroove Game"
          on:load={() => gameLoaded = true}
        ></iframe>
        
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
    
    <!-- High Scores Tab -->
    <div class="tab-content {currentTab === 'scores' ? 'active' : ''}">
      <h2>🏆 High Scores</h2>
      <div class="scores-list">
        <div class="score-item">
          <span class="rank">1st</span>
          <span class="score">{highScore.toLocaleString()}</span>
          <span class="date">Your Best</span>
        </div>
        <div class="score-item demo">
          <span class="rank">2nd</span>
          <span class="score">8,750</span>
          <span class="date">Demo Score</span>
        </div>
        <div class="score-item demo">
          <span class="rank">3rd</span>
          <span class="score">5,200</span>
          <span class="date">Demo Score</span>
        </div>
      </div>
      
      <button class="btn btn-secondary" on:click={() => switchTab('game')}>
        🎮 Play Again
      </button>
      
      <!-- Share Score Button -->
      <button class="btn btn-primary" on:click={() => shareTopScore()}>
        📤 Share Score
      </button>
    </div>
    
    <!-- Achievements Tab -->
    <div class="tab-content {currentTab === 'achievements' ? 'active' : ''}">
      <h2>🏅 Achievements</h2>
      <div class="achievements-grid" id="achievements-grid">
        <!-- Achievements will be loaded dynamically -->
      </div>
    </div>
    
    <!-- Leaderboard Tab -->
    <div class="tab-content {currentTab === 'leaderboard' ? 'active' : ''}">
      <h2>👑 Leaderboard</h2>
      <div class="leaderboard-list" id="leaderboard-list">
        <!-- Leaderboard will be loaded dynamically -->
      </div>
    </div>
    
  </main>
</div>

<style>
  /* Additional component-specific styles */
  .score-display {
    font-size: 14px;
    font-weight: 600;
    color: var(--accent-color, #ff6b35);
  }
  
  .tab-icon {
    display: block;
    font-size: 16px;
    margin-bottom: 2px;
  }
  
  .tab-label {
    display: block;
    font-size: 12px;
  }
  
  .scores-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 24px 0;
  }
  
  .score-item {
    display: flex;
    align-items: center;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    gap: 16px;
  }
  
  .score-item.demo {
    opacity: 0.7;
  }
  
  .rank {
    font-weight: 600;
    min-width: 40px;
  }
  
  .score {
    flex: 1;
    font-weight: 600;
    color: var(--accent-color, #ff6b35);
  }
  
  .date {
    font-size: 12px;
    opacity: 0.7;
  }
  
  
  .loading-hint {
    font-size: 14px;
    opacity: 0.7;
    margin-top: 8px;
    color: var(--accent-color, #ff6b35);
  }
  
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
    background: var(--bg-color);
    padding: 2rem;
    border-radius: 12px;
    text-align: center;
    max-width: 300px;
    margin: 1rem;
    border: 2px solid var(--accent-color, #ff6b35);
  }
  
  .instruction-content h3 {
    margin: 0 0 1rem 0;
    color: var(--accent-color, #ff6b35);
  }
  
  .instruction-content p {
    margin: 0.5rem 0;
    font-size: 14px;
    text-align: left;
  }
  
  /* Social Features Styles */
  .achievements-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .achievement-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }
  
  .achievement-item.unlocked {
    background: rgba(255, 107, 53, 0.1);
    border-color: var(--primary-color);
  }
  
  .achievement-item.locked {
    opacity: 0.6;
  }
  
  .achievement-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }
  
  .achievement-info h4 {
    margin: 0 0 0.25rem 0;
    color: var(--text-color);
  }
  
  .achievement-info p {
    margin: 0 0 0.25rem 0;
    font-size: 14px;
    color: var(--text-secondary);
  }
  
  .achievement-info small {
    font-size: 12px;
    color: var(--accent-color);
  }
  
  .leaderboard-list {
    margin-top: 1rem;
  }
  
  .leaderboard-item {
    display: grid;
    grid-template-columns: auto 1fr auto auto auto;
    gap: 1rem;
    align-items: center;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    margin-bottom: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .leaderboard-item:first-child {
    background: linear-gradient(135deg, var(--accent-color), var(--primary-color));
    color: var(--bg-color);
  }
  
  .leaderboard-item:nth-child(2) {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .leaderboard-item:nth-child(3) {
    background: rgba(255, 107, 53, 0.1);
  }
  
  .rank {
    font-weight: bold;
    color: var(--accent-color);
  }
  
  .player {
    font-weight: 500;
  }
  
  .score {
    font-weight: bold;
    color: var(--primary-color);
  }
  
  .level {
    font-size: 12px;
    color: var(--text-secondary);
  }
  
  .date {
    font-size: 12px;
    color: var(--text-secondary);
  }
  
  @media (max-width: 480px) {
    .tab-icon {
      font-size: 14px;
    }
    
    .tab-label {
      font-size: 10px;
    }
    
    .achievements-grid {
      grid-template-columns: 1fr;
    }
    
    .leaderboard-item {
      grid-template-columns: auto 1fr auto;
      gap: 0.5rem;
    }
    
    .level, .date {
      display: none;
    }
  }
</style>
