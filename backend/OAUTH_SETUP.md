# OAuth Configuration Reminder

## IMPORTANT: Update OAuth Redirect URIs

For OAuth to work properly, you **MUST** update your OAuth app settings:

### Google OAuth Console
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. Add to **Authorized redirect URIs:**
   - `http://localhost:5000/api/auth/oauth/google/callback`
   - `http://127.0.0.1:5000/api/auth/oauth/google/callback`

### GitHub OAuth App
1. Go to: https://github.com/settings/developers
2. Click your DevAlert app
3. Update **Authorization callback URL** to:
   - `http://localhost:5000/api/auth/oauth/github/callback`

---

## How OAuth Works Now

✅ **Popup-based authentication** (no more full page redirects)
✅ OAuth opens in centered 500x600 popup window
✅ After authentication, popup closes automatically
✅ User stays on login page during the process

---

## Testing OAuth

1. Go to http://localhost:5000
2. Click "Sign in with Google" or "Sign in with GitHub"
3. Popup window opens → authenticate → popup closes
4. You're automatically logged in!
