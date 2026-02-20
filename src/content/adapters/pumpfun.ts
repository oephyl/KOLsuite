/**
 * Pump.fun adapter for token detection
 * URL pattern: https://pump.fun/coin/{tokenAddress}
 */

import {
  TokenAdapter,
  isLikelySolanaAddress,
  extractPotentialAddresses,
} from './base';

export class PumpFunAdapter implements TokenAdapter {
  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'pump.fun' || urlObj.hostname.endsWith('.pump.fun');
    } catch {
      return false;
    }
  }

  extractMintFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter((p) => p);
      const coinIndex = pathParts.indexOf('coin');
      if (coinIndex !== -1 && pathParts.length > coinIndex + 1) {
        const potentialMint = pathParts[coinIndex + 1];
        if (isLikelySolanaAddress(potentialMint)) {
          return potentialMint;
        }
      }
      const lastSegment = pathParts[pathParts.length - 1];
      if (lastSegment && isLikelySolanaAddress(lastSegment)) {
        return lastSegment;
      }
      return null;
    } catch {
      return null;
    }
  }

  extractMintFromDom(document: Document): string | null {
    const selectors = ['[data-mint]', '[data-token]', '[data-address]', '.token-address'];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = el.textContent || el.getAttribute('data-mint') || el.getAttribute('data-address') || '';
        const addresses = extractPotentialAddresses(text);
        if (addresses.length > 0) return addresses[0];
      }
    }
    const bodyText = document.body?.innerText || '';
    const addresses = extractPotentialAddresses(bodyText);
    return addresses.length > 0 ? addresses[0] : null;
  }

  getName(): string {
    return 'Pump.fun';
  }
}
