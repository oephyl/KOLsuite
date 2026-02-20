
/**
 * Trojan adapter for token detection
 * URL pattern: https://trojan.com/terminal?token={tokenAddress}
 */
import {
  TokenAdapter,
  isLikelySolanaAddress,
  extractPotentialAddresses,
} from './base';

export class TrojanAdapter implements TokenAdapter {
  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('trojan');
    } catch {
      return false;
    }
  }

  extractMintFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Primary: ?token={mint} (e.g. /terminal?token=xxx)
      const tokenParam = urlObj.searchParams.get('token');
      if (tokenParam && isLikelySolanaAddress(tokenParam.trim())) {
        return tokenParam.trim();
      }
      const pathParts = urlObj.pathname.split('/').filter((p) => p);
      // Fallback: /token/{mint} in path
      const tokenIndex = pathParts.indexOf('token');
      if (tokenIndex !== -1 && pathParts.length > tokenIndex + 1) {
        const potentialMint = pathParts[tokenIndex + 1];
        if (isLikelySolanaAddress(potentialMint)) {
          return potentialMint;
        }
      }
      for (const part of pathParts) {
        if (isLikelySolanaAddress(part)) {
          return part;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  extractMintFromDom(document: Document): string | null {
    // Check common selectors
    const selectors = [
      '[data-mint]',
      '[data-token-address]',
      '.contract-address',
      '.token-mint',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent || element.getAttribute('data-mint') || '';
        const addresses = extractPotentialAddresses(text);
        if (addresses.length > 0) {
          return addresses[0];
        }
      }
    }

    // Fallback: scan page
    const bodyText = document.body.innerText;
    const addresses = extractPotentialAddresses(bodyText);
    return addresses.length > 0 ? addresses[0] : null;
  }

  getName(): string {
    return 'Trojan';
  }
}
