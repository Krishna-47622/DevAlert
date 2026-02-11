"""
Database Migration Script for Account Management Features
Adds new columns to users table for email verification, password reset, 2FA, and OAuth
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

def migrate_database():
    """Add new columns to users table"""
    
    # Get database URL from environment
    db_url = os.getenv('DATABASE_URL')
    
    # Handle Render deployment URL format
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    elif db_url and db_url.startswith("mysql://") and "pymysql" not in db_url:
        db_url = db_url.replace("mysql://", "mysql+pymysql://", 1)
    
    if not db_url:
        # Local development - use instance/devalert.db
        basedir = os.path.abspath(os.path.dirname(__file__))
        instance_path = os.path.join(basedir, "instance")
        db_url = f'sqlite:///{os.path.join(instance_path, "devalert.db")}'
    
    print(f"🔧 Migrating database: {db_url.split(':')[0]}://...")
    
    engine = create_engine(db_url)
    
    # Define new columns to add
    migrations = [
        # Email Verification
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMP",
        
        # Password Reset
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP",
        
        # Two-Factor Authentication
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(32)",
        
        # OAuth Integration
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider_id VARCHAR(255)",

        # Personalization
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(80)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) DEFAULT 'dark'",
        
        # Rate Limiting
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name_update_count INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name_window_start TIMESTAMP",
    ]
    
    # SQLite doesn't support IF NOT EXISTS in ALTER TABLE, handle differently
    if 'sqlite' in db_url:
        print("⚠️  SQLite detected - Using alternative migration approach")
        migrations_sqlite = [
            "email_verified BOOLEAN DEFAULT 0",
            "email_verification_token TEXT",
            "email_verification_sent_at TIMESTAMP",
            "password_reset_token TEXT",
            "password_reset_expires_at TIMESTAMP",
            "two_factor_enabled BOOLEAN DEFAULT 0",
            "two_factor_secret TEXT",
            "oauth_provider TEXT",
            "oauth_provider_id TEXT",
            "full_name TEXT",
            "display_name TEXT",
            "theme_preference TEXT DEFAULT 'dark'",
            "full_name_update_count INTEGER DEFAULT 0",
            "full_name_window_start TIMESTAMP",
        ]
        
        with engine.connect() as conn:
            # Check existing columns
            result = conn.execute(text("PRAGMA table_info(users)"))
            existing_columns = [row[1] for row in result]
            
            for column_def in migrations_sqlite:
                column_name = column_def.split()[0]
                if column_name not in existing_columns:
                    try:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {column_def}"))
                        conn.commit()
                        print(f"✅ Added column: {column_name}")
                    except Exception as e:
                        print(f"⚠️  Column {column_name} might already exist or error: {e}")
                else:
                    print(f"⏭️  Column {column_name} already exists, skipping")
            
            # Make password_hash nullable for OAuth users
            print("ℹ️  Note: SQLite doesn't support modifying column constraints easily.")
            print("   password_hash is already created, OAuth users will need empty string workaround")
    else:
        # PostgreSQL/MySQL - supports IF NOT EXISTS
        with engine.connect() as conn:
            for migration in migrations:
                try:
                    conn.execute(text(migration))
                    conn.commit()
                    column_name = migration.split("ADD COLUMN IF NOT EXISTS")[1].split()[0]
                    print(f"✅ Added/Verified column: {column_name}")
                except Exception as e:
                    print(f"⚠️  Migration step failed (might already exist): {e}")
            
            # Make password_hash nullable for OAuth users (PostgreSQL)
            try:
                conn.execute(text("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL"))
                conn.commit()
                print("✅ Made password_hash nullable for OAuth users")
            except Exception as e:
                print(f"⚠️  Could not modify password_hash constraint: {e}")
    
    print("\n🎉 Database migration completed!")
    print("💡 Next steps:")
    print("   1. Update your .env file with email service credentials")
    print("   2. Configure OAuth client IDs and secrets")
    print("   3. Restart your Flask application")

if __name__ == "__main__":
    migrate_database()
