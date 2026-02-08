# DevAlert Production Deployment Guide

## 🚀 Deployment Status

**Latest Update:** Added automatic database migration on startup. This fixes the `UndefinedColumn` error by creating necessary columns (email_verified, oauth_provider) when the app starts.

---

## 🛠️ Step 1: Verify Deployment

1. **Wait for Render to Build & Deploy**
   - Go to your Render Dashboard
   - You should see a deployment in progress (triggered by git push)
   - If not, click **"Manual Deploy"** -> **"Clear build cache & deploy"**

2. **Check Logs for Migration Success**
   - Click on the **"Logs"** tab in Render
   - Look for these messages:
     ```
     🔄 Running automatic database migration...
     🔧 Migrating database: postgresql://...
     ✅ Added/Verified column: email_verified
     ✅ Added/Verified column: oauth_provider
     ...
     ✅ Database migration finished
     ```

---

## 🔐 Step 2: Configure Production OAuth

**Google OAuth Callback URL**

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click your OAuth 2.0 Client ID
3. Add to **"Authorized redirect URIs"**:
   ```
   https://YOUR-APP-NAME.onrender.com/api/auth/oauth/google/callback
   ```
   *(Replace YOUR-APP-NAME with your actual Render app name)*

4. **Authorized JavaScript origins**:
   ```
   https://YOUR-APP-NAME.onrender.com
   ```

---

## ⚙️ Step 3: Production Environment Variables

Ensure these are set in Render Dashboard -> Environment:

```bash
# Security
SECRET_KEY=<random-string>
JWT_SECRET_KEY=<random-string>

# Database (Auto-set by Render)
DATABASE_URL=<postgresql-url>

# Frontend
FRONTEND_URL=https://YOUR-APP-NAME.onrender.com

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=<your-prod-client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<your-prod-client-secret>

# Email (Optional - for verification/reset)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=<your-email>
MAIL_PASSWORD=<your-app-password>
```

---

## 🐛 Troubleshooting

**Database Reset / Missing Columns:**
- If you see "UndefinedColumn" errors, it means migration didn't run.
- Restart the service manually to trigger the auto-migration code in `app.py`.
- Check logs for "Automatic migration failed" errors.

**OAuth Error: redirect_uri_mismatch:**
- Double check Google Cloud Console "Authorized redirect URIs" matches your Render URL exactly.
- Ensure no trailing slash (unless you added it in Google Console).

**502 Bad Gateway:**
- Check logs. Likely python dependency missing or crash.
- Ensure `gunicorn` is in `requirements.txt`.
