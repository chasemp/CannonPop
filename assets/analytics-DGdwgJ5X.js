/**
 * CannonPop Analytics System
 * Tracks game performance, player behavior, and technical metrics
 */

class GameAnalytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.events = [];
        this.performance = {
            fps: 0,
            frameCount: 0,
            lastFrameTime: 0,
            averageFPS: 0,
            memoryUsage: 0,
            loadTime: 0
        };
        this.gameStats = {
            shotsFired: 0,
            bubblesCleared: 0,
            specialBubblesUsed: 0,
            powerUpsActivated: 0,
            levelsCompleted: 0,
            highScore: 0,
            playTime: 0,
            accuracy: 0
        };
        this.technicalMetrics = {
            errors: [],
            warnings: [],
            crashes: 0,
            audioContextState: 'unknown',
            canvasPerformance: 'unknown'
        };
        
        this.initializePerformanceMonitoring();
        this.setupErrorHandling();
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Performance Monitoring
    initializePerformanceMonitoring() {
        // Monitor FPS
        this.fpsInterval = setInterval(() => {
            this.updateFPS();
        }, 1000);
        
        // Monitor memory usage
        if (performance.memory) {
            this.memoryInterval = setInterval(() => {
                this.updateMemoryUsage();
            }, 5000);
        }
        
        // Monitor load time
        window.addEventListener('load', () => {
            this.performance.loadTime = Date.now() - this.startTime;
            this.trackEvent('page_load', { loadTime: this.performance.loadTime });
        });
    }
    
    updateFPS() {
        const now = Date.now();
        const deltaTime = now - this.performance.lastFrameTime;
        
        if (this.performance.lastFrameTime > 0) {
            this.performance.fps = Math.round(1000 / deltaTime);
            this.performance.frameCount++;
            this.performance.averageFPS = Math.round(
                (this.performance.averageFPS * (this.performance.frameCount - 1) + this.performance.fps) / 
                this.performance.frameCount
            );
        }
        
        this.performance.lastFrameTime = now;
        
        // Track low FPS
        if (this.performance.fps < 30) {
            this.trackEvent('low_fps', { fps: this.performance.fps });
        }
    }
    
    updateMemoryUsage() {
        if (performance.memory) {
            this.performance.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
            
            // Track high memory usage
            if (this.performance.memoryUsage > 100) {
                this.trackEvent('high_memory_usage', { 
                    memoryMB: this.performance.memoryUsage 
                });
            }
        }
    }
    
    // Error Handling
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.trackError('javascript_error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });
        
        // Unhandled promise rejection
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError('unhandled_promise_rejection', {
                reason: event.reason,
                stack: event.reason?.stack
            });
        });
        
        // Canvas context lost
        window.addEventListener('webglcontextlost', (event) => {
            this.trackError('webgl_context_lost', {
                event: event.type
            });
        });
    }
    
    // Event Tracking
    trackEvent(eventName, data = {}) {
        const event = {
            sessionId: this.sessionId,
            timestamp: Date.now(),
            event: eventName,
            data: {
                ...data,
                performance: {
                    fps: this.performance.fps,
                    averageFPS: this.performance.averageFPS,
                    memoryMB: this.performance.memoryUsage
                }
            }
        };
        
        this.events.push(event);
        console.log('📊 Analytics Event:', event);
        
        // Store in localStorage for persistence
        this.storeEvent(event);
        
        // Send to analytics service (if configured)
        this.sendEvent(event);
    }
    
    trackError(errorType, errorData) {
        const error = {
            sessionId: this.sessionId,
            timestamp: Date.now(),
            type: 'error',
            errorType: errorType,
            data: errorData
        };
        
        this.technicalMetrics.errors.push(error);
        this.trackEvent('error_occurred', error);
        
        console.error('🚨 Analytics Error:', error);
    }
    
    // Game-specific tracking
    trackGameStart() {
        this.trackEvent('game_start', {
            level: 1,
            sessionStart: this.startTime
        });
    }
    
    trackGameEnd(score, level, reason) {
        this.gameStats.playTime = Date.now() - this.startTime;
        this.gameStats.highScore = Math.max(this.gameStats.highScore, score);
        
        this.trackEvent('game_end', {
            finalScore: score,
            levelReached: level,
            reason: reason,
            playTime: this.gameStats.playTime,
            shotsFired: this.gameStats.shotsFired,
            bubblesCleared: this.gameStats.bubblesCleared,
            accuracy: this.calculateAccuracy()
        });
    }
    
    trackBubbleShot(angle, power) {
        this.gameStats.shotsFired++;
        this.trackEvent('bubble_shot', {
            angle: angle,
            power: power,
            shotsFired: this.gameStats.shotsFired
        });
    }
    
    trackBubbleCleared(bubbleType, score) {
        this.gameStats.bubblesCleared++;
        this.trackEvent('bubble_cleared', {
            bubbleType: bubbleType,
            score: score,
            totalCleared: this.gameStats.bubblesCleared
        });
    }
    
    trackSpecialBubbleUsed(bubbleType, effect) {
        this.gameStats.specialBubblesUsed++;
        this.trackEvent('special_bubble_used', {
            bubbleType: bubbleType,
            effect: effect,
            totalUsed: this.gameStats.specialBubblesUsed
        });
    }
    
    trackLevelComplete(level, score, time) {
        this.gameStats.levelsCompleted++;
        this.trackEvent('level_complete', {
            level: level,
            score: score,
            time: time,
            totalCompleted: this.gameStats.levelsCompleted
        });
    }
    
    trackPowerUpActivated(powerUpType) {
        this.gameStats.powerUpsActivated++;
        this.trackEvent('power_up_activated', {
            powerUpType: powerUpType,
            totalActivated: this.gameStats.powerUpsActivated
        });
    }
    
    trackSettingsChange(setting, value) {
        this.trackEvent('settings_changed', {
            setting: setting,
            value: value
        });
    }
    
    trackPWAInstall() {
        this.trackEvent('pwa_install_attempt');
    }
    
    trackPWAInstallSuccess() {
        this.trackEvent('pwa_install_success');
    }
    
    // Performance Analysis
    calculateAccuracy() {
        if (this.gameStats.shotsFired === 0) return 0;
        return Math.round((this.gameStats.bubblesCleared / this.gameStats.shotsFired) * 100);
    }
    
    getPerformanceReport() {
        return {
            sessionId: this.sessionId,
            duration: Date.now() - this.startTime,
            performance: this.performance,
            gameStats: this.gameStats,
            technicalMetrics: this.technicalMetrics,
            eventCount: this.events.length
        };
    }
    
    // Data Storage
    storeEvent(event) {
        try {
            const stored = JSON.parse(localStorage.getItem('cannonpop_analytics') || '[]');
            stored.push(event);
            
            // Keep only last 1000 events
            if (stored.length > 1000) {
                stored.splice(0, stored.length - 1000);
            }
            
            localStorage.setItem('cannonpop_analytics', JSON.stringify(stored));
        } catch (error) {
            console.error('Failed to store analytics event:', error);
        }
    }
    
    getStoredEvents() {
        try {
            return JSON.parse(localStorage.getItem('cannonpop_analytics') || '[]');
        } catch (error) {
            console.error('Failed to retrieve stored events:', error);
            return [];
        }
    }
    
    clearStoredEvents() {
        localStorage.removeItem('cannonpop_analytics');
    }
    
    // Data Export
    exportAnalytics() {
        const data = {
            sessionId: this.sessionId,
            exportTime: Date.now(),
            events: this.events,
            performance: this.performance,
            gameStats: this.gameStats,
            technicalMetrics: this.technicalMetrics
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `cannonpop-analytics-${this.sessionId}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
    
    // Send to Analytics Service
    sendEvent(event) {
        // In a real implementation, this would send to your analytics service
        // For now, we'll just log it
        if (navigator.sendBeacon) {
            try {
                navigator.sendBeacon('/api/analytics', JSON.stringify(event));
            } catch (error) {
                console.warn('Failed to send analytics event:', error);
            }
        }
    }
    
    // Cleanup
    destroy() {
        if (this.fpsInterval) {
            clearInterval(this.fpsInterval);
        }
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
        }
    }
}

// Export for global access
window.GameAnalytics = GameAnalytics;
