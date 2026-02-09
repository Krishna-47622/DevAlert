# Email Verification Setup Guide (Gmail)

To enable email verification and password reset emails on your live site, you need to configure **Gmail SMTP**.

## 🚀 Step 1: Get a Google App Password

**Note:** You CANNOT use your regular Gmail password. You must generate an App Password.

1. Go to your [Google Account Security](https://myaccount.google.com/security) page.
2. Under "How you sign in to Google", select **2-Step Verification**.
3. Scroll to the bottom and select **App passwords**.
4. **Select app:** "Mail"
5. **Select device:** "Other (Custom name)" -> type "DevAlert Render"
6. Click **Generate**.
7. **Copy the 16-character password** (it looks like `abcd efgh ijkl mnop`).

---

## ⚙️ Step 2: Configure Render

1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click on your **DevAlert** Web Service.
3. Click **Environment** tab.
4. Add the following Environment Variables:

| Key | Value |
|-----|-------|
| `MAIL_USERNAME` | `your-email@gmail.com` (Your actual Gmail address) |
| `MAIL_PASSWORD` | `abcdefghijklmnop` (The 16-char App Password you just generated) |
| `MAIL_SERVER` | `smtp.gmail.com` |
| `MAIL_PORT` | `587` |
| `MAIL_USE_TLS` | `True` |
| `MAIL_FROM_EMAIL` | `noreply@devalert.local` (or your email) |

5. Click **"Save Changes"**. Render will redeploy automagically.

---

## 🧪 Step 3: Test Verification

1. Go to your live site: `https://devalert-live.onrender.com`
2. **Register a new account.**
3. Check your Gmail inbox for a "Verify your email" link.
4. Click the link to verify!

---

## 🔧 Troubleshooting

- **No email received?** Check your **Spam** folder.
- **Error 500?** Check Render Logs. If it says `Username and Password not accepted`, your App Password might be wrong, or 2FA is not enabled on Gmail.
- **"Sender address rejected"?** Ensure `MAIL_USERNAME` matches the account you are sending from.
