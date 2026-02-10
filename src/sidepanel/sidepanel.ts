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
    this.setupMainTabListeners();
    this.loadTokenData();
    this.setupTabListeners();
    this.loadSubscriptionLimit();
    this.loadXUsername();
    
    // Setup Twitter feed functionality
    this.setupTwitterFeed();
  }

  private setupMainTabListeners(): void {
    const kolBtn = document.getElementById('main-tab-kol');
    const signalBtn = document.getElementById('main-tab-signal');
    kolBtn?.addEventListener('click', () => this.switchMainTab('kol'));
    signalBtn?.addEventListener('click', () => this.switchMainTab('signal'));
  }

  private switchMainTab(tab: 'kol' | 'signal'): void {
    const kolPane = document.getElementById('main-kol-pane');
    const signalPane = document.getElementById('main-signal-pane');
    const footer = document.querySelector('.sticky-footer');
    document.querySelectorAll('.main-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-main-tab="${tab}"]`);
    activeBtn?.classList.add('active');
    if (tab === 'kol') {
      kolPane?.classList.add('active');
      signalPane?.classList.remove('active');
      if (footer instanceof HTMLElement) footer.style.display = '';
    } else {
      kolPane?.classList.remove('active');
      signalPane?.classList.add('active');
      if (footer instanceof HTMLElement) footer.style.display = 'none';
    }
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

    // Summary toggle
    document.getElementById('summary-toggle')?.addEventListener('click', () => this.toggleSummary());

    // Back button in settings
    document.getElementById('back-btn')?.addEventListener('click', () => this.closeSettings());

    // Tab buttons with explicit debugging
    document.getElementById('details-tab-btn')?.addEventListener('click', () => {
      console.log('[KOLsuite] Details tab clicked');
      this.switchTab('details');
    });
    
    document.getElementById('tweet-tab-btn')?.addEventListener('click', () => {
      console.log('[KOLsuite] Tweet tab clicked');
      this.switchTab('tweet');
    });

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

    // Discord auto-call toggle
    document.getElementById('discord-auto-call')?.addEventListener('change', () => this.saveDiscordAutoCall());

    // Discord template input
    document.getElementById('discord-template-input')?.addEventListener('blur', () => this.saveDiscordTemplate());

    // Quick Discord call button
    document.getElementById('quick-discord-call-btn')?.addEventListener('click', () => this.quickDiscordCall());

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
    document.getElementById('wallet-dev-row')?.addEventListener('click', () => this.copyWalletDev());

    // Retry/Refresh buttons
    document.getElementById('refresh-btn')?.addEventListener('click', () => this.loadTokenData());
    document.getElementById('retry-btn')?.addEventListener('click', () => this.loadTokenData());

    // Post buttons
    document.getElementById('post-x-btn')?.addEventListener('click', () => this.postOnX());
    document.getElementById('post-telegram-btn')?.addEventListener('click', () => this.postOnTelegram());
    document.getElementById('post-discord-btn')?.addEventListener('click', () => this.postOnDiscord());

    // Generate button
    document.querySelector('.generate-btn-float')?.addEventListener('click', () => this.generateCaption());

    // Upload button - image upload functionality
    document.getElementById('upload-btn')?.addEventListener('click', () => this.openImageUpload());

    // Profile Navigation Tabs
    document.querySelectorAll('.profile-nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tabName = target.dataset.tab;
        if (tabName) {
          this.switchProfileTab(tabName);
        }
      });
    });

    // Tweet compose functionality
    this.setupTweetComposer();
    document.getElementById('image-upload')?.addEventListener('change', (e) => this.handleImageUpload(e));
    document.getElementById('remove-image-btn')?.addEventListener('click', () => this.removeImage());

    // Emoji picker
    document.getElementById('emoji-btn')?.addEventListener('click', () => this.toggleEmojiPicker());
    document.addEventListener('click', (e) => this.handleEmojiPickerClick(e));

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

    // Tab switching
    this.setupTabSwitching();
    
    // Profile tabs functionality
    this.setupProfileTabs();

    // Tweet functionality
    this.setupTweetFunctionality();

    // Load caption template on init
    this.loadCaptionTemplate();
    this.loadDiscordTemplate();
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
      this.saveDiscordAutoCall(); // Save auto-call setting
    });
  }

  private loadDiscordStatus(): void {
    chrome.storage.local.get(['discordWebhookUrl', 'discordAutoCall', 'discordTemplate'], (items) => {
      if (items.discordWebhookUrl) {
        this.updateDiscordStatus(true);
      }
      
      // Load auto-call setting
      const autoCallCheckbox = document.getElementById('discord-auto-call') as HTMLInputElement;
      if (autoCallCheckbox) {
        autoCallCheckbox.checked = items.discordAutoCall || false;
      }
      
      // Load Discord template
      this.loadDiscordTemplate();
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

  private saveDiscordAutoCall(): void {
    const autoCallCheckbox = document.getElementById('discord-auto-call') as HTMLInputElement;
    if (autoCallCheckbox) {
      chrome.storage.local.set({
        discordAutoCall: autoCallCheckbox.checked
      }, () => {
        console.log('[KOLsuite] Discord auto-call setting saved:', autoCallCheckbox.checked);
      });
    }
  }

  private saveDiscordTemplate(): void {
    const templateInput = document.getElementById('discord-template-input') as HTMLTextAreaElement;
    if (templateInput) {
      const template = templateInput.value || this.getDefaultDiscordTemplate();
      chrome.storage.local.set({
        discordTemplate: template
      }, () => {
        console.log('[KOLsuite] Discord template saved');
      });
    }
  }

  private loadDiscordTemplate(): void {
    chrome.storage.local.get(['discordTemplate'], (items) => {
      const templateInput = document.getElementById('discord-template-input') as HTMLTextAreaElement;
      if (templateInput) {
        const template = items.discordTemplate || this.getDefaultDiscordTemplate();
        templateInput.value = template;
      }
    });
  }

  private getDefaultDiscordTemplate(): string {
    return `🚀 {NAME} (\${SYMBOL})

💰 Price: {PRICE}
📊 MCAP: {MCAP}
💧 Liquidity: {LIQUIDITY}
📈 24H Vol: {VOLUME}

📍 CA: {CA}

#Solana #Crypto #{SYMBOL}`;
  }

  private processDiscordTemplate(template: string, tokenData: any): string {
    if (!tokenData) return template;

    return template
      .replace(/{NAME}/g, tokenData.name || 'N/A')
      .replace(/{SYMBOL}/g, tokenData.symbol || 'N/A')
      .replace(/{PRICE}/g, tokenData.price || 'N/A')
      .replace(/{FEES}/g, tokenData.feesPaid || 'N/A')
      .replace(/{AUDIT}/g, tokenData.audit || 'N/A')
      .replace(/{MCAP}/g, tokenData.mcap || 'N/A')
      .replace(/{FDV}/g, tokenData.fdv || 'N/A')
      .replace(/{VOLUME}/g, tokenData.volume24h || 'N/A')
      .replace(/{LIQUIDITY}/g, tokenData.liquidity || 'N/A')
      .replace(/{5M}/g, tokenData.change5m || 'N/A')
      .replace(/{1H}/g, tokenData.change1h || 'N/A')
      .replace(/{6H}/g, tokenData.change6h || 'N/A')
      .replace(/{24H}/g, tokenData.change24h || 'N/A')
      .replace(/{BUNDLED}/g, tokenData.bundled || 'N/A')
      .replace(/{SNIPED}/g, tokenData.sniped || 'N/A')
      .replace(/{DEVHOLD}/g, tokenData.devHoldings || 'N/A')
      .replace(/{INSIDERS}/g, tokenData.insiders || 'N/A')
      .replace(/{TOP10}/g, tokenData.top10Holders || 'N/A')
      .replace(/{HOLDERS}/g, tokenData.holders || 'N/A')
      .replace(/{CA}/g, tokenData.mint || 'N/A');
  }

  private async quickDiscordCall(): Promise<void> {
    if (!this.tokenData) {
      this.showToast('No token data available for call');
      return;
    }

    chrome.storage.local.get(['discordWebhookUrl', 'discordTemplate'], async (items) => {
      if (!items.discordWebhookUrl) {
        this.showToast('Configure Discord Webhook in Settings first');
        return;
      }

      const template = items.discordTemplate || this.getDefaultDiscordTemplate();
      const quickCallMessage = `🚀 **QUICK CALL** 🚀\n\n` + this.processDiscordTemplate(template, this.tokenData);

      try {
        const quickCallBtn = document.getElementById('quick-discord-call-btn') as HTMLButtonElement;
        if (quickCallBtn) {
          quickCallBtn.disabled = true;
          quickCallBtn.style.opacity = '0.6';
        }

        await this.sendDiscordMessage(items.discordWebhookUrl, quickCallMessage, this.tokenData);
        console.log('[KOLsuite] Quick call sent to Discord');
        this.showToast('🚀 Token call sent to Discord!');
      } catch (error) {
        console.error('[KOLsuite] Quick call failed:', error);
        this.showToast('Failed to send Discord call');
      } finally {
        const quickCallBtn = document.getElementById('quick-discord-call-btn') as HTMLButtonElement;
        if (quickCallBtn) {
          quickCallBtn.disabled = false;
          quickCallBtn.style.opacity = '1';
        }
      }
    });
  }

  private async sendAutoTokenCall(tokenData: any): Promise<void> {
    chrome.storage.local.get(['discordWebhookUrl', 'discordAutoCall', 'discordTemplate'], async (items) => {
      if (items.discordWebhookUrl && items.discordAutoCall && tokenData) {
        const template = items.discordTemplate || this.getDefaultDiscordTemplate();
        const autoCallMessage = `🚨 **AUTO-CALL** 🚨\n\n` + this.processDiscordTemplate(template, tokenData);
        
        try {
          await this.sendDiscordMessage(items.discordWebhookUrl, autoCallMessage, tokenData);
          console.log('[KOLsuite] Auto-call sent to Discord');
        } catch (error) {
          console.error('[KOLsuite] Failed to send auto-call:', error);
        }
      }
    });
  }

  private toggleEmojiPicker(): void {
    const emojiPicker = document.getElementById('emoji-picker');
    if (emojiPicker) {
      const isVisible = emojiPicker.style.display !== 'none';
      emojiPicker.style.display = isVisible ? 'none' : 'block';
    }
  }

  private handleEmojiPickerClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Close emoji picker if clicked outside (only for main floating emoji picker)
    if (!target.closest('#emoji-picker') && !target.closest('#emoji-btn') && !target.closest('#caption-settings-popup')) {
      const emojiPicker = document.getElementById('emoji-picker');
      if (emojiPicker) {
        emojiPicker.style.display = 'none';
      }
    }
    
    // Add emoji to caption if emoji item clicked (main floating picker)
    if (target.classList.contains('emoji-item') && target.closest('#emoji-picker')) {
      const emoji = target.getAttribute('data-emoji');
      if (emoji) {
        this.addEmojiToCaption(emoji);
      }
    }
    
    // Add emoji to template if emoji item clicked within popup
    if (target.classList.contains('emoji-item') && target.closest('#caption-settings-popup')) {
      const emoji = target.getAttribute('data-emoji');
      if (emoji) {
        this.addEmojiToTemplate(emoji);
      }
    }
  }

  private addEmojiToTemplate(emoji: string): void {
    const textarea = document.getElementById('caption-template') as HTMLTextAreaElement;
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const textBefore = textarea.value.substring(0, cursorPos);
      const textAfter = textarea.value.substring(textarea.selectionEnd);
      
      textarea.value = textBefore + emoji + textAfter;
      textarea.focus();
      textarea.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
    }
  }

  private addEmojiToCaption(emoji: string): void {
    const captionInput = document.getElementById('caption-input') as HTMLTextAreaElement;
    if (captionInput) {
      const cursorPos = captionInput.selectionStart;
      const textBefore = captionInput.value.substring(0, cursorPos);
      const textAfter = captionInput.value.substring(captionInput.selectionEnd);
      
      captionInput.value = textBefore + emoji + textAfter;
      captionInput.focus();
      captionInput.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
      
      // Hide emoji picker after selection
      const emojiPicker = document.getElementById('emoji-picker');
      if (emojiPicker) {
        emojiPicker.style.display = 'none';
      }
    }
  }

  private openImageUpload(): void {
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  private handleImageUpload(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        this.showImagePreview(imageSrc);
      };
      reader.readAsDataURL(file);
    } else {
      this.showToast('Please select a valid image file');
    }
  }

  private showImagePreview(imageSrc: string): void {
    const previewArea = document.getElementById('image-preview-area');
    const previewImage = document.getElementById('preview-image') as HTMLImageElement;
    
    if (previewArea && previewImage) {
      previewImage.src = imageSrc;
      previewArea.style.display = 'block';
    }
  }

  private removeImage(): void {
    const previewArea = document.getElementById('image-preview-area');
    const previewImage = document.getElementById('preview-image') as HTMLImageElement;
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    
    if (previewArea) {
      previewArea.style.display = 'none';
    }
    if (previewImage) {
      previewImage.src = '';
    }
    if (fileInput) {
      fileInput.value = '';
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

  private async copyWalletDev(): Promise<void> {
    const full = document.getElementById('wallet-dev-short')?.getAttribute('data-full-address');
    const addr = full || this.tokenData?.devWallet || this.tokenData?.creator || this.tokenData?.updateAuthority;
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
      this.showToast('Wallet Dev copied!');
    } catch (err) {
      console.error('[KOLsuite] Failed to copy wallet dev:', err);
    }
  }

  private showToast(message: string, title: string = 'KOLsuite'): void {
    const toast = document.createElement('div');
    toast.className = 'kolsuite-toast';
    const titleEl = document.createElement('div');
    titleEl.className = 'kolsuite-toast-title';
    titleEl.textContent = title;
    const messageEl = document.createElement('div');
    messageEl.className = 'kolsuite-toast-message';
    messageEl.textContent = message;
    toast.appendChild(titleEl);
    toast.appendChild(messageEl);
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('kolsuite-toast-visible'));
    setTimeout(() => {
      toast.classList.remove('kolsuite-toast-visible');
      toast.classList.add('kolsuite-toast-out');
      setTimeout(() => toast.remove(), 320);
    }, 2500);
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

  private setupTabSwitching(): void {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        if (tabName) {
          this.switchTab(tabName);
        }
      });
    });
  }

  private switchTab(tabName: string): void {
    console.log(`[KOLsuite] Switching to tab: ${tabName}`);
    
    // Remove all existing tab classes from body
    document.body.className = document.body.className.replace(/\btab-\w+/g, '');
    
    // Add the appropriate tab class to body for CSS targeting
    if (tabName === 'details') {
      document.body.classList.add('tab-details');
    } else if (tabName === 'tweet') {
      document.body.classList.add('tab-tweets');
    }
    
    // Remove active class from all tabs and contents
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    // Add active class to clicked tab and its content
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(`${tabName}-tab-content`);
    
    if (activeTab) {
      activeTab.classList.add('active');
      console.log('[KOLsuite] Activated tab:', tabName);
    }
    
    if (activeContent) {
      activeContent.classList.add('active');
      console.log('[KOLsuite] Activated content:', `${tabName}-tab-content`);
      
      // Load profile data only when tweet tab is activated
      if (tabName === 'tweet') {
        this.loadProfileData();
      }
    } else {
      console.error('[KOLsuite] Content not found:', `${tabName}-tab-content`);
    }
  }

  private setupProfileTabs(): void {
    const profileTabButtons = document.querySelectorAll('.profile-tabs .tab-btn');
    
    profileTabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        if (tabName) {
          this.switchProfileTab(tabName);
        }
      });
    });

    // Setup Twitter feed refresh
    const refreshBtn = document.getElementById('refresh-feed-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshTwitterFeed());
    }

    // Setup search functionality
    const searchInput = document.getElementById('tweet-search') as HTMLInputElement;
    const clearSearchBtn = document.getElementById('clear-search');
    
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value;
        this.handleSearchInput(query);
      });
    }
    
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          this.handleSearchInput('');
        }
      });
    }

    // Setup filter dropdown
    const filterSelect = document.getElementById('feed-filter') as HTMLSelectElement;
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        const filter = (e.target as HTMLSelectElement).value;
        this.handleFeedFilter(filter);
      });
    }

    // Setup retry buttons
    const retryFeedBtn = document.getElementById('retry-feed-btn');
    const retryErrorBtn = document.getElementById('retry-error-btn');
    
    if (retryFeedBtn) {
      retryFeedBtn.addEventListener('click', () => this.refreshTwitterFeed());
    }
    
    if (retryErrorBtn) {
      retryErrorBtn.addEventListener('click', () => this.refreshTwitterFeed());
    }

    // Setup follower filters
    const followerFilters = document.querySelectorAll('.followers-filters .filter-btn');
    followerFilters.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');
        if (filter) {
          this.filterFollowers(filter);
        }
      });
    });
  }



  private loadProfileTabData(tabName: string): void {
    switch (tabName) {
      case 'timeline':
        this.refreshTwitterFeed();
        break;
      case 'followers':
        this.loadVerifiedFollowers();
        break;
      case 'account':
        this.loadAccountInfo();
        break;
    }
  }

  private handleSearchInput(query: string): void {
    const clearBtn = document.getElementById('clear-search');
    if (clearBtn) {
      clearBtn.style.display = query.length > 0 ? 'block' : 'none';
    }
    
    // Implement real-time search filtering
    this.filterTweetsBySearch(query);
  }

  private handleFeedFilter(filter: string): void {
    // Implement feed filtering by type
    this.filterTweetsByType(filter);
  }

  private filterTweetsBySearch(query: string): void {
    const tweetCards = document.querySelectorAll('.tweet-card');
    const lowerQuery = query.toLowerCase();
    
    tweetCards.forEach(card => {
      const content = card.textContent?.toLowerCase() || '';
      const shouldShow = query === '' || content.includes(lowerQuery);
      (card as HTMLElement).style.display = shouldShow ? 'block' : 'none';
    });
  }

  private filterTweetsByType(filter: string): void {
    const tweetCards = document.querySelectorAll('.tweet-card');
    
    tweetCards.forEach(card => {
      let shouldShow = true;
      
      switch (filter) {
        case 'official':
          shouldShow = card.classList.contains('official');
          break;
        case 'mentions':
          shouldShow = card.textContent?.includes('@') || false;
          break;
        case 'latest':
          // Would need timestamp sorting logic
          shouldShow = true;
          break;
        case 'top':
          // Would need engagement sorting logic
          shouldShow = true;
          break;
        default:
          shouldShow = true;
      }
      
      (card as HTMLElement).style.display = shouldShow ? 'block' : 'none';
    });
  }

  private filterFollowers(filter: string): void {
    // Remove active class from all filter buttons
    document.querySelectorAll('.followers-filters .filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active class to clicked filter
    const activeFilter = document.querySelector(`.followers-filters .filter-btn[data-filter="${filter}"]`);
    if (activeFilter) {
      activeFilter.classList.add('active');
    }
    
    // Implement follower filtering logic
    this.loadVerifiedFollowers(filter);
  }

  private async loadVerifiedFollowers(filter: string = 'all'): Promise<void> {
    const followersList = document.getElementById('followers-list');
    if (!followersList) return;
    
    // Show loading state
    followersList.innerHTML = `
      <div class="follower-loading">
        <div class="loading-spinner"></div>
        <span>Loading verified followers...</span>
      </div>
    `;
    
    try {
      // This would call your API to get verified followers
      // const followers = await this.fetchVerifiedFollowers(filter);
      
      // For now, show empty state
      setTimeout(() => {
        followersList.innerHTML = `
          <div style="text-align: center; padding: 32px; color: var(--text-muted);">
            <p>No verified followers data available</p>
            <p style="font-size: 12px; margin-top: 8px;">Connect Twitter integration to view followers</p>
          </div>
        `;
      }, 1500);
      
    } catch (error) {
      console.error('Error loading verified followers:', error);
      followersList.innerHTML = `
        <div style="text-align: center; padding: 32px; color: var(--text-red);">
          <p>Failed to load followers</p>
          <button onclick="this.loadVerifiedFollowers('${filter}')" style="margin-top: 8px; padding: 6px 12px; background: var(--primary); color: white; border: none; border-radius: 4px;">Retry</button>
        </div>
      `;
    }
  }

  private async loadAccountInfo(): Promise<void> {
    // Update account info elements
    this.updateAccountElement('account-created', 'Loading...');
    this.updateAccountElement('account-age', 'Loading...');
    this.updateAccountElement('account-status', 'Loading...');
    this.updateAccountElement('total-tweets', 'Loading...');
    this.updateAccountElement('daily-average', 'Loading...');
    this.updateAccountElement('last-active', 'Loading...');
    this.updateAccountElement('verification-date', 'Loading...');
    this.updateAccountElement('verification-type', 'Loading...');
    this.updateAccountElement('badge-status', 'Loading...');
    
    try {
      // This would call your API to get account information
      // const accountInfo = await this.fetchAccountInfo();
      
      // For now, show placeholder data
      setTimeout(() => {
        this.updateAccountElement('account-created', 'No data');
        this.updateAccountElement('account-age', 'No data');
        this.updateAccountElement('account-status', 'No data');
        this.updateAccountElement('total-tweets', 'No data');
        this.updateAccountElement('daily-average', 'No data');
        this.updateAccountElement('last-active', 'No data');
        this.updateAccountElement('verification-date', 'No data');
        this.updateAccountElement('verification-type', 'No data');
        this.updateAccountElement('badge-status', 'No data');
      }, 1500);
      
    } catch (error) {
      console.error('Error loading account info:', error);
      // Update with error state
      this.updateAccountElement('account-created', 'Error');
      this.updateAccountElement('account-age', 'Error');
      this.updateAccountElement('account-status', 'Error');
    }
  }

  private updateAccountElement(elementId: string, value: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }

  private loadProfileData(): void {
    console.log('[KOLsuite] Loading profile data for tweet tab');
    
    // Update profile header with token data
    const profileAvatar = document.getElementById('profile-avatar') as HTMLImageElement;
    const profileName = document.getElementById('profile-name');
    const profileHandle = document.getElementById('profile-handle');
    const profileBio = document.getElementById('profile-bio');
    const profileFollowing = document.getElementById('profile-following');
    const profileFollowers = document.getElementById('profile-followers');
    const profileTweets = document.getElementById('profile-tweets');
    
    if (this.tokenData) {
      if (profileName) {
        profileName.textContent = this.tokenData.token_name || 'Unknown Token';
      }
      
      if (profileHandle) {
        profileHandle.textContent = `@${this.tokenData.symbol || 'unknown'}`;
      }
      
      if (profileBio) {
        profileBio.textContent = this.tokenData.description || 'Loading profile information...';
      }
      
      if (profileAvatar && this.tokenData.logo_uri) {
        profileAvatar.src = this.tokenData.logo_uri;
        profileAvatar.alt = this.tokenData.token_name || 'Token Logo';
      }
      
      // Set placeholder data for stats (would be fetched from Twitter API)
      if (profileFollowing) profileFollowing.textContent = '-';
      if (profileFollowers) profileFollowers.textContent = '-';
      if (profileTweets) profileTweets.textContent = '-';
    }
  }

  private setupTweetFunctionality(): void {
    // Tweet textarea character counter
    const tweetTextarea = document.getElementById('tweet-input') as HTMLTextAreaElement;
    const charCount = document.getElementById('tweet-char-count');
    
    if (tweetTextarea && charCount) {
      tweetTextarea.addEventListener('input', () => {
        const length = tweetTextarea.value.length;
        charCount.textContent = `${length}/280`;
        
        // Update styling based on character count
        charCount.classList.remove('warning', 'error');
        if (length > 260) {
          charCount.classList.add('error');
        } else if (length > 240) {
          charCount.classList.add('warning');
        }
        
        // Enable/disable tweet button
        const tweetBtn = document.getElementById('tweet-post-btn') as HTMLButtonElement;
        if (tweetBtn) {
          tweetBtn.disabled = length === 0 || length > 280;
        }
      });
    }

    // Tweet template buttons
    document.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        const templateType = card.getAttribute('data-template');
        if (templateType) {
          this.applyTweetTemplate(templateType);
        }
      });
    });

    // Tweet controls
    document.getElementById('tweet-emoji-btn')?.addEventListener('click', () => {
      this.toggleTweetEmojiPicker();
    });

    document.getElementById('tweet-hashtag-btn')?.addEventListener('click', () => {
      this.addTweetHashtags();
    });

    // Tweet post button
    document.getElementById('tweet-post-btn')?.addEventListener('click', () => {
      const textarea = document.getElementById('tweet-input') as HTMLTextAreaElement;
      if (textarea && textarea.value.trim()) {
        this.postTweet(textarea.value.trim());
      }
    });

    // Twitter feed functionality
    this.setupTwitterFeed();
  }

  private setupTwitterFeed(): void {
    // Tweet tabs functionality
    this.setupTweetTabs();
    
    // Feed filter dropdown
    const feedFilter = document.getElementById('feed-filter') as HTMLSelectElement;
    if (feedFilter) {
      feedFilter.addEventListener('change', () => {
        this.filterTweetFeed(feedFilter.value);
      });
    }

    // Refresh feed button
    document.getElementById('refresh-feed-btn')?.addEventListener('click', () => {
      this.refreshTwitterFeed();
    });

    // Retry buttons
    document.getElementById('retry-feed-btn')?.addEventListener('click', () => {
      this.refreshTwitterFeed();
    });
    
    document.getElementById('retry-error-btn')?.addEventListener('click', () => {
      this.refreshTwitterFeed();
    });

    // Search functionality
    const searchInput = document.getElementById('tweet-search') as HTMLInputElement;
    const clearSearch = document.getElementById('clear-search');
    
    if (searchInput && clearSearch) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (query) {
          clearSearch.style.display = 'block';
          this.searchTweets(query);
        } else {
          clearSearch.style.display = 'none';
          this.showAllTweets();
        }
      });

      clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        clearSearch.style.display = 'none';
        this.showAllTweets();
      });
    }

    // Initial feed load
    setTimeout(() => {
      this.refreshTwitterFeed();
    }, 100);
  }

  private setupTweetTabs(): void {
    const latestTweetsTab = document.getElementById('latest-tweets-tab');
    const profileTab = document.getElementById('profile-tab');
    const latestTweetsContent = document.getElementById('latest-tweets-content');
    const profileContent = document.getElementById('profile-content');

    if (!latestTweetsTab || !profileTab || !latestTweetsContent || !profileContent) {
      return;
    }

    // Latest Tweets tab click
    latestTweetsTab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      document.querySelectorAll('.tweet-tab-btn').forEach(tab => tab.classList.remove('active'));
      document.querySelectorAll('.tweet-tab-content').forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      latestTweetsTab.classList.add('active');
      latestTweetsContent.classList.add('active');
      latestTweetsContent.style.display = 'block';
      profileContent.style.display = 'none';
    });

    // Profile tab click
    profileTab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      document.querySelectorAll('.tweet-tab-btn').forEach(tab => tab.classList.remove('active'));
      document.querySelectorAll('.tweet-tab-content').forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      profileTab.classList.add('active');
      profileContent.classList.add('active');
      profileContent.style.display = 'block';
      latestTweetsContent.style.display = 'none';
    });

    // Setup profile sub-tabs
    this.setupProfileSubTabs();
    
    // Setup profile action buttons
    this.setupProfileActions();
  }

  private setupProfileSubTabs(): void {
    const followingTab = document.getElementById('following-tab');
    const followersTab = document.getElementById('followers-tab');
    const followingContent = document.getElementById('following-content');
    const followersContent = document.getElementById('followers-content');

    if (!followingTab || !followersTab || !followingContent || !followersContent) {
      return;
    }

    // Following tab click
    followingTab.addEventListener('click', () => {
      document.querySelectorAll('.profile-tab-btn').forEach(tab => tab.classList.remove('active'));
      document.querySelectorAll('.profile-sub-content').forEach(content => {
        content.classList.remove('active');
        (content as HTMLElement).style.display = 'none';
      });
      
      followingTab.classList.add('active');
      followingContent.classList.add('active');
      followingContent.style.display = 'block';
    });

    // Followers tab click
    followersTab.addEventListener('click', () => {
      document.querySelectorAll('.profile-tab-btn').forEach(tab => tab.classList.remove('active'));
      document.querySelectorAll('.profile-sub-content').forEach(content => {
        content.classList.remove('active');
        (content as HTMLElement).style.display = 'none';
      });
      
      followersTab.classList.add('active');
      followersContent.classList.add('active');
      followersContent.style.display = 'block';
    });

    // Setup following filters
    this.setupFollowingFilters();
  }

  private setupFollowingFilters(): void {
    const allBtn = document.getElementById('all-following');
    const verifiedBtn = document.getElementById('verified-following');

    if (!allBtn || !verifiedBtn) return;

    allBtn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      allBtn.classList.add('active');
      this.filterFollowing('all');
    });

    verifiedBtn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      verifiedBtn.classList.add('active');
      this.filterFollowing('verified');
    });
  }

  private setupProfileActions(): void {
    const postBtn = document.getElementById('post-btn');
    const replayBtn = document.getElementById('replay-btn');
    const verifiedBtn = document.getElementById('verified-btn');
    const followerBtn = document.getElementById('follower-btn');

    if (!postBtn || !replayBtn || !verifiedBtn || !followerBtn) return;

    // Post button click
    postBtn.addEventListener('click', () => {
      this.switchProfileAction('post');
    });

    // Replay button click
    replayBtn.addEventListener('click', () => {
      this.switchProfileAction('replay');
    });

    // Verified button click
    verifiedBtn.addEventListener('click', () => {
      this.switchProfileAction('verified');
    });

    // Follower button click
    followerBtn.addEventListener('click', () => {
      this.switchProfileAction('follower');
    });
  }

  private switchProfileAction(action: 'post' | 'replay' | 'verified' | 'follower'): void {
    // Remove active class from all action buttons
    document.querySelectorAll('.action-btn').forEach(btn => btn.classList.remove('active'));
    
    // Remove active class from all action contents
    document.querySelectorAll('.action-content').forEach(content => {
      content.classList.remove('active');
      (content as HTMLElement).style.display = 'none';
    });

    // Add active class to clicked button
    const activeBtn = document.getElementById(`${action}-btn`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }

    // Show corresponding content
    const activeContent = document.getElementById(`${action}-content`);
    if (activeContent) {
      activeContent.classList.add('active');
      activeContent.style.display = 'block';
    }
  }

  private filterFollowing(filterType: 'all' | 'verified'): void {
    const userItems = document.querySelectorAll('.user-item');
    
    userItems.forEach(item => {
      const hasVerified = item.querySelector('.mini-verified');
      const shouldShow = filterType === 'all' || (filterType === 'verified' && hasVerified);
      (item as HTMLElement).style.display = shouldShow ? 'flex' : 'none';
    });
  }

  private filterTweetFeed(filterType: string): void {
    const tweets = document.querySelectorAll('.tweet-card');
    
    tweets.forEach(tweet => {
      const tweetElement = tweet as HTMLElement;
      let shouldShow = false;
      
      switch (filterType) {
        case 'all':
          shouldShow = true;
          break;
        case 'official':
          shouldShow = tweet.classList.contains('official');
          break;
        case 'mentions':
          shouldShow = !tweet.classList.contains('official');
          break;
        case 'latest':
          // Show tweets with recent time indicators
          const timeText = tweet.querySelector('.tweet-time')?.textContent || '';
          shouldShow = timeText.includes('h') || timeText.includes('m');
          break;
        case 'top':
          // Show tweets with high engagement
          const likeCount = tweet.querySelector('.engagement-item.like span')?.textContent || '0';
          shouldShow = parseInt(likeCount) > 100;
          break;
      }
      
      tweetElement.style.display = shouldShow ? 'block' : 'none';
    });
    
    this.showToast(`Filtered: ${filterType}`);
  }

  private searchTweets(query: string): void {
    const tweets = document.querySelectorAll('.tweet-card');
    const lowercaseQuery = query.toLowerCase();
    
    tweets.forEach(tweet => {
      const tweetElement = tweet as HTMLElement;
      const content = tweet.querySelector('.tweet-content')?.textContent?.toLowerCase() || '';
      const author = tweet.querySelector('.author-name')?.textContent?.toLowerCase() || '';
      const handle = tweet.querySelector('.author-handle')?.textContent?.toLowerCase() || '';
      
      const shouldShow = content.includes(lowercaseQuery) || 
                        author.includes(lowercaseQuery) || 
                        handle.includes(lowercaseQuery);
      
      tweetElement.style.display = shouldShow ? 'block' : 'none';
    });
  }

  private showAllTweets(): void {
    const tweets = document.querySelectorAll('.tweet-card');
    tweets.forEach(tweet => {
      (tweet as HTMLElement).style.display = 'block';
    });
  }

  private refreshTwitterFeed(): void {
    const feedContainer = document.getElementById('tweet-feed-container');
    const loadingState = document.getElementById('feed-loading');
    const noDataState = document.getElementById('feed-no-data');
    const errorState = document.getElementById('feed-error');
    const refreshBtn = document.getElementById('refresh-feed-btn');
    
    if (!feedContainer) return;
    
    // Show loading state
    this.showFeedState('loading');
    
    if (refreshBtn) {
      refreshBtn.style.transform = 'rotate(360deg)';
      setTimeout(() => {
        refreshBtn.style.transform = '';
      }, 500);
    }
    
    // Get current token data for Twitter search
    const tokenSymbol = this.tokenData?.symbol || '';
    const tokenName = this.tokenData?.token_name || '';
    const tokenMint = this.tokenData?.mint || '';
    
    // Call Twitter API or service to get real feed data
    this.fetchTwitterFeed(tokenSymbol, tokenName, tokenMint)
      .then((tweets) => {
        if (tweets && tweets.length > 0) {
          this.renderTweets(tweets);
          this.showFeedState('data');
        } else {
          this.showFeedState('no-data');
        }
      })
      .catch((error) => {
        console.error('Failed to fetch Twitter feed:', error);
        this.showFeedState('error');
      });
  }

  private showFeedState(state: 'loading' | 'data' | 'no-data' | 'error'): void {
    const loadingState = document.getElementById('feed-loading');
    const noDataState = document.getElementById('feed-no-data');
    const errorState = document.getElementById('feed-error');
    const loadingMore = document.getElementById('loading-more');
    
    // Hide all states first
    if (loadingState) loadingState.style.display = 'none';
    if (noDataState) noDataState.style.display = 'none';
    if (errorState) errorState.style.display = 'none';
    if (loadingMore) loadingMore.style.display = 'none';
    
    // Hide existing tweet cards
    const tweetCards = document.querySelectorAll('.tweet-card');
    tweetCards.forEach(card => (card as HTMLElement).style.display = 'none');
    
    // Show appropriate state
    switch (state) {
      case 'loading':
        if (loadingState) loadingState.style.display = 'flex';
        break;
      case 'no-data':
        if (noDataState) noDataState.style.display = 'flex';
        break;
      case 'error':
        if (errorState) errorState.style.display = 'flex';
        break;
      case 'data':
        // Show existing tweet cards
        tweetCards.forEach(card => (card as HTMLElement).style.display = 'block');
        break;
    }
  }

  private async fetchTwitterFeed(tokenSymbol: string, tokenName: string, tokenMint: string): Promise<any[]> {
    // This would be implemented to call actual Twitter API or your backend service
    // For now, we'll return empty to show no-data state
    
    try {
      // Example: Call your backend service that fetches Twitter data
      // const response = await fetch(`/api/twitter/feed?symbol=${tokenSymbol}&mint=${tokenMint}`);
      // const data = await response.json();
      // return data.tweets || [];
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Return empty array to trigger no-data state (real implementation needed)
      return [];
      
    } catch (error) {
      console.error('Error fetching Twitter feed:', error);
      throw error;
    }
  }

  private renderTweets(tweets: any[]): void {
    const feedContainer = document.getElementById('tweet-feed-container');
    if (!feedContainer) return;
    
    // Clear existing tweets (except state elements)
    const existingTweets = feedContainer.querySelectorAll('.tweet-card');
    existingTweets.forEach(tweet => tweet.remove());
    
    // Render new tweets
    tweets.forEach((tweet, index) => {
      const tweetElement = this.createTweetElement(tweet);
      // Insert before loading/error states
      const loadingMore = document.getElementById('loading-more');
      if (loadingMore) {
        feedContainer.insertBefore(tweetElement, loadingMore);
      } else {
        feedContainer.appendChild(tweetElement);
      }
    });
  }

  private createTweetElement(tweetData: any): HTMLElement {
    const tweetCard = document.createElement('div');
    tweetCard.className = 'tweet-card';
    if (tweetData.verified) {
      tweetCard.classList.add('official');
    }
    
    tweetCard.innerHTML = `
      <div class="tweet-header">
        <div class="tweet-avatar">
          <img src="${tweetData.author_avatar || ''}" alt="${tweetData.author_name}" class="avatar-img">
        </div>
        <div class="tweet-info">
          <div class="tweet-author">
            <span class="author-name">${tweetData.author_name || 'Unknown'}</span>
            ${tweetData.verified ? `
              <svg class="verified-badge" width="16" height="16" fill="#1DA1F2" viewBox="0 0 24 24">
                <path d="M22.46 6c-.85.38-1.78.64-2.75.76 1-.6 1.76-1.55 2.12-2.68-.93.55-1.96.95-3.06 1.18-.88-.94-2.13-1.53-3.51-1.53-2.66 0-4.81 2.16-4.81 4.81 0 .38.04.75.13 1.1-4-.2-7.55-2.12-9.92-5.04-.42.72-.66 1.55-.66 2.44 0 1.67.85 3.14 2.14 3.9-.79-.03-1.53-.24-2.18-.6v.06c0 2.33 1.66 4.27 3.86 4.72-.4.11-.83.17-1.27.17-.31 0-.62-.03-.92-.08.62 1.94 2.42 3.35 4.55 3.39-1.67 1.31-3.77 2.09-6.05 2.09-.39 0-.78-.02-1.17-.07 2.18 1.4 4.77 2.22 7.55 2.22 9.06 0 14.01-7.5 14.01-14.01 0-.21 0-.42-.01-.63.96-.69 1.8-1.56 2.46-2.55z"/>
              </svg>
            ` : ''}
            <span class="author-handle">@${tweetData.author_handle || 'unknown'}</span>
          </div>
          <div class="tweet-time">${this.formatTimeAgo(tweetData.created_at)}</div>
        </div>
      </div>
      <div class="tweet-content">
        <p>${this.formatTweetContent(tweetData.text || '')}</p>
      </div>
      <div class="tweet-engagement">
        <div class="engagement-item">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.046 2.242l-4.148-.01h-.002c-4.374 0-7.8 3.427-7.8 7.802 0 4.098 3.186 7.206 7.465 7.37v3.828c0 .108.044.286.12.403.142.225.384.347.632.347.138 0 .277-.038.402-.118.264-.168 6.473-4.14 8.088-5.506 1.902-1.61 3.04-3.97 3.043-6.312v-.017c-.006-4.367-3.43-7.787-7.8-7.788zm3.787 12.972c-1.134.96-4.862 3.405-6.772 4.643V16.67c0-.414-.335-.75-.75-.75h-.396c-3.66 0-6.318-2.476-6.318-5.886 0-3.534 2.768-6.302 6.3-6.302l4.147.01h.002c3.532 0 6.3 2.766 6.302 6.296-.003 1.91-.942 3.844-2.514 5.176z"/>
          </svg>
          <span>${this.formatNumber(tweetData.reply_count || 0)}</span>
        </div>
        <div class="engagement-item">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.061 0s-.293.768 0 1.061l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767.001-1.06z"/>
          </svg>
          <span>${this.formatNumber(tweetData.retweet_count || 0)}</span>
        </div>
        <div class="engagement-item like">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12z"/>
          </svg>
          <span>${this.formatNumber(tweetData.favorite_count || 0)}</span>
        </div>
        <div class="engagement-item">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.53 7.47l-5-5c-.293-.293-.768-.293-1.06 0l-5 5c-.294.293-.294.768 0 1.06s.767.294 1.06 0l3.72-3.72V15c0 .414.336.75.75.75s.75-.336.75-.75V4.81l3.72 3.72c.146.147.338.22.53.22s.384-.072.53-.22c.293-.293.293-.767 0-1.06z"/>
          </svg>
        </div>
      </div>
    `;
    
    return tweetCard;
  }

  private formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  }

  private formatTweetContent(text: string): string {
    // Basic formatting for hashtags, mentions, and links
    return text
      .replace(/#(\w+)/g, '<span class="hashtag">#$1</span>')
      .replace(/@(\w+)/g, '<span class="mention">@$1</span>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  private applyTweetTemplate(templateType: string): void {
    const textarea = document.getElementById('tweet-input') as HTMLTextAreaElement;
    if (!textarea || !this.tokenData) return;

    const { token_name, symbol, price_usd, market_cap } = this.tokenData;
    
    let template = '';
    
    switch (templateType) {
      case 'bullish':
        template = `🚀 ${token_name} (${symbol}) looking strong! 

💰 Current Price: $${parseFloat(price_usd).toFixed(6)}
📊 Market Cap: $${this.formatNumber(market_cap)}

This could be the next gem! 👀

#Solana #Crypto #${symbol}`;
        break;
        
      case 'alert':
        template = `🚨 ALERT: ${token_name} (${symbol})

📍 Price: $${parseFloat(price_usd).toFixed(6)}
📊 MCAP: $${this.formatNumber(market_cap)}

Worth watching! 📈

#Alert #${symbol} #Solana`;
        break;
        
      case 'analysis':
        template = `📊 ANALYSIS: ${token_name} (${symbol})

💰 Price: $${parseFloat(price_usd).toFixed(6)}
📈 Market Cap: $${this.formatNumber(market_cap)}

Technical analysis thread coming soon 🧵

#Analysis #${symbol} #Crypto`;
        break;
        
      case 'gem':
        template = `💎 Hidden Gem Alert: ${token_name}

🏷️ Symbol: ${symbol}
💰 Price: $${parseFloat(price_usd).toFixed(6)}
📊 MCAP: $${this.formatNumber(market_cap)}

Early opportunity! DYOR 🔍

#HiddenGem #${symbol} #Solana`;
        break;
    }
    
    textarea.value = template;
    
    // Trigger input event to update character count
    const event = new Event('input', { bubbles: true });
    textarea.dispatchEvent(event);
    
    // Show preview
    this.updateTweetPreview(template);
  }

  private updateTweetPreview(text: string): void {
    const preview = document.getElementById('tweet-preview');
    const previewText = document.getElementById('tweet-preview-text');
    
    if (preview && previewText) {
      if (text.trim()) {
        previewText.textContent = text;
        preview.style.display = 'block';
      } else {
        preview.style.display = 'none';
      }
    }
  }

  private toggleTweetEmojiPicker(): void {
    // Reuse existing emoji picker functionality for tweets
    // You could implement a separate emoji picker for tweets if needed
    this.showToast('Emoji picker for tweets - coming soon!');
  }

  private addTweetHashtags(): void {
    const textarea = document.getElementById('tweet-input') as HTMLTextAreaElement;
    if (!textarea) return;

    const commonHashtags = ['#Solana', '#Crypto', '#DeFi', '#Web3', '#Blockchain'];
    const hashtagText = commonHashtags.join(' ');
    
    const currentText = textarea.value;
    if (!currentText.includes('#')) {
      textarea.value += (currentText ? '\n\n' : '') + hashtagText;
      
      // Trigger input event to update character count
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }
  }



  private formatNumber(num: number | string): string {
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    
    if (isNaN(numValue)) return '0';
    
    if (numValue >= 1e9) {
      return (numValue / 1e9).toFixed(2) + 'B';
    } else if (numValue >= 1e6) {
      return (numValue / 1e6).toFixed(2) + 'M';
    } else if (numValue >= 1e3) {
      return (numValue / 1e3).toFixed(2) + 'K';
    } else if (numValue < 1) {
      return numValue.toFixed(6);
    } else {
      return numValue.toFixed(2);
    }
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
    console.log('[KOLsuite Sidepanel] displayToken() called with:', tokenInfo);
    
    const mint = tokenInfo.mint || 'Unknown';
    const name = tokenInfo.name || 'Token Name';
    const symbol = tokenInfo.symbol || 'UNKNOWN';
    
    // Trigger auto-call if enabled
    this.sendAutoTokenCall(tokenInfo);
    
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

    // Wallet Dev
    const devWallet = tokenInfo.devWallet || tokenInfo.creator || tokenInfo.updateAuthority || '';
    const walletDevEl = document.getElementById('wallet-dev-short');
    if (walletDevEl) {
      if (devWallet && devWallet.length >= 8) {
        walletDevEl.textContent = `${devWallet.slice(0, 6)}...${devWallet.slice(-6)}`;
        walletDevEl.setAttribute('data-full-address', devWallet);
      } else {
        walletDevEl.textContent = '—';
        walletDevEl.removeAttribute('data-full-address');
      }
    }
    
    // Stats
    this.updateElement('stat-price', tokenInfo.price);
    this.updateElement('stat-fees', tokenInfo.fees);
    this.updateElement('stat-audit', tokenInfo.audit);
    this.updateElement('stat-mcap', tokenInfo.mcap);
    this.updateElement('stat-buys', tokenInfo.buys ?? '0');
    this.updateElement('stat-fdv', tokenInfo.fdv);
    this.updateElement('stat-volume', tokenInfo.volume24h);
    this.updateElement('stat-liquidity', tokenInfo.liquidity);
    
    // Timeframes
    // Metrics Row 3 (Bundled, etc.)
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
    
    // Auto-fill caption from template (sesuai setting template, ganti token = caption ikut ganti)
    this.fillCaptionFromTemplate(tokenInfo);
    
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
    console.log('[KOLsuite] Post on Discord clicked');
    const caption = (document.getElementById('caption-input') as HTMLTextAreaElement)?.value || '';
    
    if (!caption.trim()) {
      this.showToast('Please write a caption first!');
      return;
    }
    
    // Check if Discord webhook is configured
    chrome.storage.local.get(['discordWebhookUrl'], (items) => {
      if (items.discordWebhookUrl) {
        // Send via Discord webhook with rich embed if token data exists
        this.sendDiscordMessage(items.discordWebhookUrl, caption, this.tokenData);
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

  /** Build buy links for Solana token (Trojan, Axiom, GMGN, Padre) */
  private getTokenBuyLinks(mint: string): { label: string; url: string }[] {
    if (!mint || mint.length < 32) return [];
    return [
      { label: 'Buy Trojan', url: `https://trojan.com/token/${mint}` },
      { label: 'Buy Axiom', url: `https://axiom.trade/meme/${mint}?chain=sol` },
      { label: 'Buy GMGN', url: `https://gmgn.ai/sol/token/${mint}` },
      { label: 'Buy Padre', url: `https://trade.padre.gg/trade/solana/${mint}` }
    ];
  }

  /** Discord message components: satu baris tombol link Buy (Trojan, Axiom, GMGN, Padre) */
  private buildDiscordBuyButtons(tokenData?: any): { type: number; components: { type: number; style: number; label: string; url: string }[] }[] | undefined {
    const mint = tokenData?.mint;
    const links = this.getTokenBuyLinks(mint);
    if (links.length === 0) return undefined;
    return [{
      type: 1,
      components: links.map(({ label, url }) => ({
        type: 2,
        style: 5,
        label,
        url
      }))
    }];
  }

  /** Build embed field value: link markdown [Label](url) untuk fallback jika tombol tidak muncul */
  private getBuyLinksMarkdown(mint: string): string {
    const links = this.getTokenBuyLinks(mint);
    return links.map(({ label, url }) => `[${label}](${url})`).join(' • ');
  }

  private async sendDiscordMessage(webhookUrl: string, message: string, tokenData?: any): Promise<void> {
    try {
      let payload: { content?: string; embeds?: object[]; components?: object[] };

      if (tokenData) {
        const buyButtons = this.buildDiscordBuyButtons(tokenData);
        const mint = tokenData.mint || '';
        const buyLinksText = this.getBuyLinksMarkdown(mint);
        const fields: { name: string; value: string; inline: boolean }[] = [
          { name: '💰 Price', value: tokenData.price || 'N/A', inline: true },
          { name: '📊 Market Cap', value: tokenData.mcap || 'N/A', inline: true },
          { name: '💧 Liquidity', value: tokenData.liquidity || 'N/A', inline: true },
          { name: '📈 24H Volume', value: tokenData.volume24h || 'N/A', inline: true },
          { name: '🔥 24H Change', value: tokenData.change24h || 'N/A', inline: true },
          { name: '👥 Holders', value: tokenData.holders || 'N/A', inline: true }
        ];
        if (buyLinksText) {
          fields.push({ name: '🛒 Buy', value: buyLinksText, inline: false });
        }
        payload = {
          embeds: [{
            title: `🚀 ${tokenData.name || 'Unknown Token'} (${tokenData.symbol || 'N/A'})`,
            description: message,
            color: 0x8b5cf6,
            fields,
            footer: {
              text: `Contract: ${mint || 'N/A'}`,
              icon_url: 'https://cryptologos.cc/logos/solana-sol-logo.png'
            },
            timestamp: new Date().toISOString(),
            thumbnail: {
              url: tokenData.image || 'https://cryptologos.cc/logos/solana-sol-logo.png'
            }
          }],
          ...(buyButtons?.length ? { components: buyButtons } : {})
        };
      } else {
        payload = { content: message };
      }

      const urlWithComponents = webhookUrl.includes('?')
        ? `${webhookUrl}&with_components=true`
        : `${webhookUrl}?with_components=true`;
      const response = await fetch(urlWithComponents, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
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

  private static readonly DEFAULT_CAPTION_TEMPLATE = `🚀 {NAME} (${'$'}{SYMBOL})\n\n💰 Price: {PRICE}\n📊 MCAP: {MCAP}\n💧 Liquidity: {LIQUIDITY}\n📈 24H Vol: {VOLUME}\n\n📍 CA: {CA}\n\n#Solana #Crypto #{SYMBOL}`;

  private buildCaptionFromTemplate(tokenInfo: any, template: string): string {
    const t = tokenInfo || {};
    return (template || SidePanelManager.DEFAULT_CAPTION_TEMPLATE)
      .replace(/{NAME}/g, t.name || t.token_name || 'N/A')
      .replace(/{SYMBOL}/g, t.symbol || 'N/A')
      .replace(/{PRICE}/g, t.price || t.price_usd || 'N/A')
      .replace(/{FEES}/g, t.feesPaid ?? t.fees ?? 'N/A')
      .replace(/{AUDIT}/g, t.audit || 'N/A')
      .replace(/{MCAP}/g, t.mcap || t.market_cap || 'N/A')
      .replace(/{FDV}/g, t.fdv || 'N/A')
      .replace(/{VOLUME}/g, t.volume24h || t.volume || 'N/A')
      .replace(/{LIQUIDITY}/g, t.liquidity || 'N/A')
      .replace(/{5M}/g, t.change5m || 'N/A')
      .replace(/{1H}/g, t.change1h || 'N/A')
      .replace(/{6H}/g, t.change6h || 'N/A')
      .replace(/{24H}/g, t.change24h || t.change1d || 'N/A')
      .replace(/{BUNDLED}/g, t.bundled || 'N/A')
      .replace(/{SNIPED}/g, t.sniped || 'N/A')
      .replace(/{DEVHOLD}/g, t.devHoldings ?? t.dev ?? 'N/A')
      .replace(/{INSIDERS}/g, t.insiders || 'N/A')
      .replace(/{TOP10}/g, t.top10Holders ?? t.top10 ?? 'N/A')
      .replace(/{HOLDERS}/g, t.holders || 'N/A')
      .replace(/{CA}/g, t.mint || 'N/A');
  }

  private fillCaptionFromTemplate(tokenInfo: any): void {
    if (!tokenInfo) return;
    chrome.storage.local.get(['captionTemplate'], (items) => {
      const template = items.captionTemplate || SidePanelManager.DEFAULT_CAPTION_TEMPLATE;
      const caption = this.buildCaptionFromTemplate(tokenInfo, template);
      const textarea = document.getElementById('caption-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.value = caption;
        this.updatePreview(caption);
      }
    });
  }

  private generateCaption(): void {
    console.log('[TokenPeek] Generate caption clicked');
    if (!this.tokenData) {
      this.showToast('No token data available');
      return;
    }
    this.incrementTokenUsage();
    chrome.storage.local.get(['captionTemplate'], (items) => {
      const template = items.captionTemplate || SidePanelManager.DEFAULT_CAPTION_TEMPLATE;
      const caption = this.buildCaptionFromTemplate(this.tokenData, template);
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
    
    previewText.textContent = text.trim().length > 0 ? text : 'Your caption will appear here...';
    previewCard.style.display = 'none'; /* Preview post tidak ditampilkan saat generate */
  }

  private switchProfileTab(tabName: string): void {
    // Remove active class from all tabs
    document.querySelectorAll('.profile-nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Hide all tab contents
    document.querySelectorAll('.feed-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    // Activate selected tab
    const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
    const selectedContent = document.getElementById(`${tabName}-content`);
    
    if (selectedTab) {
      selectedTab.classList.add('active');
    }
    
    if (selectedContent) {
      selectedContent.classList.add('active');
    }
    
    console.log(`[KOLsuite] Switched to ${tabName} tab`);
  }

  private setupTweetComposer(): void {
    const textarea = document.getElementById('tweet-compose-input') as HTMLTextAreaElement;
    const charCount = document.querySelector('.char-count');
    const submitBtn = document.querySelector('.tweet-submit-btn') as HTMLButtonElement;
    
    if (textarea && charCount && submitBtn) {
      // Character count and button state
      textarea.addEventListener('input', () => {
        const length = textarea.value.length;
        charCount.textContent = `${length}/280`;
        
        // Update submit button state
        if (length > 0 && length <= 280) {
          submitBtn.disabled = false;
        } else {
          submitBtn.disabled = true;
        }
        
        // Color coding for character count
        if (length > 260) {
          (charCount as HTMLElement).style.color = '#f53d3d';
        } else if (length > 240) {
          (charCount as HTMLElement).style.color = '#ffd400';
        } else {
          (charCount as HTMLElement).style.color = 'var(--text-secondary)';
        }
      });

      // Submit tweet functionality
      submitBtn.addEventListener('click', () => {
        if (textarea.value.trim() && textarea.value.length <= 280) {
          this.postTweet(textarea.value.trim());
        }
      });
    }

    // Tool buttons functionality
    document.querySelectorAll('.tool-btn').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        switch(index) {
          case 0: // Photo
            this.addPhotoToTweet();
            break;
          case 1: // GIF
            this.addGifToTweet();
            break;
          case 2: // Emoji
            this.showEmojiPicker();
            break;
        }
      });
    });

    // Reply buttons on tweets
    document.querySelectorAll('.reply-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.replyToTweet();
      });
    });
  }

  private postTweet(content: string): void {
    console.log('[KOLsuite] Posting tweet:', content);
    this.showToast('Tweet posted! (UI Demo)');
    
    // Clear textarea
    const textarea = document.getElementById('tweet-compose-input') as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = '';
      textarea.dispatchEvent(new Event('input')); // Trigger input event to update UI
    }

    // Add to feed (demo functionality)
    this.addTweetToFeed(content);
  }

  private addTweetToFeed(content: string): void {
    const postsContent = document.getElementById('posts-content');
    if (!postsContent) return;

    const tweetCard = document.createElement('div');
    tweetCard.className = 'tweet-card';
    
    tweetCard.innerHTML = `
      <div class="tweet-avatar">
        <img src="https://i.pravatar.cc/40?img=1" alt="You" class="avatar-small">
      </div>
      <div class="tweet-content">
        <div class="tweet-header">
          <span class="tweet-author">You</span>
          <span class="tweet-handle">@username</span>
          <span class="tweet-time">·</span>
          <span class="tweet-time">now</span>
        </div>
        <div class="tweet-text">${content}</div>
        <div class="tweet-actions">
          <button class="action-btn reply-btn">
            <svg width="16" height="16" fill="currentColor">
              <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366a.75.75 0 010 1.5H9.756c-3.6 0-6.505 2.904-6.505 6.5s2.905 6.5 6.505 6.5h4.366a.75.75 0 010 1.5H9.756c-4.421 0-8.005-3.58-8.005-8z"/>
            </svg>
            <span>0</span>
          </button>
          <button class="action-btn retweet-btn">
            <svg width="16" height="16" fill="currentColor">
              <path d="M4.5 3.88l4.432-4.14a1.042 1.042 0 011.614 0L14.982 3.88c.8.75.8 2.028 0 2.777L10.546 10.8a1.042 1.042 0 01-1.614 0L4.5 6.657c-.8-.749-.8-2.027 0-2.777z"/>
            </svg>
            <span>0</span>
          </button>
          <button class="action-btn like-btn">
            <svg width="16" height="16" fill="currentColor">
              <path d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
            </svg>
            <span>0</span>
          </button>
          <button class="action-btn share-btn">
            <svg width="16" height="16" fill="currentColor">
              <path d="M4.5 3.88l4.432-4.14a1.042 1.042 0 011.614 0L14.982 3.88c.8.75.8 2.028 0 2.777L10.546 10.8a1.042 1.042 0 01-1.614 0L4.5 6.657c-.8-.749-.8-2.027 0-2.777z"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Insert after composer
    const composer = postsContent.querySelector('.tweet-composer');
    if (composer && composer.nextSibling) {
      postsContent.insertBefore(tweetCard, composer.nextSibling);
    }
  }

  private addPhotoToTweet(): void {
    this.showToast('Photo picker (UI Demo)');
  }

  private addGifToTweet(): void {
    this.showToast('GIF picker (UI Demo)');
  }

  private showEmojiPicker(): void {
    this.showToast('Emoji picker (UI Demo)');
  }

  private replyToTweet(): void {
    this.showToast('Reply functionality (UI Demo)');
    
    // Focus on composer
    const textarea = document.getElementById('tweet-compose-input') as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
      textarea.value = '@username ';
      textarea.dispatchEvent(new Event('input'));
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
