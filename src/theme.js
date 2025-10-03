/**
 * CannonPop Theme Manager
 * Handles light/dark theme switching across all pages
 */

class ThemeManager {
    constructor() {
        this.STORAGE_KEY = 'cannonpop_theme';
        this.init();
    }

    init() {
        // Load saved theme or detect system preference
        const savedTheme = this.getSavedTheme();
        this.applyTheme(savedTheme);
        
        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!this.getSavedTheme()) {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    getSavedTheme() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) return saved;
        
        // Detect system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        return 'light';
    }

    applyTheme(theme) {
        const root = document.documentElement;
        const body = document.body;
        
        // Remove existing theme classes
        root.classList.remove('light-theme', 'dark-theme');
        body.classList.remove('light-theme', 'dark-theme');
        root.removeAttribute('data-theme');
        
        // Apply new theme
        if (theme === 'dark') {
            root.classList.add('dark-theme');
            body.classList.add('dark-theme');
            root.setAttribute('data-theme', 'dark');
        } else {
            root.classList.add('light-theme');
            body.classList.add('light-theme');
            root.setAttribute('data-theme', 'light');
        }
        
        // Update meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#1e1e2e' : '#fff5e1');
        }
        
        console.log(`🎨 Theme applied: ${theme}`);
    }

    setTheme(theme) {
        localStorage.setItem(this.STORAGE_KEY, theme);
        this.applyTheme(theme);
        
        // Notify other tabs/windows
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }

    getTheme() {
        return this.getSavedTheme();
    }

    toggleTheme() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        return newTheme;
    }
}

// Export singleton instance
const themeManager = new ThemeManager();
window.themeManager = themeManager;

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        themeManager.init();
    });
} else {
    themeManager.init();
}

export default themeManager;

