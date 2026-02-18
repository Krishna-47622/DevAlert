import os
import sqlite3
import shutil
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load env vars
load_dotenv()

def get_flask_db_uri():
    try:
        from config import Config
        return Config.SQLALCHEMY_DATABASE_URI
    except Exception as e:
        return f"Could not determine from Config: {e}"

def fix_sqlite_db(db_path):
    print(f"\n[FIXING] {db_path}")
    if not os.path.exists(db_path):
        print("  -> File does not exist")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check existing columns
        cursor.execute("PRAGMA table_info(users)")
        cols = [row[1] for row in cursor.fetchall()]
        print(f"  -> Current columns: {len(cols)}")
        
        columns_to_add = [
            ("full_name", "VARCHAR(150)"),
            ("display_name", "VARCHAR(80)"),
            ("theme_preference", "VARCHAR(20) DEFAULT 'dark'"),
            ("email_verified", "BOOLEAN DEFAULT 0"),
            ("email_verification_token", "VARCHAR(255)"),
            ("email_verification_sent_at", "TIMESTAMP"),
            ("password_reset_token", "VARCHAR(255)"),
            ("password_reset_expires_at", "TIMESTAMP"),
            ("two_factor_enabled", "BOOLEAN DEFAULT 0"),
            ("two_factor_secret", "VARCHAR(32)"),
            ("oauth_provider", "VARCHAR(20)"),
            ("oauth_provider_id", "VARCHAR(255)"),
            ("is_host_approved", "BOOLEAN DEFAULT 0"),
            ("requested_host_access", "BOOLEAN DEFAULT 0"),
            ("full_name_update_count", "INTEGER DEFAULT 0"),
            ("full_name_window_start", "TIMESTAMP")
        ]
        
        for name, defn in columns_to_add:
            if name not in cols:
                try:
                    print(f"  -> Adding {name}...")
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {name} {defn}")
                    conn.commit()
                except Exception as e:
                    print(f"     FAILED to add {name}: {e}")
            else:
                pass # print(f"  -> {name} exists")

        # Fix Hackathons/Internships
        for table in ['hackathons', 'internships']:
            cursor.execute(f"PRAGMA table_info({table})")
            t_cols = [row[1] for row in cursor.fetchall()]
            
            if 'source' not in t_cols:
                print(f"  -> Adding source to {table}")
                try: cursor.execute(f"ALTER TABLE {table} ADD COLUMN source VARCHAR(100) DEFAULT 'manual'")
                except: pass
            
            if 'host_id' not in t_cols:
                print(f"  -> Adding host_id to {table}")
                try: cursor.execute(f"ALTER TABLE {table} ADD COLUMN host_id INTEGER REFERENCES users(id)")
                except: pass
                
        conn.commit()
        conn.close()
        print("  -> DONE")
        
    except Exception as e:
        print(f"  -> ERROR: {e}")

def main():
    print("=== DATABASE REPAIR UTILITY ===")
    
    # 1. Identify Active Config
    print(f"\n[CONFIG CHECK]")
    uri = get_flask_db_uri()
    print(f"Active SQLALCHEMY_DATABASE_URI: {uri}")
    
    # 2. Find ALL .db files
    print(f"\n[SCANNING FOR DB FILES]")
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # Go up from backend/
    db_files = []
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith(".db"):
                full_path = os.path.join(root, file)
                db_files.append(full_path)
                print(f"Found: {full_path}")

    # 3. Fix ALL found DB files
    print(f"\n[APPLYING FIXES]")
    for db_path in db_files:
        fix_sqlite_db(db_path)

if __name__ == "__main__":
    main()
