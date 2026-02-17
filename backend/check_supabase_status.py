
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def check_migration_status():
    print("🔍 Checking Supabase Migration Status...")
    
    DEST_DB_URL = os.getenv('SUPABASE_DATABASE_URL')
    if not DEST_DB_URL:
        print("❌ Error: SUPABASE_DATABASE_URL not found.")
        return

    try:
        conn = psycopg2.connect(DEST_DB_URL)
        cur = conn.cursor()
        
        # Check tables
        tables = ['users', 'hackathons', 'internships', 'applications', 'tracked_events', 'notifications']
        print(f"\nChecking {len(tables)} tables:")
        
        for table in tables:
            try:
                # Check existance
                cur.execute(f"SELECT to_regclass('public.{table}');")
                exists = cur.fetchone()[0]
                
                if exists:
                    # Check row count
                    cur.execute(f"SELECT COUNT(*) FROM {table};")
                    count = cur.fetchone()[0]
                    print(f"   ✅ {table}: Exists ({count} rows)")
                else:
                    print(f"   ❌ {table}: Does NOT exist")
                    
            except Exception as e:
                print(f"   ⚠️ Error checking {table}: {e}")
                conn.rollback()
                
        conn.close()
        
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

if __name__ == "__main__":
    check_migration_status()
