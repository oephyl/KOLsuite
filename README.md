# KOLsuite

> All-in-one Chrome extension toolkit for Solana KOLs to analyze and promote tokens

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/)

KOLsuite is a production-grade Chrome extension designed specifically for Solana Key Opinion Leaders (KOLs) to streamline their workflow when analyzing and promoting tokens across multiple platforms.

## ✨ Features

### 🔍 Multi-Platform Token Detection
- **Auto-detection** on GMGN.ai, NeoBull X, Trojan, Axiom, and Padre
- Real-time token data extraction from URLs and DOM
- Automatic token data refresh on page navigation

### 📊 Comprehensive Token Analysis
- **Token Identity**: Name, symbol, avatar, contract address
- **Market Metrics**: Price, MCAP, FDV, 24H Volume, Liquidity
- **Performance**: 5m, 1h, 6h, 24h price changes
- **Security**: Fees paid, audit status, rug check
- **Token Economics**: Bundled %, sniped %, dev holdings, insiders %
- **Holders**: Top 10 holders concentration, total holders count
- **Bonding Curve**: Visual progress bar with current/target values

### 📝 Smart Caption Generator
- **Template System**: Customizable templates with parameter placeholders
- **Dynamic Parameters**: `{NAME}`, `{SYMBOL}`, `{PRICE}`, `{MCAP}`, etc.
- **Emoji Picker**: Quick emoji insertion (30+ crypto-related emojis)
- **Click-to-Insert**: Click parameters or emojis to add to template
- **Live Preview**: See formatted caption before posting

### 📢 Social Media Integration
- **Multi-Platform Posting**: X (Twitter), Telegram, Discord
- **One-Click Share**: Post to all platforms simultaneously
- **Platform Authentication**: Secure API token management
- **Test Connections**: Verify credentials before posting

### 📈 Subscription Management
- **Token Limits**: Track API usage with visual badge
- **Tier System**: Free and Premium tier badges
- **Usage Warnings**: Alerts at 70%, 90%, and 100% usage

### 🔒 Authentication
- **Sign in with X**: X account integration
- **Session Management**: Persistent user profile with avatar

## 🚀 Installation

### For Users

1. Download the latest release from [Releases](../../releases)
2. Extract the ZIP file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the extracted `dist` folder

### For Developers

```bash
# Clone the repository
git clone https://github.com/yourusername/KOLsuite.git
cd KOLsuite

# Install dependencies
npm install

# Build the extension
npm run build

# The built extension will be in the dist/ folder
```

## 🛠️ Development

### Prerequisites

- Node.js 16+ and npm
- Chrome/Edge browser

### Scripts

```bash
npm run build      # Production build
npm run dev        # Development build with watch mode
npm run type-check # TypeScript type checking
```

### Project Structure

```
KOLsuite/
├── src/
│   ├── manifest.json           # Extension manifest (MV3)
│   ├── background/
│   │   └── serviceWorker.ts    # Background service worker
│   ├── content/
│   │   ├── detector.ts         # Token detection engine
│   │   ├── overlay.ts          # Content script overlay
│   │   └── adapters/           # Platform-specific adapters
│   │       ├── gmgn.ts         # GMGN.ai
│   │       ├── neobull.ts      # NeoBull X
│   │       ├── trojan.ts       # Trojan
│   │       ├── axiom.ts        # Axiom
│   │       └── padre.ts        # Padre
│   ├── sidepanel/
│   │   ├── sidepanel.html      # Main UI
│   │   ├── sidepanel.ts        # UI logic
│   │   └── sidepanel.css       # Styling
│   ├── shared/
│   │   ├── types.ts            # TypeScript definitions
│   │   ├── storage.ts          # Chrome Storage API wrapper
│   │   ├── rpc.ts              # Solana RPC client
│   │   └── cache.ts            # Caching utilities
│   └── img/                    # Assets
├── dist/                       # Built extension (generated)
├── vite.config.ts             # Vite build configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Project dependencies
```

## 📖 Usage

### Token Analysis

1. Navigate to any supported platform (GMGN.ai, NeoBull X, etc.)
2. Click the KOLsuite extension icon to open the side panel
3. Token data will automatically load and display

### Creating Captions

1. Open the side panel on a token page
2. Scroll to the "Caption" section
3. Click the settings icon to open template editor
4. Click parameters or emojis to insert into template
5. Edit the template as desired
6. Click "Save Template"
7. Click "Generate" to create a caption from your template
8. Click "Post to X", "Telegram", or "Discord" to share

### Social Media Setup

1. Click the settings icon in the header
2. Configure your credentials:
   - **X Username**: Your X handle (e.g., @yourhandle)
   - **Telegram**: Bot Token and Chat ID
   - **Discord**: Webhook URL
3. Use "Test Connection" buttons to verify
4. Save settings

## 🔧 Configuration

### Caption Template Parameters

| Parameter | Description |
|-----------|-------------|
| `{NAME}` | Token name |
| `{SYMBOL}` | Token symbol |
| `{PRICE}` | Current price |
| `{MCAP}` | Market capitalization |
| `{FDV}` | Fully diluted valuation |
| `{VOLUME}` | 24-hour trading volume |
| `{LIQUIDITY}` | Total liquidity |
| `{FEES}` | Fees paid |
| `{AUDIT}` | Audit status |
| `{5M}`, `{1H}`, `{6H}`, `{24H}` | Price changes |
| `{BUNDLED}` | Bundled percentage |
| `{SNIPED}` | Sniped percentage |
| `{DEVHOLD}` | Dev holdings |
| `{INSIDERS}` | Insider holdings |
| `{TOP10}` | Top 10 holders % |
| `{HOLDERS}` | Total holder count |
| `{CA}` | Contract address |

### Example Template

```
🚀 {NAME} (${SYMBOL})

💰 Price: {PRICE}
📊 MCAP: {MCAP}
💧 Liquidity: {LIQUIDITY}
📈 24H Vol: {VOLUME}

📍 CA: {CA}

#Solana #Crypto #{SYMBOL}
```

## 🌐 Supported Platforms

- ✅ **GMGN.ai** - Full token detection and analysis
- ✅ **NeoBull X** - Full token detection and analysis
- ✅ **Trojan** - Full token detection and analysis
- ✅ **Axiom** - Full token detection and analysis
- ✅ **Padre** - Full token detection and analysis

## 🔐 Privacy & Security

- All API credentials stored locally in Chrome Storage
- No data sent to external servers (except platform APIs)
- Telegram and Discord use official APIs
- No tracking or analytics

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Vite](https://vitejs.dev/) and [TypeScript](https://www.typescriptlang.org/)
- Uses [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/) for blockchain interactions
- Icon design and UI inspired by modern Web3 aesthetics

## 📞 Support

For issues, questions, or suggestions:
- Open an [issue](../../issues)
- Contact via X: [@YourHandle]

---

**Made with ❤️ for the Solana KOL community**