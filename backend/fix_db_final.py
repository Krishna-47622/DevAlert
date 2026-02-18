import os
import sqlite3
import time

def log(msg):
    print(msg)
    # Try multiple locations for log file
    locations = [
        'fix_log.txt',
        r'd:\ADD(DevAlert)\fix_log.txt',
        r'd:\ADD(DevAlert)\backend\fix_log.txt'
    ]
    for loc in locations:
        try:
            with open(loc, 'a', encoding='utf-8') as f:
                f.write(msg + '\n')
            break
        except:
            continue

def fix_db(path):
    log(f"Processing: {path}")
    if not os.path.exists(path):
        log("  -> File not found")
        return

    try:
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        
        # Get existing columns
        cursor.execute("PRAGMA table_info(users)")
        cols = [row[1] for row in cursor.fetchall()]
        log(f"  -> Columns: {len(cols)}")
        
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
                    log(f"  -> ADDED {name}")
                except Exception as e:
                    log(f"  -> FAILED to add {name}: {e}")
            else:
                 pass
        
        # Fix Hackathons/Internships
        for table in ['hackathons', 'internships']:
            try:
                cursor.execute(f"PRAGMA table_info({table})")
                t_cols = [row[1] for row in cursor.fetchall()]
                
                if 'source' not in t_cols:
                    log(f"  -> Adding source to {table}")
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN source VARCHAR(100) DEFAULT 'manual'")
                
                if 'host_id' not in t_cols:
                    log(f"  -> Adding host_id to {table}")
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN host_id INTEGER REFERENCES users(id)")
                
                conn.commit()
            except Exception as e:
                log(f"  -> Error fixing {table}: {e}")

        conn.close()
        log("  -> Done")

    except Exception as e:
        log(f"  -> CRITICAL ERROR: {e}")

def main():
    log("=== STARTING FINAL DB FIX ===")
    
    # 1. Check known locations
    known_paths = [
        r'd:\ADD(DevAlert)\devalert.db',
        r'd:\ADD(DevAlert)\backend\devalert.db',
        r'd:\ADD(DevAlert)\backend\instance\devalert.db',
        r'd:\ADD(DevAlert)\instance\devalert.db',  # Possible relative path issue
    ]
    
    for p in known_paths:
        fix_db(p)
        
    # 2. Walk entire directory as backup
    root_dir = r'd:\ADD(DevAlert)'
    for root, dirs, files in os.walk(root_dir):
        if 'node_modules' in dirs: dirs.remove('node_modules')
        if '.venv' in dirs: dirs.remove('.venv')
        if '__pycache__' in dirs: dirs.remove('__pycache__')
        
        for file in files:
            if file.endswith(".db"):
                full_path = os.path.join(root, file)
                if full_path not in known_paths:
                    fix_db(full_path)
    
    log("=== FINISHED ===")

if __name__ == "__main__":
    main()
