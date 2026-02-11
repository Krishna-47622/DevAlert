import os
import sqlite3

def check_db_integrity(path):
    print(f"Checking: {path}")
    if not os.path.exists(path):
        print("  - File not found")
        return

    try:
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        print(f"  - User Columns: {len(columns)} found")
        if "full_name" in columns:
            print("  - ✅ full_name PRESENT")
        else:
            print("  - ❌ full_name MISSING")
            
        conn.close()
    except Exception as e:
        print(f"  - Error: {e}")

if __name__ == "__main__":
    # Check the obvious ones
    paths = [
        r"d:\ADD(DevAlert)\devalert.db",
        r"d:\ADD(DevAlert)\backend\devalert.db",
        r"d:\ADD(DevAlert)\backend\instance\devalert.db"
    ]
    for p in paths:
        check_db_integrity(p)
