/**
 * CannonPop Social Features & Score Sharing
 * Enables players to share scores, achievements, and compete with friends
 */

class SocialManager {
    constructor() {
        this.shareData = {
            title: 'BustAGroove - Bubble Shooter PWA',
            text: 'Check out my amazing score!',
            url: 'https://cannonpop.523.life/',
            hashtags: ['BustAGroove', 'BubbleShooter', 'PWA', 'MobileGame']
        };
        
        this.achievements = this.loadAchievements();
        this.leaderboard = this.loadLeaderboard();
    }
    
    // Score Sharing Methods
    async shareScore(score, level, specialBubblesUsed, accuracy) {
        const shareText = this.generateShareText(score, level, specialBubblesUsed, accuracy);
        const shareUrl = this.generateShareUrl(score, level);
        
        const shareData = {
            title: this.shareData.title,
            text: shareText,
            url: shareUrl
        };
        
        try {
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
                this.trackShareEvent('native_share', { score, level });
                return true;
            } else {
                // Fallback to Web Share API or manual sharing
                return this.fallbackShare(shareText, shareUrl);
            }
        } catch (error) {
            console.error('Share failed:', error);
            return this.fallbackShare(shareText, shareUrl);
        }
    }
    
    generateShareText(score, level, specialBubblesUsed, accuracy) {
        const messages = [
            `🎮 Just scored ${score.toLocaleString()} points on level ${level} in BustAGroove!`,
            `💥 Amazing! ${score.toLocaleString()} points and ${specialBubblesUsed} special bubbles used!`,
            `🎯 Level ${level} complete with ${accuracy}% accuracy! Score: ${score.toLocaleString()}`,
            `🌟 BustAGroove mastery: ${score.toLocaleString()} points on level ${level}!`,
            `⚡ Epic bubble shooting! ${score.toLocaleString()} points achieved!`
        ];
        
        return messages[Math.floor(Math.random() * messages.length)];
    }
    
    generateShareUrl(score, level) {
        const params = new URLSearchParams({
            score: score.toString(),
            level: level.toString(),
            source: 'share'
        });
        
        return `https://cannonpop.523.life/?${params.toString()}`;
    }
    
    fallbackShare(text, url) {
        // Copy to clipboard
        const fullText = `${text}\n\nPlay at: ${url}`;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fullText).then(() => {
                this.showShareNotification('Score copied to clipboard!');
                this.trackShareEvent('clipboard_share', { text: fullText });
            }).catch(() => {
                this.showManualShareDialog(fullText);
            });
        } else {
            this.showManualShareDialog(fullText);
        }
        
        return true;
    }
    
    showManualShareDialog(text) {
        const dialog = document.createElement('div');
        dialog.className = 'share-dialog';
        dialog.innerHTML = `
            <div class="share-dialog-content">
                <h3>Share Your Score!</h3>
                <textarea readonly>${text}</textarea>
                <div class="share-dialog-actions">
                    <button class="btn btn-primary" onclick="navigator.clipboard.writeText(this.previousElementSibling.value).then(() => this.textContent = 'Copied!')">
                        Copy to Clipboard
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.share-dialog').remove()">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        this.trackShareEvent('manual_share', { text });
    }
    
    showShareNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'share-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary-color);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Achievement System
    loadAchievements() {
        const defaultAchievements = [
            {
                id: 'first_shot',
                name: 'First Shot',
                description: 'Fire your first bubble',
                icon: '🎯',
                unlocked: false,
                condition: (stats) => stats.shotsFired >= 1
            },
            {
                id: 'bubble_master',
                name: 'Bubble Master',
                description: 'Clear 100 bubbles',
                icon: '💥',
                unlocked: false,
                condition: (stats) => stats.bubblesCleared >= 100
            },
            {
                id: 'special_expert',
                name: 'Special Expert',
                description: 'Use 10 special bubbles',
                icon: '⭐',
                unlocked: false,
                condition: (stats) => stats.specialBubblesUsed >= 10
            },
            {
                id: 'level_5',
                name: 'Level 5',
                description: 'Reach level 5',
                icon: '🏆',
                unlocked: false,
                condition: (stats) => stats.level >= 5
            },
            {
                id: 'high_score_1000',
                name: 'High Scorer',
                description: 'Score 1,000 points',
                icon: '💯',
                unlocked: false,
                condition: (stats) => stats.highScore >= 1000
            },
            {
                id: 'accuracy_master',
                name: 'Accuracy Master',
                description: 'Achieve 80% accuracy',
                icon: '🎯',
                unlocked: false,
                condition: (stats) => stats.accuracy >= 80
            },
            {
                id: 'power_up_king',
                name: 'Power-up King',
                description: 'Use 25 power-ups',
                icon: '⚡',
                unlocked: false,
                condition: (stats) => stats.powerUpsActivated >= 25
            },
            {
                id: 'level_10',
                name: 'Level 10',
                description: 'Reach level 10',
                icon: '👑',
                unlocked: false,
                condition: (stats) => stats.level >= 10
            }
        ];
        
        try {
            const saved = JSON.parse(localStorage.getItem('cannonpop_achievements') || '[]');
            return saved.length > 0 ? saved : defaultAchievements;
        } catch (error) {
            console.error('Failed to load achievements:', error);
            return defaultAchievements;
        }
    }
    
    checkAchievements(gameStats) {
        const newAchievements = [];
        
        this.achievements.forEach(achievement => {
            if (!achievement.unlocked && achievement.condition(gameStats)) {
                achievement.unlocked = true;
                achievement.unlockedAt = Date.now();
                newAchievements.push(achievement);
                this.showAchievementNotification(achievement);
            }
        });
        
        if (newAchievements.length > 0) {
            this.saveAchievements();
            this.trackAchievementEvent(newAchievements);
        }
        
        return newAchievements;
    }
    
    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-text">
                    <h4>Achievement Unlocked!</h4>
                    <p><strong>${achievement.name}</strong></p>
                    <p>${achievement.description}</p>
                </div>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
            color: white;
            padding: 20px;
            border-radius: 12px;
            z-index: 1000;
            animation: achievementPop 0.5s ease;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'achievementFade 0.5s ease';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    saveAchievements() {
        try {
            localStorage.setItem('cannonpop_achievements', JSON.stringify(this.achievements));
        } catch (error) {
            console.error('Failed to save achievements:', error);
        }
    }
    
    // Leaderboard System
    loadLeaderboard() {
        try {
            return JSON.parse(localStorage.getItem('cannonpop_leaderboard') || '[]');
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            return [];
        }
    }
    
    addToLeaderboard(score, level, playerName = 'Anonymous') {
        const entry = {
            id: Date.now().toString(),
            playerName,
            score,
            level,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };
        
        this.leaderboard.push(entry);
        this.leaderboard.sort((a, b) => b.score - a.score);
        
        // Keep only top 50 entries
        if (this.leaderboard.length > 50) {
            this.leaderboard = this.leaderboard.slice(0, 50);
        }
        
        this.saveLeaderboard();
        return entry;
    }
    
    saveLeaderboard() {
        try {
            localStorage.setItem('cannonpop_leaderboard', JSON.stringify(this.leaderboard));
        } catch (error) {
            console.error('Failed to save leaderboard:', error);
        }
    }
    
    getTopScores(limit = 10) {
        return this.leaderboard.slice(0, limit);
    }
    
    getPlayerRank(score) {
        return this.leaderboard.findIndex(entry => entry.score <= score) + 1;
    }
    
    // Social Media Integration
    shareToTwitter(score, level) {
        const text = this.generateShareText(score, level, 0, 0);
        const url = this.generateShareUrl(score, level);
        const hashtags = this.shareData.hashtags.join(',');
        
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;
        
        window.open(twitterUrl, '_blank', 'width=600,height=400');
        this.trackShareEvent('twitter_share', { score, level });
    }
    
    shareToFacebook(score, level) {
        const url = this.generateShareUrl(score, level);
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        
        window.open(facebookUrl, '_blank', 'width=600,height=400');
        this.trackShareEvent('facebook_share', { score, level });
    }
    
    shareToWhatsApp(score, level) {
        const text = this.generateShareText(score, level, 0, 0);
        const url = this.generateShareUrl(score, level);
        const message = `${text}\n\nPlay at: ${url}`;
        
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappUrl, '_blank');
        this.trackShareEvent('whatsapp_share', { score, level });
    }
    
    // Analytics Tracking
    trackShareEvent(platform, data) {
        if (window.analytics) {
            window.analytics.trackEvent('score_shared', {
                platform,
                score: data.score,
                level: data.level,
                ...data
            });
        }
    }
    
    trackAchievementEvent(achievements) {
        if (window.analytics) {
            window.analytics.trackEvent('achievement_unlocked', {
                achievements: achievements.map(a => a.id),
                count: achievements.length
            });
        }
    }
    
    // Export/Import Social Data
    exportSocialData() {
        const data = {
            achievements: this.achievements,
            leaderboard: this.leaderboard,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `cannonpop-social-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
    
    importSocialData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.achievements) {
                        this.achievements = data.achievements;
                        this.saveAchievements();
                    }
                    
                    if (data.leaderboard) {
                        this.leaderboard = data.leaderboard;
                        this.saveLeaderboard();
                    }
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes achievementPop {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    
    @keyframes achievementFade {
        from { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        to { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
    }
    
    .share-dialog {
        position: fixed;
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
    
    .share-dialog-content {
        background: var(--bg-color);
        padding: 2rem;
        border-radius: 12px;
        max-width: 400px;
        width: 90%;
    }
    
    .share-dialog-content textarea {
        width: 100%;
        height: 100px;
        margin: 1rem 0;
        padding: 0.5rem;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--surface-color);
        color: var(--text-color);
        resize: vertical;
    }
    
    .share-dialog-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
    }
    
    .achievement-content {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .achievement-icon {
        font-size: 2rem;
    }
    
    .achievement-text h4 {
        margin: 0 0 0.5rem 0;
        color: white;
    }
    
    .achievement-text p {
        margin: 0.25rem 0;
        font-size: 14px;
    }
`;
document.head.appendChild(style);

// Export for global access
window.SocialManager = SocialManager;
