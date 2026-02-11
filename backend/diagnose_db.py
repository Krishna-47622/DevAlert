import sqlite3
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_columns(db_path):
    if not os.path.exists(db_path):
        return f"File not found: {db_path}"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        conn.close()
        return columns
    except Exception as e:
        return f"Error reading {db_path}: {e}"

def diagnose():
    print("=== Database Diagnostic Tool ===")
    
    # Check Environment Variable
    db_url = os.getenv('DATABASE_URL')
    print(f"DATABASE_URL in .env: {db_url}")
    
    # 1. Check Root DB
    root_db = os.path.abspath("devalert.db")
    print(f"\n[1] Checking Root DB: {root_db}")
    print(f"Columns: {get_columns(root_db)}")
    
    # 2. Check Instance DB
    instance_db = os.path.abspath(os.path.join("instance", "devalert.db"))
    print(f"\n[2] Checking Instance DB: {instance_db}")
    print(f"Columns: {get_columns(instance_db)}")

    # 3. Check for specific missing columns in the 'active' likely candidate
    target_columns = ['full_name', 'display_name', 'theme_preference', 'email_verified']
    
    print("\n=== Analysis ===")
    if os.path.exists(root_db):
        root_cols = get_columns(root_db)
        if isinstance(root_cols, list):
            missing = [c for c in target_columns if c not in root_cols]
            print(f"Root DB Missing: {missing}")
    
    if os.path.exists(instance_db):
        inst_cols = get_columns(instance_db)
        if isinstance(inst_cols, list):
            missing = [c for c in target_columns if c not in inst_cols]
            print(f"Instance DB Missing: {missing}")

if __name__ == "__main__":
    diagnose()
