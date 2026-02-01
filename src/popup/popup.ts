/**
 * Token Peek Popup Script - Simple Version
 */

class PopupManager {
  private currentState: 'main' | 'settings' = 'main';
  private tokenData: any = null;

  constructor() {
    this.init();
  }

  private init(): void {
    this.setupEventListeners();
    this.loadTokenData();
  }

  private setupEventListeners(): void {
    // Settings
    document.getElementById('settings-btn')?.addEventListener('click', () => this.showSettings());
    document.getElementById('back-btn')?.addEventListener('click', () => this.showMain());
    document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());

    // Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rpcUrl = btn.getAttribute('data-rpc');
        if (rpcUrl) {
          (document.getElementById('rpc-url') as HTMLTextAreaElement).value = rpcUrl;
        }
      });
    });

    // Actions
    document.getElementById('copy-mint-btn')?.addEventListener('click', () => this.copyToClipboard());
    document.getElementById('explorer-btn')?.addEventListener('click', () => this.openExplorer());
    document.getElementById('refresh-btn')?.addEventListener('click', () => this.loadTokenData());
    document.getElementById('refresh-empty-btn')?.addEventListener('click', () => this.loadTokenData());
    document.getElementById('retry-btn')?.addEventListener('click', () => this.loadTokenData());
  }

  private showSettings(): void {
    this.currentState = 'settings';
    document.getElementById('main-panel')!.style.display = 'none';
    document.getElementById('settings-panel')!.style.display = 'flex';
    
    chrome.storage.sync.get(['rpcEndpoint'], (items: any) => {
      const rpcInput = document.getElementById('rpc-url') as HTMLTextAreaElement;
      if (rpcInput) {
        rpcInput.value = items.rpcEndpoint || 'https://mainnet.helius-rpc.com/?api-key=a715727e-ac65-43f4-8694-8281e0b31d21';
      }
    });
  }

  private showMain(): void {
    this.currentState = 'main';
    document.getElementById('main-panel')!.style.display = 'flex';
    document.getElementById('settings-panel')!.style.display = 'none';
  }

  private async saveSettings(): Promise<void> {
    const rpcInput = document.getElementById('rpc-url') as HTMLTextAreaElement;

    if (!rpcInput || !rpcInput.value.trim()) {
      alert('Please enter a valid RPC endpoint');
      return;
    }

    try {
      await new Promise<void>((resolve) => {
        chrome.storage.sync.set({
          rpcEndpoint: rpcInput.value.trim()
        }, resolve);
      });

      alert('Settings saved!');
      this.showMain();
    } catch (error) {
      alert('Failed to save settings');
    }
  }

  private async loadTokenData(): Promise<void> {
    try {
      this.hideAll();
      document.getElementById('loading-state')!.style.display = 'flex';

      const tabs = await new Promise<any[]>((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, resolve);
      });

      const tab = tabs[0];
      if (!tab.id) throw new Error('No active tab found');

      const response = await new Promise<any>((resolve) => {
        try {
          chrome.tabs.sendMessage(tab.id!, { action: 'GET_TOKEN_DATA' }, (response) => {
            resolve(response || null);
          });
        } catch {
          resolve(null);
        }
      });

      document.getElementById('loading-state')!.style.display = 'none';

      if (response?.tokenInfo) {
        this.tokenData = response.tokenInfo;
        this.displayToken(response.tokenInfo);
        document.getElementById('main-panel')!.style.display = 'flex';
      } else {
        document.getElementById('empty-state')!.style.display = 'flex';
      }
    } catch (error) {
      document.getElementById('loading-state')!.style.display = 'none';
      document.getElementById('error-state')!.style.display = 'flex';
      document.getElementById('error-message')!.textContent = 'Failed to detect token';
    }
  }

  private displayToken(tokenInfo: any): void {
    const mint = tokenInfo.mint || 'Unknown';
    const decimals = tokenInfo.decimals || 0;
    const supply = tokenInfo.supply || '0';

    // Display mint
    const mintEl = document.getElementById('token-mint') as HTMLElement;
    if (mintEl) {
      mintEl.innerHTML = `
        <span class="mint-text">${mint}</span>
        <button class="copy-btn" id="copy-mint-btn">Copy</button>
      `;
      mintEl.querySelector('.copy-btn')?.addEventListener('click', () => this.copyToClipboard());
    }

    // Display decimals
    document.getElementById('token-decimals')!.textContent = decimals.toString();

    // Display supply
    const formattedSupply = this.formatSupply(supply, decimals);
    document.getElementById('token-supply')!.textContent = formattedSupply;
  }

  private formatSupply(supply: string, decimals: number): string {
    try {
      const num = parseInt(supply);
      if (decimals > 0) {
        const divisor = Math.pow(10, decimals);
        return (num / divisor).toLocaleString();
      }
      return num.toLocaleString();
    } catch {
      return supply;
    }
  }

  private copyToClipboard(): void {
    const mint = this.tokenData?.mint;
    if (mint) {
      navigator.clipboard.writeText(mint).then(() => {
        const btn = document.getElementById('copy-mint-btn');
        if (btn) {
          const orig = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => {
            btn.textContent = orig;
          }, 1500);
        }
      });
    }
  }

  private openExplorer(): void {
    if (this.tokenData?.mint) {
      chrome.tabs.create({
        url: `https://solscan.io/token/${this.tokenData.mint}`
      });
    }
  }

  private hideAll(): void {
    document.getElementById('main-panel')!.style.display = 'none';
    document.getElementById('settings-panel')!.style.display = 'none';
    document.getElementById('error-state')!.style.display = 'none';
    document.getElementById('empty-state')!.style.display = 'none';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
  });
} else {
  new PopupManager();
}
