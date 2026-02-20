
/**
 * Padre adapter for token detection
 * URL pattern: https://trade.padre.gg/trade/solana/{tokenAddress}
 */
import {
  TokenAdapter,
  isLikelySolanaAddress,
  extractPotentialAddresses,
} from './base';

export class PadreAdapter implements TokenAdapter {
  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('padre');
    } catch {
      return false;
    }
  }

  extractMintFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter((p) => p);
      // Pattern: /trade/solana/{mint}
      const solanaIndex = pathParts.indexOf('solana');
      if (solanaIndex !== -1 && pathParts.length > solanaIndex + 1) {
        const potentialMint = pathParts[solanaIndex + 1];
        if (isLikelySolanaAddress(potentialMint)) {
          return potentialMint;
        }
      }
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
    const selectors = [
      '[data-mint]',
      '[data-token]',
      '.token-address',
      '.contract',
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

    const bodyText = document.body.innerText;
    const addresses = extractPotentialAddresses(bodyText);
    return addresses.length > 0 ? addresses[0] : null;
  }

  getName(): string {
    return 'Padre';
  }
}
