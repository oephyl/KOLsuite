/**
 * KOLsuite Side Panel Script
 */

import { buildRugcheckBadges } from './rugcheckBadgeAdapter'; 

interface TwitterProfileData {
  id: string;
  username: string;
  name: string;
  bio: string;
  pinnedTweetIds: string[];
  verified: boolean;
  avatar: string;
  banner: string;
  isBlueVerified: boolean;
  followerCount: number;
  followingCount: number;
}

interface TrendingTokenItem {
  chainId?: string;
  tokenAddress: string;
  poolAddress?: string | null;
  name: string;
  uniqueName?: string | null;
  symbol: string;
  decimals?: number;
  logo?: string;
  usdPrice?: number;
  createdAt?: number | string;
  marketCap?: number;
  liquidityMaxUsd?: number;
  holders?: number;
  pricePercentChange?: { '1h'?: number; '4h'?: number; '12h'?: number; '24h'?: number };
  totalVolume?: Record<string, number>;
  transactions?: Record<string, number>;
  exchange?: { name?: string; logo?: string };
  source?: string;
}

class SidePanelManager {
  private currentState: 'loading' | 'main' | 'empty' | 'error' = 'loading';
  private tokenData: any = null;
  private lastTokenMint: string | null = null;
  /** Origin of the tab we last loaded token from; clear state when tab switches to another site */
  private lastTabOrigin: string | null = null;
  private refreshIntervalId: ReturnType<typeof setInterval> | null = null;
  private trendingRefreshIntervalId: ReturnType<typeof setInterval> | null = null;
  private twitterProfileData: TwitterProfileData | null = null;
  private twitterRefreshIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastTwitterUsername: string | null = null;
  private isTweetTabActive = false;

  constructor() {
    console.log('[KOLsuite] SidePanelManager constructor called!');
    this.init();
  }

