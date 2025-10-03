/**
 * EventHelper - Universal touch/click event handling
 * Following best practice: "Touch-First Event Handling" - PWA_MOBILE_UX_GUIDE.md
 */

interface EventOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

type EventHandler = (event: Event) => void;
type CleanupFunction = () => void;

class EventHelper {
  /**
   * Add universal touch/click handler to an element
   * Handles both touch and click events, preventing double-firing
   */
  static addUniversalHandler(
    element: HTMLElement,
    handler: EventHandler,
    options: EventOptions = {}
  ): CleanupFunction {
    if (!element) {
      console.error('EventHelper: No element provided');
      return () => {};
    }

    let touchHandled = false;
    const { preventDefault = false, stopPropagation = false } = options;

    // Touch event handler
    const touchHandler = (e: Event) => {
      touchHandled = true;
      if (preventDefault) e.preventDefault();
      if (stopPropagation) e.stopPropagation();
      handler(e);
      
      // Reset flag after a short delay
      setTimeout(() => {
        touchHandled = false;
      }, 300);
    };

    // Click event handler
    const clickHandler = (e: Event) => {
      // Skip if already handled by touch
      if (touchHandled) {
        e.preventDefault();
        return;
      }
      if (preventDefault) e.preventDefault();
      if (stopPropagation) e.stopPropagation();
      handler(e);
    };

    // Add both event listeners
    element.addEventListener('touchstart', touchHandler, { passive: !preventDefault });
    element.addEventListener('click', clickHandler);

    // Return cleanup function
    return () => {
      element.removeEventListener('touchstart', touchHandler);
      element.removeEventListener('click', clickHandler);
    };
  }

  /**
   * Add universal handlers to multiple elements
   */
  static addUniversalHandlers(
    elements: NodeListOf<Element> | HTMLElement[],
    handler: EventHandler,
    options: EventOptions = {}
  ): CleanupFunction {
    const cleanupFunctions: CleanupFunction[] = [];
    
    elements.forEach((element) => {
      const cleanup = EventHelper.addUniversalHandler(element as HTMLElement, handler, options);
      if (cleanup) {
        cleanupFunctions.push(cleanup);
      }
    });

    // Return cleanup function that removes all handlers
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }

  /**
   * Create a delegated universal event handler
   * Useful for dynamically added elements
   */
  static addDelegatedHandler(
    container: HTMLElement,
    selector: string,
    handler: EventHandler,
    options: EventOptions = {}
  ): CleanupFunction {
    if (!container) {
      console.error('EventHelper: No container provided');
      return () => {};
    }

    let touchHandled = false;
    const { preventDefault = false, stopPropagation = false } = options;

    const delegatedHandler = (eventType: 'touchstart' | 'click') => (e: Event) => {
      const target = (e.target as HTMLElement).closest(selector);
      if (!target) return;

      if (eventType === 'touchstart') {
        touchHandled = true;
        if (preventDefault) e.preventDefault();
        if (stopPropagation) e.stopPropagation();
        handler.call(target, e);
        
        setTimeout(() => {
          touchHandled = false;
        }, 300);
      } else if (eventType === 'click') {
        if (touchHandled) {
          e.preventDefault();
          return;
        }
        if (preventDefault) e.preventDefault();
        if (stopPropagation) e.stopPropagation();
        handler.call(target, e);
      }
    };

    const touchHandler = delegatedHandler('touchstart');
    const clickHandler = delegatedHandler('click');

    container.addEventListener('touchstart', touchHandler, { passive: !preventDefault });
    container.addEventListener('click', clickHandler);

    // Return cleanup function
    return () => {
      container.removeEventListener('touchstart', touchHandler);
      container.removeEventListener('click', clickHandler);
    };
  }
}

export default EventHelper;
