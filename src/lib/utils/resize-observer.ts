/**
 * Debounced ResizeObserver utility for plot components.
 * Prevents excessive re-renders by throttling resize callbacks.
 */

export interface ResizeDimensions {
  width: number;
  height: number;
}

export interface ResizeObserverOptions {
  /** Debounce delay in milliseconds (default: 100) */
  debounceMs?: number;
  /** Minimum width to report (default: 100) */
  minWidth?: number;
  /** Minimum height to report (default: 100) */
  minHeight?: number;
}

/**
 * Creates a debounced ResizeObserver that calls the callback with the new dimensions.
 * Returns a cleanup function to disconnect the observer.
 */
export function createDebouncedResizeObserver(
  element: HTMLElement,
  callback: (dimensions: ResizeDimensions) => void,
  options: ResizeObserverOptions = {}
): () => void {
  const { debounceMs = 100, minWidth = 100, minHeight = 100 } = options;
  
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastDimensions: ResizeDimensions | null = null;

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      
      // Only process valid dimensions
      if (width >= minWidth && height >= minHeight) {
        // Check if dimensions actually changed
        if (lastDimensions?.width === width && lastDimensions?.height === height) {
          continue;
        }
        
        lastDimensions = { width, height };
        
        // Debounce the callback
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
          callback({ width, height });
          timeoutId = null;
        }, debounceMs);
      }
    }
  });

  resizeObserver.observe(element);

  // Return cleanup function
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    resizeObserver.disconnect();
  };
}

/**
 * Calculate dynamic tick count based on plot dimensions.
 * Larger plots get more ticks for better readability.
 */
export function calculateTickCount(size: number, baseTickCount: number = 5): number {
  if (size < 200) return Math.max(2, baseTickCount - 2);
  if (size < 350) return baseTickCount;
  if (size < 500) return baseTickCount + 2;
  if (size < 700) return baseTickCount + 4;
  return baseTickCount + 6;
}

/**
 * Calculate plot dimensions from container, accounting for padding and title.
 */
export function calculatePlotDimensions(
  containerWidth: number,
  containerHeight: number,
  options: {
    hasTitle?: boolean;
    padding?: number;
    titleHeight?: number;
  } = {}
): { width: number; height: number } {
  const { hasTitle = false, padding = 16, titleHeight = 28 } = options;
  
  const width = Math.max(200, containerWidth - padding * 2);
  const height = Math.max(150, containerHeight - padding * 2 - (hasTitle ? titleHeight : 0));
  
  return { width, height };
}
