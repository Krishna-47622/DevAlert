# Database Connection Guide

Step-by-step instructions to find your database connection strings for migration.

## 1. Find Render Database URL (Source)

1.  Log in to your [Render Dashboard](https://dashboard.render.com/).
2.  Click on your **PostgreSQL** database service (it might be named something like `dpg-xyz`).
3.  Scroll down to the **Connections** section.
4.  Look for **External Database URL** (for running migration from your computer).
    *   It should look like: `postgres://user:password@hostname.render.com/database_name`
    *   **Note**: `Internal Database URL` only works inside Render servers.

## 2. Find Supabase Database URL (Destination)

1.  Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Select your project.
3.  Click on the **Settings** icon (cogwheel) in the left sidebar.
4.  Go to **Database** within the settings menu.
5.  Scroll down to the **Connection String** section.
6.  Click on **URI**.
7.  Copy the connection string.
    *   It should look like: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
    *   **Important**: You must replace `[YOUR-PASSWORD]` with the actual database password you set when creating the project.

## 3. Update Your Environment (.env)

Open your `backend/.env` file and add the following:

```bash
# Source (Render) - Use External URL for local migration
RENDER_DATABASE_URL=postgres://user:password@host.render.com/db_name

# Destination (Supabase)
SUPABASE_DATABASE_URL=postgresql://postgres.ref:password@aws-0-region.pooler.supabase.com:6543/postgres
```
