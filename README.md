# V4V Analytics

Value for Value payment analytics CLI for Bitcoin Lightning payments via NWC (Nostr Wallet Connect).

> **⚠️ Not yet standalone.** This tool requires a Lightning payment proxy that injects page URLs into invoice descriptions. A working implementation is live at shawnyeager.com and will be extracted for general-purpose use. For now, you'll need to set up your own proxy.

## Setup

```bash
npm install
```

Create a `.env` file with your NWC connection string:

```bash
NWC_CONNECTION_STRING=nostr+walletconnect://...
```

Or export it in your shell:

```bash
export NWC_CONNECTION_STRING="nostr+walletconnect://..."
```

## Usage

```bash
# Show help
./bin/v4v

# Generate payment report
./bin/v4v report
./bin/v4v report --usd              # Include USD values
./bin/v4v report --by-essay         # Show breakdown by essay/page
./bin/v4v report --time-series      # Show monthly trend
./bin/v4v report --format json      # JSON output

# Start web dashboard
./bin/v4v dashboard
./bin/v4v dashboard -p 8080         # Custom port

# Manage cache
./bin/v4v cache                     # Show cache stats
./bin/v4v cache --clear             # Clear cache
```

## Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `NWC_CONNECTION_STRING` | NWC connection URL (required) | - |
| `V4V_SITE_URL` | Site URL for filtering payments (required) | - |
| `V4V_RSS_URL` | RSS feed URL for essay titles | `https://{V4V_SITE_URL}/feed.xml` |
| `NWC_TIMEOUT` | NWC request timeout in ms | `120000` |

## How It Works

1. Connects to your Alby Hub via NWC protocol
2. Fetches incoming Lightning payments
3. Filters for V4V payments (containing your site URL in description)
4. Caches transactions locally for fast subsequent runs
5. Fetches essay titles from your site's RSS feed for friendly display

## License

MIT
