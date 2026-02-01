/**
 * Token Peek overlay UI component
 */

import { TokenInfo, TokenDetectionResult } from '../shared/types';

export interface OverlayState {
  isVisible: boolean;
  isMinimized: boolean;
  showSettings: boolean;
  status: 'detected' | 'not-detected' | 'loading' | 'error';
  tokenInfo: TokenInfo | null;
  error: string | null;
  lastUpdated: Date | null;
}

export class TokenOverlay {
  private container: HTMLElement | null = null;
  private state: OverlayState = {
    isVisible: false,
    isMinimized: false,
    showSettings: false,
    status: 'not-detected',
    tokenInfo: null,
    error: null,
    lastUpdated: null,
  };
  private callbacks: Map<string, Array<() => void>> = new Map();
  private rpcUrl: string = 'https://mainnet.helius-rpc.com/?api-key=a715727e-ac65-43f4-8694-8281e0b31d21';

  constructor() {
    this.loadStyles();
    this.createOverlay();
    this.state.showSettings = false;
  }

  /**
   * Load CSS styles into the page
   */
  private loadStyles(): void {
    const styleId = 'tp-overlay-styles';
    if (document.getElementById(styleId)) {
      return;
    }

    const link = document.createElement('link');
    link.id = styleId;
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content/overlay.css');
    document.head.appendChild(link);
  }

  /**
   * Create and inject overlay HTML
   */
  private createOverlay(): void {
    this.container = document.createElement('div');
    this.container.className = 'tp-overlay';
    this.container.style.display = 'none';
    
    this.render();
    document.body.appendChild(this.container);
  }

  /**
   * Show the overlay
   */
  show(): void {
    if (!this.container) return;
    
    this.state.isVisible = true;
    this.container.style.display = 'block';
    this.container.style.visibility = 'visible';
    this.container.style.opacity = '1';
    
    // Set default state if no token info yet
    if (!this.state.tokenInfo && this.state.status === 'not-detected') {
      this.state.status = 'loading';
      this.state.tokenInfo = {
        mint: 'EPjFWaLb3hyccqJ12DDWeLMsTT9J7Z1Gmm5gGgNjKpJ',
        decimals: 6,
        supply: '1000000000000000',
        lastUpdated: Date.now(),
      };
      this.render();
    }
    
    this.emit('show');
  }

  /**
   * Hide the overlay
   */
  hide(): void {
    if (!this.container) return;
    
    this.state.isVisible = false;
    this.container.style.display = 'none';
    this.emit('hide');
  }

