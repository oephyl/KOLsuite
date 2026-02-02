/**
 * NeoBull X adapter for token detection
 * Example URL patterns:
 * - https://neo.bullx.io/terminal?chainId=1399811149&address={contract_address}
 */

import {
  TokenAdapter,
  isLikelySolanaAddress,
  extractPotentialAddresses,
} from './base';

export class NeoBullAdapter implements TokenAdapter {
  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'neo.bullx.io' || 
             urlObj.hostname.endsWith('.bullx.io');
    } catch {
      return false;
    }
  }

  extractMintFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      
      // Extract from query parameter: ?address={mint}
      const addressParam = urlObj.searchParams.get('address');
      if (addressParam && isLikelySolanaAddress(addressParam)) {
        return addressParam;
      }

      // Check path segments as fallback
      const pathParts = urlObj.pathname.split('/').filter((p) => p);
      
      // Pattern: /terminal/{mint} or similar
      for (const segment of pathParts) {
        if (isLikelySolanaAddress(segment)) {
          return segment;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  extractMintFromDom(document: Document): string | null {
    // Check for common selectors that might contain the mint
    const selectors = [
      '[data-address]',
      '[data-mint]',
      '[data-token]',
      '[data-contract]',
      '.token-address',
      '.contract-address',
      '.mint-address',
      'input[value*="pump"]', // Common in Solana addresses
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const text = 
          element.textContent || 
          element.getAttribute('data-address') || 
          element.getAttribute('data-mint') ||
          element.getAttribute('data-contract') ||
          (element as HTMLInputElement).value ||
          '';
        
        const addresses = extractPotentialAddresses(text);
        if (addresses.length > 0) {
          return addresses[0];
        }
      }
    }

    // Check for copy buttons or address displays
    const copyButtons = document.querySelectorAll('button[title*="Copy"], button[aria-label*="Copy"]');
    for (let i = 0; i < copyButtons.length; i++) {
      const button = copyButtons[i];
      const nearbyText = button.parentElement?.textContent || '';
      const addresses = extractPotentialAddresses(nearbyText);
      if (addresses.length > 0) {
        return addresses[0];
      }
    }

    // Fallback: scan page text for addresses
    const bodyText = document.body.innerText;
    const addresses = extractPotentialAddresses(bodyText);
    
    // Return first valid looking address
    return addresses.length > 0 ? addresses[0] : null;
  }

  getName(): string {
    return 'NeoBull X';
  }
}
