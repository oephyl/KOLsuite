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
    this.loadSubscriptionLimit();
    this.loadXUsername();
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
    // Sign in with X button
    const signInBtn = document.getElementById('sign-in-x-btn');
    if (signInBtn) {
      signInBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }

    // Settings button
    document.getElementById('settings-btn')?.addEventListener('click', () => this.openSettings());

    // Summary toggle
    document.getElementById('summary-toggle')?.addEventListener('click', () => this.toggleSummary());

    // Back button in settings
    document.getElementById('back-btn')?.addEventListener('click', () => this.closeSettings());

    // KeyCode toggle
    document.getElementById('keycode-toggle')?.addEventListener('click', () => this.toggleKeyCodeSection());

    // Save KeyCode button
    document.getElementById('save-keycode-btn')?.addEventListener('click', () => this.saveKeyCode());

    // X Account toggle
    document.getElementById('x-account-toggle')?.addEventListener('click', () => this.toggleXAccountSection());

    // Connect X Account button
    document.getElementById('connect-x-btn')?.addEventListener('click', () => this.connectXAccount());

    // Telegram Account toggle
    document.getElementById('telegram-account-toggle')?.addEventListener('click', () => this.toggleTelegramSection());

    // Connect Telegram button
    document.getElementById('connect-telegram-btn')?.addEventListener('click', () => this.connectTelegram());

    // Discord Account toggle
    document.getElementById('discord-account-toggle')?.addEventListener('click', () => this.toggleDiscordSection());

    // Connect Discord button
    document.getElementById('connect-discord-btn')?.addEventListener('click', () => this.connectDiscord());

    // Test Telegram button
    document.getElementById('test-telegram-btn')?.addEventListener('click', () => this.testTelegramConnection());

    // Test Discord button
    document.getElementById('test-discord-btn')?.addEventListener('click', () => this.testDiscordConnection());

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

    // Post buttons
    document.getElementById('post-x-btn')?.addEventListener('click', () => this.postOnX());
    document.getElementById('post-telegram-btn')?.addEventListener('click', () => this.postOnTelegram());
    document.getElementById('post-discord-btn')?.addEventListener('click', () => this.postOnDiscord());

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

    // Save template button
    document.getElementById('save-template-btn')?.addEventListener('click', () => {
      this.saveCaptionTemplate();
    });

    // Parameter tag click to insert
    this.setupParameterTagListeners();

    // Emoji click to insert
    this.setupEmojiListeners();

    // Load caption template on init
    this.loadCaptionTemplate();
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

  private toggleTelegramSection(): void {
    const content = document.getElementById('telegram-account-content');
    const chevron = document.querySelector('#telegram-account-toggle .chevron-icon');
    
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
        this.loadTelegramStatus();
      }
    }
  }

  private async connectTelegram(): Promise<void> {
    const botTokenInput = document.getElementById('telegram-bot-token-input') as HTMLInputElement;
    const chatIdInput = document.getElementById('telegram-chat-id-input') as HTMLInputElement;
    
    const botToken = botTokenInput?.value?.trim();
    const chatId = chatIdInput?.value?.trim();
    
    if (!botToken) {
      this.showToast('Please enter your Telegram Bot Token');
      return;
    }

    // Save to chrome storage
    chrome.storage.local.set({ 
      telegramBotToken: botToken,
      telegramChatId: chatId 
    }, () => {
      console.log('[KOLsuite] Telegram account saved');
      this.showToast('Telegram connected successfully!');
      this.updateTelegramStatus(true);
      if (botTokenInput) botTokenInput.value = '';
      if (chatIdInput) chatIdInput.value = '';
    });
  }

  private loadTelegramStatus(): void {
    chrome.storage.local.get(['telegramBotToken'], (items) => {
      if (items.telegramBotToken) {
        this.updateTelegramStatus(true);
      }
    });
  }

  private updateTelegramStatus(connected: boolean): void {
    const statusDot = document.querySelector('#telegram-status .status-dot');
    const statusText = document.querySelector('#telegram-status .status-text');
    const connectBtn = document.getElementById('connect-telegram-btn');
    
    if (connected) {
      statusDot?.classList.add('connected');
      if (statusText) {
        statusText.textContent = 'Connected';
      }
      if (connectBtn) {
        connectBtn.textContent = 'Update Token';
      }
    } else {
      statusDot?.classList.remove('connected');
      if (statusText) {
        statusText.textContent = 'Not connected';
      }
      if (connectBtn) {
        connectBtn.textContent = 'Connect Account';
      }
    }
  }

  private toggleDiscordSection(): void {
    const content = document.getElementById('discord-account-content');
    const chevron = document.querySelector('#discord-account-toggle .chevron-icon');
    
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
        this.loadDiscordStatus();
      }
    }
  }

  private async connectDiscord(): Promise<void> {
    const webhookInput = document.getElementById('discord-webhook-input') as HTMLInputElement;
    
    const webhookUrl = webhookInput?.value?.trim();
    
    if (!webhookUrl) {
      this.showToast('Please enter your Discord Webhook URL');
      return;
    }

    // Validate webhook URL format
    if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      this.showToast('Invalid Discord Webhook URL');
      return;
    }

    // Save to chrome storage
    chrome.storage.local.set({ 
      discordWebhookUrl: webhookUrl
    }, () => {
      console.log('[KOLsuite] Discord webhook saved');
      this.showToast('Discord connected successfully!');
      this.updateDiscordStatus(true);
      if (webhookInput) webhookInput.value = '';
    });
  }

  private loadDiscordStatus(): void {
    chrome.storage.local.get(['discordWebhookUrl'], (items) => {
      if (items.discordWebhookUrl) {
        this.updateDiscordStatus(true);
      }
    });
  }

  private updateDiscordStatus(connected: boolean): void {
    const statusDot = document.querySelector('#discord-status .status-dot');
    const statusText = document.querySelector('#discord-status .status-text');
    const connectBtn = document.getElementById('connect-discord-btn');
    
    if (connected) {
      statusDot?.classList.add('connected');
      if (statusText) {
        statusText.textContent = 'Connected';
      }
      if (connectBtn) {
        connectBtn.textContent = 'Update Webhook';
      }
    } else {
      statusDot?.classList.remove('connected');
      if (statusText) {
        statusText.textContent = 'Not connected';
      }
      if (connectBtn) {
        connectBtn.textContent = 'Connect Webhook';
      }
    }
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

  private toggleXAccountSection(): void {
    const content = document.getElementById('x-account-content');
    const chevron = document.querySelector('#x-account-toggle .chevron-icon');
    
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
        this.loadXAccountStatus();
      }
    }
  }

  private async connectXAccount(): Promise<void> {
    const usernameInput = document.getElementById('x-username-input') as HTMLInputElement;
    const passwordInput = document.getElementById('x-password-input') as HTMLInputElement;
    
    const username = usernameInput?.value?.trim();
    const password = passwordInput?.value?.trim();
    
    if (!username) {
      this.showToast('Please enter your X username');
      return;
    }

    // Save to chrome storage
    chrome.storage.local.set({ 
      xUsername: username,
      xPassword: password 
    }, () => {
      console.log('[KOLsuite] X account saved');
      this.showToast('X account connected successfully!');
      this.updateXAccountStatus(username);
      if (usernameInput) usernameInput.value = '';
      if (passwordInput) passwordInput.value = '';
    });
  }

  private loadXAccountStatus(): void {
    chrome.storage.local.get(['xUsername'], (items) => {
      if (items.xUsername) {
        this.updateXAccountStatus(items.xUsername);
      }
    });
  }

  private updateXAccountStatus(username: string): void {
    const statusDot = document.querySelector('.x-status-dot');
    const statusText = document.querySelector('.x-status-text');
    const connectBtn = document.getElementById('connect-x-btn');
    
    if (username) {
      statusDot?.classList.add('connected');
      if (statusText) {
        statusText.textContent = `Connected as @${username}`;
      }
      if (connectBtn) {
        connectBtn.textContent = 'Update Account';
      }
    } else {
      statusDot?.classList.remove('connected');
      if (statusText) {
        statusText.textContent = 'Not connected';
      }
      if (connectBtn) {
        connectBtn.textContent = 'Connect Account';
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

  private loadSubscriptionLimit(): void {
    // Load from storage or use default
    chrome.storage.local.get(['tokenUsed', 'tokenLimit', 'subscriptionPlan'], (items) => {
      const used = items.tokenUsed || 0;
      const limit = items.tokenLimit || 100; // Default free plan limit
      const plan = items.subscriptionPlan || 'free';
      
      this.updateSubscriptionBadge(used, limit);
      this.updateTierBadge(plan);
    });
  }

  private loadXUsername(): void {
    // Load X username from storage
    chrome.storage.local.get(['xUsername'], (items) => {
      const username = items.xUsername;
      const usernameElement = document.getElementById('username-text');
      const userProfile = document.getElementById('user-profile');
      const signInBtn = document.getElementById('sign-in-x-btn');
      
      if (username && username !== '@username') {
        // User is signed in, show profile
        if (usernameElement) {
          usernameElement.textContent = username;
        }
        if (userProfile) {
          userProfile.style.display = 'flex';
        }
        if (signInBtn) {
          signInBtn.style.display = 'none';
        }
      } else {
        // User is not signed in, show sign in button
        if (userProfile) {
          userProfile.style.display = 'none';
        }
        if (signInBtn) {
          signInBtn.style.display = 'flex';
        }
      }
    });
  }

  private saveCaptionTemplate(): void {
    const textarea = document.getElementById('caption-template') as HTMLTextAreaElement;
    if (!textarea) return;

    const template = textarea.value;
    chrome.storage.local.set({ captionTemplate: template }, () => {
      console.log('[KOLsuite] Caption template saved');
      this.showToast('Template saved!');
      
      // Close popup
      const popup = document.getElementById('caption-settings-popup');
      if (popup) popup.style.display = 'none';
    });
  }

  private loadCaptionTemplate(): void {
    chrome.storage.local.get(['captionTemplate'], (items) => {
      const template = items.captionTemplate;
      if (!template) return;

      const textarea = document.getElementById('caption-template') as HTMLTextAreaElement;
      if (textarea) {
        textarea.value = template;
      }
    });
  }

  private setupParameterTagListeners(): void {
    const paramTags = document.querySelectorAll('.param-tag');
    const textarea = document.getElementById('caption-template') as HTMLTextAreaElement;
    
    if (!textarea) return;

    paramTags.forEach(tag => {
      tag.addEventListener('click', () => {
        const param = tag.textContent || '';
        const cursorPos = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, cursorPos);
        const textAfter = textarea.value.substring(textarea.selectionEnd);
        
        // Insert parameter at cursor position
        textarea.value = textBefore + param + textAfter;
        
        // Move cursor after inserted parameter
        const newCursorPos = cursorPos + param.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      });
    });
  }

  private setupEmojiListeners(): void {
    const emojiItems = document.querySelectorAll('.emoji-item');
    const textarea = document.getElementById('caption-template') as HTMLTextAreaElement;
    
    if (!textarea) return;

    emojiItems.forEach(emoji => {
      emoji.addEventListener('click', () => {
        const emojiChar = emoji.textContent || '';
        const cursorPos = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, cursorPos);
        const textAfter = textarea.value.substring(textarea.selectionEnd);
        
        // Insert emoji at cursor position
        textarea.value = textBefore + emojiChar + textAfter;
        
        // Move cursor after inserted emoji
        const newCursorPos = cursorPos + emojiChar.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      });
    });
  }

  private updateTierBadge(plan: string): void {
    const tierText = document.getElementById('tier-text');
    const tierBadge = document.getElementById('tier-badge');
    
    if (tierText) {
      // Capitalize first letter
      tierText.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
    }

    if (tierBadge) {
      // Add premium class for premium tier
      if (plan === 'premium' || plan === 'pro') {
        tierBadge.classList.add('premium');
      } else {
        tierBadge.classList.remove('premium');
      }
    }
  }

  private updateSubscriptionBadge(used: number, limit: number): void {
    const badgeText = document.getElementById('token-limit-text');
    const badge = document.getElementById('subscription-badge');
    
    if (badgeText) {
      badgeText.textContent = `${used}/${limit}`;
    }

    // Change badge color based on usage percentage
    if (badge) {
      const percentage = (used / limit) * 100;
      
      if (percentage >= 90) {
        // Red - almost at limit
        badge.style.background = 'rgba(239, 68, 68, 0.15)';
        badge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      } else if (percentage >= 70) {
        // Orange - getting close
        badge.style.background = 'rgba(249, 115, 22, 0.15)';
        badge.style.borderColor = 'rgba(249, 115, 22, 0.3)';
      } else {
        // Default blue
        badge.style.background = 'rgba(79, 70, 229, 0.15)';
        badge.style.borderColor = 'rgba(79, 70, 229, 0.3)';
      }
    }
  }

  private incrementTokenUsage(): void {
    chrome.storage.local.get(['tokenUsed', 'tokenLimit'], (items) => {
      const used = (items.tokenUsed || 0) + 1;
      const limit = items.tokenLimit || 100;
      
      chrome.storage.local.set({ tokenUsed: used }, () => {
        this.updateSubscriptionBadge(used, limit);
        
        // Warn if approaching limit
        if (used >= limit) {
          this.showToast('⚠️ Token limit reached! Upgrade to continue.');
        } else if (used >= limit * 0.9) {
          this.showToast(`⚠️ ${limit - used} tokens remaining`);
        }
      });
    });
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
    
    // Bonding Curve
    this.updateBondingCurve(tokenInfo);
    
    // Summary
    this.updateSummary(tokenInfo);
    
    console.log('[TokenPeek Sidepanel] ✅ Token displayed!');
  }
  
  private updateElement(id: string, value: any): void {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) {
      el.textContent = value.toString();
    }
  }

  private updateBondingCurve(tokenInfo: any): void {
    // Calculate bonding curve progress (example: based on market cap or liquidity)
    const current = tokenInfo.mcap ? parseFloat(tokenInfo.mcap.replace(/[^0-9.]/g, '')) : 0;
    const target = 100; // Target in K (e.g., $100K)
    const percentage = Math.min((current / target) * 100, 100);
    
    // Update percentage display
    const percentageEl = document.getElementById('bonding-percentage');
    if (percentageEl) {
      percentageEl.textContent = `${percentage.toFixed(1)}%`;
    }
    
    // Update progress bar
    const progressBar = document.getElementById('bonding-progress-fill');
    if (progressBar) {
      (progressBar as HTMLElement).style.width = `${percentage}%`;
    }
    
    // Update current and target values
    this.updateElement('bonding-current', tokenInfo.mcap || '$0.00K');
    this.updateElement('bonding-target', '$100K');
  }

  private toggleSummary(): void {
    const header = document.getElementById('summary-toggle');
    const content = document.getElementById('summary-content');
    
    if (header && content) {
      header.classList.toggle('active');
      content.classList.toggle('expanded');
    }
  }

  private updateSummary(tokenInfo: any): void {
    // Generate simple summary text
    const name = tokenInfo.name || 'This token';
    const symbol = tokenInfo.symbol || '';
    const mcap = tokenInfo.mcap || '$0';
    const holders = tokenInfo.holders || '0';
    
    const summaryText = `${name}${symbol ? ' (' + symbol + ')' : ''} has a market cap of ${mcap} with ${holders} holders. The token shows current metrics including liquidity, volume, and holder distribution. Monitor the bonding curve progress and key indicators above for real-time updates.`;
    
    this.updateElement('summary-text', summaryText);
  }

  private async testTelegramConnection(): Promise<void> {
    const testBtn = document.getElementById('test-telegram-btn') as HTMLButtonElement;
    
    if (testBtn) {
      testBtn.disabled = true;
      testBtn.textContent = 'Testing...';
    }

    chrome.storage.local.get(['telegramBotToken', 'telegramChatId'], async (items) => {
      if (!items.telegramBotToken) {
        this.showToast('Please save Bot Token first');
        if (testBtn) {
          testBtn.disabled = false;
          testBtn.textContent = 'Test Connection';
        }
        return;
      }

      try {
        // Test getMe endpoint to verify bot token
        const response = await fetch(`https://api.telegram.org/bot${items.telegramBotToken}/getMe`);
        const data = await response.json();

        if (data.ok) {
          this.showToast(`✓ Connected to bot: @${data.result.username}`);
          
          // If chat ID is provided, try sending a test message
          if (items.telegramChatId) {
            await this.sendTelegramMessage(
              items.telegramBotToken, 
              items.telegramChatId, 
              '✓ Test message from KOLsuite'
            );
          }
        } else {
          this.showToast('✗ Invalid Bot Token');
        }
      } catch (error) {
        console.error('[KOLsuite] Test failed:', error);
        this.showToast('✗ Connection failed');
      } finally {
        if (testBtn) {
          testBtn.disabled = false;
          testBtn.textContent = 'Test Connection';
        }
      }
    });
  }

  private async testDiscordConnection(): Promise<void> {
    const testBtn = document.getElementById('test-discord-btn') as HTMLButtonElement;
    
    if (testBtn) {
      testBtn.disabled = true;
      testBtn.textContent = 'Testing...';
    }

    chrome.storage.local.get(['discordWebhookUrl'], async (items) => {
      if (!items.discordWebhookUrl) {
        this.showToast('Please save Webhook URL first');
        if (testBtn) {
          testBtn.disabled = false;
          testBtn.textContent = 'Test Connection';
        }
        return;
      }

      try {
        const response = await fetch(items.discordWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: '✓ Test message from KOLsuite'
          })
        });

        if (response.ok || response.status === 204) {
          this.showToast('✓ Discord webhook is working!');
        } else {
          this.showToast('✗ Invalid webhook URL');
        }
      } catch (error) {
        console.error('[KOLsuite] Test failed:', error);
        this.showToast('✗ Connection failed');
      } finally {
        if (testBtn) {
          testBtn.disabled = false;
          testBtn.textContent = 'Test Connection';
        }
      }
    });
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

  private postOnTelegram(): void {
    console.log('[TokenPeek] Post on Telegram clicked');
    const caption = (document.getElementById('caption-input') as HTMLTextAreaElement)?.value || '';
    
    if (!caption.trim()) {
      this.showToast('Please write a caption first!');
      return;
    }
    
    // Check if Telegram is configured
    chrome.storage.local.get(['telegramBotToken', 'telegramChatId'], (items) => {
      if (items.telegramBotToken && items.telegramChatId) {
        // Send via Telegram Bot API
        this.sendTelegramMessage(items.telegramBotToken, items.telegramChatId, caption);
      } else {
        // Fallback to share URL
        const telegramUrl = `https://t.me/share/url?text=${encodeURIComponent(caption)}`;
        window.open(telegramUrl, '_blank');
        
        if (!items.telegramBotToken) {
          this.showToast('Configure Telegram Bot in Settings for direct posting');
        }
      }
    });
  }

  private async sendTelegramMessage(botToken: string, chatId: string, message: string): Promise<void> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });

      if (response.ok) {
        this.showToast('Posted to Telegram successfully!');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('[KOLsuite] Telegram error:', error);
      this.showToast('Failed to post to Telegram');
    }
  }

  private postOnDiscord(): void {
    console.log('[TokenPeek] Post on Discord clicked');
    const caption = (document.getElementById('caption-input') as HTMLTextAreaElement)?.value || '';
    
    if (!caption.trim()) {
      this.showToast('Please write a caption first!');
      return;
    }
    
    // Check if Discord webhook is configured
    chrome.storage.local.get(['discordWebhookUrl'], (items) => {
      if (items.discordWebhookUrl) {
        // Send via Discord webhook
        this.sendDiscordMessage(items.discordWebhookUrl, caption);
      } else {
        // Copy to clipboard as fallback
        navigator.clipboard.writeText(caption).then(() => {
          this.showToast('Caption copied! Configure Discord Webhook in Settings for direct posting.');
        }).catch(() => {
          this.showToast('Failed to copy caption');
        });
      }
    });
  }

  private async sendDiscordMessage(webhookUrl: string, message: string): Promise<void> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message
        })
      });

      if (response.ok || response.status === 204) {
        this.showToast('Posted to Discord successfully!');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('[KOLsuite] Discord error:', error);
      this.showToast('Failed to post to Discord');
    }
  }

  private generateCaption(): void {
    console.log('[TokenPeek] Generate caption clicked');
    
    if (!this.tokenData) {
      this.showToast('No token data available');
      return;
    }
    
    // Increment token usage for AI generation
    this.incrementTokenUsage();
    
    // Get template from storage
    chrome.storage.local.get(['captionTemplate'], (items) => {
      let template = items.captionTemplate || `🚀 {NAME} (\${SYMBOL})\n\n💰 Price: {PRICE}\n📊 MCAP: {MCAP}\n💧 Liquidity: {LIQUIDITY}\n📈 24H Vol: {VOLUME}\n\n📍 CA: {CA}\n\n#Solana #Crypto #{SYMBOL}`;
      
      // Replace parameters with actual data
      const caption = template
        .replace(/{NAME}/g, this.tokenData.name || 'N/A')
        .replace(/{SYMBOL}/g, this.tokenData.symbol || 'N/A')
        .replace(/{PRICE}/g, this.tokenData.price || 'N/A')
        .replace(/{FEES}/g, this.tokenData.feesPaid || 'N/A')
        .replace(/{AUDIT}/g, this.tokenData.audit || 'N/A')
        .replace(/{MCAP}/g, this.tokenData.mcap || 'N/A')
        .replace(/{FDV}/g, this.tokenData.fdv || 'N/A')
        .replace(/{VOLUME}/g, this.tokenData.volume24h || 'N/A')
        .replace(/{LIQUIDITY}/g, this.tokenData.liquidity || 'N/A')
        .replace(/{5M}/g, this.tokenData.change5m || 'N/A')
        .replace(/{1H}/g, this.tokenData.change1h || 'N/A')
        .replace(/{6H}/g, this.tokenData.change6h || 'N/A')
        .replace(/{24H}/g, this.tokenData.change24h || 'N/A')
        .replace(/{BUNDLED}/g, this.tokenData.bundled || 'N/A')
        .replace(/{SNIPED}/g, this.tokenData.sniped || 'N/A')
        .replace(/{DEVHOLD}/g, this.tokenData.devHoldings || 'N/A')
        .replace(/{INSIDERS}/g, this.tokenData.insiders || 'N/A')
        .replace(/{TOP10}/g, this.tokenData.top10Holders || 'N/A')
        .replace(/{HOLDERS}/g, this.tokenData.holders || 'N/A')
        .replace(/{CA}/g, this.tokenData.mint || 'N/A');
      
      const textarea = document.getElementById('caption-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.value = caption;
        this.updatePreview(caption);
        this.showToast('Caption generated!');
      }
    });
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