  private init(): void {
    console.log('[KOLsuite Sidepanel] Initializing...');
    this.loadTheme();
    this.setupEventListeners();
    this.setupMainTabListeners();
    this.setupTradeTabListeners();
    this.setupTradeFilterPopup();
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
    document.querySelectorAll('.header-badges .main-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.header-badges [data-main-tab="${tab}"]`);
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

  private setupTradeTabListeners(): void {
    const list = document.getElementById('trade-mode-list');
    const searchInput = document.getElementById('trade-mode-search') as HTMLInputElement | null;
    const callsPane = document.getElementById('trade-mode-calls-pane');
    const trendingPane = document.getElementById('trade-mode-trending-pane');

    document.querySelectorAll('.trade-mode-tabs [data-trade-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).getAttribute('data-trade-tab') || 'public';
        document.querySelectorAll('.trade-mode-tabs .main-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (tab === 'trending') {
          callsPane?.classList.remove('active');
          trendingPane?.classList.add('active');
          this.showTrendingSkeleton();
          this.loadTrendingTokens(false);
          this.startTrendingRefreshInterval();
        } else {
          this.stopTrendingRefreshInterval();
          trendingPane?.classList.remove('active');
          callsPane?.classList.add('active');
        }
      });
    });
    searchInput?.addEventListener('input', () => {
      const q = (searchInput.value || '').trim().toLowerCase();
      list?.querySelectorAll('.trade-call-card').forEach((card) => {
        const text = (card.textContent || '').toLowerCase();
        (card as HTMLElement).style.display = q === '' || text.includes(q) ? '' : 'none';
      });
    });
  }

  private formatTrendingMC(val: number | undefined): string {
    if (val == null || isNaN(val)) return 'MC $0';
    if (val >= 1e9) return `MC $${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `MC $${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `MC $${(val / 1e3).toFixed(2)}K`;
    return `MC $${val.toFixed(0)}`;
  }

  private formatTrendingHolders(val: number | undefined): string {
    if (val == null || isNaN(val)) return '0';
    if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `${(val / 1e3).toFixed(2)}K`;
    return String(val);
  }

  /** Parse createdAt (UTC), compare to now, return short age e.g. 2s, 5M, 6D */
  private formatTrendingAge(createdAt: number | string | undefined): string {
    if (createdAt == null) return '—';
    let ts: number;
    if (typeof createdAt === 'string') {
      const parsed = Date.parse(createdAt);
      if (isNaN(parsed)) return '—';
      ts = parsed;
    } else {
      ts = createdAt >= 1e12 ? createdAt : createdAt * 1000;
    }
    const now = Date.now();
    const diffMs = Math.max(0, now - ts);
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay > 0) return `${diffDay}D`;
    if (diffHour > 0) return `${diffHour}h`;
    if (diffMin > 0) return `${diffMin}M`;
    if (diffSec > 0) return `${diffSec}s`;
    return '0s';
  }

  private async fetchTrendingDexPaidHasTokenProfile(tokenAddress: string): Promise<boolean> {
    const baseUrl = ((import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) || 'http://localhost:4000/api';
    const apiKey = (import.meta as { env?: { API_KEY?: string } }).env?.API_KEY || '';
    const apiUrl = baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (apiKey) (headers as Record<string, string>)['x-api-key'] = apiKey;
    try {
      const res = await this.fetchWith502Retry(`${apiUrl.replace(/\/$/, '')}/tokenDexPaid/${encodeURIComponent(tokenAddress)}/dev`, headers);
      if (!res.ok) return false;
      const json = await res.json();
      const orders = json?.dexPaidData?.orders ?? [];
      if (!Array.isArray(orders)) return false;
      return orders.some((o: any) => {
        const type = String(o?.type ?? '').trim().toLowerCase();
        const status = String(o?.status ?? '').trim().toLowerCase();
        return type === 'tokenprofile' && status === 'approved';
      });
    } catch {
      return false;
    }
  }

  private appendTrendingDexPaidIcon(holdersContainer: Element): void {
    if (typeof chrome === 'undefined' || !chrome.runtime?.getURL) return;
    const existing = holdersContainer.querySelectorAll('.trade-trending-dexpaid-icon');
    if (existing.length > 0) return;
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('img/dexpaid.svg');
    img.alt = 'DexPaid';
    img.className = 'trade-trending-dexpaid-icon';
    img.title = 'DexPaid';
    const ageEl = holdersContainer.querySelector('.trade-call-age');
    if (ageEl) holdersContainer.insertBefore(img, ageEl);
    else holdersContainer.appendChild(img);
  }

  private showTrendingSkeleton(): void {
    const skeleton = document.getElementById('trade-trending-skeleton');
    const content = document.getElementById('trade-trending-content');
    if (skeleton) skeleton.style.display = 'flex';
    if (content) content.style.display = 'none';
  }

  private hideTrendingSkeleton(): void {
    const skeleton = document.getElementById('trade-trending-skeleton');
    const content = document.getElementById('trade-trending-content');
    if (skeleton) skeleton.style.display = 'none';
    if (content) content.style.display = '';
  }

  private startTrendingRefreshInterval(): void {
    this.stopTrendingRefreshInterval();
    this.trendingRefreshIntervalId = setInterval(() => {
      const pane = document.getElementById('trade-mode-trending-pane');
      if (pane?.classList.contains('active')) this.loadTrendingTokens(true);
      else this.stopTrendingRefreshInterval();
    }, 60000);
  }

  private stopTrendingRefreshInterval(): void {
    if (this.trendingRefreshIntervalId) {
      clearInterval(this.trendingRefreshIntervalId);
      this.trendingRefreshIntervalId = null;
    }
  }

  private async loadTrendingTokens(background = false): Promise<void> {
    const baseUrl = ((import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) || 'http://localhost:4000/api';
    const apiKey = (import.meta as { env?: { API_KEY?: string } }).env?.API_KEY || '';
    const apiUrl = baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (apiKey) (headers as Record<string, string>)['x-api-key'] = apiKey;
    const endpoint = `${apiUrl.replace(/\/$/, '')}/trendingToken/dev`;
    try {
      const res = await this.fetchWith502Retry(endpoint, headers);
      if (!res.ok) {
        if (!background) this.hideTrendingSkeleton();
        return;
      }
      const items: Array<{
        tokenAddress?: string;
        poolAddress?: string | null;
        name?: string;
        symbol?: string;
        logo?: string;
        marketCap?: number;
        holders?: number;
        createdAt?: number | string;
        exchange?: { name?: string; logo?: string };
      }> = await res.json();
      if (!Array.isArray(items)) {
        if (!background) this.hideTrendingSkeleton();
        return;
      }

      const podium = document.querySelector('#trade-mode-trending-pane .trade-trending-podium');
      const listEl = document.getElementById('trade-trending-list');
      if (!podium || !listEl) {
        if (!background) this.hideTrendingSkeleton();
        return;
      }

      const fillPodiumCard = (card: Element, item: (typeof items)[0], rank: number) => {
        const rankEl = card.querySelector('.trade-trending-rank');
        const avatarEl = card.querySelector('.trade-trending-podium-avatar');
        const titleEl = card.querySelector('.trade-trending-podium-title');
        const metaEl = card.querySelector('.trade-trending-podium-meta');
        const statEl = card.querySelector('.trade-trending-podium-stat');
        const holdersEl = card.querySelector('.trade-trending-podium-holders');
        const holdersValEl = card.querySelector('.trade-trending-podium-holders-value');
        const holderImgEl = card.querySelector('.trade-trending-holder-icon') as HTMLImageElement;
        const btn = card.querySelector('.trade-trending-podium-btn') as HTMLButtonElement;
        if (rankEl) rankEl.textContent = String(rank);
        if (avatarEl) {
          const logo = (item.logo || '').trim();
          if (logo) {
            avatarEl.innerHTML = '';
            const img = document.createElement('img');
            img.src = logo;
            img.alt = item.name || '';
            img.referrerPolicy = 'no-referrer';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = 'inherit';
            avatarEl.appendChild(img);
          } else {
            avatarEl.textContent = (item.symbol || item.name || '?').charAt(0).toUpperCase();
          }
        }
        if (titleEl) {
          titleEl.innerHTML = '';
          const nameSpan = document.createElement('span');
          nameSpan.textContent = item.name || '—';
          nameSpan.style.overflow = 'hidden';
          nameSpan.style.textOverflow = 'ellipsis';
          nameSpan.style.whiteSpace = 'nowrap';
          titleEl.appendChild(nameSpan);
          const exLogo = (item.exchange?.logo || '').trim();
          if (exLogo) {
            const exImg = document.createElement('img');
            exImg.src = exLogo;
            exImg.alt = item.exchange?.name || '';
            exImg.className = 'trade-trending-exchange-icon';
            exImg.referrerPolicy = 'no-referrer';
            titleEl.appendChild(exImg);
          }
        }
        if (metaEl) metaEl.textContent = item.symbol || '—';
        if (statEl) statEl.textContent = this.formatTrendingMC(item.marketCap);
        if (holdersValEl) holdersValEl.textContent = this.formatTrendingHolders(item.holders);
        if (holderImgEl && typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
          holderImgEl.src = chrome.runtime.getURL('img/holder.svg');
        }
        if (holdersEl) holdersEl.querySelectorAll('.trade-trending-dexpaid-icon').forEach((el) => el.remove());
        const mint = (item.tokenAddress || '').trim();
        if (btn) {
          btn.dataset.tokenAddress = mint;
          const poolAddress = (item.poolAddress || '').trim() || null;
          btn.onclick = () => {
            if (mint) {
              this.openTrendingTokenInCurrentTerminal(mint, poolAddress);
              this.loadTokenData(mint);
            }
          };
        }
      };

      const rank1Card = podium.querySelector('[data-rank="1"]');
      const rank2Card = podium.querySelector('[data-rank="2"]');
      const rank3Card = podium.querySelector('[data-rank="3"]');
      if (items[0] && rank1Card) fillPodiumCard(rank1Card, items[0], 1);
      if (items[1] && rank2Card) fillPodiumCard(rank2Card, items[1], 2);
      if (items[2] && rank3Card) fillPodiumCard(rank3Card, items[2], 3);

      listEl.innerHTML = '';
      for (let i = 3; i < Math.min(items.length, 10); i++) {
        const item = items[i];
        const rank = i + 1;
        const card = document.createElement('article');
        card.className = 'trade-call-card';
        const logo = (item.logo || '').trim();
        const symbolOrName = (item.symbol || item.name || '?').charAt(0).toUpperCase();
        const nameContent = item.name || '—';
        const exLogo = (item.exchange?.logo || '').trim();
        const mint = (item.tokenAddress || '').trim();

        const label = document.createElement('div');
        label.className = 'trade-call-label';
        label.innerHTML = '<span class="trade-call-dot"></span><span>#' + rank + '</span>';
        card.appendChild(label);

        const body = document.createElement('div');
        body.className = 'trade-call-body';
        const left = document.createElement('div');
        left.className = 'trade-call-left';
        const avatarWrap = document.createElement('div');
        avatarWrap.className = 'trade-call-avatar-wrap';
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'trade-call-avatar';
        if (logo) {
          const img = document.createElement('img');
          img.src = logo;
          img.alt = '';
          img.referrerPolicy = 'no-referrer';
          avatarDiv.appendChild(img);
        } else {
          avatarDiv.textContent = symbolOrName;
        }
        avatarWrap.appendChild(avatarDiv);
        left.appendChild(avatarWrap);

        const info = document.createElement('div');
        info.className = 'trade-call-info';
        const titleRow = document.createElement('div');
        titleRow.className = 'trade-call-title-row';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'trade-call-title';
        titleSpan.textContent = nameContent;
        titleRow.appendChild(titleSpan);
        if (exLogo) {
          const exImg = document.createElement('img');
          exImg.className = 'trade-trending-exchange-icon';
          exImg.src = exLogo;
          exImg.alt = item.exchange?.name || '';
          exImg.referrerPolicy = 'no-referrer';
          titleRow.appendChild(exImg);
        }
        const statSpan = document.createElement('span');
        statSpan.className = 'trade-call-stat trade-call-stat-title-row';
        statSpan.textContent = this.formatTrendingMC(item.marketCap);
        titleRow.appendChild(statSpan);
        info.appendChild(titleRow);
        const subtitle = document.createElement('div');
        subtitle.className = 'trade-call-subtitle';
        subtitle.textContent = item.symbol || '—';
        info.appendChild(subtitle);
        const holdersRow = document.createElement('div');
        holdersRow.className = 'trade-call-holders';
        const holderIcon = document.createElement('img');
        holderIcon.className = 'trade-trending-holder-icon';
        holderIcon.alt = 'Holders';
        if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) holderIcon.src = chrome.runtime.getURL('img/holder.svg');
        const holdersVal = document.createElement('span');
        holdersVal.className = 'trade-call-holders-value';
        holdersVal.textContent = this.formatTrendingHolders(item.holders);
        const ageSpan = document.createElement('span');
        ageSpan.className = 'trade-call-age';
        ageSpan.textContent = this.formatTrendingAge(item.createdAt);
        holdersRow.appendChild(holderIcon);
        holdersRow.appendChild(holdersVal);
        holdersRow.appendChild(ageSpan);
        info.appendChild(holdersRow);
        left.appendChild(info);
        body.appendChild(left);

        const right = document.createElement('div');
        right.className = 'trade-call-right';
        const tradeBtn = document.createElement('button');
        tradeBtn.type = 'button';
        tradeBtn.className = 'trade-call-action-btn';
        tradeBtn.textContent = 'Trade';
        const poolAddress = (item.poolAddress || '').trim() || null;
        if (mint) {
          tradeBtn.addEventListener('click', () => {
            this.openTrendingTokenInCurrentTerminal(mint, poolAddress);
            this.loadTokenData(mint);
          });
        }
        right.appendChild(tradeBtn);
        body.appendChild(right);
        card.appendChild(body);
        listEl.appendChild(card);
      }

      const maxIdx = Math.min(items.length, 10);
      const dexPaidChecks = Array.from({ length: maxIdx }, (_, i) => {
        const addr = (items[i].tokenAddress || '').trim();
        if (!addr) return Promise.resolve(false);
        return this.fetchTrendingDexPaidHasTokenProfile(addr);
      });
      Promise.all(dexPaidChecks).then((results) => {
        const pane = document.getElementById('trade-mode-trending-pane');
        const podium = pane?.querySelector('.trade-trending-podium');
        const list = document.getElementById('trade-trending-list');
        if (!pane || !podium || !list) return;
        pane.querySelectorAll('.trade-trending-dexpaid-icon').forEach((el) => el.remove());
        for (let i = 0; i < results.length; i++) {
          if (!results[i]) continue;
          if (i < 3) {
            const card = podium.querySelector(`[data-rank="${i + 1}"]`);
            const holders = card?.querySelector('.trade-trending-podium-holders');
            if (holders) this.appendTrendingDexPaidIcon(holders);
          } else {
            const card = list.children[i - 3];
            const holders = card?.querySelector('.trade-call-holders');
            if (holders) this.appendTrendingDexPaidIcon(holders);
          }
        }
      });

      if (!background) this.hideTrendingSkeleton();
    } catch (e) {
      console.warn('[KOLsuite] loadTrendingTokens failed:', e);
      if (!background) this.hideTrendingSkeleton();
    }
  }

  private setupTradeFilterPopup(): void {
    const popup = document.getElementById('trade-filter-popup') as HTMLElement | null;
    const filterBtn = document.getElementById('trade-mode-filter-btn');
    const backdrop = document.getElementById('trade-filter-popup-backdrop');
    const closeBtn = document.getElementById('trade-filter-popup-close');
    const resetBtn = document.getElementById('trade-filter-reset-btn');
    const applyBtn = document.getElementById('trade-filter-apply-btn');
    const selectAllBtn = document.getElementById('trade-filter-protocols-select-all');
    const protocolsGrid = document.getElementById('trade-filter-protocols-grid');
    const tickerInput = document.getElementById('trade-filter-ticker-input') as HTMLInputElement | null;
    const defaultProtocols = new Set(['pump', 'moonit', 'launchlab', 'believe']);

    const show = (): void => {
      if (popup) popup.style.display = 'flex';
    };
    const hide = (): void => {
      if (popup) popup.style.display = 'none';
    };

    const getProtocolTags = (): HTMLElement[] =>
      Array.from(document.querySelectorAll<HTMLElement>('.trade-filter-protocol-tag'));
    const getAuditTabs = (): HTMLElement[] =>
      Array.from(document.querySelectorAll<HTMLElement>('.trade-filter-audit-tab'));
    const getSocialCheckboxes = (): HTMLInputElement[] =>
      Array.from(document.querySelectorAll<HTMLInputElement>('.trade-filter-popup input[name="social"]'));

    protocolsGrid?.addEventListener('click', (e) => {
      const tag = (e.target as HTMLElement).closest('.trade-filter-protocol-tag');
      if (tag) tag.classList.toggle('active');
    });

    selectAllBtn?.addEventListener('click', () => {
      const tags = getProtocolTags();
      const allActive = tags.every((t) => t.classList.contains('active'));
      tags.forEach((t) => t.classList.toggle('active', !allActive));
      if (selectAllBtn) selectAllBtn.textContent = allActive ? 'Select All' : 'Deselect All';
    });

    getAuditTabs().forEach((tab) => {
      tab.addEventListener('click', () => {
        getAuditTabs().forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });

    filterBtn?.addEventListener('click', show);
    backdrop?.addEventListener('click', hide);
    closeBtn?.addEventListener('click', hide);

    applyBtn?.addEventListener('click', () => {
      const protocols = getProtocolTags()
        .filter((t) => t.classList.contains('active'))
        .map((t) => t.getAttribute('data-protocol') || '');
      const ticker = (tickerInput?.value || '').trim();
      const auditTab = document.querySelector('.trade-filter-audit-tab.active')?.getAttribute('data-audit-tab') || 'audit';
      const socials = getSocialCheckboxes().filter((cb) => cb.checked).map((cb) => cb.value);
      console.log('[KOLsuite] Trade filter apply:', { protocols, ticker, auditTab, socials });
      hide();
    });

    resetBtn?.addEventListener('click', () => {
      getProtocolTags().forEach((t) => {
        t.classList.toggle('active', defaultProtocols.has(t.getAttribute('data-protocol') || ''));
      });
      if (tickerInput) tickerInput.value = '';
      getAuditTabs().forEach((t) => {
        t.classList.toggle('active', t.getAttribute('data-audit-tab') === 'audit');
      });
      getSocialCheckboxes().forEach((cb) => { cb.checked = false; });
      if (selectAllBtn) selectAllBtn.textContent = 'Select All';
    });
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

    document.getElementById('sign-in-x-btn')?.addEventListener('click', () => this.openAccount());
    document.getElementById('user-profile')?.addEventListener('click', () => this.openAccount());
    document.getElementById('account-back-btn')?.addEventListener('click', () => this.closeAccount());
    this.setupAccountTabs();

    // Summary toggle
    document.getElementById('summary-toggle')?.addEventListener('click', () => this.toggleSummary());

    // DexPaid History toggle
    document.getElementById('dexpaid-toggle')?.addEventListener('click', () => this.toggleDexPaid());

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

    document.getElementById('github-tab-btn')?.addEventListener('click', () => {
      this.switchTab('github');
    });

    document.getElementById('youtube-tab-btn')?.addEventListener('click', () => {
      this.switchTab('youtube');
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
    const walletDevIcon = document.getElementById('wallet-dev-icon') as HTMLImageElement;
    if (walletDevIcon && typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      walletDevIcon.src = chrome.runtime.getURL('img/devwallet.svg');
    }

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

  private openAccount(): void {
    const mainPanel = document.querySelector('.side-panel-container') as HTMLElement;
    const accountView = document.getElementById('account-view');
    if (mainPanel) mainPanel.style.display = 'none';
    if (accountView) accountView.style.display = 'flex';
    this.populateAccountInfo();
  }

  private closeAccount(): void {
    const accountView = document.getElementById('account-view');
    if (accountView) accountView.style.display = 'none';
    const mainPanel = document.querySelector('.side-panel-container') as HTMLElement;
    if (mainPanel) mainPanel.style.display = 'flex';
  }

  private populateAccountInfo(): void {
    chrome.storage.local.get(['xUsername'], (items) => {
      const handle = items.xUsername || '@username';
      const nameEl = document.getElementById('account-info-name');
      const handleEl = document.getElementById('account-info-handle');
      const profileHandleEl = document.getElementById('account-profile-handle');
      const avatarEl = document.getElementById('account-info-avatar');
      if (nameEl) nameEl.textContent = handle ? handle.replace('@', '') : 'Guest';
      if (handleEl) handleEl.textContent = handle;
      if (profileHandleEl) profileHandleEl.textContent = handle;
      if (avatarEl) avatarEl.textContent = handle ? (handle.charAt(1) || '?').toUpperCase() : '?';
    });
  }

  private setupAccountTabs(): void {
    document.querySelectorAll('.account-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).getAttribute('data-account-tab') || 'profile';
        document.querySelectorAll('.account-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.account-tab-pane').forEach(pane => {
          pane.classList.toggle('active', (pane as HTMLElement).getAttribute('data-account-pane') === tab);
        });
      });
    });
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
    } else if (tabName === 'github') {
      document.body.classList.add('tab-github');
    } else if (tabName === 'youtube') {
      document.body.classList.add('tab-youtube');
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

      if (tabName === 'tweet') {
        this.isTweetTabActive = true;
        this.loadProfileData();
        this.loadTwitterProfileOnTab();
      } else {
        this.isTweetTabActive = false;
        this.stopTwitterRefresh();
      }
      if (tabName === 'github') {
        this.loadGitHubWebview();
      } else if (tabName === 'youtube') {
        this.loadYouTubeWebview();
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

  /** Extract Twitter/X username from URL e.g. https://x.com/alonzocooks/xxx/xxx → alonzocooks */
  private extractTwitterUsername(twitterUrl: string): string | null {
    if (!twitterUrl || typeof twitterUrl !== 'string') return null;
    const u = twitterUrl.trim();
    const m = u.match(/(?:twitter\.com|x\.com)\/([^/?#]+)/i);
    return m ? m[1].toLowerCase() : null;
  }

  private stopTwitterRefresh(): void {
    if (this.twitterRefreshIntervalId) {
      clearInterval(this.twitterRefreshIntervalId);
      this.twitterRefreshIntervalId = null;
    }
  }

  private loadTwitterProfileOnTab(): void {
    if (!this.lastTwitterUsername) return;
    this.fetchAndStoreTwitterProfile(this.lastTwitterUsername);
    this.stopTwitterRefresh();
    this.twitterRefreshIntervalId = setInterval(() => {
      if (this.isTweetTabActive && this.lastTwitterUsername) {
        this.fetchAndStoreTwitterProfile(this.lastTwitterUsername!, false);
      }
    }, 60000);
  }

  private async fetchAndStoreTwitterProfile(twitterUsername: string, showPlaceholder = true): Promise<void> {
    if (showPlaceholder) this.showTwitterProfilePlaceholder(true);
    const baseUrl = ((import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) || 'http://localhost:4000/api';
    const apiKey = (import.meta as { env?: { API_KEY?: string } }).env?.API_KEY || '';
    const apiUrl = baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (apiKey) (headers as Record<string, string>)['x-api-key'] = apiKey;
    const endpoint = `${apiUrl.replace(/\/$/, '')}/twitter/getByUsername/${encodeURIComponent(twitterUsername)}/dev`;
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await this.fetchWith502Retry(endpoint, headers);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const d = json?.data;
        if (!d || typeof d !== 'object') throw new Error('Invalid response');
        const bioRaw = d.bio ?? d.description ?? d.legacy?.description ?? '';
        this.twitterProfileData = {
          id: String(d.id ?? ''),
          username: String(d.username ?? ''),
          name: String(d.name ?? ''),
          bio: String(bioRaw),
          pinnedTweetIds: Array.isArray(d.pinnedTweetIds) ? d.pinnedTweetIds.map(String) : [],
          verified: !!d.verified,
          avatar: String(d.avatar ?? ''),
          banner: String(d.banner ?? ''),
          isBlueVerified: !!d.isBlueVerified,
          followerCount: Number(d.followerCount) || 0,
          followingCount: Number(d.followingCount) || 0,
        };
        this.updateTwitterProfileContent();
        return;
      } catch (e) {
        if (attempt === maxRetries - 1) {
          this.twitterProfileData = null;
          this.updateTwitterProfileContent();
        } else {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
  }

  private showTwitterProfilePlaceholder(loading: boolean): void {
    const card = document.getElementById('twitter-profile-card');
    if (card) {
      if (loading) card.classList.add('twitter-profile-loading');
      else card.classList.remove('twitter-profile-loading');
    }
  }

  private updateTwitterProfileContent(): void {
    this.showTwitterProfilePlaceholder(false);
    const avatar = document.getElementById('twitter-profile-avatar') as HTMLImageElement;
    const verifiedBadge = document.getElementById('twitter-profile-verified-badge');
    const nameEl = document.getElementById('twitter-profile-name');
    const handleEl = document.getElementById('twitter-profile-handle');
    const followersEl = document.getElementById('twitter-profile-followers');
    const followingEl = document.getElementById('twitter-profile-following');
    const bioEl = document.getElementById('twitter-profile-bio');

    const p = this.twitterProfileData;
    if (!p) {
      if (avatar) avatar.src = '';
      if (verifiedBadge) verifiedBadge.style.display = 'none';
      if (nameEl) nameEl.textContent = '—';
      if (handleEl) handleEl.textContent = '@—';
      if (followersEl) followersEl.textContent = '—';
      if (followingEl) followingEl.textContent = '—';
      if (bioEl) bioEl.textContent = '—';
      return;
    }
    if (avatar) {
      avatar.src = p.avatar || '';
      avatar.referrerPolicy = 'no-referrer';
      avatar.onerror = () => { avatar.src = ''; };
    }
    if (verifiedBadge) verifiedBadge.style.display = p.isBlueVerified ? '' : 'none';
    if (nameEl) nameEl.textContent = p.name || '—';
    if (handleEl) handleEl.textContent = p.username ? `@${p.username}` : '@—';
    if (followersEl) followersEl.textContent = p.followerCount >= 1e6 ? `${(p.followerCount / 1e6).toFixed(1)}M` : p.followerCount >= 1e3 ? `${(p.followerCount / 1e3).toFixed(1)}K` : String(p.followerCount);
    if (followingEl) followingEl.textContent = p.followingCount >= 1e6 ? `${(p.followingCount / 1e6).toFixed(1)}M` : p.followingCount >= 1e3 ? `${(p.followingCount / 1e3).toFixed(1)}K` : String(p.followingCount);
    if (bioEl) bioEl.textContent = p.bio || '—';
  }

  private async loadTokenData(mintOverride?: string): Promise<void> {
    this.stopBackgroundRefresh();
    this.stopTwitterRefresh();
    this.twitterProfileData = null;
    this.updateTwitterProfileContent();
    this.showState('loading');
    // Bersihkan banner image supaya tidak tampil token sebelumnya
    const dexscreenerBannerWrap = document.getElementById('dexscreener-banner-wrap');
    const dexscreenerBannerImg = document.getElementById('dexscreener-banner-img') as HTMLImageElement;
    if (dexscreenerBannerWrap && dexscreenerBannerImg) {
      dexscreenerBannerImg.src = '';
      dexscreenerBannerImg.removeAttribute('alt');
      dexscreenerBannerWrap.style.display = 'none';
    }
    document.getElementById('main-kol-pane')?.classList.remove('banner-visible');
    const ctoBtn = document.getElementById('social-cto-btn');
    if (ctoBtn) ctoBtn.style.display = 'none';
    const dexpaidBtn = document.getElementById('social-dexpaid-btn');
    if (dexpaidBtn) dexpaidBtn.style.display = 'none';
    const dexpaidSection = document.getElementById('dexpaid-section');
    const dexpaidList = document.getElementById('dexpaid-list');
    const dexpaidToggle = document.getElementById('dexpaid-toggle');
    const dexpaidContent = document.getElementById('dexpaid-content');
    if (dexpaidSection) dexpaidSection.style.display = 'none';
    if (dexpaidList) dexpaidList.innerHTML = '';
    if (dexpaidToggle) dexpaidToggle.classList.remove('active');
    if (dexpaidContent) dexpaidContent.classList.remove('expanded');
    const boostBtn = document.getElementById('social-boost-btn');
    if (boostBtn) boostBtn.style.display = 'none';
    const pumpliveWrapClear = document.getElementById('social-pumplive-wrap');
    if (pumpliveWrapClear) pumpliveWrapClear.style.display = 'none';
    const pumplivePopupClear = document.getElementById('social-pumplive-popup');
    if (pumplivePopupClear) pumplivePopupClear.style.display = 'none';
    const unlockedAlert = document.getElementById('rug-unlocked-alert');
    if (unlockedAlert) unlockedAlert.style.display = 'none';

    try {
      let mint: string | null = (mintOverride && mintOverride.trim()) || null;
      if (mint) console.log('[TokenPeek Sidepanel] Using mint override:', mint);

      if (!mint) {
        const tab = await new Promise<chrome.tabs.Tab>((resolve, reject) => {
          try {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }
              if (!tabs || tabs.length === 0) reject(new Error('No active tab'));
              else resolve(tabs[0]);
            });
          } catch (err) {
            reject(err);
          }
        });
        console.log('[TokenPeek Sidepanel] Tab URL:', tab.url);
        const url = tab.url || '';
        try {
          const currentOrigin = url ? new URL(url).origin : '';
          if (this.lastTabOrigin !== null && currentOrigin !== this.lastTabOrigin) {
            const prevOrigin = this.lastTabOrigin;
            this.tokenData = null;
            this.lastTokenMint = null;
            this.lastTabOrigin = null;
            console.log('[TokenPeek Sidepanel] Website changed, cleared cache.', prevOrigin, '→', currentOrigin);
          }
          this.lastTabOrigin = currentOrigin || null;
        } catch {
          this.lastTabOrigin = null;
        }
        // Mapping per source (order matches supported token page URLs)
        if (url.includes('gmgn.ai')) {
          const m = url.match(/\/sol\/token\/([1-9A-HJ-NP-Za-km-z]{32,44})/);
          if (m?.[1]) mint = m[1].trim();
        }
        if (!mint && (url.includes('axiom.trade') || url.includes('axiom'))) {
          try {
            const u = new URL(url);
            const parts = u.pathname.split('/').filter((p) => p);
            const memeIdx = parts.indexOf('meme');
            if (memeIdx !== -1 && parts.length > memeIdx + 1) {
              const candidate = (parts[memeIdx + 1] || '').trim();
              if (candidate.length >= 32 && candidate.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(candidate)) mint = candidate;
            }
            if (!mint) {
              const m = url.match(/\/meme\/([^/?#]+)/);
              const raw = m?.[1] ? decodeURIComponent(m[1]).trim() : '';
              if (raw.length >= 32 && raw.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(raw)) mint = raw;
            }
          } catch {
            const m = url.match(/\/meme\/([^/?#]+)/);
            const raw = m?.[1] ? decodeURIComponent(m[1]).trim() : '';
            if (raw.length >= 32 && raw.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(raw)) mint = raw;
          }
        }
        if (!mint && url.includes('trojan.com')) {
          const m = url.match(/[?&]token=([^&\s#]+)/);
          if (m?.[1]) mint = decodeURIComponent(m[1]).trim();
        }
        if (!mint && url.includes('pump.fun')) {
          const m = url.match(/\/coin\/([1-9A-HJ-NP-Za-km-z]{32,44})/);
          if (m?.[1]) mint = m[1].trim();
        }
        if (!mint && url.includes('padre.gg')) {
          try {
            const u = new URL(url);
            const parts = u.pathname.split('/').filter((p) => p);
            const solanaIdx = parts.indexOf('solana');
            if (solanaIdx !== -1 && parts.length > solanaIdx + 1) {
              const candidate = (parts[solanaIdx + 1] || '').trim();
              if (candidate.length >= 32 && candidate.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(candidate)) mint = candidate;
            }
            if (!mint) {
              const m = url.match(/\/trade\/solana\/([^/?#]+)/);
              const raw = m?.[1] ? decodeURIComponent(m[1]).trim() : '';
              if (raw.length >= 32 && raw.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(raw)) mint = raw;
            }
          } catch {
            const m = url.match(/\/trade\/solana\/([^/?#]+)/);
            const raw = m?.[1] ? decodeURIComponent(m[1]).trim() : '';
            if (raw.length >= 32 && raw.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(raw)) mint = raw;
          }
        }
        if (!mint && url.includes('bullx.io')) {
          const m = url.match(/[?&]address=([^&\s#]+)/);
          if (m?.[1]) mint = decodeURIComponent(m[1]).trim();
        }
        if (!mint && url.includes('telemetry.io')) {
          const m = url.match(/\/trading\/([1-9A-HJ-NP-Za-km-z]{32,44})/);
          if (m?.[1]) mint = m[1].trim();
        }
        // Fallback: generic ?token= for any other supported tab
        if (!mint && /gmgn|axiom|trojan|pump\.fun|padre|bullx|telemetry/.test(url)) {
          const m = url.match(/[?&]token=([^&\s#]+)/);
          if (m?.[1]) mint = decodeURIComponent(m[1]).trim();
        }
        // Only accept Solana-style address (base58, 32–44 chars)
        if (mint) {
          const cleaned = mint.trim();
          if (cleaned.length < 32 || cleaned.length > 44 || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(cleaned)) mint = '';
          else mint = cleaned;
        }
      }

      if (!mint || mint.length < 32) {
        console.log('[TokenPeek Sidepanel] ❌ No valid mint');
        this.tokenData = null;
        this.lastTokenMint = null;
        this.stopBackgroundRefresh();
        this.showState('empty');
        return;
      }

      console.log('[TokenPeek Sidepanel] ✅ Mint valid, fetching token data...');

      // Fetch token data from API
      const baseUrl = ((import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) || 'http://localhost:4000/api';
      const apiKey = (import.meta as { env?: { API_KEY?: string } }).env?.API_KEY || '';
      const apiUrl = baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`;
      const tokenEndpoint = `${apiUrl.replace(/\/$/, '')}/token/${mint}/dev`;
      const securityEndpoint = `${apiUrl.replace(/\/$/, '')}/tokenSecurity/${mint}/dev`;

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-api-key'] = apiKey;

      // 1. Fetch /api/token first
      const tokenResponse = await this.fetchWith502Retry(tokenEndpoint, headers);
      if (!tokenResponse.ok) {
        throw new Error(`API error: ${tokenResponse.status} ${tokenResponse.statusText}`);
      }
      const apiData = await tokenResponse.json();
      const td = apiData?.tokenDetails;
      if (!td) {
        throw new Error('Invalid API response: missing tokenDetails');
      }

      // 2. Fetch /api/tokenSocials (wajib - selalu dipanggil agar twitter dll tersedia)
      let socialsData: { twitter?: string; website?: string; github?: string; telegram?: string; instagram?: string; tiktok?: string; youtube?: string; dexBanner?: string; pumpLive?: { thumbnail?: string; startAt?: number; replyCount?: number } | null } = {};
      try {
        const socialsRes = await this.fetchWith502Retry(`${apiUrl.replace(/\/$/, '')}/tokenSocials/${mint}/dev`, headers);
        if (socialsRes.ok) {
          const socialsJson = await socialsRes.json();
          const pick = (v: any) => (v && typeof v === 'string' ? String(v).trim() : '') || '';
          let raw: any = socialsJson?.socials ?? socialsJson?.data ?? socialsJson?.result ?? socialsJson;
          if (Array.isArray(raw) && raw.length > 0) {
            const item = raw.find((e: any) => e?.id === mint) ?? raw[0];
            raw = item;
          } else if (raw && typeof raw === 'object' && raw.socials && typeof raw.socials === 'object') {
            raw = raw.socials;
          } else if (!raw || typeof raw !== 'object') {
            raw = {};
          }
          const tw = pick(raw.twitter) || pick(raw.x) || pick(raw.communities);
          if (tw) socialsData.twitter = tw;
          if (pick(raw.website)) socialsData.website = pick(raw.website);
          if (pick(raw.github)) socialsData.github = pick(raw.github);
          if (pick(raw.telegram)) socialsData.telegram = pick(raw.telegram);
          if (pick(raw.instagram)) socialsData.instagram = pick(raw.instagram);
          if (pick(raw.tiktok)) socialsData.tiktok = pick(raw.tiktok);
          if (pick(raw.youtube)) socialsData.youtube = pick(raw.youtube);
          if (pick(raw.dexBanner)) socialsData.dexBanner = pick(raw.dexBanner);
          const pl = raw.pumpLive ?? raw.pumplive;
          if (pl && typeof pl === 'object') {
            socialsData.pumpLive = {
              thumbnail: typeof pl.thumbnail === 'string' ? pl.thumbnail : undefined,
              startAt: typeof pl.startAt === 'number' ? pl.startAt : undefined,
              replyCount: typeof pl.replyCount === 'number' ? pl.replyCount : undefined,
            };
          } else {
            socialsData.pumpLive = null;
          }
          if (!tw && Array.isArray(socialsJson)) {
            const twitterEntry = socialsJson.find((e: any) => e?.type === 'twitter' || e?.type === 'x' || e?.type === 'communities');
            const url = pick(twitterEntry?.url) || pick(twitterEntry?.value) || pick(twitterEntry?.link);
            if (url) socialsData.twitter = url;
          }
        }
      } catch { /* ignore */ }

      // 3. Fetch other endpoints (security, dexPaid - wajib)
      const [securityResponse, dexPaidResponse] = await Promise.all([
        this.fetchWith502Retry(securityEndpoint, headers).catch(() => null),
        this.fetchWith502Retry(`${apiUrl.replace(/\/$/, '')}/tokenDexPaid/${mint}/dev`, headers).catch(() => null),
      ]);

      let rugcheckBadges: ReturnType<typeof buildRugcheckBadges> | null = null;
      let rugcheckSummary: { score?: number; score_normalised?: number; risks?: Array<{ name: string; description: string; level: string }> } | null = null;
      let lockers: Array<{ address: string; name: string }> = [];
      if (securityResponse?.ok) {
        try {
          const securityData = await securityResponse.json();
          rugcheckBadges = buildRugcheckBadges(securityData);
          lockers = this.extractLockersFromSecurity(securityData);
          const rs = securityData?.rugcheckSummary;
          if (rs) {
            rugcheckSummary = {
              score: rs.score,
              score_normalised: rs.score_normalised,
              risks: Array.isArray(rs.risks) ? rs.risks.map((r: any) => ({
                name: r?.name ?? '',
                description: r?.description ?? '',
                level: r?.level ?? 'info',
              })) : [],
            };
          }
        } catch {
          rugcheckBadges = null;
        }
      }

      let dexPaidData: { orders?: Array<{ type: string; status: string; paymentTimestamp: number }>; boosts?: Array<{ amount: number; paymentTimestamp: number }> } | null = null;
      if (dexPaidResponse?.ok) {
        try {
          const dexPaidJson = await dexPaidResponse.json();
          if (dexPaidJson?.dexPaidData) dexPaidData = dexPaidJson.dexPaidData;
        } catch {
          dexPaidData = null;
        }
      }

      // Helper to format USD values
      const formatUSD = (val: number | undefined): string => {
        if (val == null || isNaN(val)) return '$0.00';
        if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
        if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
        if (val >= 1) return `$${val.toFixed(2)}`;
        if (val >= 0.0001) return `$${val.toFixed(6)}`;
        return `$${val.toExponential(2)}`;
      };
      // Price format: $0.0₄178 (subscript = zeros after 0.0, then significant digits)
      const formatPriceWithSubscript = (val: number | undefined): string => {
        if (val == null || isNaN(val) || val <= 0) return '$0.00';
        if (val >= 0.01) {
          if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
          if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
          if (val >= 1) return `$${val.toFixed(2)}`;
          return `$${val.toFixed(4)}`;
        }
        const str = val.toFixed(20);
        const afterZero = str.slice(2); // after "0."
        let zeros = 0;
        for (let i = 0; i < afterZero.length && afterZero[i] === '0'; i++) zeros++;
        const sig = afterZero.slice(zeros).replace(/0+$/, '').slice(0, 4) || '0';
        const sub = '₀₁₂₃₄₅₆₇₈₉';
        const subChar = zeros <= 9 ? sub[zeros] : String(zeros);
        return `$0.0${subChar}${sig}`;
      };
      const formatPercent = (val: number | undefined): string => {
        if (val == null || isNaN(val)) return '0%';
        return `${val.toFixed(1)}%`;
      };

      const bundled = td.bundlersHoldingsPercentage ?? 0;
      const sniped = td.snipersHoldingsPercentage ?? 0;
      const prev = this.tokenData;
      const sameMint = prev?.mint === mint;

      let twitter = (td.socials?.twitter?.trim() || socialsData.twitter || '').trim();
      let website = (td.socials?.website?.trim() || socialsData.website || '').trim();
      let github = (td.socials?.github?.trim() || socialsData.github || '').trim();
      let telegram = (td.socials?.telegram?.trim() || socialsData.telegram || '').trim();
      let instagram = (td.socials?.instagram?.trim() || socialsData.instagram || '').trim();
      let tiktok = (td.socials?.tiktok?.trim() || socialsData.tiktok || '').trim();
      let youtube = (td.socials?.youtube?.trim() || socialsData.youtube || '').trim();

      if (website && /^https?:\/\/(www\.)?github\.com\//i.test(website)) {
        if (!github) github = website;
        website = '';
      }
      if (website && /(youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)/i.test(website)) {
        if (!youtube) youtube = website;
        website = '';
      }
      if (github && !github.startsWith('http')) {
        github = `https://github.com/${github.replace(/^\/*/, '')}`;
      }

      // Map tokenDetails to basicToken (mint unchanged)
      const basicToken = {
        mint: mint,
        name: td.name ?? 'Unknown',
        symbol: (td.symbol ?? '??').trim(),
        price: formatPriceWithSubscript(td.priceUSD),
        volume24h: formatUSD(td.volume24hUSD),
        liquidity: formatUSD(td.liquidityMaxUSD),
        fees: formatUSD(td.feesPaid24hUSD),
        audit: rugcheckSummary?.score != null && rugcheckSummary?.score_normalised != null
          ? `${rugcheckSummary.score}/${rugcheckSummary.score_normalised}`
          : '0/10',
        rugcheckSummary,
        mcap: formatUSD(td.marketCapUSD),
        buys: String(td.buys24h ?? 0),
        fdv: formatUSD(td.marketCapDilutedUSD),
        change5m: formatPercent(td.priceChange5minPercentage),
        change1h: formatPercent(td.priceChange1hPercentage),
        change6h: formatPercent(td.priceChange6hPercentage),
        change1d: formatPercent(td.priceChange24hPercentage),
        change24h: formatPercent(td.priceChange24hPercentage),
        bundled: formatPercent(bundled),
        proTrader: String(td.proTradersCount ?? 0),
        sniped: formatPercent(sniped),
        smartTrader: String(td.smartTradersCount ?? 0),
        dev: formatPercent(td.devHoldingsPercentage),
        insiders: formatPercent(td.insidersHoldingsPercentage),
        top10: formatPercent(td.top10HoldingsPercentage),
        holders: String(td.holdersCount ?? 0),
        devWallet: td.deployer ?? '',
        logo: (td.logo ?? td.logoURI ?? td.logo_uri ?? td.image ?? td.uri ?? td.icon ?? '').trim() || '',
        exchange: {
          name: td.exchange?.name ?? '',
          logo: td.exchange?.logo ?? '',
        },
        source: td.source ?? null,
        bondingPercentage: td.bondingPercentage ?? 0,
        bonded: td.bonded ?? false,
        rugcheckBadges,
        dexscreenerListed: (sameMint && prev?.dexscreenerListed === true) ? true : (td.dexscreenerListed ?? false),
        dexscreenerHeader: (sameMint && prev?.dexscreenerHeader) ? prev.dexscreenerHeader : (td.dexscreenerHeader ?? null),
        dexscreenerBoosted: td.dexscreenerBoosted ?? false,
        dexscreenerBoostedDate: td.dexscreenerBoostedDate ?? null,
        dexscreenerBoostedAmount: td.dexscreenerBoostedAmount ?? 0,
        deployerMigrationsCount: td.deployerMigrationsCount ?? 0,
        deployerTokensCount: td.deployerTokensCount ?? 0,
        organicBuys24h: td.organicBuys24h ?? 0,
        organicSells24h: td.organicSells24h ?? 0,
        dexPaidData,
        website,
        twitter,
        github,
        telegram,
        instagram,
        tiktok,
        youtube,
        dexBanner: socialsData.dexBanner || null,
        pumpLive: socialsData.pumpLive ?? null,
        lockers,
      };

      this.tokenData = basicToken;
      this.displayToken(basicToken);
      this.showState('main');
      this.startBackgroundRefresh(mint);

      const twitterUsername = this.extractTwitterUsername(twitter);
      if (twitterUsername) {
        this.lastTwitterUsername = twitterUsername;
        if (this.isTweetTabActive) this.loadTwitterProfileOnTab();
      } else {
        this.lastTwitterUsername = null;
        this.twitterProfileData = null;
        this.updateTwitterProfileContent();
      }

    } catch (error) {
      console.error('[TokenPeek Sidepanel] Error loading token:', error);
      this.stopBackgroundRefresh();
      this.showState('error', 'Taking a moment to load. Please try again.');
    }
  }

  private async fetchWith502Retry(endpoint: string, headers: HeadersInit, maxRetries = 3): Promise<Response> {
    let lastResponse: Response | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      lastResponse = await fetch(endpoint, { headers });
      if (lastResponse.status !== 502) {
        return lastResponse;
      }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
    return lastResponse!;
  }

  private stopBackgroundRefresh(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  private startBackgroundRefresh(mint: string): void {
    this.stopBackgroundRefresh();
    this.refreshIntervalId = setInterval(() => {
      this.refreshTokenDataSilent(mint);
    }, 1500);
  }

  private async refreshTokenDataSilent(mint: string): Promise<void> {
    if (this.currentState !== 'main') return;
    try {
      const baseUrl = ((import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) || 'http://localhost:4000/api';
      const apiKey = (import.meta as { env?: { API_KEY?: string } }).env?.API_KEY || '';
      const apiUrl = baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`;
      const endpoint = `${apiUrl.replace(/\/$/, '')}/token/${mint}/dev`;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-api-key'] = apiKey;

      const response = await this.fetchWith502Retry(endpoint, headers);
      if (!response.ok) return;

      const apiData = await response.json();
      const td = apiData?.tokenDetails;
      if (!td) return;

      const prev = this.tokenData;
      let lockers = prev?.lockers ?? [];
      let refreshPumpLive: { thumbnail?: string; startAt?: number; replyCount?: number } | null = prev?.pumpLive ?? null;

      // 2. Fetch tokenSocials (wajib - selalu dipanggil agar twitter dll tersedia)
      let socialsFromApi: Record<string, string> = {};
      try {
        const socialsRes = await this.fetchWith502Retry(`${apiUrl.replace(/\/$/, '')}/tokenSocials/${mint}/dev`, headers);
        if (socialsRes.ok) {
          const sj = await socialsRes.json();
          const pick = (v: any) => (v && typeof v === 'string' ? String(v).trim() : '') || '';
          let raw: any = sj?.socials ?? sj?.data ?? sj?.result ?? sj;
          if (Array.isArray(raw) && raw.length > 0) {
            const item = raw.find((e: any) => e?.id === mint) ?? raw[0];
            raw = item;
          } else if (raw && typeof raw === 'object' && raw.socials && typeof raw.socials === 'object') {
            raw = raw.socials;
          } else if (!raw || typeof raw !== 'object') {
            raw = {};
          }
          const tw = pick(raw.twitter) || pick(raw.x) || pick(raw.communities);
          if (tw) socialsFromApi.twitter = tw;
          if (pick(raw.website)) socialsFromApi.website = pick(raw.website);
          if (pick(raw.github)) socialsFromApi.github = pick(raw.github);
          if (pick(raw.telegram)) socialsFromApi.telegram = pick(raw.telegram);
          if (pick(raw.instagram)) socialsFromApi.instagram = pick(raw.instagram);
          if (pick(raw.tiktok)) socialsFromApi.tiktok = pick(raw.tiktok);
          if (pick(raw.youtube)) socialsFromApi.youtube = pick(raw.youtube);
          if (pick(raw.dexBanner)) socialsFromApi.dexBanner = pick(raw.dexBanner);
          const pl = raw.pumpLive ?? raw.pumplive;
          if (pl && typeof pl === 'object') {
            refreshPumpLive = {
              thumbnail: typeof pl.thumbnail === 'string' ? pl.thumbnail : undefined,
              startAt: typeof pl.startAt === 'number' ? pl.startAt : undefined,
              replyCount: typeof pl.replyCount === 'number' ? pl.replyCount : undefined,
            };
          } else {
            refreshPumpLive = null;
          }
          if (!tw && Array.isArray(sj)) {
            const twitterEntry = sj.find((e: any) => e?.type === 'twitter' || e?.type === 'x' || e?.type === 'communities');
            const url = pick(twitterEntry?.url) || pick(twitterEntry?.value) || pick(twitterEntry?.link);
            if (url) socialsFromApi.twitter = url;
          }
        }
      } catch { /* ignore */ }

      // 3. Fetch other endpoints (security, dexPaid)
      try {
        const secRes = await this.fetchWith502Retry(`${apiUrl.replace(/\/$/, '')}/tokenSecurity/${mint}/dev`, headers);
        if (secRes.ok) {
          const secData = await secRes.json();
          const extracted = this.extractLockersFromSecurity(secData);
          if (extracted.length > 0) lockers = extracted;
        }
      } catch { /* keep prev lockers */ }

      let refreshTwitter = (td.socials?.twitter?.trim() || socialsFromApi.twitter || prev?.twitter || '').trim();
      let refreshWebsite = (td.socials?.website?.trim() || socialsFromApi.website || prev?.website || '').trim();
      let refreshGithub = (td.socials?.github?.trim() || socialsFromApi.github || prev?.github || '').trim();
      let refreshTelegram = (td.socials?.telegram?.trim() || socialsFromApi.telegram || prev?.telegram || '').trim();
      let refreshInstagram = (td.socials?.instagram?.trim() || socialsFromApi.instagram || prev?.instagram || '').trim();
      let refreshTiktok = (td.socials?.tiktok?.trim() || socialsFromApi.tiktok || prev?.tiktok || '').trim();
      let refreshYoutube = (td.socials?.youtube?.trim() || socialsFromApi.youtube || prev?.youtube || '').trim();
      let refreshDexBanner = (socialsFromApi.dexBanner || prev?.dexBanner || '').trim() || null;
      if (refreshWebsite && /^https?:\/\/(www\.)?github\.com\//i.test(refreshWebsite)) {
        if (!refreshGithub) refreshGithub = refreshWebsite;
        refreshWebsite = '';
      }
      if (refreshWebsite && /(youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)/i.test(refreshWebsite)) {
        if (!refreshYoutube) refreshYoutube = refreshWebsite;
        refreshWebsite = '';
      }
      if (refreshGithub && !refreshGithub.startsWith('http')) {
        refreshGithub = `https://github.com/${refreshGithub.replace(/^\/*/, '')}`;
      }

      let dexPaidData = prev?.dexPaidData ?? null;
      try {
        const dexPaidEndpoint = `${apiUrl.replace(/\/$/, '')}/tokenDexPaid/${mint}/dev`;
        const dexPaidRes = await this.fetchWith502Retry(dexPaidEndpoint, headers);
        if (dexPaidRes.ok) {
          const dexPaidJson = await dexPaidRes.json();
          if (dexPaidJson?.dexPaidData) dexPaidData = dexPaidJson.dexPaidData;
        }
      } catch {
        // keep prev dexPaidData
      }

      const formatUSD = (val: number | undefined): string => {
        if (val == null || isNaN(val)) return '$0.00';
        if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
        if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
        if (val >= 1) return `$${val.toFixed(2)}`;
        if (val >= 0.0001) return `$${val.toFixed(6)}`;
        return `$${val.toExponential(2)}`;
      };
      const formatPercent = (val: number | undefined): string => {
        if (val == null || isNaN(val)) return '0%';
        return `${val.toFixed(1)}%`;
      };
      const formatPriceWithSubscript = (val: number | undefined): string => {
        if (val == null || isNaN(val) || val <= 0) return '$0.00';
        if (val >= 0.01) {
          if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
          if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
          if (val >= 1) return `$${val.toFixed(2)}`;
          return `$${val.toFixed(4)}`;
        }
        const str = val.toFixed(20);
        const afterZero = str.slice(2);
        let zeros = 0;
        for (let i = 0; i < afterZero.length && afterZero[i] === '0'; i++) zeros++;
        const sig = afterZero.slice(zeros).replace(/0+$/, '').slice(0, 4) || '0';
        const sub = '₀₁₂₃₄₅₆₇₈₉';
        const subChar = zeros <= 9 ? sub[zeros] : String(zeros);
        return `$0.0${subChar}${sig}`;
      };
      const bundled = td.bundlersHoldingsPercentage ?? 0;
      const sniped = td.snipersHoldingsPercentage ?? 0;

      const basicToken = {
        mint,
        name: td.name ?? prev?.name ?? 'Unknown',
        symbol: (td.symbol ?? prev?.symbol ?? '??').trim(),
        price: formatPriceWithSubscript(td.priceUSD),
        volume24h: formatUSD(td.volume24hUSD),
        liquidity: formatUSD(td.liquidityMaxUSD),
        fees: formatUSD(td.totalFeesPaidUSD ?? td.feesPaid24hUSD),
        audit: (() => {
          const rs = prev?.rugcheckSummary;
          return rs?.score != null && rs?.score_normalised != null
            ? `${rs.score}/${rs.score_normalised}`
            : '0/10';
        })(),
        rugcheckSummary: prev?.rugcheckSummary ?? null,
        mcap: formatUSD(td.marketCapUSD),
        buys: String(td.buys24h ?? 0),
        fdv: formatUSD(td.marketCapDilutedUSD),
        change5m: formatPercent(td.priceChange5minPercentage),
        change1h: formatPercent(td.priceChange1hPercentage),
        change6h: formatPercent(td.priceChange6hPercentage),
        change1d: formatPercent(td.priceChange24hPercentage),
        change24h: formatPercent(td.priceChange24hPercentage),
        bundled: formatPercent(bundled),
        proTrader: String(td.proTradersCount ?? 0),
        sniped: formatPercent(sniped),
        smartTrader: String(td.smartTradersCount ?? 0),
        dev: formatPercent(td.devHoldingsPercentage),
        insiders: formatPercent(td.insidersHoldingsPercentage),
        top10: formatPercent(td.top10HoldingsPercentage),
        holders: String(td.holdersCount ?? 0),
        devWallet: td.deployer ?? prev?.devWallet ?? '',
        logo: (String(td.logo ?? td.logoURI ?? td.logo_uri ?? td.image ?? td.uri ?? td.icon ?? '').trim()) || (prev?.logo ?? ''),
        exchange: {
          name: td.exchange?.name ?? prev?.exchange?.name ?? '',
          logo: td.exchange?.logo ?? prev?.exchange?.logo ?? '',
        },
        source: td.source ?? prev?.source ?? null,
        bondingPercentage: td.bondingPercentage ?? 0,
        bonded: td.bonded ?? false,
        rugcheckBadges: prev?.rugcheckBadges ?? null,
        dexscreenerListed: prev?.dexscreenerListed === true ? true : (td.dexscreenerListed ?? false),
        dexscreenerHeader: prev?.dexscreenerHeader || td.dexscreenerHeader || null,
        dexscreenerBoosted: td.dexscreenerBoosted ?? prev?.dexscreenerBoosted ?? false,
        dexscreenerBoostedDate: td.dexscreenerBoostedDate ?? prev?.dexscreenerBoostedDate ?? null,
        dexscreenerBoostedAmount: td.dexscreenerBoostedAmount ?? prev?.dexscreenerBoostedAmount ?? 0,
        deployerMigrationsCount: td.deployerMigrationsCount ?? prev?.deployerMigrationsCount ?? 0,
        deployerTokensCount: td.deployerTokensCount ?? prev?.deployerTokensCount ?? 0,
        organicBuys24h: td.organicBuys24h ?? prev?.organicBuys24h ?? 0,
        organicSells24h: td.organicSells24h ?? prev?.organicSells24h ?? 0,
        dexPaidData,
        website: refreshWebsite,
        twitter: refreshTwitter,
        github: refreshGithub,
        telegram: refreshTelegram,
        instagram: refreshInstagram,
        tiktok: refreshTiktok,
        youtube: refreshYoutube,
        dexBanner: refreshDexBanner || null,
        pumpLive: refreshPumpLive ?? null,
        lockers,
      };

      this.tokenData = basicToken;
      this.displayToken(basicToken);

      const newUsername = this.extractTwitterUsername(refreshTwitter);
      if (newUsername && newUsername !== this.lastTwitterUsername) {
        this.lastTwitterUsername = newUsername;
        if (this.isTweetTabActive) {
          this.fetchAndStoreTwitterProfile(newUsername, false);
          if (!this.twitterRefreshIntervalId) this.loadTwitterProfileOnTab();
        }
      }
    } catch {
      // Silent fail - no user feedback for background refresh
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
    
    // Token Logo (avatar) - from basicToken.logo; supports PNG, JPG, GIF (including animated)
    const tokenLogoImg = document.getElementById('token-logo-img') as HTMLImageElement;
    if (tokenLogoImg) {
      if (tokenInfo.logo) {
        tokenLogoImg.src = tokenInfo.logo;
        tokenLogoImg.alt = name;
        tokenLogoImg.style.display = '';
        tokenLogoImg.referrerPolicy = 'no-referrer';
        tokenLogoImg.onerror = () => { tokenLogoImg.style.display = 'none'; };
      } else {
        tokenLogoImg.src = '';
        tokenLogoImg.style.display = 'none';
      }
    }

    // Token Name
    const nameEl = document.getElementById('token-name-header');
    if (nameEl) nameEl.textContent = name;

    const exchangeLogoWrap = document.getElementById('exchange-logo-wrap');
    const exchangeLogo = document.getElementById('exchange-logo') as HTMLImageElement;
    if (exchangeLogoWrap && exchangeLogo && tokenInfo.exchange?.logo) {
      exchangeLogo.src = tokenInfo.exchange.logo;
      exchangeLogo.alt = tokenInfo.exchange.name || 'Exchange';
      exchangeLogo.title = tokenInfo.exchange.name || '';
      exchangeLogoWrap.style.display = '';
    } else if (exchangeLogoWrap) {
      exchangeLogoWrap.style.display = 'none';
    }

    // Dex Banner: prioritas dexBanner dari tokenSocials, fallback dexscreenerHeader
    const dexscreenerBannerWrap = document.getElementById('dexscreener-banner-wrap');
    const dexscreenerBannerImg = document.getElementById('dexscreener-banner-img') as HTMLImageElement;
    if (dexscreenerBannerWrap && dexscreenerBannerImg) {
      const imgUrl = tokenInfo.dexBanner || (tokenInfo.dexscreenerListed && tokenInfo.dexscreenerHeader ? tokenInfo.dexscreenerHeader : null);
      const showBanner = !!imgUrl;
      const mainKolPane = document.getElementById('main-kol-pane');
      if (showBanner && imgUrl) {
        dexscreenerBannerImg.referrerPolicy = 'no-referrer';
        dexscreenerBannerImg.src = imgUrl;
        dexscreenerBannerImg.alt = 'Banner';
        dexscreenerBannerWrap.style.display = '';
        mainKolPane?.classList.add('banner-visible');
        dexscreenerBannerImg.onerror = () => {
          dexscreenerBannerImg.src = '';
          dexscreenerBannerWrap.style.display = 'none';
          mainKolPane?.classList.remove('banner-visible');
        };
      } else {
        dexscreenerBannerWrap.style.display = 'none';
        mainKolPane?.classList.remove('banner-visible');
      }
    }
    
    // Token Symbol
    const symbolEl = document.getElementById('token-symbol');
    if (symbolEl) symbolEl.textContent = `${symbol}`;
    
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

    // Fake launch warning (when source is null)
    this.updateFakeLaunchWarning(tokenInfo);

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
    this.updateElement('metric-proTrader', tokenInfo.proTrader);
    this.updateElement('metric-sniped', tokenInfo.sniped);
    this.updateElement('metric-smartTrader', tokenInfo.smartTrader);
    
    // Metrics Row 5
    this.updateElement('metric-dev', tokenInfo.dev);
    this.updateElement('metric-insiders', tokenInfo.insiders);
    this.updateElement('metric-top10', tokenInfo.top10);
    this.updateElement('metric-holders', tokenInfo.holders ?? '0');
    
    // Dev Token / Dev Migration
    this.updateElement('dev-tokens-count', tokenInfo.deployerTokensCount ?? '0');
    this.updateElement('dev-migrations-count', tokenInfo.deployerMigrationsCount ?? '0');
    this.updateElement('organic-buys-24h', tokenInfo.organicBuys24h ?? '0');
    this.updateElement('organic-sells-24h', tokenInfo.organicSells24h ?? '0');

    // DevLock
    this.updateDevLock(tokenInfo.lockers);

    // Bonding Curve
    this.updateBondingCurve(tokenInfo);

    // Rug Check
    this.updateRugCheck(tokenInfo.rugcheckBadges);
    this.updateRugCheckRisks(tokenInfo.rugcheckSummary?.risks);

    // DexPaid History
    this.updateDexPaidHistory(tokenInfo.dexPaidData);

    // Tweet tab - hide when twitter is null or empty
    const tweetTabBtn = document.getElementById('tweet-tab-btn');
    if (tweetTabBtn) {
      const hasTwitter = !!tokenInfo.twitter?.trim();
      tweetTabBtn.style.display = hasTwitter ? '' : 'none';
      if (!hasTwitter) {
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab?.getAttribute('data-tab') === 'tweet') {
          this.switchTab('details');
        }
      }
    }

    // GitHub tab - show when github URL exists
    const githubTabBtn = document.getElementById('github-tab-btn');
    if (githubTabBtn) {
      const hasGithub = !!tokenInfo.github?.trim() && /github\.com/i.test(tokenInfo.github);
      githubTabBtn.style.display = hasGithub ? '' : 'none';
      if (!hasGithub) {
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab?.getAttribute('data-tab') === 'github') {
          this.switchTab('details');
        }
      }
    }

    // YouTube tab - show when youtube URL exists (from youtube field or website detected as youtube)
    const youtubeTabBtn = document.getElementById('youtube-tab-btn');
    if (youtubeTabBtn) {
      const hasYoutube = !!this.getYouTubeVideoId(tokenInfo.youtube?.trim() || '');
      youtubeTabBtn.style.display = hasYoutube ? '' : 'none';
      if (!hasYoutube) {
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab?.getAttribute('data-tab') === 'youtube') {
          this.switchTab('details');
        }
      }
    }

    // Social action bar - show icons for available links from tokenSocials
    this.updateSocialActionBar(tokenInfo);

    // Summary
    this.updateSummary(tokenInfo);
    
    // Auto-fill caption from template (per template setting; caption updates when token changes)
    this.fillCaptionFromTemplate(tokenInfo);
    
    console.log('[TokenPeek Sidepanel] ✅ Token displayed!');
  }
  
  private updateSocialActionBar(tokenInfo: any): void {
    const setSocialBtn = (id: string, url: string | undefined) => {
      const btn = document.getElementById(id) as HTMLAnchorElement;
      if (!btn) return;
      const u = url?.trim();
      const hasUrl = !!u && (u.startsWith('http://') || u.startsWith('https://'));
      if (hasUrl && u) {
        btn.href = u;
        btn.style.display = 'flex';
      } else {
        btn.href = '#';
        btn.style.display = 'none';
      }
    };
    setSocialBtn('social-twitter-btn', tokenInfo.twitter);
    setSocialBtn('social-telegram-btn', tokenInfo.telegram);
    setSocialBtn('social-instagram-btn', tokenInfo.instagram);
    setSocialBtn('social-tiktok-btn', tokenInfo.tiktok);
    const youtubeUrl = tokenInfo.youtube?.trim();
    const youtubeVideoId = this.getYouTubeVideoId(youtubeUrl || '');
    setSocialBtn('social-youtube-btn', youtubeVideoId ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : undefined);
    const websiteUrl = tokenInfo.website?.trim();
    const isSocialSite = websiteUrl && /(twitter\.com|x\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com)/i.test(websiteUrl);
    const hasTiktok = !!tokenInfo.tiktok?.trim() && (tokenInfo.tiktok.startsWith('http://') || tokenInfo.tiktok.startsWith('https://'));
    setSocialBtn('social-website-btn', websiteUrl && !isSocialSite && !hasTiktok ? websiteUrl : undefined);
    const showBanner = !!(tokenInfo.dexBanner || (tokenInfo.dexscreenerListed && tokenInfo.dexscreenerHeader));
    const orders = tokenInfo.dexPaidData?.orders ?? [];
    const hasCommunityTakeover = Array.isArray(orders) && orders.some((o: any) => {
      const t = String(o?.type ?? '').toLowerCase().replace(/[\s_-]+/g, ' ');
      return t.includes('community') && t.includes('takeover');
    });
    const ctoBtn = document.getElementById('social-cto-btn');
    const ctoImg = document.getElementById('social-cto-icon-img') as HTMLImageElement;
    if (ctoBtn && ctoImg) {
      if (hasCommunityTakeover) {
        ctoImg.src = chrome.runtime.getURL('img/cto.svg');
        ctoBtn.style.display = 'flex';
      } else {
        ctoBtn.style.display = 'none';
      }
    }
    const dexpaidBtn = document.getElementById('social-dexpaid-btn');
    const dexpaidImg = document.getElementById('social-dexpaid-icon-img') as HTMLImageElement;
    if (dexpaidBtn && dexpaidImg) {
      if (showBanner) {
        dexpaidImg.src = chrome.runtime.getURL('img/dexpaid.svg');
        dexpaidBtn.style.display = 'flex';
      } else {
        dexpaidBtn.style.display = 'none';
      }
    }
    const boosts = tokenInfo.dexPaidData?.boosts ?? [];
    const hasBoosts = Array.isArray(boosts) && boosts.length > 0;
    const byDate: Record<string, { amount: number; ts: number }> = {};
    for (const b of boosts) {
      const ts = Number(b?.paymentTimestamp) || 0;
      if (!ts) continue;
      const key = this.getDateKey(ts);
      if (!byDate[key]) byDate[key] = { amount: 0, ts };
      byDate[key].amount += Number(b?.amount) || 0;
      if (ts > byDate[key].ts) byDate[key].ts = ts;
    }
    const dates = Object.keys(byDate).sort().reverse();
    const newestDateKey = dates[0];
    const newestBoostAmount = newestDateKey ? byDate[newestDateKey]?.amount ?? 0 : 0;
    const boostBtn = document.getElementById('social-boost-btn');
    const boostAmountEl = document.getElementById('social-boost-amount');
    if (boostBtn && boostAmountEl) {
      if (hasBoosts && newestBoostAmount > 0) {
        boostAmountEl.textContent = newestBoostAmount >= 1000 ? `${(newestBoostAmount / 1000).toFixed(1)}K` : `${newestBoostAmount}`;
        boostBtn.style.display = 'flex';
        boostBtn.title = `Boost: ${newestBoostAmount.toLocaleString()}`;
      } else {
        boostBtn.style.display = 'none';
      }
    }

    const pumpLive = tokenInfo.pumpLive;
    const pumpliveWrap = document.getElementById('social-pumplive-wrap');
    const pumplivePill = document.getElementById('social-pumplive-btn');
    const pumpliveLabel = document.getElementById('social-pumplive-label');
    const pumplivePopup = document.getElementById('social-pumplive-popup');
    if (pumpliveWrap && pumplivePill && pumpliveLabel && pumplivePopup) {
      if (pumpLive && typeof pumpLive === 'object') {
        pumpliveWrap.style.display = 'inline-flex';
        const exchangeName = tokenInfo.exchange?.name || 'Pumpfun';
        pumpliveLabel.textContent = `LIVE`;
        const pumpliveIcon = document.getElementById('social-pumplive-icon') as HTMLImageElement;
        if (pumpliveIcon && tokenInfo.exchange?.logo) {
          pumpliveIcon.src = tokenInfo.exchange.logo;
          pumpliveIcon.alt = exchangeName;
          pumpliveIcon.style.display = 'inline-block';
        } else if (pumpliveIcon) {
          pumpliveIcon.style.display = 'none';
        }
        const thumbEl = document.getElementById('pumplive-popup-thumb') as HTMLImageElement;
        const nameEl = document.getElementById('pumplive-popup-name');
        const symbolEl = document.getElementById('pumplive-popup-symbol');
        const timeEl = document.getElementById('pumplive-popup-time');
        const repliesEl = document.getElementById('pumplive-popup-replies');
        const openBtn = document.getElementById('pumplive-popup-open-btn') as HTMLAnchorElement;
        const copyBtn = document.getElementById('pumplive-popup-copy');
        const mint = (tokenInfo.mint || tokenInfo.address || '').trim();
        const shortMint = mint.length > 10 ? `${mint.slice(0, 4)}...${mint.slice(-4)}` : mint;
        if (thumbEl) {
          const logoUrl = (tokenInfo.logo || tokenInfo.logo_uri || (this.tokenData && (this.tokenData.logo || this.tokenData.logo_uri)) || tokenInfo.image || pumpLive.thumbnail || '').trim();
          if (logoUrl) {
            thumbEl.src = logoUrl;
            thumbEl.alt = tokenInfo.name || '';
            thumbEl.style.display = '';
            thumbEl.removeAttribute('srcset');
            thumbEl.referrerPolicy = 'no-referrer';
            thumbEl.onerror = () => {
              const fallback = (pumpLive.thumbnail || '').trim();
              if (fallback && thumbEl.src !== fallback) {
                thumbEl.src = fallback;
              } else {
                thumbEl.style.display = 'none';
              }
            };
          } else {
            thumbEl.src = '';
            thumbEl.style.display = 'none';
          }
        }
        const headerImgEl = document.getElementById('pumplive-popup-header-img') as HTMLImageElement;
        if (headerImgEl) {
          const headerThumb = (pumpLive.thumbnail || '').trim();
          if (headerThumb) {
            headerImgEl.src = headerThumb;
            headerImgEl.alt = tokenInfo.name || 'Live';
            headerImgEl.style.display = 'block';
            headerImgEl.referrerPolicy = 'no-referrer';
          } else {
            headerImgEl.src = '';
            headerImgEl.style.display = 'none';
          }
        }
        if (nameEl) nameEl.textContent = tokenInfo.name || '—';
        if (symbolEl) symbolEl.textContent = shortMint || '—';
        if (timeEl) timeEl.textContent = pumpLive.startAt != null ? this.formatElapsedTime(pumpLive.startAt) : '—';
        if (repliesEl) repliesEl.textContent = String(pumpLive.replyCount ?? 0);
        if (openBtn) {
          openBtn.href = mint ? `https://pump.fun/coin/${mint}` : '#';
        }
        if (copyBtn) {
          copyBtn.onclick = () => {
            if (mint && navigator.clipboard) {
              navigator.clipboard.writeText(mint).catch(() => {});
            }
          };
        }
        const pumpliveLogoUrl = (tokenInfo.logo || tokenInfo.logo_uri || (this.tokenData && (this.tokenData.logo || this.tokenData.logo_uri)) || tokenInfo.image || pumpLive.thumbnail || '').trim();
        let pumpliveHideT: ReturnType<typeof setTimeout> | null = null;
        const showPumplivePopup = () => {
          if (pumpliveHideT) clearTimeout(pumpliveHideT);
          pumpliveHideT = null;
          pumplivePopup.style.display = 'block';
          if (thumbEl && pumpliveLogoUrl) {
            thumbEl.style.display = '';
            thumbEl.src = pumpliveLogoUrl;
          }
          const headerThumb = (pumpLive.thumbnail || '').trim();
          if (headerImgEl && headerThumb) {
            headerImgEl.src = headerThumb;
            headerImgEl.style.display = 'block';
          }
        };
        const scheduleHidePumplivePopup = () => {
          if (pumpliveHideT) clearTimeout(pumpliveHideT);
          pumpliveHideT = setTimeout(() => {
            pumplivePopup.style.display = 'none';
            pumpliveHideT = null;
          }, 150);
        };
        pumpliveWrap.onmouseenter = showPumplivePopup;
        pumpliveWrap.onmouseleave = scheduleHidePumplivePopup;
        const popupInner = pumplivePopup.querySelector('.pumplive-popup-inner');
        if (popupInner) {
          popupInner.addEventListener('mouseenter', showPumplivePopup);
          popupInner.addEventListener('mouseleave', scheduleHidePumplivePopup);
        }
      } else {
        pumpliveWrap.style.display = 'none';
        pumplivePopup.style.display = 'none';
      }
    }
  }

  private updateElement(id: string, value: any): void {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) {
      el.textContent = value.toString();
    }
  }

  private updateRugCheck(badges: ReturnType<typeof buildRugcheckBadges> | null): void {
    const defaults = {
      risk: { text: '—', color: 'orange' as const },
      liqLock: { text: '—', color: 'orange' as const },
      mintAuth: { text: '—', color: 'orange' as const },
      honeypot: { text: '—', color: 'orange' as const },
    };
    const b = badges ?? defaults;

    const setBadge = (id: string, badge: { text: string; color: string }) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = badge.text;
        el.classList.remove('green', 'orange', 'red');
        el.classList.add(badge.color);
      }
    };

    setBadge('rug-risk', b.risk);
    setBadge('rug-liquidity', b.liqLock);
    setBadge('rug-mint', b.mintAuth);
    setBadge('rug-honeypot', b.honeypot);
    const unlockedAlert = document.getElementById('rug-unlocked-alert');
    if (unlockedAlert) {
      const liqText = (b.liqLock?.text ?? '').toLowerCase();
      const showAlert = liqText === 'unlocked' || liqText === 'partial';
      unlockedAlert.style.display = showAlert ? 'flex' : 'none';
    }
  }

  private updateRugCheckRisks(risks: Array<{ name: string; description: string; level: string }> | undefined): void {
    const wrap = document.getElementById('rug-check-risks');
    const list = document.getElementById('rug-check-risks-list');
    if (!wrap || !list) return;

    if (!risks?.length) {
      wrap.style.display = 'none';
      list.innerHTML = '';
      return;
    }

    list.innerHTML = '';
    for (const r of risks) {
      if (!r.name && !r.description) continue;
      const levelClass = r.level === 'error' ? 'risk-error' : r.level === 'warn' ? 'risk-warn' : 'risk-info';
      const div = document.createElement('div');
      div.className = `rug-risk-item ${levelClass}`;
      const nameSpan = document.createElement('span');
      nameSpan.className = 'rug-risk-name';
      nameSpan.textContent = r.name;
      const descSpan = document.createElement('span');
      descSpan.className = 'rug-risk-desc';
      descSpan.textContent = r.description;
      div.appendChild(nameSpan);
      div.appendChild(descSpan);
      list.appendChild(div);
    }
    wrap.style.display = '';
  }

  private updateBondingCurve(tokenInfo: any): void {
    const percentage = tokenInfo.bonded
      ? 100
      : Math.min(Math.max(tokenInfo.bondingPercentage ?? 0, 0), 100);
    const percentageEl = document.getElementById('bonding-percentage');
    if (percentageEl) {
      percentageEl.textContent = `${percentage.toFixed(1)}%`;
    }
    const progressBar = document.getElementById('bonding-progress-fill');
    if (progressBar) {
      (progressBar as HTMLElement).style.width = `${percentage}%`;
    }
    this.updateElement('bonding-current', `${percentage.toFixed(1)}%` || '$0.00K');
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

  private extractLockersFromSecurity(securityData: any): Array<{ address: string; name: string }> {
    const ka = securityData?.knownAccounts ?? securityData?.known_accounts ?? securityData?.result?.knownAccounts ?? securityData?.tokenSecurity?.knownAccounts ?? securityData?.data?.knownAccounts ?? securityData?.rugcheck?.knownAccounts;
    if (!ka) return [];
    if (Array.isArray(ka)) {
      return ka
        .filter((v: any) => String(v?.type ?? '').toUpperCase() === 'LOCKER')
        .map((v: any) => ({ address: v?.address ?? v?.pubkey ?? '', name: v?.name ?? 'Locker' }))
        .filter((l) => l.address);
    }
    if (typeof ka === 'object') {
      return Object.entries(ka)
        .filter(([, v]: [string, any]) => String(v?.type ?? '').toUpperCase() === 'LOCKER')
        .map(([addr, v]: [string, any]) => ({ address: addr, name: v?.name ?? 'Locker' }));
    }
    return [];
  }

  private updateFakeLaunchWarning(tokenInfo: any): void {
    const wrap = document.getElementById('fake-launch-warning');
    const textEl = document.getElementById('fake-launch-text');
    if (!wrap || !textEl) return;

    const source = tokenInfo.source;
    const exchangeName = tokenInfo.exchange?.name?.trim() || 'Unknown';

    if (source == null) {
      textEl.textContent = `Fake Launch From Launchpads : ${exchangeName}`;
      wrap.style.display = '';
    } else {
      wrap.style.display = 'none';
    }
  }

  private updateDevLock(lockers: Array<{ address: string; name: string }> | undefined): void {
    const section = document.getElementById('devlock-section');
    const listEl = document.getElementById('devlock-list');
    if (!section || !listEl) return;

    const hasLockers = Array.isArray(lockers) && lockers.length > 0;
    if (hasLockers) {
      console.log('[KOLsuite] DevLock: showing', lockers.length, 'locker(s)');
    }
    if (!hasLockers) {
      section.style.display = 'none';
      return;
    }

    section.style.display = '';
    const items = lockers.map((l) => {
      const shortAddr = `${l.address.slice(0, 6)}...${l.address.slice(-6)}`;
      const solscanUrl = `https://solscan.io/account/${l.address}`;
      return `
        <div class="devlock-item">
          <div class="devlock-info">
            <span class="devlock-name">${l.name || 'Locker'}</span>
            <span class="devlock-address" title="${l.address}">${shortAddr}</span>
          </div>
          <a href="${solscanUrl}" target="_blank" rel="noopener noreferrer" class="devlock-btn">
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/><path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/></svg>
            View on Solscan
          </a>
        </div>
      `;
    });
    listEl.innerHTML = items.join('');
  }

  private loadGitHubWebview(): void {
    const iframe = document.getElementById('github-repo-iframe') as HTMLIFrameElement;
    const emptyEl = document.getElementById('github-empty');
    const githubUrl = this.tokenData?.github?.trim();
    const match = githubUrl?.match(/github\.com\/([^/]+\/[^/?]+)/i);
    const hasRepo = !!match?.[1];

    if (iframe && emptyEl) {
      if (hasRepo) {
        const github1sUrl = `https://github1s.com/${match[1]}`;
        iframe.src = github1sUrl;
        iframe.style.display = 'block';
        emptyEl.style.display = 'none';
      } else {
        iframe.src = 'about:blank';
        iframe.style.display = 'none';
        emptyEl.style.display = 'flex';
      }
    }
  }

  private getYouTubeVideoId(url: string): string | null {
    if (!url?.trim()) return null;
    const youtuBe = url.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\?.*)?$/i);
    if (youtuBe) return youtuBe[1];
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})(?:\?.*)?/i);
    return ytMatch ? ytMatch[1] : null;
  }

  private loadYouTubeWebview(): void {
    const thumbnailLink = document.getElementById('youtube-thumbnail-link') as HTMLAnchorElement;
    const thumbnailImg = document.getElementById('youtube-thumbnail-img') as HTMLImageElement;
    const emptyEl = document.getElementById('youtube-empty');
    const youtubeUrl = this.tokenData?.youtube?.trim() || '';
    const videoId = this.getYouTubeVideoId(youtubeUrl);

    if (thumbnailLink && thumbnailImg && emptyEl) {
      if (videoId) {
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        const thumbFallback = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        thumbnailLink.href = watchUrl;
        thumbnailImg.src = thumbUrl;
        thumbnailImg.onerror = () => { thumbnailImg.src = thumbFallback; };
        thumbnailLink.style.display = 'flex';
        emptyEl.style.display = 'none';
      } else {
        thumbnailLink.style.display = 'none';
        thumbnailImg.src = '';
        emptyEl.style.display = 'flex';
      }
    }
  }

  private toggleDexPaid(): void {
    const header = document.getElementById('dexpaid-toggle');
    const content = document.getElementById('dexpaid-content');
    
    if (header && content) {
      header.classList.toggle('active');
      content.classList.toggle('expanded');
    }
  }

  private getDateKey(ts: number): string {
    try {
      const d = new Date(ts);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch {
      return String(ts);
    }
  }

  private formatElapsedTime(startAt: number): string {
    const ms = startAt < 1e12 ? startAt * 1000 : startAt;
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days} d ago`;
    if (hours > 0) return `${hours} h ago`;
    if (mins > 0) return `${mins} m ago`;
    return 'just now';
  }

  private formatPaymentTimestamp(ts: number): string {
    try {
      const d = new Date(ts);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const timeStr = d.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit', hour12: true });
      return `${dateStr} ${timeStr} UTC`;
    } catch {
      return '—';
    }
  }

  private updateDexPaidHistory(dexPaidData: { orders?: Array<{ type?: string; status?: string; paymentTimestamp?: number }>; boosts?: Array<{ amount?: number; paymentTimestamp?: number }> } | null): void {
    const section = document.getElementById('dexpaid-section');
    const listEl = document.getElementById('dexpaid-list');
    if (!section || !listEl) return;

    const hasData = dexPaidData && (
      (Array.isArray(dexPaidData.orders) && dexPaidData.orders.length > 0) ||
      (Array.isArray(dexPaidData.boosts) && dexPaidData.boosts.length > 0)
    );

    if (!hasData) {
      section.style.display = 'none';
      return;
    }

    section.style.display = '';
    const header = document.getElementById('dexpaid-toggle');
    const content = document.getElementById('dexpaid-content');
    if (header && content) {
      header.classList.add('active');
      content.classList.add('expanded');
    }
    const items: string[] = [];
    let idx = 1;

    const orders = (dexPaidData.orders ?? []).sort((a, b) => (Number(b?.paymentTimestamp) || 0) - (Number(a?.paymentTimestamp) || 0));
    for (const o of orders) {
      const rawType = o.type ?? 'order';
      const type = rawType ? rawType.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim() : 'Order';
      const status = (o.status ?? '').toLowerCase();
      const statusClass = status === 'approved' ? 'badge-success' : status === 'pending' ? 'badge-warning' : status === 'rejected' ? 'badge-danger' : 'badge-muted';
      const paymentAt = o.paymentTimestamp != null ? this.formatPaymentTimestamp(o.paymentTimestamp) : '—';
      items.push(`
        <div class="dexpaid-item dexpaid-order">
          <div class="dexpaid-item-label">${idx}. Order</div>
          <div class="dexpaid-item-body">
            <span class="dexpaid-type">${type}</span>
            <span class="dexpaid-badge ${statusClass}">${o.status ?? '—'}</span>
            <span class="dexpaid-meta">${paymentAt}</span>
          </div>
        </div>
      `);
      idx++;
    }

    const boosts = (dexPaidData.boosts ?? []).sort((a, b) => (Number(b?.paymentTimestamp) || 0) - (Number(a?.paymentTimestamp) || 0));
    for (const b of boosts) {
      const amount = b.amount != null ? `${b.amount}` : '—';
      const boostAt = b.paymentTimestamp != null ? this.formatPaymentTimestamp(b.paymentTimestamp) : '—';
      items.push(`
        <div class="dexpaid-item dexpaid-boost">
          <div class="dexpaid-item-label">${idx}. Booster</div>
          <div class="dexpaid-item-body">
            <span class="dexpaid-boost-icon" title="Boost">⚡</span>
            <span class="dexpaid-amount">${amount}</span>
            <span class="dexpaid-meta">${boostAt}</span>
          </div>
        </div>
      `);
      idx++;
    }

    listEl.innerHTML = items.join('');
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

  /** Build buy links for Solana token (URLs match supported platforms) */
  private getTokenBuyLinks(mint: string): { label: string; url: string }[] {
    if (!mint || mint.length < 32) return [];
    return [
      { label: 'GMGN', url: `https://gmgn.ai/sol/token/${mint}` },
      { label: 'Axiom', url: `https://axiom.trade/meme/${mint}?chain=sol` },
      { label: 'Trojan', url: `https://trojan.com/terminal?token=${mint}` },
      { label: 'Pump', url: `https://pump.fun/coin/${mint}` },
      { label: 'Padre', url: `https://trade.padre.gg/trade/solana/${mint}` },
      { label: 'BullX', url: `https://neo.bullx.io/terminal?chainId=1399811149&address=${mint}` },
      { label: 'Telemetry', url: `https://app.telemetry.io/trading/${mint}` },
    ];
  }

  /** Navigate the currently open tab to a URL (refresh page with new URL) */
  private openBuyInCurrentTab(url: string): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs?.length || !tabs[0].id) {
        this.showToast('Could not get active tab');
        return;
      }
      chrome.tabs.update(tabs[0].id!, { url });
    });
  }

  /** When user clicks Trade on trending: detect terminal from open tab and replace URL with token. */
  private openTrendingTokenInCurrentTerminal(mint: string, poolAddress?: string | null): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs?.length) return;
      const tabUrl = tabs[0]?.url;
      const url = this.getBuyUrlForOpenTerminal(tabUrl, mint, poolAddress);
      if (url && tabs[0]?.id) chrome.tabs.update(tabs[0].id, { url });
    });
  }

  /** Detect which terminal is open from tab URL; return buy URL. Axiom/Padre use poolAddress when given. */
  private getBuyUrlForOpenTerminal(tabUrl: string | undefined, mint: string, poolAddress?: string | null): string | null {
    if (!mint || mint.length < 32) return null;
    const url = (tabUrl || '').toLowerCase();
    const pool = (poolAddress || '').trim() || mint;
    if (url.includes('gmgn.ai')) return `https://gmgn.ai/sol/token/${mint}`;
    if (url.includes('axiom.trade') || url.includes('axiom')) return `https://axiom.trade/meme/${pool}?chain=sol`;
    if (url.includes('trojan.com')) return `https://trojan.com/terminal?token=${mint}`;
    if (url.includes('pump.fun')) return `https://pump.fun/coin/${mint}`;
    if (url.includes('padre.gg')) return `https://trade.padre.gg/trade/solana/${pool}`;
    if (url.includes('bullx.io')) return `https://neo.bullx.io/terminal?chainId=1399811149&address=${mint}`;
    if (url.includes('telemetry.io')) return `https://app.telemetry.io/trading/${mint}`;
    return null;
  }

  /** Discord message components: one row of Buy link buttons (Trojan, Axiom, GMGN, Padre) */
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

  /** Build embed field value: link markdown [Label](url) for fallback when button does not appear */
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
    previewCard.style.display = 'none'; /* Preview post is not shown during generate */
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
