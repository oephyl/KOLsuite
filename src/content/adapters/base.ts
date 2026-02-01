/**
 * Base adapter interface for token detection
 */

export interface TokenAdapter {
  /**
   * Check if this adapter can handle the current URL
   */
  canHandle(url: string): boolean;

  /**
   * Extract token mint from URL
   * Returns null if not found
   */
  extractMintFromUrl(url: string): string | null;

  /**
   * Extract token mint from DOM
   * Returns null if not found
   */
  extractMintFromDom(document: Document): string | null;

  /**
   * Get adapter name for debugging
   */
  getName(): string;
}

/**
 * Utility: Validate if a string looks like a Solana address
 * Base58 characters, length 32-44
 */
export function isLikelySolanaAddress(str: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(str);
}

/**
 * Utility: Extract potential Solana addresses from text
 */
export function extractPotentialAddresses(text: string): string[] {
  const base58Pattern = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
  const matches = text.match(base58Pattern) || [];
  return [...new Set(matches)]; // Remove duplicates
}
