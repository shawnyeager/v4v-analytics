# V4V Bundle for Hugo Sites

Accept Bitcoin Lightning payments on your Hugo site with a clean, theme-agnostic payment page.

## Quick Start

```bash
# 1. Copy files to your Hugo site
cp -r proxy/netlify/* your-site/netlify/
cp -r hugo/layouts/v4v your-site/layouts/
cp hugo/content/v4v.md your-site/content/
cp hugo/assets/css/v4v.css your-site/assets/css/

# 2. Install dependencies
cd your-site
npm install @getalby/sdk bolt11

# 3. Set env vars in Netlify Dashboard:
#    - NWC_CONNECTION_STRING (from Alby)
#    - ALBY_USERNAME (your Alby username)
#    - V4V_SITE_URL (your domain, e.g., yoursite.com)

# 4. Update netlify.toml (see detailed instructions below)

# 5. Deploy and visit /v4v/
```

## What's Included

- **Netlify Edge Functions**: LNURL-pay proxy with discovery, invoice generation, and status polling
- **Hugo Layout**: Payment page template with amount selection and QR codes
- **CSS**: Theme-agnostic styles with customizable CSS variables

## Prerequisites

- [Alby](https://getalby.com) account with NWC (Nostr Wallet Connect) enabled
- Hugo site deployed on Netlify
- Node.js 18+ (for local development)

## Installation

### 1. Copy Proxy Files

Copy the entire `proxy/netlify/` directory to your Hugo site root:

```bash
cp -r proxy/netlify/* your-hugo-site/netlify/
```

Your site structure should look like:

```
your-hugo-site/
├── netlify/
│   └── edge-functions/
│       ├── lnurlp.ts
│       ├── lnurl-callback.ts
│       ├── invoice-status.ts
│       └── _shared/
│           ├── config.ts
│           └── nwc.ts
├── layouts/
├── content/
└── ...
```

### 2. Copy Hugo Files

```bash
# Layout template
cp hugo/layouts/v4v/single.html your-hugo-site/layouts/v4v/

# Content page
cp hugo/content/v4v.md your-hugo-site/content/

# CSS (copy to your assets folder)
cp hugo/assets/css/v4v.css your-hugo-site/assets/css/
```

### 3. Include the CSS

Add the V4V stylesheet to your base template or import it in your main CSS:

**Option A: Link in base template**

```html
<!-- In layouts/_default/baseof.html -->
<link rel="stylesheet" href="{{ "css/v4v.css" | relURL }}">
```

**Option B: Import in your main stylesheet**

```css
/* In assets/css/main.css */
@import 'v4v.css';
```

### 4. Configure netlify.toml

Add these routes to your `netlify.toml`:

```toml
[build]
  publish = "public"
  command = "hugo --minify"

# LNURL-pay discovery endpoint
[[edge_functions]]
  path = "/.well-known/lnurlp/*"
  function = "lnurlp"

# Invoice generation callback
[[edge_functions]]
  path = "/lnurl-callback"
  function = "lnurl-callback"

# Invoice status polling
[[edge_functions]]
  path = "/invoice-status"
  function = "invoice-status"
```

**Note:** The edge functions directory defaults to `netlify/edge-functions/`. If you placed yours elsewhere, add:

```toml
[build]
  edge_functions = "path/to/edge-functions"
```

### 5. Install Dependencies

In your Hugo site root, install the required packages:

```bash
npm init -y  # if you don't have a package.json
npm install @getalby/sdk bolt11
```

**Note:** Edge functions run on Deno with native WebSocket support, so `ws` is not needed.

### 6. Set Environment Variables

In Netlify Dashboard → Site Settings → Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `NWC_CONNECTION_STRING` | Your Alby NWC connection URL | `nostr+walletconnect://...` |
| `ALBY_USERNAME` | Your Alby username (without @getalby.com) | `satoshi` |
| `V4V_SITE_URL` | Your site domain (no protocol) | `yoursite.com` |
| `NTFY_TOPIC` | (Optional) ntfy.sh topic for failure alerts | `my-v4v-alerts` |

Get your NWC URL from [Alby](https://getalby.com) → Settings → Nostr Wallet Connect → Create New Connection.

### 7. Hugo Configuration

Add to your `config.toml` or `hugo.toml`:

```toml
[params]
  v4v_site_url = "https://yoursite.com"
```

## Usage

### General V4V Page

After setup, visit `https://yoursite.com/v4v/` to see your payment page.

### Per-Content V4V Pages (Optional)

To generate V4V pages for individual articles/essays:

1. Copy `hugo/content/_content.gotmpl` to your `content/` folder

2. Create `data/essays.json` with your content (see `hugo/data/essays.json.example`):

```json
[
  { "slug": "my-first-post", "title": "My First Post" },
  { "slug": "another-article", "title": "Another Article" }
]
```

3. Each entry generates a `/my-first-post/v4v/` page

**Tip:** You can generate this file automatically from your content using a build script or Hugo's data templates.

## Customization

### CSS Variables

Override these in your theme to match your design:

```css
:root {
  /* Brand color for buttons and accents */
  --v4v-accent: #your-brand-color;
  --v4v-accent-hover: #your-hover-color;

  /* Text colors */
  --v4v-text-primary: #1a1a1a;
  --v4v-text-secondary: #444;
  --v4v-text-meta: #666;

  /* Backgrounds */
  --v4v-background: #fff;
  --v4v-background-card: #f5f5f5;

  /* See hugo/assets/css/v4v.css for all available variables */
}
```

### Amount Buttons

Edit `layouts/v4v/single.html` to change default amounts:

```html
<div class="amount-grid">
  <button class="amount-btn" data-amount="100">100 sats</button>
  <button class="amount-btn amount-btn--suggested" data-amount="500">500 sats</button>
  <button class="amount-btn" data-amount="2000">2,000 sats</button>
  <button class="amount-btn" data-amount="5000">5,000 sats</button>
</div>
```

### Lightning Address Usernames

By default, the proxy accepts `sats@`, `zap@`, and `lightning@` your domain. To customize, edit `proxy/netlify/edge-functions/_shared/config.ts`:

```typescript
// Lightning address aliases that map to your Alby account
// e.g., sats@yoursite.com, tips@yoursite.com
export const VALID_USERNAMES = ["sats", "tips", "donate"] as const;
```

### Payment Limits

The proxy uses your Alby wallet's limits. These are fetched automatically from Alby when generating invoices.

## How It Works

1. **User visits** `/v4v/` and selects an amount
2. **Edge function** (`lnurlp`) returns LNURL-pay metadata at `/.well-known/lnurlp/sats`
3. **Edge function** (`lnurl-callback`) generates invoice via NWC when amount is confirmed
4. **QR code** displays, user pays with Lightning wallet
5. **Edge function** (`invoice-status`) checks payment status every 3 seconds
6. **Confirmation** shows when payment is received

## Troubleshooting

### "Payment service unavailable" or 500 errors

- Check that `NWC_CONNECTION_STRING` is set correctly in Netlify
- Check that `ALBY_USERNAME` is set (just the username, not the full email)
- Verify your Alby wallet has receiving capacity
- Check Netlify Edge Functions logs for detailed error messages

### "Cannot find module" errors in function logs

You need to install dependencies in your Hugo site:

```bash
npm install @getalby/sdk bolt11
```

### QR code not generating

- Check browser console for errors
- Verify edge function is deployed (check Netlify Functions tab)
- Make sure `V4V_SITE_URL` is set (domain only, no `https://`)

### Payment not confirming

- Polling timeout is 5 minutes; payment may have arrived after
- Check Alby dashboard for received payments
- Verify invoice-status function is accessible at `/invoice-status`

### Edge function not working

- Ensure `netlify/edge-functions/lnurlp.ts` exists
- Check that the edge function path matches `/.well-known/lnurlp/*` in netlify.toml
- Look for errors in Netlify's Edge Functions logs

## Local Development

To test locally with Netlify CLI:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Create .env file (DO NOT COMMIT THIS)
echo "NWC_CONNECTION_STRING=nostr+walletconnect://..." > .env
echo "ALBY_USERNAME=yourusername" >> .env
echo "V4V_SITE_URL=localhost:8888" >> .env

# Add .env to .gitignore
echo ".env" >> .gitignore

# Run local dev server
netlify dev
```

Then visit `http://localhost:8888/v4v/` to test.

## Security Notes

- NWC URL is only used server-side; never exposed to browser
- Invoice status endpoint only confirms paid/unpaid; no amounts leaked
- All payments go directly to your Alby wallet

## License

MIT
