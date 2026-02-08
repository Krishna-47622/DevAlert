# Render PostgreSQL Database Setup Guide

## Quick Setup for Render Database

### 1. Get Your Database URL from Render

In Render Dashboard:
1. Go to your PostgreSQL database
2. Copy the **Internal Database URL** (starts with `postgres://` or `postgresql://`)
3. Example: `postgres://devalert_user:abc123...@dpg-xyz.render.com/devalert_db`

### 2. Update Your `.env` File

Replace the `DATABASE_URL` line in `backend/.env`:

```bash
# Comment out SQLite
# DATABASE_URL=sqlite:///devalert.db

# Add your Render PostgreSQL URL
DATABASE_URL=postgresql://your-user:your-password@dpg-xyz.render.com/your-database
```

**Note:** The migration script automatically converts `postgres://` to `postgresql://` if needed.

### 3. Run the Migration

```bash
cd backend
python migrate_account_features.py
```

You should see output like:
```
🔧 Migrating database: postgresql://...
✅ Added/Verified column: email_verified
✅ Added/Verified column: email_verification_token
...
✅ Made password_hash nullable for OAuth users
🎉 Database migration completed!
```

### 4. Verify the Migration

Check that new columns were added:

```bash
python
```

```python
from app import create_app
from models import db, User

app = create_app()
with app.app_context():
    # Check a user's new fields
    user = User.query.first()
    if user:
        print(f"Email Verified: {user.email_verified}")
        print(f"2FA Enabled: {user.two_factor_enabled}")
        print(f"OAuth Provider: {user.oauth_provider}")
```

## Common Issues

### Issue: "relation does not exist"

**Solution:** The database hasn't been initialized yet. First run:
```bash
python
```
```python
from app import create_app
from models import db

app = create_app()
with app.app_context():
    db.create_all()
```

Then run the migration script.

### Issue: "column already exists"

**Solution:** This is fine! The migration script uses `IF NOT EXISTS` for PostgreSQL. The message just means columns are already there from a previous run.

### Issue: Connection timeout

**Solution:** 
- Make sure you're using the **Internal Database URL** from Render
- Check your database is not paused (free tier databases pause after inactivity)
- Verify your IP is whitelisted if you have IP restrictions

## Production Deployment on Render

When deploying to Render, the `DATABASE_URL` is automatically provided as an environment variable. Just make sure:

1. Your Render web service is linked to your PostgreSQL database
2. The migration script runs during deployment (add to build command or use a startup script)

Example build command:
```bash
pip install -r backend/requirements.txt && cd backend && python migrate_account_features.py
```

## Rollback (If Needed)

If you need to remove the new columns:

```sql
-- Connect to your database and run:
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
ALTER TABLE users DROP COLUMN IF EXISTS email_verification_token;
ALTER TABLE users DROP COLUMN IF EXISTS email_verification_sent_at;
ALTER TABLE users DROP COLUMN IF EXISTS password_reset_token;
ALTER TABLE users DROP COLUMN IF EXISTS password_reset_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS two_factor_enabled;
ALTER TABLE users DROP COLUMN IF EXISTS two_factor_secret;
ALTER TABLE users DROP COLUMN IF EXISTS oauth_provider;
ALTER TABLE users DROP COLUMN IF EXISTS oauth_provider_id;
```

## Next Steps

After migration:
1. ✅ Configure email service in `.env`
2. ✅ Set up OAuth apps (Google/GitHub)
3. ✅ Test account features locally
4. ✅ Deploy to production
