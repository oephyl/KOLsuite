/**
 * Telemetry adapter for token detection
 * URL pattern: https://app.telemetry.io/trading/{tokenAddress}
 */

import {
  TokenAdapter,
  isLikelySolanaAddress,
  extractPotentialAddresses,
} from './base';

export class TelemetryAdapter implements TokenAdapter {
  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('telemetry.io');
    } catch {
      return false;
    }
  }

  extractMintFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter((p) => p);
      const tradingIndex = pathParts.indexOf('trading');
      if (tradingIndex !== -1 && pathParts.length > tradingIndex + 1) {
        const potentialMint = pathParts[tradingIndex + 1];
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
    return 'Telemetry';
  }
}
