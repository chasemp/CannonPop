/**
 * Logger Utility - Conditional logging for production vs development
 * Following best practice: "Remove all debug code" - PWA_DEVELOPMENT_WORKFLOW.md
 */

class Logger {
  private isDev: boolean;

  constructor() {
    // Check if we're in development mode
    this.isDev = import.meta.env.DEV || 
                 import.meta.env.MODE === 'development' ||
                 localStorage.getItem('debug') === 'true' ||
                 window.location.hostname === 'localhost' ||
                 window.location.hostname.includes('127.0.0.1');
  }

  /**
   * Log informational message (only in development)
   */
  log(...args: any[]): void {
    if (this.isDev) {
      console.log(...args);
    }
  }

  /**
   * Log warning (only in development)
   */
  warn(...args: any[]): void {
    if (this.isDev) {
      console.warn(...args);
    }
  }

  /**
   * Log error (always logged, even in production)
   */
  error(...args: any[]): void {
    console.error(...args);
  }

  /**
   * Log informational message with emoji prefix
   */
  info(emoji: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(emoji, ...args);
    }
  }

  /**
   * Log success message (only in development)
   */
  success(...args: any[]): void {
    if (this.isDev) {
      console.log('✅', ...args);
    }
  }

  /**
   * Log warning with emoji (only in development)
   */
  warning(...args: any[]): void {
    if (this.isDev) {
      console.warn('⚠️', ...args);
    }
  }

  /**
   * Enable debug mode programmatically
   */
  enableDebug(): void {
    localStorage.setItem('debug', 'true');
    this.isDev = true;
    this.log('🐛 Debug mode enabled');
  }

  /**
   * Disable debug mode
   */
  disableDebug(): void {
    localStorage.removeItem('debug');
    this.isDev = false;
  }
}

// Export singleton instance
const logger = new Logger();
export default logger;
