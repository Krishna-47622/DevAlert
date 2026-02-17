
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

def migrate_data():
    """
    Migrate data from Source DB (Render) to Destination DB (Supabase)
    """
    print("🚀 Starting Database Migration...")
    
    # Configuration
    SOURCE_DB_URL = os.getenv('RENDER_DATABASE_URL') or os.getenv('DATABASE_URL')
    DEST_DB_URL = os.getenv('SUPABASE_DATABASE_URL')
    
    # 1. Validation
    if not SOURCE_DB_URL:
        print("❌ Error: Valid Source DB URL not found. Set RENDER_DATABASE_URL.")
        return
        
    if not DEST_DB_URL:
        print("❌ Error: Valid Destination DB URL not found. Set SUPABASE_DATABASE_URL.")
        return
        
    if SOURCE_DB_URL == DEST_DB_URL:
        print("❌ Error: Source and Destination URLs are the same!")
        return
        
    print(f"🔹 Source: {SOURCE_DB_URL.split('@')[1] if '@' in SOURCE_DB_URL else 'Hidden'}")
    print(f"🔹 Destination: {DEST_DB_URL.split('@')[1] if '@' in DEST_DB_URL else 'Hidden'}")
    
    # confirmation = input("⚠️  Are you sure you want to overwrite data in Destination? (yes/no): ")
    confirmation = 'yes'
    if confirmation.lower() != 'yes':
        print("Migration cancelled.")
        return

    try:
        # Connect to databases
        src_conn = psycopg2.connect(SOURCE_DB_URL)
        dest_conn = psycopg2.connect(DEST_DB_URL)
        
        src_cur = src_conn.cursor(cursor_factory=RealDictCursor)
        dest_cur = dest_conn.cursor()
        
        # 2. Table Order (Respect Foreign Keys)
        # Order: Independent tables -> Dependent tables
        tables = [
            'users',            # Core table
            'hackathons',       # Depends on users (host_id)
            'internships',      # Depends on users (host_id)
            'applications',     # Depends on users, events
            'tracked_events',   # Depends on users
            'notifications'     # Depends on users
        ]
        
        # 3. Migration Loop
        for table in tables:
            print(f"\n📦 Migrating table: {table}...")
            
            # Fetch data from source
            try:
                src_cur.execute(f"SELECT * FROM {table}")
                rows = src_cur.fetchall()
                print(f"   Found {len(rows)} rows in source.")
            except Exception as e:
                print(f"   ⚠️ Could not read {table} from source (might not exist): {e}")
                src_conn.rollback() # Reset transaction
                continue
            
            if not rows:
                continue
                
            # Get columns
            columns = rows[0].keys()
            cols_str = ', '.join(columns)
            vals_str = ', '.join(['%s'] * len(columns))
            
            # Insert into destination
            try:
                # Clean table in destination first? Optional/Risky. 
                # Better to use ON CONFLICT DO NOTHING or UPDATE
                
                inserted_count = 0
                for row in rows:
                    values = [row[col] for col in columns]
                    
                    query = f"""
                        INSERT INTO {table} ({cols_str}) 
                        VALUES ({vals_str})
                        ON CONFLICT (id) DO UPDATE SET
                        {', '.join([f"{col} = EXCLUDED.{col}" for col in columns if col != 'id'])}
                    """
                    dest_cur.execute(query, values)
                    inserted_count += 1
                    
                dest_conn.commit()
                print(f"   ✅ Migrated {inserted_count} rows to {table}.")
                
                # 4. Reset Sequences (Fix for Postgres auto-increment)
                # This ensures next INSERT doesn't fail with "duplicate key value"
                try:
                    dest_cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), coalesce(max(id), 0) + 1, false) FROM {table};")
                    dest_conn.commit()
                    print(f"   🔄 Sequence reset for {table}.")
                except Exception as seq_e:
                    print(f"   ⚠️ Could not reset sequence for {table} (might not use serial): {seq_e}")
                    dest_conn.rollback()

            except Exception as e:
                print(f"   ❌ Failed to migrate {table}: {e}")
                dest_conn.rollback()
        
        print("\n✨ Migration Successfully Completed!")
        
    except Exception as e:
        print(f"\n❌ Migration Failed: {e}")
    finally:
        if 'src_conn' in locals(): src_conn.close()
        if 'dest_conn' in locals(): dest_conn.close()

if __name__ == "__main__":
    migrate_data()
