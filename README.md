# Token Peek

A production-grade Chrome Extension (Manifest V3) that automatically detects Solana tokens on terminal pages and displays token information in a clean overlay panel.

## Features

- **🔍 Auto Detection**: Automatically detects token mint addresses from URLs and DOM on supported terminal sites
- **📊 Token Information**: Displays token decimals, total supply, and other key metrics
- **🎨 Clean UI**: Modern, responsive overlay panel that doesn't interfere with the underlying page
- **⚙️ Configurable**: Customizable RPC endpoint and display settings
- **🔄 Real-time Updates**: Monitors page changes for SPA navigation and DOM updates
- **📋 Quick Actions**: Copy mint address, refresh data, open in Solscan explorer

## Supported Sites

- **GMGN.ai** (`gmgn.ai` and subdomains)
- **Trojan** (`*.trojan.*`)
- **Axiom** (`*.axiom.*`)
- **Padre** (`*.padre.*`)

## Installation

### Development Setup

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd token-peek
npm install
```

2. **Build the extension**:
```bash
npm run build
```

3. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from your project

### Production Build

```bash
npm run build
```

The built extension will be in the `dist` directory.

## Development

### Scripts

- `npm run dev` - Build in watch mode for development
- `npm run build` - Production build
- `npm run type-check` - TypeScript type checking

### Project Structure

```
src/
├── manifest.json              # Extension manifest (MV3)
├── background/
│   └── serviceWorker.ts       # Background service worker
├── content/
│   ├── index.ts              # Content script entry point
│   ├── detector.ts           # Token detection engine
│   ├── overlay.ts            # UI overlay component
│   ├── overlay.css           # Overlay styles
│   └── adapters/             # Site-specific adapters
│       ├── base.ts           # Base adapter interface
│       ├── gmgn.ts           # GMGN.ai adapter
│       ├── trojan.ts         # Trojan adapter
│       ├── axiom.ts          # Axiom adapter
│       └── padre.ts          # Padre adapter
├── options/
│   ├── options.html          # Options page
│   ├── options.ts            # Options page logic
│   └── options.css           # Options page styles
└── shared/
    ├── types.ts              # TypeScript type definitions
    ├── storage.ts            # Chrome storage wrapper
    ├── cache.ts              # In-memory caching
    └── rpc.ts                # Solana RPC client
```

### Architecture

#### Token Detection System

The extension uses an **adapter pattern** for site-specific token detection:

1. **URL Detection**: Extracts mint addresses from URL patterns (most reliable)
2. **DOM Detection**: Scans page content for Solana addresses (fallback)
3. **Generic Detection**: Uses regex to find potential base58 addresses

#### Adapters

Each supported site has its own adapter implementing:
```typescript
interface TokenAdapter {
  canHandle(url: string): boolean;
  extractMintFromUrl(url: string): string | null;
  extractMintFromDom(document: Document): string | null;
  getName(): string;
}
```

#### SPA Support

- **URL Monitoring**: Overrides `pushState`/`replaceState` and listens for `popstate`
- **DOM Monitoring**: Uses `MutationObserver` to detect content changes
- **Polling Fallback**: 5-second interval as a safety net

#### RPC Integration

Two patterns for fetching token data:

**Pattern A (Default)**: Direct fetch from content script
```typescript
const tokenInfo = await fetchTokenInfoDirect(mint, rpcUrl);
```

**Pattern B (CORS Fallback)**: Via background service worker
```typescript
const tokenInfo = await fetchTokenInfoViaBackground(mint);
```

Switch to Pattern B by modifying the RPC calls in the content script if CORS blocks direct requests.

## Configuration

### RPC Endpoints

Configure custom Solana RPC endpoints in the extension options:

- **Default**: `https://api.mainnet-beta.solana.com`
- **Presets**: Serum, Ankr, or custom endpoints

### Display Settings

- **Auto-open Panel**: Automatically show overlay when token detected
- **Minimize/Expand**: Collapsible overlay panel

## Usage

1. **Navigate** to a supported terminal site (GMGN.ai, etc.)
2. **Open a token page** - the extension will automatically detect the token mint
3. **View information** in the overlay panel on the right side
4. **Use quick actions**:
   - Copy mint address to clipboard
   - Refresh token data
   - Open token in Solscan explorer

### Manual Controls

- Click the **minimize button** (−) to collapse the panel to a small pill
- Click the **close button** (×) to hide the overlay completely
- Use the **refresh button** to reload token data
- Click **Explorer** to open the token page on Solscan

## Technical Details

### Manifest V3 Compliance

- Uses **service worker** instead of background page
- **Declarative content scripts** with proper host permissions
- **Web accessible resources** for CSS injection
- **Chrome.storage.sync** for settings persistence

### Security & Privacy

- **No data collection**: Extension only stores user settings locally
- **Minimal permissions**: Only requests necessary permissions
- **Secure RPC**: All API calls use HTTPS endpoints
- **Content isolation**: Overlay uses prefixed CSS classes to avoid conflicts

### Caching Strategy

- **30-second TTL** for token data
- **In-memory cache** (no persistent storage of token data)
- **Automatic cleanup** of expired entries

### Error Handling

- **Graceful degradation** when RPC fails
- **User feedback** for connection issues
- **Fallback detection** methods when primary adapters fail

## Browser Support

- **Chrome 88+** (Manifest V3 requirement)
- **Edge 88+** (Chromium-based)

## Contributing

### Adding New Sites

1. Create a new adapter in `src/content/adapters/`
2. Implement the `TokenAdapter` interface
3. Add the adapter to the detector in `src/content/detector.ts`
4. Update host permissions in `manifest.json`
5. Add content script matches for the new domain

### Development Guidelines

- **TypeScript**: All code must be strongly typed
- **Error Handling**: Wrap async operations in try-catch
- **Logging**: Use consistent `[TokenPeek]` prefix for console logs
- **Testing**: Test on actual target sites

## Troubleshooting

### Common Issues

**"RPC Connection Failed"**
- Check if custom RPC endpoint is accessible
- Try switching to a different RPC provider
- Verify internet connection

**"No Token Detected"**
- Ensure you're on a supported site
- Check if the page URL contains the token mint
- Try refreshing the page

**"Overlay Not Showing"**
- Check extension permissions
- Verify site is in supported domains list
- Open browser console for error messages

### Debug Mode

Enable debug logs by opening browser console on any supported page. Look for `[TokenPeek]` prefixed messages.

### Reset Settings

1. Go to `chrome://extensions/`
2. Click on Token Peek
3. Click "Extension options"
4. Click "Reset to Defaults"

## License

MIT License - see LICENSE file for details.

## Support

For issues, feature requests, or questions:
1. Check the browser console for error messages
2. Verify you're on a supported site
3. Check the extension's options page for configuration issues

---

**Version**: 1.0.0  
**Manifest Version**: 3  
**Compatible**: Chrome 88+, Edge 88+