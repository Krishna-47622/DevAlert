# Deploying DevAlert to Production

> **Important**: The live website uses a **separate database** from your local computer. Your local accounts will NOT work there. You must **Sign Up** again on the live site.

This guide will help you push your code to GitHub and deploy it live using **Render** (a free/easy cloud hosting provider).

## 1. Safety First: Secure Your Credentials
We have already verified that your `.gitignore` file excludes sensitive files.
- **Checked**: `.env` (contains API keys) is ignored.
- **Checked**: `instance/` (contains local database) is ignored.
- **Checked**: `node_modules` and `__pycache__` are ignored.

This ensures you can safely push to GitHub without leaking your keys.

## 7. How to Switch to Persistent Database (MySQL or PostgreSQL)
**Prevents data loss when Render restarts.**

### Option A: PostgreSQL (Recommended - Native to Render)
1.  Go to Render Dashboard -> Click **"New +"** -> **"PostgreSQL"**.
2.  Name it `devalert-db` -> **Free Tier** -> **Create Database**.
3.  Copy **Internal Database URL**.
4.  Go to your Service -> **Environment** -> Add `DATABASE_URL` = `(Paste URL)`.
5.  Save & Redeploy.

### Option B: MySQL (External Provider)
Render does NOT have a native MySQL service. Use **Aiven** or **PlanetScale** (Free Tiers available).
1.  Create a MySQL database on an external provider.
2.  Get the **Connection URL** (looks like `mysql://user:pass@host:port/db`).
3.  Go to Render Service -> **Environment** -> Add `DATABASE_URL` = `(Paste URL)`.
4.  Save & Redeploy.

### Step 3: Migrate Local Data (Recover Data)
Since the live data is gone (it was temporary), we will upload your **Local Data** to the live server.
1.  Get the **External Database URL** (Postgres or MySQL).
2.  Run this in your local terminal:
    ```powershell
    $env:DATABASE_URL='<paste_external_url_here>'; python backend/migrate_data.py
    ```
3.  It will say: `🎉 MIGRATION COMPLETE!`

## 8. How to Fix Google Search API Key (401 Error)
If you see `401 Client Error: Unauthorized` in your logs, your API key is invalid or expired.

1.  **Go to Google Cloud Console**: [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2.  Select your project (e.g., `DevAlert`).
3.  Click **+ CREATE CREDENTIALS** (at the top) -> **API key**.
4.  Copy the new key (starts with `AIza...`).
5.  **Restrict the Key** (Recommended):
    - Click on the key name.
    - Under "API restrictions", select **Restrict key**.
    - Choose **Custom Search API**.
    - Click **Save**.
6.  **Update Render**:
    - Go to Render Dashboard -> `devalert` Service -> **Environment**.
    - Update `GOOGLE_API_KEY` with the new key.
    - Save Changes.
## 2. Push to GitHub
**Status**: ✅ **SUCCESS!**
Your code is now live on GitHub at: `https://github.com/Krishna-47622/DevAlert`

You can proceed directly to **Step 3: Deploy to Render.com**.
    - Name it `devalert` (or similar).
    - **Do NOT** initialize with README, .gitignore, or license (we already have them).
    - Click **Create repository**.

2.  **Push your code**:
    Copy the commands shown on GitHub under "…or push an existing repository from the command line". They will look like this:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/devalert.git
    git branch -M main
    git push -u origin main
    ```

## 3. Deploy to Render.com
Render is excellent for Flask + React apps.

1.  **Sign up/Log in** to [Render.com](https://render.com).
2.  **New Web Service**: Click "New +" -> "Web Service".
3.  **Connect GitHub**: Select your `devalert` repository.
4.  **Configure Service**:
    - **Name**: `devalert-live` (or unique name)
    - **Region**: Closest to you (e.g., Singapore or Frankfurt).
    - **Branch**: `main`
    - **Root Directory**: `.` (leave empty or use `.`)
    - **Runtime**: **Python 3**
    - **Build Command**:
      ```bash
      # Install requestments and build frontend
      pip install -r backend/requirements.txt && cd frontend && npm install && npm run build
      ```
    - **Start Command**:
      ```bash
      # Run Flask app (which serves the built frontend)
      cd backend && gunicorn wsgi:app
      ```
5.  **Environment Variables**:
    You MUST add your secret keys here (since they were ignored in `.env`).
    - Scroll down to "Environment Variables" -> "Add Environment Variable".
    - `SECRET_KEY`: (Generate a random string)
    - `JWT_SECRET_KEY`: (Generate a random string)
    - `GOOGLE_API_KEY`: (Your Google/Gemini API Key)
    - `GEMINI_API_KEY`: (Your Gemini API Key)
    - `DATABASE_URL`: `sqlite:///instance/devalert.db` (For persistent data, consider using Render Disk or Postgres, but SQLite works for simple demos if you set the disk path correctly. *Note: On free tier, SQLite data resets on deploy. For permanent data, use Render PostgreSQL.*)

6.  **Deploy**: Click "Create Web Service".

## 4. How to Create an Admin Account
> **Wait!** Make sure your latest deployment on Render shows **"Live"** or **"Succeeded"** before trying this. If it's still "Building", the link won't work yet.

Since the "Shell" is a paid feature, we added a special **secret link** for you to become admin.

1.  **Register** a new account on your live website.
3.  **Visit this URL** in your browser:
    ```
    https://devalert-live.onrender.com/api/auth/promote-admin/Krishna/setup-2024
    ```

4.  You should see a message: `{"message": "Success! User Krishna is now an Admin."}`
5.  Logout and Login again to see your Admin dashboard.

## 5. Verify
Once deployed, Render will give you a URL (e.g., `https://devalert.onrender.com`).
- Visit the URL.
- Test login/register.
- Run the AI Scanner from the Admin Dashboard.

## Notes
- **Database Persistence**: The standard SQLite setup in `backend/instance` is ephemeral on Render's free tier (data is lost on restart). For a real "live" app, you should:
    1.  Create a **PostgreSQL** database on Render.
    2.  Copy the `Internal Database URL` from Render.
    3.  Add it as `DATABASE_URL` in your Environment Variables.
    4.  The app is already configured to use `DATABASE_URL` if present!
- **Gunicorn Import Error**: If you see `gunicorn.errors.AppImporterError: Failed to find attribute 'app' in 'app'`, it means Gunicorn can't find the `app` object. We added `backend/wsgi.py` AND updated `backend/app.py` to support both `wsgi:app` and `app:app` launch commands, which fixes this issue regardless of your Render settings.

- **Database Error**: If you see `sqlite3.OperationalError: unable to open database file`, it means the folder for the DB isn't writable. We updated `backend/config.py` to use `/tmp/devalert.db` on Render, which is always safe and writable.
