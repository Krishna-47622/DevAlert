import sqlite3
import os

# Path to database
db_path = os.path.join('instance', 'devalert.db')

def migrate_db():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # List all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    existing_tables = cursor.fetchall()
    
    with open('db_tables.txt', 'w') as f:
        f.write(str(existing_tables))
        
    print("Existing tables written to db_tables.txt")

    tables = ['hackathons', 'internships']
    
    for table in tables:
        try:
            print(f"Checking {table} table...")
            # Check if column exists
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [info[1] for info in cursor.fetchall()]
            
            if 'host_id' not in columns:
                print(f"Adding host_id column to {table}...")
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN host_id INTEGER REFERENCES users(id)")
                print(f"Successfully added host_id to {table}")
            else:
                print(f"host_id column already exists in {table}")
                
        except Exception as e:
            print(f"Error updating {table}: {e}")

    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate_db()