  /**
   * Toggle overlay visibility
   */
  toggle(): void {
    if (this.state.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Minimize/expand overlay
   */
  toggleMinimize(): void {
    this.state.isMinimized = !this.state.isMinimized;
    this.updateMinimizedState();
    this.emit('minimize', this.state.isMinimized);
  }

  /**
   * Update with detection result
   */
  updateDetection(result: TokenDetectionResult): void {
    if (result.mint) {
      this.state.status = 'loading';
      this.state.tokenInfo = {
        mint: result.mint,
        decimals: 0,
        supply: '0',
        lastUpdated: Date.now(),
      };
      this.state.error = null;
    } else {
      this.state.status = 'not-detected';
      this.state.tokenInfo = null;
      this.state.error = null;
    }
    
    this.state.lastUpdated = new Date();
    this.render();
  }

  /**
   * Update with token info
   */
  updateTokenInfo(tokenInfo: TokenInfo): void {
    this.state.status = 'detected';
    this.state.tokenInfo = tokenInfo;
    this.state.error = null;
    this.state.lastUpdated = new Date();
    this.render();
  }

  /**
   * Update with error
   */
  updateError(error: string): void {
    this.state.status = 'error';
    this.state.error = error;
    this.state.lastUpdated = new Date();
    this.render();
  }

  /**
   * Get current state
   */
  getState(): OverlayState {
    return { ...this.state };
  }

  /**
   * Toggle settings view
   */
  toggleSettings(): void {
    this.state.showSettings = !this.state.showSettings;
    this.render();
    this.emit('settings-toggle', this.state.showSettings);
  }

  /**
   * Update RPC endpoint
   */
  setRpcUrl(url: string): void {
    this.rpcUrl = url;
  }

  /**
   * Add event listener
   */
  on(event: string, callback: () => void): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: () => void): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data?: any): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb();
        } catch (error) {
          console.error('[TokenPeek] Event callback error:', error);
        }
      });
    }
  }

  /**
   * Render overlay content
   */
  private render(): void {
    if (!this.container) return;

    if (this.state.showSettings) {
      this.renderSettings();
    } else {
      this.renderTokenInfo();
    }

    this.updateMinimizedState();
    this.attachEventListeners();
  }

  /**
   * Render token info view
   */
  private renderTokenInfo(): void {
    if (!this.container) return;

    const minimizeChar = this.state.isMinimized ? '□' : '−';
    const displayMint = this.state.tokenInfo?.mint?.substring(0, 8) || 'token';
    
    // Build token symbol (first 3 chars of mint)
    const tokenSymbol = displayMint.substring(0, 3).toUpperCase();
    const displaySupply = this.state.tokenInfo ? this.formatSupply() : 'Loading...';

    this.container.innerHTML = `
      <div class="tp-wallet-panel">
        <!-- Header -->
        <div class="tp-panel-header">
          <div class="tp-header-top">
            <div class="tp-wallet-icon">👛</div>
            <div class="tp-wallet-info">
              <div class="tp-wallet-name">Token Peek</div>
              <div class="tp-wallet-address">${displayMint}...</div>
            </div>
            <div class="tp-header-controls">
              <button class="tp-icon-btn" data-action="settings" title="Settings">⚙️</button>
              <button class="tp-icon-btn" data-action="minimize" title="Minimize">${minimizeChar}</button>
            </div>
          </div>

          <!-- Balance Section -->
          <div class="tp-balance-section">
            <div class="tp-balance-main">
              <div class="tp-balance-value">$0.00</div>
              <div class="tp-balance-label">Today's PnL: <span class="tp-pnl-positive">+$0.00</span></div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="tp-action-buttons">
            <button class="tp-action-item" data-action="swap">
              <span class="tp-action-icon">⇄</span>
              <span class="tp-action-label">Swap</span>
            </button>
            <button class="tp-action-item" data-action="send">
              <span class="tp-action-icon">↗</span>
              <span class="tp-action-label">Send</span>
            </button>
            <button class="tp-action-item" data-action="receive">
              <span class="tp-action-icon">↙</span>
              <span class="tp-action-label">Receive</span>
            </button>
            <button class="tp-action-item" data-action="buy">
              <span class="tp-action-icon">💰</span>
              <span class="tp-action-label">Buy</span>
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tp-tabs-container">
          <button class="tp-tab-btn tp-tab-active" data-tab="tokens">Tokens</button>
          <button class="tp-tab-btn" data-tab="defi">DeFi</button>
          <button class="tp-tab-btn" data-tab="nfts">NFTs</button>
          <button class="tp-tab-btn" data-tab="activity">Activity</button>
        </div>

        <!-- Content Area -->
        <div class="tp-panel-content">
          <!-- Tokens Tab -->
          <div class="tp-tab-content tp-tab-active" data-tab="tokens">
            <div class="tp-holdings-header">
              <span class="tp-holdings-label">Holdings:</span>
              <span class="tp-holdings-value">$0.00</span>
            </div>

            <div class="tp-token-list">
              ${this.state.tokenInfo ? `
                <div class="tp-token-item">
                  <div class="tp-token-left">
                    <div class="tp-token-icon">${tokenSymbol.charAt(0)}</div>
                    <div class="tp-token-details">
                      <div class="tp-token-name">${tokenSymbol}</div>
                      <div class="tp-token-amount">${this.state.tokenInfo.supply} raw</div>
                    </div>
                  </div>
                  <div class="tp-token-right">
                    <div class="tp-token-value">$0.00</div>
                    <div class="tp-token-change">−11.53%</div>
                  </div>
                </div>
              ` : `
                <div class="tp-empty-state">No tokens detected</div>
              `}
            </div>
          </div>

          <!-- Other Tabs (Placeholder) -->
          <div class="tp-tab-content" data-tab="defi">
            <div class="tp-empty-state">No DeFi positions</div>
          </div>
          <div class="tp-tab-content" data-tab="nfts">
            <div class="tp-empty-state">No NFTs</div>
          </div>
          <div class="tp-tab-content" data-tab="activity">
            <div class="tp-empty-state">No activity yet</div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="tp-footer-actions">
          <button class="tp-footer-btn" data-action="refresh">
            <span>🔄</span> Refresh
          </button>
          <button class="tp-footer-btn" data-action="explorer">
            <span>🔗</span> Explorer
          </button>
          <button class="tp-footer-btn tp-close-btn" data-action="close">
            <span>✕</span> Close
          </button>
        </div>
      </div>

      <div class="tp-minimized-pill" data-action="expand">
        <div class="tp-status-dot"></div>
        <span>Token Peek</span>
      </div>
    `;
  }

  /**
   * Render settings view
   */
  private renderSettings(): void {
    if (!this.container) return;

    const minimizeChar = this.state.isMinimized ? '□' : '−';

    this.container.innerHTML = `
      <div class="tp-header">
        <h3 class="tp-title">Settings</h3>
        <div class="tp-controls">
          <button class="tp-btn" data-action="back-to-token" title="Back">←</button>
          <button class="tp-btn tp-minimize-btn" data-action="minimize">${minimizeChar}</button>
          <button class="tp-btn" data-action="close">×</button>
        </div>
      </div>
      
      <div class="tp-content">
        <div class="tp-field">
          <label class="tp-label">RPC Endpoint</label>
          <textarea id="tp-rpc-input" class="tp-rpc-input" placeholder="Enter RPC URL">${this.rpcUrl}</textarea>
        </div>

        <div class="tp-field">
          <label class="tp-label tp-checkbox-label">
            <input type="checkbox" id="tp-auto-open" class="tp-checkbox" checked>
            <span>Auto-open panel on detection</span>
          </label>
        </div>

        <div class="tp-actions">
          <button class="tp-action-btn" data-action="save-settings">
            Save Settings
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Update minimized state classes
   */
  private updateMinimizedState(): void {
    if (!this.container) return;
    
    if (this.state.isMinimized) {
      this.container.classList.add('tp-minimized');
    } else {
      this.container.classList.remove('tp-minimized');
    }
  }

  /**
   * Get status display text
   */
  private getStatusText(): string {
    switch (this.state.status) {
      case 'detected':
        return 'Token Detected';
      case 'loading':
        return 'Loading Token Info...';
      case 'error':
        return 'Error Loading Token';
      case 'not-detected':
      default:
        return 'No Token Detected';
    }
  }

  /**
   * Format token supply for display
   */
  private formatSupply(): string {
    if (!this.state.tokenInfo || !this.state.tokenInfo.supply) {
      return 'Unknown';
    }

    const supply = this.state.tokenInfo.supply;
    const decimals = this.state.tokenInfo.decimals;
    
    // Convert raw supply to human readable
    if (decimals > 0) {
      const divisor = Math.pow(10, decimals);
      const formatted = (parseInt(supply) / divisor).toLocaleString();
      return `${formatted} (${supply} raw)`;
    }
    
    return parseInt(supply).toLocaleString();
  }

  /**
   * Attach event listeners to buttons
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.getAttribute('data-action');
      const tab = target.getAttribute('data-tab');
      
      // Handle tab switching
      if (tab) {
        this.switchTab(tab);
        return;
      }
      
      switch (action) {
        case 'minimize':
          this.toggleMinimize();
          break;
          
        case 'close':
          this.hide();
          break;
          
        case 'expand':
          this.state.isMinimized = false;
          this.updateMinimizedState();
          break;
          
        case 'settings':
          this.toggleSettings();
          break;

        case 'back-to-token':
          this.state.showSettings = false;
          this.render();
          break;
          
        case 'copy-mint':
          if (this.state.tokenInfo?.mint) {
            this.copyToClipboard(this.state.tokenInfo.mint);
          }
          break;
          
        case 'refresh':
          this.emit('refresh');
          break;
          
        case 'explorer':
          if (this.state.tokenInfo?.mint) {
            const url = `https://solscan.io/token/${this.state.tokenInfo.mint}`;
            window.open(url, '_blank');
          }
          break;

        case 'swap':
        case 'send':
        case 'receive':
        case 'buy':
          this.emit(`action-${action}`);
          break;

        case 'save-settings':
          this.handleSaveSettings();
          break;
      }
    });
  }

  /**
   * Switch between tabs
   */
  private switchTab(tabName: string): void {
    // Update tab buttons
    const tabButtons = this.container?.querySelectorAll('.tp-tab-btn');
    tabButtons?.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('tp-tab-active');
      } else {
        btn.classList.remove('tp-tab-active');
      }
    });

    // Update tab content
    const tabContents = this.container?.querySelectorAll('.tp-tab-content');
    tabContents?.forEach(content => {
      if (content.getAttribute('data-tab') === tabName) {
        content.classList.add('tp-tab-active');
      } else {
        content.classList.remove('tp-tab-active');
      }
    });
  }

  /**
   * Handle save settings
   */
  private handleSaveSettings(): void {
    const rpcInput = document.getElementById('tp-rpc-input') as HTMLTextAreaElement;
    const autoOpenCheckbox = document.getElementById('tp-auto-open') as HTMLInputElement;

    if (rpcInput && rpcInput.value.trim()) {
      this.rpcUrl = rpcInput.value.trim();
      this.emit('settings-saved', {
        rpcEndpoint: this.rpcUrl,
        autoOpenPanel: autoOpenCheckbox?.checked ?? true,
      });
      
      // Show feedback
      const btn = this.container?.querySelector('[data-action="save-settings"]') as HTMLElement;
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = '✓ Saved!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }
    }
  }

  /**
   * Copy text to clipboard
   */
  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      // Show brief feedback
      const buttons = this.container?.querySelectorAll('[data-action="copy-mint"]');
      buttons?.forEach(btn => {
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 1000);
      });
    } catch (error) {
      console.error('[TokenPeek] Failed to copy to clipboard:', error);
    }
  }

  /**
   * Cleanup and remove overlay
   */
  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.callbacks.clear();
  }
}