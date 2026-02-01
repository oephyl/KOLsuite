/**
 * Token Peek Options Page Script - Simplified
 */

class OptionsManager {
  private form: HTMLFormElement;
  private saveBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private testBtn: HTMLButtonElement;
  private statusMessage: HTMLElement;
  private rpcEndpointInput: HTMLInputElement;
  private autoOpenPanelInput: HTMLInputElement;
  private xUsernameInput: HTMLInputElement;
  private xApiKeyInput: HTMLInputElement;
  private xConnectBtn: HTMLButtonElement;
  private xStatusIndicator: HTMLElement;

  constructor() {
    this.form = document.getElementById('optionsForm') as HTMLFormElement;
    this.saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    this.testBtn = document.getElementById('testBtn') as HTMLButtonElement;
    this.statusMessage = document.getElementById('statusMessage') as HTMLElement;
    this.rpcEndpointInput = document.getElementById('rpcEndpoint') as HTMLInputElement;
    this.autoOpenPanelInput = document.getElementById('autoOpenPanel') as HTMLInputElement;
    this.xUsernameInput = document.getElementById('xUsername') as HTMLInputElement;
    this.xApiKeyInput = document.getElementById('xApiKey') as HTMLInputElement;
    this.xConnectBtn = document.getElementById('xConnectBtn') as HTMLButtonElement;
    this.xStatusIndicator = document.getElementById('xStatusIndicator') as HTMLElement;

    this.init();
  }

  private async init(): Promise<void> {
    await this.loadSettings();
    this.setupEventListeners();
    this.setupPresetButtons();
  }

  private async loadSettings(): Promise<void> {
    try {
      const items = await new Promise<any>((resolve) => {
        chrome.storage.sync.get(['rpcEndpoint', 'autoOpenPanel', 'xUsername', 'xApiKey'], resolve);
      });

      this.rpcEndpointInput.value = items.rpcEndpoint || 'https://mainnet.helius-rpc.com/?api-key=a715727e-ac65-43f4-8694-8281e0b31d21';
      this.autoOpenPanelInput.checked = items.autoOpenPanel !== false;
      this.xUsernameInput.value = items.xUsername || '';
      this.xApiKeyInput.value = items.xApiKey || '';

      this.updateXAccountStatus();
      console.log('[TokenPeek] Settings loaded:', items);
    } catch (error) {
      console.error('[TokenPeek] Failed to load settings:', error);
      this.showMessage('Failed to load settings', 'error');
    }
  }

  private setupEventListeners(): void {
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    this.resetBtn.addEventListener('click', this.handleReset.bind(this));
    this.testBtn.addEventListener('click', this.handleTest.bind(this));
    this.rpcEndpointInput.addEventListener('input', this.validateRpcUrl.bind(this));
    this.xConnectBtn.addEventListener('click', this.handleXConnect.bind(this));
  }

