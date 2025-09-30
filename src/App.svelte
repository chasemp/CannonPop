<script lang="ts">
  import { onMount } from 'svelte';
  
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
    { id: 'scores', label: 'Scores', icon: '🏆' }
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
    
    console.log('📱 App received message from game:', event.data);
    
    switch (event.data.event) {
      case 'gameLoaded':
        gameLoaded = true;
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
        element.style.webkitUserSelect = 'none';
        element.style.webkitTouchCallout = 'none';
        element.style.webkitTapHighlightColor = 'transparent';
        
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
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
  }
  
  // Setup mobile viewport optimizations
  function setupMobileViewport() {
    // Prevent pull-to-refresh on mobile
    document.body.style.overscrollBehavior = 'none';
    
    // Optimize for mobile scrolling
    document.documentElement.style.webkitTextSizeAdjust = '100%';
    document.documentElement.style.textSizeAdjust = '100%';
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
    clearTimeout(window.mobileResizeTimeout);
    window.mobileResizeTimeout = setTimeout(() => {
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
          </div>
        {/if}
        
        <iframe 
          bind:this={gameIframe}
          class="game-iframe"
          src="/BustAGroove/game.html"
          title="BustAGroove Game"
          on:load={() => gameLoaded = true}
        ></iframe>
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
  
  .settings-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: 24px 0;
  }
  
  .setting-item {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .setting-item label {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }
  
  .setting-item input,
  .setting-item select {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 8px;
    color: var(--text-color, #f5f1e8);
  }
  
  .settings-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 32px;
  }
  
  @media (max-width: 480px) {
    .nav-header {
      flex-direction: column;
      gap: 8px;
    }
    
    .tab-icon {
      font-size: 14px;
    }
    
    .tab-label {
      font-size: 10px;
    }
    
    .settings-actions {
      flex-direction: column;
    }
  }
</style>
