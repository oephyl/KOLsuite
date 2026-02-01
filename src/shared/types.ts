/**
 * Shared type definitions for Token Peek extension
 */

export interface TokenInfo {
  mint: string;
  decimals: number;
  supply: string;
  name?: string;
  symbol?: string;
  lastUpdated: number;
}

export interface TokenDetectionResult {
  mint: string | null;
  source: 'url' | 'dom' | 'none';
  confidence: 'high' | 'medium' | 'low';
}

export interface ExtensionSettings {
  rpcEndpoint: string;
  autoOpenPanel: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface RpcResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

export interface TokenAccountInfo {
  decimals: number;
  supply: string;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  rpcEndpoint: 'https://mainnet.helius-rpc.com/?api-key=a715727e-ac65-43f4-8694-8281e0b31d21',
  autoOpenPanel: true,
};

export const STORAGE_KEYS = {
  SETTINGS: 'tp_settings',
} as const;
