import os
import sqlite3
import sys
import time

def log(msg):
    print(msg)
    try:
        with open("emergency_fix.log", "a", encoding="utf-8") as f:
            f.write(msg + "\n")
    except:
        pass

def fix_db(path):
    log(f"\n[SCAN] Checking: {path}")
    if not os.path.exists(path):
        log("  -> File not found (Skipping)")
        return

    try:
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        
        # Check users table
        try:
            cursor.execute("PRAGMA table_info(users)")
            cols = [row[1] for row in cursor.fetchall()]
        except Exception as e:
            log(f"  -> Error reading schema: {e}")
            return

        if not cols:
            log("  -> Users table missing or empty (Skipping)")
            return
            
        log(f"  -> Found {len(cols)} columns in 'users'.")
        
        # COLUMNS TO ADD
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
        
        added_count = 0
        for name, defn in columns_to_add:
            if name not in cols:
                try:
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {name} {defn}")
                    log(f"  -> [+] Added column: {name}")
                    added_count += 1
                except Exception as e:
                    log(f"  -> [!] Failed to add {name}: {e}")
            else:
                pass # log(f"  -> [=] {name} already exists")

        # HACKATHONS / INTERNSHIPS
        for table in ['hackathons', 'internships']:
            try:
                cursor.execute(f"PRAGMA table_info({table})")
                t_cols = [row[1] for row in cursor.fetchall()]
                
                if 'source' not in t_cols:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN source VARCHAR(100) DEFAULT 'manual'")
                    log(f"  -> [+] Added 'source' to {table}")
                    
                if 'host_id' not in t_cols:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN host_id INTEGER REFERENCES users(id)")
                    log(f"  -> [+] Added 'host_id' to {table}")
            except:
                pass

        conn.commit()
        conn.close()
        
        if added_count > 0:
            log(f"  -> SUCCESS! Added {added_count} missing columns.")
        else:
            log("  -> Database is already up to date.")
            
    except Exception as e:
        log(f"  -> CRITICAL ERROR: {e}")

def main():
    log("=== EMERGENCY DATABASE REPAIR TOOL ===")
    log("Scanning for 'devalert.db' files...")
    
    # 1. Current Directory
    cwd = os.getcwd()
    log(f"Runnning in: {cwd}")
    
    # 2. Hardcoded checks based on project structure
    # Try to find the project root by looking for 'backend'
    project_root = cwd
    if 'backend' in os.listdir(cwd):
        project_root = cwd
    elif os.path.basename(cwd) == 'backend':
        project_root = os.path.dirname(cwd)
    elif os.path.basename(cwd) == 'instance':
         project_root = os.path.dirname(os.path.dirname(cwd))
         
    log(f"Project Root detected as: {project_root}")
    
    # Files to check
    candidates = [
        os.path.join(project_root, 'devalert.db'),
        os.path.join(project_root, 'backend', 'devalert.db'),
        os.path.join(project_root, 'backend', 'instance', 'devalert.db'),
        os.path.join(project_root, 'instance', 'devalert.db'),
        os.path.join(cwd, 'devalert.db'),
        os.path.join(cwd, 'instance', 'devalert.db')
    ]
    
    # Deduplicate
    candidates = list(set([os.path.normpath(p) for p in candidates]))
    
    for db_path in candidates:
        fix_db(db_path)
        
    log("\n=== REPAIR COMPLETE ===")
    log("Please restart your 'python app.py' server now.")
    input("\nPress ENTER to exit...")

if __name__ == "__main__":
    main()
