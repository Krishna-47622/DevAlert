# DevAlert Production Deployment Guide

## 🚀 Deployment Status

**Latest Update:** Switched to **Unified Deployment**. Your Frontend and Backend are now one single service. This fixes all Blueprint sync errors and makes the links automatic.

---

## 🛠️ Step 1: Deploying the App

1. **Delete Existing Services** (Optional but Recommended):
   - To avoid confusion, delete any separate "frontend" or "backend" services you created.
   - We are moving to a single service called `devalert-app`.

2. **Trigger a Deploy**:
   - Go to your Render Dashboard.
   - Click **"New +"** -> **"Web Service"**.
   - Connect your GitHub repo.
   - Render will auto-detect the `render.yaml` file.
   - Use the name `devalert-app`.

---

## 🔐 Step 2: Environment Variables

In your Render Dashboard for the `devalert-app` service, ensure these are set:

| Key | Value | Reason |
|-----|-------|--------|
| `FRONTEND_URL` | *(Leave Blank)* | App will auto-detect its URL for email links. |
| `BREVO_API_KEY` | `xkeysib-...` | Required for sending emails. |
| `MAIL_FROM_EMAIL` | `devalert1310@gmail.com` | Verified sender email. |
| `SECRET_KEY` | `some-random-string` | Security. |
| `JWT_SECRET_KEY` | `another-random-string` | Auth Security. |

---

## 🌐 Step 3: Production URLs

Once the build is finished, your site will be live at:
- **Main Site:** `https://devalert-app.onrender.com`
- **Health Check:** `https://devalert-app.onrender.com/api/health`

**Note:** You no longer need a separate `VITE_API_URL` environment variable because the frontend is served directly by the backend!

---

## 🐛 Troubleshooting

**Email links not working?**
- Request a **new** reset email. The old ones were generated with the old broken links.
- Check the service logs to ensure the app started successfully.

**502 Bad Gateway?**
- Wait 2-3 minutes for the `npm run build` process in the logs to finish. The app takes a moment to compile the frontend assets during its first start.
