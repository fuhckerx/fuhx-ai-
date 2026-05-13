# FuhX AI — Premium

Elite unrestricted coding assistant powered by Claude.

## 🚀 Vercel-এ Deploy করার নিয়ম

### ধাপ ১: GitHub-এ আপলোড করো
1. [github.com](https://github.com) এ যাও
2. "New repository" বানাও → নাম দাও `fuhx-ai`
3. এই ফোল্ডারের সব ফাইল সেই repo-তে আপলোড করো

### ধাপ ২: Vercel-এ Deploy করো
1. [vercel.com](https://vercel.com) এ যাও → Sign up (GitHub দিয়ে)
2. "Add New Project" → GitHub repo select করো
3. Framework: **Vite** (auto detect হবে)
4. **Deploy** চাপো → ২ মিনিটে live!

### ধাপ ৩: API Key সেট করো
Deploy হওয়ার পর Vercel dashboard এ:
- Settings → Environment Variables
- `VITE_ANTHROPIC_API_KEY` = তোমার API key

## 💻 Local-এ চালানো
```bash
npm install
npm run dev
```

## 📦 Build করা
```bash
npm run build
```
