/**
 * KOLsuite Side Panel Script
 */

console.log('[KOLsuite] ======================================');
console.log('[KOLsuite] SIDEPANEL SCRIPT LOADED!');
console.log('[KOLsuite] ======================================');

class SidePanelManager {
  private currentState: 'loading' | 'main' | 'empty' | 'error' = 'loading';
  private tokenData: any = null;
  private lastTokenMint: string | null = null;

  constructor() {
    console.log('[KOLsuite] SidePanelManager constructor called!');
    this.init();
  }

  private init(): void {
    console.log('[KOLsuite Sidepanel] Initializing...');
    this.loadTheme();
    this.setupEventListeners();
    this.loadTokenData();
    this.setupTabListeners();
  }

  private setupTabListeners(): void {
    // Listen for tab URL changes
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.url && tab.active) {
        console.log('[KOLsuite] Tab URL changed, reloading token data...');
        this.loadTokenData();
      }
    });

    // Listen for active tab changes
    chrome.tabs.onActivated.addListener(() => {
      console.log('[KOLsuite] Active tab changed, reloading token data...');
      setTimeout(() => this.loadTokenData(), 100);
    });
  }

  private loadTheme(): void {
    // Default to dark mode (KOLsuite theme)
    document.body.classList.add('dark-mode');
  }

  private setupEventListeners(): void {
    // Settings button
    document.getElementById('settings-btn')?.addEventListener('click', () => this.openSettings());

    // Back button in settings
    document.getElementById('back-btn')?.addEventListener('click', () => this.closeSettings());

    // KeyCode toggle
    document.getElementById('keycode-toggle')?.addEventListener('click', () => this.toggleKeyCodeSection());

    // Save KeyCode button
    document.getElementById('save-keycode-btn')?.addEventListener('click', () => this.saveKeyCode());

    // Subscription item click
    document.getElementById('subscription-item')?.addEventListener('click', () => {
      this.showToast('Subscription management coming soon!');
    });

    // Terms & Conditions
    document.getElementById('terms-item')?.addEventListener('click', () => {
      window.open('https://kolsuite.com/terms', '_blank');
    });

    // Privacy Policy
    document.getElementById('privacy-item')?.addEventListener('click', () => {
      window.open('https://kolsuite.com/privacy', '_blank');
    });

    // Language select
    document.getElementById('language-select')?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      console.log('[KOLsuite] Language changed to:', value);
      this.showToast('Language preference saved!');
    });

    // Theme select in settings
    document.getElementById('theme-select')?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      if (value === 'dark') {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    });

    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => this.toggleTheme());

    // Address pill copy
    document.getElementById('address-pill')?.addEventListener('click', () => this.copyAddress());

    // Retry/Refresh buttons
    document.getElementById('refresh-btn')?.addEventListener('click', () => this.loadTokenData());
    document.getElementById('retry-btn')?.addEventListener('click', () => this.loadTokenData());

    // Post button
    document.querySelector('.post-btn')?.addEventListener('click', () => this.postOnX());

    // Generate button
    document.querySelector('.generate-btn-float')?.addEventListener('click', () => this.generateCaption());

    // Upload button
    document.querySelector('.upload-btn-float')?.addEventListener('click', () => this.uploadMedia());

    // Caption input to update preview
    document.getElementById('caption-input')?.addEventListener('input', (e) => this.updatePreview((e.target as HTMLTextAreaElement).value));

    // Caption settings button
    document.getElementById('caption-settings-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCaptionSettings();
    });

    // Settings close button
    document.getElementById('settings-close-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const popup = document.getElementById('caption-settings-popup');
      if (popup) popup.style.display = 'none';
    });

    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
      const popup = document.getElementById('caption-settings-popup');
      const btn = document.getElementById('caption-settings-btn');
      if (popup && popup.style.display === 'block' && !popup.contains(e.target as Node) && !btn?.contains(e.target as Node)) {
        popup.style.display = 'none';
      }
    });
  }

  private toggleCaptionSettings(): void {
    const popup = document.getElementById('caption-settings-popup');
    if (popup) {
      popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
    }
  }

  private toggleTheme(): void {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    console.log('[KOLsuite] Theme toggled:', isDark ? 'dark' : 'light');
  }

  private openSettings(): void {
    console.log('[KOLsuite] Opening settings...');
    const mainPanel = document.querySelector('.side-panel-container') as HTMLElement;
    const settingsView = document.getElementById('settings-view');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const errorState = document.getElementById('error-state');
    
    if (mainPanel) mainPanel.style.display = 'none';
    if (loadingState) loadingState.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    if (errorState) errorState.style.display = 'none';
    if (settingsView) settingsView.style.display = 'flex';
  }

  private closeSettings(): void {
    console.log('[KOLsuite] Closing settings...');
    const settingsView = document.getElementById('settings-view');
    if (settingsView) settingsView.style.display = 'none';
    
    // Return to previous state
    if (this.currentState === 'main') {
      const mainPanel = document.querySelector('.side-panel-container') as HTMLElement;
      if (mainPanel) mainPanel.style.display = 'flex';
    } else {
      this.showState(this.currentState);
    }
  }

  private saveKeyCode(): void {
    const input = document.getElementById('keycode-input') as HTMLInputElement;
    const keyCode = input?.value?.trim();
    
    if (!keyCode) {
      this.showToast('Please enter a KeyCode');
      return;
    }

    // Save to chrome storage
    chrome.storage.local.set({ keyCode: keyCode }, () => {
      console.log('[KOLsuite] KeyCode saved');
      this.showToast('KeyCode saved successfully!');
      if (input) input.value = '';
    });
  }

  private toggleKeyCodeSection(): void {
    const content = document.getElementById('keycode-content');
    const chevron = document.querySelector('#keycode-toggle .chevron-icon');
    
    if (content && chevron) {
      const isExpanded = content.classList.contains('expanded');
      
      if (isExpanded) {
        content.classList.remove('expanded');
        content.style.display = 'none';
        chevron.classList.remove('expanded');
      } else {
        content.classList.add('expanded');
        content.style.display = 'flex';
        chevron.classList.add('expanded');
      }
    }
  }

  private async copyAddress(): Promise<void> {
    if (!this.tokenData || !this.tokenData.mint) return;
    
    try {
      await navigator.clipboard.writeText(this.tokenData.mint);
      console.log('[TokenPeek] Address copied:', this.tokenData.mint);
      this.showToast('Address copied!');
    } catch (err) {
      console.error('[TokenPeek] Failed to copy:', err);
    }
  }

  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(16, 185, 129, 0.9);
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 14px;
      z-index: 1000;
      animation: fadeIn 0.3s;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  private async loadTokenData(): Promise<void> {
    console.log('[TokenPeek Sidepanel] loadTokenData() called');
    
    this.showState('loading');

    try {
      const tab = await new Promise<chrome.tabs.Tab>((resolve, reject) => {
        try {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            console.log('[TokenPeek] chrome.tabs.query result:', { tabs: tabs?.length, error: chrome.runtime.lastError });
            
            if (chrome.runtime.lastError) {
              console.error('[TokenPeek] chrome.runtime.lastError:', chrome.runtime.lastError);
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            
            if (!tabs || tabs.length === 0) {
              console.log('[TokenPeek] No tabs found');
              reject(new Error('No active tab'));
              return;
            }
            
            console.log('[TokenPeek] Tab found:', { url: tabs[0].url, id: tabs[0].id });
            resolve(tabs[0]);
          });
        } catch (err) {
          console.error('[TokenPeek] Exception in chrome.tabs.query:', err);
          reject(err);
        }
      });

      console.log('[TokenPeek Sidepanel] Tab URL:', tab.url);

      // Extract mint from URL
      let mint: string | null = null;
      
      // Try extracting from query parameter (?token=)
      const tokenMatch = tab.url?.match(/[?&]token=([^&\s#]+)/);
      if (tokenMatch && tokenMatch[1]) {
        mint = decodeURIComponent(tokenMatch[1]).trim();
        console.log('[TokenPeek Sidepanel] ✅ Extracted mint from query:', mint);
      }

      // Try extracting from gmgn.ai URL pattern: /sol/token/{address}
      if (!mint && tab.url?.includes('gmgn.ai')) {
        const gmgnMatch = tab.url.match(/\/sol\/token\/([A-Za-z0-9]{32,44})/);
        if (gmgnMatch && gmgnMatch[1]) {
          mint = gmgnMatch[1].trim();
          console.log('[TokenPeek Sidepanel] ✅ Extracted mint from gmgn.ai URL:', mint);
        }
      }

      // Try extracting from axiom.trade URL pattern: /meme/{address}?chain=sol
      if (!mint && tab.url?.includes('axiom.trade')) {
        const axiomMatch = tab.url.match(/\/meme\/([A-Za-z0-9]{32,44})/);
        if (axiomMatch && axiomMatch[1] && tab.url.includes('chain=sol')) {
          mint = axiomMatch[1].trim();
          console.log('[TokenPeek Sidepanel] ✅ Extracted mint from axiom.trade URL:', mint);
        }
      }

      // Try extracting from padre.gg URL pattern: /trade/solana/{address}
      if (!mint && tab.url?.includes('padre.gg')) {
        const padreMatch = tab.url.match(/\/trade\/solana\/([A-Za-z0-9]{32,44})/);
        if (padreMatch && padreMatch[1]) {
          mint = padreMatch[1].trim();
          console.log('[TokenPeek Sidepanel] ✅ Extracted mint from padre.gg URL:', mint);
        }
      }

      if (!mint || mint.length < 5) {
        console.log('[TokenPeek Sidepanel] ❌ No valid mint');
        this.showState('empty');
        return;
      }

      console.log('[TokenPeek Sidepanel] ✅ Mint valid, displaying...');

      // Create basic token object
      const basicToken = {
        mint: mint,
        name: 'Sample Token',
        symbol: 'SMPL',
        price: '$0.00',
        volume24h: '$0.00K',
        liquidity: '$0.00K',
        fees: '0.0000',
        audit: '0/10',
        change5m: '-0.0%',
        change1h: '-0.0%',
        change6h: '-0.0%',
        change1d: '-0.0%',
        bundled: '0.0%',
        remaining1: '100%',
        sniped: '0.0%',
        remaining2: '100%',
        dev: '0%',
        insiders: '0%',
        top10: '0.0%'
      };

      this.tokenData = basicToken;
      this.displayToken(basicToken);
      this.showState('main');
      
    } catch (error) {
      console.error('[TokenPeek Sidepanel] Error loading token:', error);
      this.showState('error', error instanceof Error ? error.message : 'Failed to load token');
    }
  }

  private showState(state: 'loading' | 'main' | 'empty' | 'error', errorMsg?: string): void {
    console.log('[TokenPeek] showState:', state);
    
    const loading = document.getElementById('loading-state');
    const empty = document.getElementById('empty-state');
    const error = document.getElementById('error-state');
    const panel = document.querySelector('.side-panel-container') as HTMLElement;
    
    if (loading) loading.style.display = state === 'loading' ? 'flex' : 'none';
    if (empty) empty.style.display = state === 'empty' ? 'flex' : 'none';
    if (error) {
      error.style.display = state === 'error' ? 'flex' : 'none';
      if (errorMsg) {
        const errMsgEl = document.getElementById('error-message');
        if (errMsgEl) errMsgEl.textContent = errorMsg;
      }
    }
    if (panel) panel.style.display = state === 'main' ? 'flex' : 'none';
    
    this.currentState = state;
  }

  private displayToken(tokenInfo: any): void {
    console.log('[TokenPeek Sidepanel] displayToken() called with:', tokenInfo);
    
    const mint = tokenInfo.mint || 'Unknown';
    const name = tokenInfo.name || 'Token Name';
    const symbol = tokenInfo.symbol || 'UNKNOWN';
    
    // Token Name
    const nameEl = document.getElementById('token-name-header');
    if (nameEl) nameEl.textContent = name;
    
    // Token Symbol
    const symbolEl = document.getElementById('token-symbol');
    if (symbolEl) symbolEl.textContent = `$${symbol}`;
    
    // Address Pill
    const mintEl = document.getElementById('token-mint-short');
    if (mintEl) {
      const shortMint = `${mint.slice(0, 8)}...${mint.slice(-8)}`;
      mintEl.textContent = shortMint;
    }
    
    // Stats
    this.updateElement('stat-price', tokenInfo.price);
    this.updateElement('stat-fees', tokenInfo.fees);
    this.updateElement('stat-audit', tokenInfo.audit);
    this.updateElement('stat-volume', tokenInfo.volume24h);
    this.updateElement('stat-liquidity', tokenInfo.liquidity);
    
    // Timeframes
    this.updateElement('change-5m', tokenInfo.change5m);
    this.updateElement('change-1h', tokenInfo.change1h);
    this.updateElement('change-6h', tokenInfo.change6h);
    this.updateElement('change-1d', tokenInfo.change1d);
    
    // Metrics Row 4
    this.updateElement('metric-bundled', tokenInfo.bundled);
    this.updateElement('metric-remaining1', tokenInfo.remaining1);
    this.updateElement('metric-sniped', tokenInfo.sniped);
    this.updateElement('metric-remaining2', tokenInfo.remaining2);
    
    // Metrics Row 5
    this.updateElement('metric-dev', tokenInfo.dev);
    this.updateElement('metric-insiders', tokenInfo.insiders);
    this.updateElement('metric-top10', tokenInfo.top10);
    
    console.log('[TokenPeek Sidepanel] ✅ Token displayed!');
  }
  
  private updateElement(id: string, value: any): void {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) {
      el.textContent = value.toString();
    }
  }

  private postOnX(): void {
    console.log('[TokenPeek] Post on X clicked');
    const caption = (document.getElementById('caption-input') as HTMLTextAreaElement)?.value || '';
    
    if (!caption.trim()) {
      this.showToast('Please write a caption first!');
      return;
    }
    
    // Open Twitter with caption
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}`;
    window.open(tweetUrl, '_blank');
  }

  private generateCaption(): void {
    console.log('[TokenPeek] Generate caption clicked');
    
    if (!this.tokenData) {
      this.showToast('No token data available');
      return;
    }
    
    const caption = `🚀 ${this.tokenData.name} ($${this.tokenData.symbol})\n\n` +
                   `💰 Price: ${this.tokenData.price}\n` +
                   `📊 24H Vol: ${this.tokenData.volume24h}\n` +
                   `💧 Liquidity: ${this.tokenData.liquidity}\n\n` +
                   `#Solana #Crypto #${this.tokenData.symbol}`;
    
    const textarea = document.getElementById('caption-input') as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = caption;
      this.updatePreview(caption);
      this.showToast('Caption generated!');
    }
  }

  private updatePreview(text: string): void {
    const previewCard = document.getElementById('post-preview-card');
    const previewText = document.getElementById('preview-text');
    
    if (!previewCard || !previewText) return;
    
    if (text.trim().length > 0) {
      previewCard.style.display = 'block';
      previewText.textContent = text;
    } else {
      previewCard.style.display = 'none';
      previewText.textContent = 'Your caption will appear here...';
    }
  }

  private uploadMedia(): void {
    console.log('[TokenPeek] Upload media clicked');
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        console.log('[TokenPeek] File selected:', file.name);
        this.showToast(`File selected: ${file.name}`);
        // Here you would handle the file upload
        // For now just show notification
      }
    };
    input.click();
  }
}

// Initialize on DOM ready
console.log('[TokenPeek] Document readyState:', document.readyState);

if (document.readyState === 'loading') {
  console.log('[TokenPeek] Waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[TokenPeek] DOMContentLoaded fired! Creating SidePanelManager...');
    (window as any).sidePanelManager = new SidePanelManager();
  });
} else {
  console.log('[TokenPeek] DOM already loaded, creating SidePanelManager immediately...');
  (window as any).sidePanelManager = new SidePanelManager();
}

console.log('[TokenPeek] Sidepanel script initialization complete');
