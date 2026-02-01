/**
 * Background service worker for Token Peek extension
 * Handles RPC requests if CORS blocks direct calls from content script
 */

console.log('[TokenPeek] Background service worker loaded');

/**
 * Handle extension icon click - open side panel
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
      console.error('[TokenPeek] Failed to open side panel:', error);
    }
  }
});

/**
 * Handle token info fetch request
 */
async function handleFetchTokenInfo(
  payload: any,
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    if (!payload || !payload.mintAddress) {
      throw new Error('Missing mintAddress in payload');
    }

    console.log('[TokenPeek] Fetching token info for:', payload.mintAddress);

    const rpcUrl = 'https://mainnet.helius-rpc.com/?api-key=a715727e-ac65-43f4-8694-8281e0b31d21';

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenSupply',
        params: [payload.mintAddress],
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    if (!data.result || !data.result.value) {
      throw new Error('Invalid RPC response format');
    }

    sendResponse({
      success: true,
      data: {
        decimals: data.result.value.decimals,
        supply: data.result.value.amount,
      },
    });

    console.log('[TokenPeek] Token info fetched successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TokenPeek] Failed to fetch token info:', error);

    sendResponse({
      success: false,
      error: errorMessage,
    });
  }
}

// Setup chrome.runtime message listeners
try {
  chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
    try {
      console.log('[TokenPeek] Background received message:', message);

      if (message.type === 'FETCH_TOKEN_INFO') {
        handleFetchTokenInfo(message.payload, sendResponse);
        return true; // Keep message channel open for async response
      }

      if (message.type === 'PING') {
        sendResponse({ status: 'pong' });
        return false;
      }

      // Relay message from sidepanel to content script
      if (message.type === 'RELAY_TO_CONTENT_SCRIPT') {
        const tabId = message.tabId;
        const contentMessage = message.contentMessage;
        
        console.log('[TokenPeek] Relaying message to tab:', tabId, 'with message:', contentMessage);
        
        chrome.tabs.sendMessage(tabId, contentMessage, (response) => {
          console.log('[TokenPeek] Relay callback received, response:', response);
          
          if (chrome.runtime.lastError) {
            console.error('[TokenPeek] Relay error:', chrome.runtime.lastError);
            sendResponse({ 
              error: chrome.runtime.lastError?.message || 'Unknown relay error',
              tokenInfo: null
            });
          } else if (response) {
            console.log('[TokenPeek] Relay response successful:', response);
            sendResponse(response);
          } else {
            console.warn('[TokenPeek] Relay received empty response');
            sendResponse({ 
              error: 'Empty response from content script',
              tokenInfo: null
            });
          }
        });
        
        return true; // Keep channel open for async callback
      }

      console.warn('[TokenPeek] Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
      return false;
    } catch (error) {
      console.error('[TokenPeek] Error in onMessage handler:', error);
      sendResponse({ error: 'Handler error' });
      return false;
    }
  });
} catch (error) {
  console.error('[TokenPeek] Failed to setup message listener:', error);
}

// Extension lifecycle events
try {
  chrome.runtime.onStartup.addListener(() => {
    console.log('[TokenPeek] Extension started');
  });

  chrome.runtime.onInstalled.addListener((details: any) => {
    console.log('[TokenPeek] Extension installed:', details);
    
    if (details.reason === 'install') {
      console.log('[TokenPeek] First time install');
    } else if (details.reason === 'update') {
      console.log('[TokenPeek] Extension updated from:', details.previousVersion);
    }
  });
} catch (error) {
  console.error('[TokenPeek] Failed to setup lifecycle listeners:', error);
}