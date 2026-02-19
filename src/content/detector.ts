/**
 * Token detection engine with adapter system
 */

import { TokenAdapter, extractPotentialAddresses, isLikelySolanaAddress } from './adapters/base';
import { GmgnAdapter } from './adapters/gmgn';
import { TrojanAdapter } from './adapters/trojan';
import { AxiomAdapter } from './adapters/axiom';
import { PadreAdapter } from './adapters/padre';
import { NeoBullAdapter } from './adapters/neobull';
import { PumpFunAdapter } from './adapters/pumpfun';
import { TelemetryAdapter } from './adapters/telemetry';
import { TokenDetectionResult } from '../shared/types';

export class TokenDetector {
  private adapters: TokenAdapter[] = [];
  private lastDetectedMint: string | null = null;
  /** When the user navigates to another site, reset so we don't reuse old mint */
  private lastOrigin: string | null = null;
  private observer: MutationObserver | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private callbacks: Array<(result: TokenDetectionResult) => void> = [];

  constructor() {
    this.adapters = [
      new GmgnAdapter(),
      new TrojanAdapter(),
      new AxiomAdapter(),
      new PadreAdapter(),
      new NeoBullAdapter(),
      new PumpFunAdapter(),
      new TelemetryAdapter(),
    ];
  }

  /**
   * Start detection with URL and DOM monitoring
   */
  start(): void {
    console.log('[TokenPeek] Starting token detection');
    
    // Initial detection
    this.detectToken();

    // Monitor URL changes (SPA navigation)
    this.startUrlMonitoring();

    // Monitor DOM changes
    this.startDomMonitoring();

    // Polling fallback for edge cases
    this.startPolling();
  }

  /**
   * Stop all monitoring
   */
  stop(): void {
    console.log('[TokenPeek] Stopping token detection');
    
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.callbacks = [];
  }

  /**
   * Add callback for detection results
   */
  onDetection(callback: (result: TokenDetectionResult) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove callback
   */
  offDetection(callback: (result: TokenDetectionResult) => void): void {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  /**
   * Manual token detection trigger
   */
  detectToken(): void {
    const currentUrl = window.location.href;
    let currentOrigin = '';
    try {
      currentOrigin = new URL(currentUrl).origin;
    } catch {
      currentOrigin = currentUrl;
    }
    if (this.lastOrigin !== null && currentOrigin !== this.lastOrigin) {
      this.lastDetectedMint = null;
      console.log('[TokenPeek] Website changed, cleared mint cache.', this.lastOrigin, '→', currentOrigin);
    }
    this.lastOrigin = currentOrigin;

    const result = this.performDetection();
    
    // Only notify if mint changed
    if (result.mint !== this.lastDetectedMint) {
      console.log('[TokenPeek] Token changed:', {
        from: this.lastDetectedMint,
        to: result.mint,
        source: result.source,
        confidence: result.confidence,
      });
      
      this.lastDetectedMint = result.mint;
      this.notifyCallbacks(result);
    }
  }

  /**
   * Core detection logic
   */
  private performDetection(): TokenDetectionResult {
    const currentUrl = window.location.href;

    // Try adapters first
    for (const adapter of this.adapters) {
      if (adapter.canHandle(currentUrl)) {
        console.log(`[TokenPeek] Using ${adapter.getName()} adapter`);
        
        // Try URL extraction first (more reliable)
        const urlMint = adapter.extractMintFromUrl(currentUrl);
        if (urlMint) {
          return {
            mint: urlMint,
            source: 'url',
            confidence: 'high',
          };
        }

        // Fallback to DOM extraction
        const domMint = adapter.extractMintFromDom(document);
        if (domMint) {
          return {
            mint: domMint,
            source: 'dom',
            confidence: 'medium',
          };
        }
      }
    }

    // Generic fallback detection
    const genericMint = this.genericDetection();
    if (genericMint) {
      return {
        mint: genericMint,
        source: 'dom',
        confidence: 'low',
      };
    }

    return {
      mint: null,
      source: 'none',
      confidence: 'low',
    };
  }

  /**
   * Generic token detection across the page
   */
  private genericDetection(): string | null {
    const bodyText = document.body.innerText;
    const addresses = extractPotentialAddresses(bodyText);
    
    if (addresses.length === 0) {
      return null;
    }

    // Simple heuristics to pick the most likely token mint
    // Prefer addresses that appear less frequently (likely not UI elements)
    const addressCounts = new Map<string, number>();
    for (const addr of addresses) {
      const count = (bodyText.match(new RegExp(addr, 'g')) || []).length;
      addressCounts.set(addr, count);
    }

    // Find address with minimum occurrences (but at least 1)
    let bestAddress: string | null = null;
    let minCount = Infinity;

    for (const [addr, count] of addressCounts) {
      if (count < minCount && count >= 1) {
        minCount = count;
        bestAddress = addr;
      }
    }

    return bestAddress;
  }

  /**
   * Monitor URL changes for SPA navigation
   */
  private startUrlMonitoring(): void {
    let lastUrl = window.location.href;
    
    const checkUrlChange = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        // Debounce detection on URL change
        setTimeout(() => this.detectToken(), 100);
      }
    };

    // Override pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      setTimeout(checkUrlChange, 50);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      setTimeout(checkUrlChange, 50);
    };

    // Listen for popstate
    window.addEventListener('popstate', checkUrlChange);
  }

  /**
   * Monitor DOM changes
   */
  private startDomMonitoring(): void {
    this.observer = new MutationObserver(
      this.debounce(() => {
        this.detectToken();
      }, 500)
    );

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  /**
   * Polling fallback (every 5 seconds)
   */
  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      this.detectToken();
    }, 5000);
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(result: TokenDetectionResult): void {
    for (const callback of this.callbacks) {
      try {
        callback(result);
      } catch (error) {
        console.error('[TokenPeek] Callback error:', error);
      }
    }
  }

  /**
   * Simple debounce utility
   */
  private debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
}