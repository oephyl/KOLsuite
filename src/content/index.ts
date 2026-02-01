/**
 * Content script - Token detection for supported websites
 */

console.log('[TokenPeek] Content script loaded at:', window.location.href);

// Extract token from URL - simple and reliable
function extractTokenFromPage(): any {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  console.log('[TokenPeek] Extracting from URL:', url);
  console.log('[TokenPeek] Hostname:', hostname);

  let mint: string | null = null;

  // Try query parameter (?token=xxx)
  const queryMatch = url.match(/[?&]token=([^&\s#]+)/);
  if (queryMatch && queryMatch[1]) {
    mint = decodeURIComponent(queryMatch[1]).trim();
    console.log('[TokenPeek] Found token in query param:', mint);
  }

  // Try path (/token/xxx)
  if (!mint) {
    const pathMatch = url.match(/\/token\/([a-zA-Z0-9]+)/);
    if (pathMatch && pathMatch[1]) {
      mint = pathMatch[1].trim();
      console.log('[TokenPeek] Found token in path:', mint);
    }
  }

  // Validate mint is a Solana address (base58: 1-9, A-Z, a-z excluding I, O, i, l, o)
  if (mint && mint.length >= 32 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(mint)) {
    console.log('[TokenPeek] ✅ Valid token extracted:', mint);
    return { mint, name: 'Token', symbol: 'TKN', decimals: 6, supply: '0' };
  } else {
    console.log('[TokenPeek] ❌ Token not valid - length:', mint?.length, 'mint:', mint);
    return null;
  }
}

// Fetch full token info from RPC
async function fetchTokenInfo(mint: string): Promise<any> {
  try {
    const rpcUrl = 'https://mainnet.helius-rpc.com/?api-key=a715727e-ac65-43f4-8694-8281e0b31d21';
    
    console.log('[TokenPeek] Fetching full token info for:', mint);
    
    let decimals = 6;
    let supply = '0';
    let holders = '-';
    let freezeAuthority = '-';
    let mintAuthority = '-';
    let name = 'Token';
    let symbol = 'TKN';

    // Get token supply and decimals
    try {
      const supplyResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenSupply',
          params: [mint],
        }),
      });

      if (supplyResponse.ok) {
        const supplyData = await supplyResponse.json();
        if (supplyData.result?.value) {
          supply = supplyData.result.value.amount || '0';
          decimals = supplyData.result.value.decimals || 6;
          console.log('[TokenPeek] Token supply:', supply, 'decimals:', decimals);
        }
      }
    } catch (error) {
      console.warn('[TokenPeek] Error fetching supply:', error);
    }

    // Get token largest accounts (holders)
    try {
      const accountsResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'getTokenLargestAccounts',
          params: [mint],
        }),
      });

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        if (accountsData.result?.value) {
          holders = accountsData.result.value.length.toString();
          console.log('[TokenPeek] Token holders:', holders);
        }
      }
    } catch (error) {
      console.warn('[TokenPeek] Error fetching accounts:', error);
    }

    // Get mint info (authorities)
    try {
      const mintResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'getAccountInfo',
          params: [mint, { encoding: 'jsonParsed' }],
        }),
      });

      if (mintResponse.ok) {
        const mintData = await mintResponse.json();
        if (mintData.result?.value?.data?.parsed?.info) {
          const info = mintData.result.value.data.parsed.info;
          
          // Try to get name and symbol from metadata
          if (info.name) name = info.name;
          if (info.symbol) symbol = info.symbol;
          
          // Get authorities
          if (info.freezeAuthority && info.freezeAuthority !== 'null') {
            freezeAuthority = info.freezeAuthority.substring(0, 8) + '...';
          }
          if (info.owner && info.owner !== 'null') {
            mintAuthority = info.owner.substring(0, 8) + '...';
          }
          
          console.log('[TokenPeek] Mint info - name:', name, 'symbol:', symbol);
        }
      }
    } catch (error) {
      console.warn('[TokenPeek] Error fetching mint info:', error);
    }

    console.log('[TokenPeek] Token info complete');

    return {
      mint,
      name,
      symbol,
      decimals,
      supply,
      verified: false,
      holders,
      programs: '-',
      freezeAuthority,
      mintAuthority,
    };
  } catch (error) {
    console.error('[TokenPeek] Error fetching token info:', error);
    // Return basic info even on network error
    return {
      mint,
      name: 'Token',
      symbol: 'TKN',
      decimals: 6,
      supply: '0',
      verified: false,
      holders: '-',
      programs: '-',
      freezeAuthority: '-',
      mintAuthority: '-',
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

// Log when message listener is registered
console.log('[TokenPeek] Registering message listener...');

// Guard to prevent multiple listener registrations
let isListenerRegistered = false;

if (!isListenerRegistered) {
  // Handle messages from sidepanel - optional, mainly for manual refresh
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[TokenPeek] Message received:', request);
    
    if (request.action === 'GET_TOKEN_DATA') {
      console.log('[TokenPeek] Manual refresh requested');
      
      const tokenData = extractTokenFromPage();
      console.log('[TokenPeek] Re-extracted token data:', tokenData);
      
      if (tokenData && tokenData.mint) {
        console.log('[TokenPeek] Token found:', tokenData.mint);
      }
      
      sendResponse({ ok: true });
    }
    
    return false;
  });

  isListenerRegistered = true;
  console.log('[TokenPeek] Message listener registered successfully');
}

// No storage usage - sidepanel extracts directly from URL

// Also monitor for URL changes and re-extract
window.addEventListener('popstate', () => {
  console.log('[TokenPeek] URL changed via popstate');
  const newToken = extractTokenFromPage();
  if (newToken && newToken.mint) {
    chrome.storage.local.set({ currentToken: newToken, lastUpdated: Date.now() });
  }
});
