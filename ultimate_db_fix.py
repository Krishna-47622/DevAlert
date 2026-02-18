import os
import sqlite3
import sys

LOG_FILE = r'd:\ADD(DevAlert)\db_fix_log.txt'

def log(msg):
    print(msg)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(msg + '\n')

def fix_db(path):
    log(f"Processing: {path}")
    try:
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        
        # Get existing columns
        try:
            cursor.execute("PRAGMA table_info(users)")
            cols = [row[1] for row in cursor.fetchall()]
        except Exception as e:
            log(f"  - Error reading users table: {e}")
            return

        if not cols:
            log(f"  - Users table not found or empty.")
            return

        log(f"  - Columns found: {len(cols)}")
        
        # Define Columns to Add
        new_cols = [
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

        for name, defn in new_cols:
            if name not in cols:
                try:
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {name} {defn}")
                    log(f"  - ADDED {name}")
                except Exception as e:
                    log(f"  - FAILED to add {name}: {e}")
            else:
                 pass # log(f"  - {name} exists")
        
        conn.commit()
        conn.close()
        log("  - Done")

    except Exception as e:
        log(f"  - CRITICAL ERROR: {e}")

def main():
    if os.path.exists(LOG_FILE):
        os.remove(LOG_FILE)
    
    log("=== STARTING ULTIMATE DB FIX ===")
    root_dir = r'd:\ADD(DevAlert)'
    
    for root, dirs, files in os.walk(root_dir):
        # Skip node_modules and venv to speed up
        if 'node_modules' in dirs: dirs.remove('node_modules')
        if '.venv' in dirs: dirs.remove('.venv')
        if '__pycache__' in dirs: dirs.remove('__pycache__')
        
        for file in files:
            if file.endswith(".db"):
                full_path = os.path.join(root, file)
                fix_db(full_path)
    
    log("=== FINISHED ===")

if __name__ == "__main__":
    main()
