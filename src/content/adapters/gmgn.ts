/**
 * GMGN adapter for token detection
 * Example URL patterns:
 * - https://gmgn.ai/sol/token/[mint]
 * - https://gmgn.ai/token/[mint]
 */

import {
  TokenAdapter,
  isLikelySolanaAddress,
  extractPotentialAddresses,
} from './base';

export class GmgnAdapter implements TokenAdapter {
  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'gmgn.ai' || urlObj.hostname.endsWith('.gmgn.ai');
    } catch {
      return false;
    }
  }

  extractMintFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter((p) => p);

      // Pattern: /sol/token/{mint} or /token/{mint}
      const tokenIndex = pathParts.indexOf('token');
      if (tokenIndex !== -1 && pathParts.length > tokenIndex + 1) {
        const potentialMint = pathParts[tokenIndex + 1];
        if (isLikelySolanaAddress(potentialMint)) {
          return potentialMint;
        }
      }

      // Fallback: check last path segment
      const lastSegment = pathParts[pathParts.length - 1];
      if (isLikelySolanaAddress(lastSegment)) {
        return lastSegment;
      }

      return null;
    } catch {
      return null;
    }
  }

  extractMintFromDom(document: Document): string | null {
    // Check for common selectors that might contain the mint
    const selectors = [
      '[data-mint]',
      '[data-token]',
      '[data-address]',
      '.token-address',
      '.mint-address',
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

    // Fallback: scan page text for addresses
    const bodyText = document.body.innerText;
    const addresses = extractPotentialAddresses(bodyText);
    
    // Return first valid looking address (heuristic: not too common)
    return addresses.length > 0 ? addresses[0] : null;
  }

  getName(): string {
    return 'GMGN';
  }
}