  private setupPresetButtons(): void {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = (e.target as HTMLElement).getAttribute('data-url');
        if (url) {
          this.rpcEndpointInput.value = url;
          this.validateRpcUrl();
        }
      });
    });
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    if (!this.validateForm()) {
      return;
    }

    this.setSaveButtonLoading(true);

    try {
      const settings = {
        rpcEndpoint: this.rpcEndpointInput.value.trim(),
        autoOpenPanel: this.autoOpenPanelInput.checked,
        xUsername: this.xUsernameInput.value.trim(),
        xApiKey: this.xApiKeyInput.value.trim(),
      };

      await new Promise<void>((resolve) => {
        chrome.storage.sync.set(settings, resolve);
      });

      this.updateXAccountStatus();
      this.showMessage('Settings saved successfully!', 'success');
      console.log('[TokenPeek] Settings saved:', settings);
    } catch (error) {
      console.error('[TokenPeek] Failed to save settings:', error);
      this.showMessage('Failed to save settings', 'error');
    } finally {
      this.setSaveButtonLoading(false);
    }
  }

  private async handleReset(): Promise<void> {
    try {
      await new Promise<void>((resolve) => {
        chrome.storage.sync.set(
          {
            rpcEndpoint: 'https://mainnet.helius-rpc.com/?api-key=a715727e-ac65-43f4-8694-8281e0b31d21',
            autoOpenPanel: true,
            xUsername: '',
            xApiKey: '',
          },
          resolve
        );
      });

      await this.loadSettings();
      this.showMessage('Settings reset to defaults', 'success');
    } catch (error) {
      console.error('[TokenPeek] Failed to reset settings:', error);
      this.showMessage('Failed to reset settings', 'error');
    }
  }

  private async handleTest(): Promise<void> {
    const rpcUrl = this.rpcEndpointInput.value.trim();

    if (!rpcUrl) {
      this.showMessage('Please enter an RPC URL first', 'warning');
      return;
    }

    if (!this.isValidUrl(rpcUrl)) {
      this.showMessage('Please enter a valid URL', 'error');
      return;
    }

    this.setTestButtonLoading(true);

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getVersion',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.result && data.result['solana-core']) {
        this.showMessage(
          `✅ Connection successful! Solana version: ${data.result['solana-core']}`,
          'success'
        );
      } else {
        this.showMessage('⚠️ Connected, but response format unexpected', 'warning');
      }
    } catch (error) {
      console.error('[TokenPeek] RPC test failed:', error);
      this.showMessage(
        `❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      this.setTestButtonLoading(false);
    }
  }

  private validateForm(): boolean {
    return this.validateRpcUrl();
  }

  private validateRpcUrl(): boolean {
    const url = this.rpcEndpointInput.value.trim();
    const isValid = !!url && this.isValidUrl(url);

    if (isValid) {
      this.rpcEndpointInput.classList.remove('invalid');
    } else {
      this.rpcEndpointInput.classList.add('invalid');
    }

    return isValid;
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warning'): void {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';

    if (type === 'success') {
      setTimeout(() => {
        this.hideMessage();
      }, 5000);
    }
  }

  private hideMessage(): void {
    this.statusMessage.style.display = 'none';
  }

  private setSaveButtonLoading(loading: boolean): void {
    if (loading) {
      this.saveBtn.classList.add('loading');
      this.saveBtn.disabled = true;
      this.saveBtn.textContent = 'Saving...';
    } else {
      this.saveBtn.classList.remove('loading');
      this.saveBtn.disabled = false;
      this.saveBtn.textContent = 'Save Settings';
    }
  }

  private setTestButtonLoading(loading: boolean): void {
    if (loading) {
      this.testBtn.classList.add('loading');
      this.testBtn.disabled = true;
      this.testBtn.textContent = 'Testing...';
    } else {
      this.testBtn.classList.remove('loading');
      this.testBtn.disabled = false;
      this.testBtn.textContent = 'Test Connection';
    }
  }

  private async handleXConnect(): Promise<void> {
    const username = this.xUsernameInput.value.trim();
    const apiKey = this.xApiKeyInput.value.trim();

    if (!username) {
      this.showMessage('Please enter your X username', 'warning');
      return;
    }

    this.setXConnectButtonLoading(true);

    try {
      // Simulate connection (in real app, this would call X API)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const settings = {
        xUsername: username,
        xApiKey: apiKey,
      };

      await new Promise<void>((resolve) => {
        chrome.storage.sync.set(settings, resolve);
      });

      this.updateXAccountStatus();
      this.showMessage('X account connected successfully!', 'success');
    } catch (error) {
      console.error('[TokenPeek] X connection failed:', error);
      this.showMessage('Failed to connect X account', 'error');
    } finally {
      this.setXConnectButtonLoading(false);
    }
  }

  private setXConnectButtonLoading(loading: boolean): void {
    if (loading) {
      this.xConnectBtn.classList.add('loading');
      this.xConnectBtn.disabled = true;
      this.xConnectBtn.textContent = 'Connecting...';
    } else {
      this.xConnectBtn.classList.remove('loading');
      this.xConnectBtn.disabled = false;
      this.xConnectBtn.textContent = 'Connect Account';
    }
  }

  private updateXAccountStatus(): void {
    const username = this.xUsernameInput.value.trim();
    const statusDot = this.xStatusIndicator.querySelector('.status-dot');
    const statusText = this.xStatusIndicator.querySelector('.status-text');

    if (username) {
      statusDot?.classList.remove('status-disconnected');
      statusDot?.classList.add('status-connected');
      if (statusText) {
        statusText.textContent = `Connected as @${username}`;
      }
      this.xConnectBtn.textContent = 'Update Account';
    } else {
      statusDot?.classList.remove('status-connected');
      statusDot?.classList.add('status-disconnected');
      if (statusText) {
        statusText.textContent = 'Not connected';
      }
      this.xConnectBtn.textContent = 'Connect Account';
    }
  }
}

// Initialize when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new OptionsManager();
  });
} else {
  new OptionsManager();
}
