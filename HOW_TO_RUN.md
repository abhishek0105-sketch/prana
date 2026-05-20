# How to Run PRANA

## Step 1 — Install Node.js (one time only)

1. Go to **https://nodejs.org**
2. Click the big green **"LTS"** button to download
3. Run the installer — click Next through everything, keep all defaults
4. When done, restart your computer

## Step 2 — Run the App

Double-click **`START_PRANA.bat`** in this folder.

That's it. The script will:
- Install all packages automatically (first time takes ~2 minutes)
- Start the server
- Start the app
- Open it in your browser at **http://localhost:5173**

## Step 3 — Test It

1. Open **http://localhost:5173** in two different browser windows (or two different browsers)
2. Sign up for two test accounts (use any fake emails)
3. Add one as a friend using the other's email
4. Start a hangout — you'll see the video call connect between the two windows!

## Stopping the App

Press `Ctrl + C` in both command windows that opened.

---

## Project Structure

```
prana/
├── START_PRANA.bat       ← Double-click to run
├── server/               ← Backend (Node.js)
│   └── prana.db          ← Database (created automatically)
└── client/               ← Frontend (React)
```

## Features Built

- **Sign Up / Log In** — secure accounts with encrypted passwords
- **Add Friends** — search by email, send/accept requests  
- **Video Hangout** — real peer-to-peer video call (WebRTC)
- **Live Chat** — real-time messages during hangout
- **Place Finder** — find the same spot (Starbucks, bar, etc.) in both cities
- **Buy a Round** — send a virtual drink/meal to your friend
- **City Setting** — so the Place Finder knows where each person is

## Next Steps (when you're ready to grow)

- Add Stripe for real payments (Buy a Round becomes real money)
- Add push notifications (mobile app install prompt)
- Build iOS/Android native apps with React Native (same code, ~70% reusable)
- Add a watch-together feature (sync YouTube/streaming)
- Add more languages for global reach
