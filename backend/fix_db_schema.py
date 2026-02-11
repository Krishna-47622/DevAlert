import sqlite3
import os

def fix_database(db_path):
    print(f"\n🔧 Checking database: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"❌ File not found: {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. Get existing columns for 'users'
        cursor.execute("PRAGMA table_info(users)")
        existing_columns = [row[1] for row in cursor.fetchall()]
        print(f"   Existing columns: {existing_columns}")
        
        # 2. Define ALL required columns (merged from models.py and migrations)
        required_columns = {
            # Core
            'role': "VARCHAR(20) DEFAULT 'participant'",
            'organization': "VARCHAR(200)",
            'designation': "VARCHAR(200)",
            'is_host_approved': "BOOLEAN DEFAULT 0",
            'requested_host_access': "BOOLEAN DEFAULT 0",
            
            # Email Verification
            'email_verified': "BOOLEAN DEFAULT 0",
            'email_verification_token': "VARCHAR(255)",
            'email_verification_sent_at': "TIMESTAMP",
            
            # Password Reset
            'password_reset_token': "VARCHAR(255)",
            'password_reset_expires_at': "TIMESTAMP",
            
            # 2FA
            'two_factor_enabled': "BOOLEAN DEFAULT 0",
            'two_factor_secret': "VARCHAR(32)",
            
            # OAuth
            'oauth_provider': "VARCHAR(20)",
            'oauth_provider_id': "VARCHAR(255)",
            
            # Personalization
            'full_name': "VARCHAR(150)",
            'display_name': "VARCHAR(80)",
            'theme_preference': "VARCHAR(20) DEFAULT 'dark'",
            
            # Rate Limiting
            'full_name_update_count': "INTEGER DEFAULT 0",
            'full_name_window_start': "TIMESTAMP"
        }
        
        # 3. Add missing columns
        for col_name, col_def in required_columns.items():
            if col_name not in existing_columns:
                print(f"   ➕ Adding missing column: {col_name}")
                try:
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")
                    conn.commit()
                except Exception as e:
                    print(f"   ⚠️ Failed to add {col_name}: {e}")
            else:
                pass # print(f"   ✅ {col_name} exists")

        # 4. Check Hackathons table (for source column)
        cursor.execute("PRAGMA table_info(hackathons)")
        hack_cols = [row[1] for row in cursor.fetchall()]
        if 'source' not in hack_cols:
             print("   ➕ Adding 'source' to hackathons")
             try:
                cursor.execute("ALTER TABLE hackathons ADD COLUMN source VARCHAR(100) DEFAULT 'manual'")
                conn.commit()
             except Exception as e: print(f"Error: {e}")
        
        if 'host_id' not in hack_cols:
             print("   ➕ Adding 'host_id' to hackathons")
             try:
                cursor.execute("ALTER TABLE hackathons ADD COLUMN host_id INTEGER REFERENCES users(id)")
                conn.commit()
             except Exception as e: print(f"Error: {e}")

        # 5. Check Internships table
        cursor.execute("PRAGMA table_info(internships)")
        int_cols = [row[1] for row in cursor.fetchall()]
        if 'source' not in int_cols:
             print("   ➕ Adding 'source' to internships")
             try:
                cursor.execute("ALTER TABLE internships ADD COLUMN source VARCHAR(100) DEFAULT 'manual'")
                conn.commit()
             except Exception as e: print(f"Error: {e}")

        if 'host_id' not in int_cols:
             print("   ➕ Adding 'host_id' to internships")
             try:
                cursor.execute("ALTER TABLE internships ADD COLUMN host_id INTEGER REFERENCES users(id)")
                conn.commit()
             except Exception as e: print(f"Error: {e}")
             
        conn.close()
        print("   ✅ Fix complete for this file.")
        
    except Exception as e:
        print(f"   ❌ Critical Error fixing {db_path}: {e}")

if __name__ == "__main__":
    print("🚀 Starting Database Repair...")
    
    # Fix BOTH potential locations
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. backend/devalert.db
    db1 = os.path.join(base_dir, "devalert.db")
    fix_database(db1)
    
    # 2. backend/instance/devalert.db
    db2 = os.path.join(base_dir, "instance", "devalert.db")
    fix_database(db2)
    
    print("\n🏁 Repair process finished.")
