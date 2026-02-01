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

  constructor() {
    this.form = document.getElementById('optionsForm') as HTMLFormElement;
    this.saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    this.testBtn = document.getElementById('testBtn') as HTMLButtonElement;
    this.statusMessage = document.getElementById('statusMessage') as HTMLElement;
    this.rpcEndpointInput = document.getElementById('rpcEndpoint') as HTMLInputElement;
    this.autoOpenPanelInput = document.getElementById('autoOpenPanel') as HTMLInputElement;

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
        chrome.storage.sync.get(['rpcEndpoint', 'autoOpenPanel'], resolve);
      });

      this.rpcEndpointInput.value = items.rpcEndpoint || 'https://mainnet.helius-rpc.com/?api-key=a715727e-ac65-43f4-8694-8281e0b31d21';
      this.autoOpenPanelInput.checked = items.autoOpenPanel !== false;

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
      };

      await new Promise<void>((resolve) => {
        chrome.storage.sync.set(settings, resolve);
      });

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
}

// Initialize when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new OptionsManager();
  });
} else {
  new OptionsManager();
}
