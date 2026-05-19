# 🌸 BudgetsBloom

Your cute & cozy personal finance tracker — built as a PWA (works like an app on your phone!).

---

## 📱 Features
- Dashboard with income, expenses, goals, mood & meds
- Daily shift logger with pay breakdown
- Debt Crusher (snowball & avalanche)
- Credit card utilization tracker
- AI Financial Coach (OpenAI powered)
- Works offline as a phone app (PWA)
- 5 beautiful themes (pink, lavender, dark, cozy, minimal)

---

## 🚀 Deploy to Netlify (Step by Step)

### Step 1 — Install Node.js
Download and install from: https://nodejs.org (choose the LTS version)

### Step 2 — Create a GitHub Account
Go to https://github.com and sign up (free).

### Step 3 — Create a New Repository
1. Click the **+** button → **New repository**
2. Name it: `budgetsbloom`
3. Set to **Public** or **Private** (your choice)
4. Click **Create repository**

### Step 4 — Upload Your Files
On the new repo page, click **uploading an existing file** and drag ALL these files in:
```
budgetsbloom/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
├── netlify.toml
├── .gitignore
└── README.md
```
Click **Commit changes**.

### Step 5 — Connect to Netlify
1. Go to https://netlify.com → Sign up with GitHub (free)
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub** → select your `budgetsbloom` repo
4. Build settings are auto-detected from `netlify.toml`
5. Click **Deploy site** 🎉

Netlify gives you a live URL like: `budgetsbloom.netlify.app`

### Step 6 — Add to Your iPhone Home Screen
1. Open your Netlify URL in **Safari** on iPhone
2. Tap the **Share** button (box with arrow)
3. Tap **Add to Home Screen**
4. Tap **Add**
5. Open it from your home screen — it works like a real app! 🌸

---

## 🔄 How to Update the App
1. Make changes to `src/App.jsx`
2. Upload the new file to GitHub (replace the old one)
3. Netlify automatically rebuilds and updates your live site in ~2 minutes

---

## 🤖 AI Coach Setup
1. Get a free API key at https://platform.openai.com
2. Open the app → go to **Settings**
3. Paste your OpenAI API key
4. Go to **AI Coach** → tap **Get Full AI Analysis**

Your key is stored only on your device — never sent anywhere else.

---

## 💾 Data Storage
All your data is saved locally on your device using `localStorage`.
- No account needed
- No data sent to any server
- Works offline

---

## 🛠 Local Development (optional)
```bash
npm install
npm run dev
# Open http://localhost:5173
```

To build for production:
```bash
npm run build
# Upload the /dist folder to Netlify manually, OR just use GitHub auto-deploy
```

---

Made with 💕 for Zaira & Ariel
