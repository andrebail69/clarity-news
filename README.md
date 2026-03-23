# Clarity — Signal Over Noise

Balanced, fact-rated news intelligence powered by Claude.

## Deploy to Vercel (5 minutes)

### Prerequisites
- A GitHub account
- A Vercel account (free at vercel.com — sign up with GitHub)
- An Anthropic API key (from console.anthropic.com)

### Step 1: Push to GitHub

```bash
# In your terminal, navigate to this folder
cd clarity-news

# Initialize git and push
git init
git add .
git commit -m "Initial commit"

# Create a new repo on GitHub (github.com/new), then:
git remote add origin https://github.com/YOUR_USERNAME/clarity-news.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to **vercel.com/new**
2. Click **Import** next to your `clarity-news` repo
3. Vercel auto-detects Vite — leave defaults
4. Before clicking Deploy, expand **Environment Variables**
5. Add: `ANTHROPIC_API_KEY` = your key from console.anthropic.com
6. Click **Deploy**

That's it. You'll get a URL like `clarity-news-xyz.vercel.app`.

### Step 3: Add to Phone Home Screen

1. Open the Vercel URL on your phone in Safari (iOS) or Chrome (Android)
2. **iOS**: Tap Share → "Add to Home Screen"
3. **Android**: Tap ⋮ menu → "Add to Home screen"

It will open full-screen like a native app — no browser chrome.

### Step 4 (Optional): Custom Domain

In Vercel dashboard → your project → Settings → Domains.
Add something like `clarity.yourdomain.com` and point DNS there.

---

## Cost Estimate

Using Claude Haiku 4.5:
- ~4-6 cents per category load
- ~$4-5/month if you check 3 categories daily
- Vercel hosting: free tier covers this easily

## Project Structure

```
clarity-news/
├── api/
│   └── chat.js          # Serverless proxy (holds your API key)
├── public/
│   └── manifest.json    # PWA config
├── src/
│   ├── main.jsx         # React entry
│   └── App.jsx          # The entire app
├── index.html           # HTML shell
├── vercel.json          # Vercel config (120s function timeout)
├── vite.config.js       # Build config
└── .env.example         # API key template
```

## Local Development

```bash
cp .env.example .env.local
# Edit .env.local with your Anthropic API key

npm install
npx vercel dev
# Opens at localhost:3000
```

## Upgrading the Model

To switch between Haiku and Sonnet, change the model in two places:
1. `src/App.jsx` — the `MDL` constant at the top
2. `api/chat.js` — the default model in the fetch body

Model options:
- `claude-haiku-4-5-20251001` — fast, ~4-6¢/load
- `claude-sonnet-4-20250514` — deeper analysis, ~10-17¢/load
