/**
 * Solana RPC client for fetching token information
 */

import { RpcResponse, TokenAccountInfo } from './types';

export class SolanaRpc {
  private rpcUrl: string;
  private requestId: number = 1;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  /**
   * Update RPC endpoint URL
   */
  setRpcUrl(url: string): void {
    this.rpcUrl = url;
  }

  /**
   * Make a JSON-RPC request
   */
  private async request<T>(method: string, params: any[]): Promise<T> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: this.requestId++,
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.statusText}`);
    }

    const data: RpcResponse<T> = await response.json();

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    if (data.result === undefined) {
      throw new Error('RPC response missing result');
    }

    return data.result;
  }

  /**
   * Fetch token account info (decimals and supply)
   */
  async getTokenInfo(mintAddress: string): Promise<TokenAccountInfo> {
    try {
      // Fetch account info to get decimals
      const accountInfo = await this.request<{
        value: {
          data: [string, string];
          owner: string;
        } | null;
      }>('getAccountInfo', [
        mintAddress,
        {
          encoding: 'jsonParsed',
        },
      ]);

      if (!accountInfo.value) {
        throw new Error('Token account not found');
      }

      // Fetch token supply
      const supplyInfo = await this.request<{
        value: {
          amount: string;
          decimals: number;
          uiAmount: number | null;
          uiAmountString: string;
        };
      }>('getTokenSupply', [mintAddress]);

      return {
        decimals: supplyInfo.value.decimals,
        supply: supplyInfo.value.amount,
      };
    } catch (error) {
      console.error('[TokenPeek] Failed to fetch token info:', error);
      throw error;
    }
  }

  /**
   * Validate if an address is a valid Solana account
   */
  async isValidAccount(address: string): Promise<boolean> {
    try {
      const result = await this.request<{ value: any | null }>(
        'getAccountInfo',
        [address]
      );
      return result.value !== null;
    } catch {
      return false;
    }
  }
}

/**
 * Pattern A: Direct fetch from content script
 * This is the default approach. If CORS blocks this, switch to Pattern B.
 */
export async function fetchTokenInfoDirect(
  mintAddress: string,
  rpcUrl: string
): Promise<TokenAccountInfo> {
  const rpc = new SolanaRpc(rpcUrl);
  return await rpc.getTokenInfo(mintAddress);
}

/**
 * Pattern B: Fetch via background service worker
 * Use this if CORS blocks direct fetches from content script.
 * Send a message to the background worker to fetch the data.
 */
export async function fetchTokenInfoViaBackground(
  mintAddress: string
): Promise<TokenAccountInfo> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'FETCH_TOKEN_INFO',
        payload: { mintAddress },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        resolve(response.data);
      }
    );
  });
}
