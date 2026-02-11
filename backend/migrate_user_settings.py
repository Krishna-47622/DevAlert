"""
Migration script to add User Settings features
Adds columns: full_name, theme_preference, full_name_update_count, full_name_window_start
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

def migrate_user_settings():
    # Get database URL from environment
    db_url = os.getenv('DATABASE_URL')
    
    # Handle Render deployment URL format
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    elif db_url and db_url.startswith("mysql://") and "pymysql" not in db_url:
        db_url = db_url.replace("mysql://", "mysql+pymysql://", 1)
    
    if not db_url:
        # Local development
        basedir = os.path.abspath(os.path.dirname(__file__))
        instance_path = os.path.join(basedir, "instance")
        db_url = f'sqlite:///{os.path.join(instance_path, "devalert.db")}'
    
    print(f"🔧 Migrating database for User Settings: {db_url.split(':')[0]}://...")
    
    engine = create_engine(db_url)
    
    # New columns to add
    migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) DEFAULT 'dark'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name_update_count INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name_window_start TIMESTAMP"
    ]
    
    if 'sqlite' in db_url:
        print("⚠️  SQLite detected - Using alternative migration approach")
        
        migrations_sqlite = [
            "full_name VARCHAR(150)",
            "theme_preference VARCHAR(20) DEFAULT 'dark'",
            "full_name_update_count INTEGER DEFAULT 0",
            "full_name_window_start TIMESTAMP"
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
                        print(f"⚠️  Column {column_name} error: {e}")
                else:
                    print(f"⏭️  Column {column_name} already exists, skipping")
                    
    else:
        # PostgreSQL/MySQL
        with engine.connect() as conn:
            for migration in migrations:
                try:
                    conn.execute(text(migration))
                    conn.commit()
                    column_name = migration.split("ADD COLUMN IF NOT EXISTS")[1].split()[0]
                    print(f"✅ Added/Verified column: {column_name}")
                except Exception as e:
                    print(f"⚠️  Migration step failed: {e}")
    
    print("\n🎉 User Settings migration completed!")

if __name__ == "__main__":
    migrate_user_settings()
