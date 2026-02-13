import sqlite3
import os

def migrate():
    # Common locations for the database
    possible_paths = [
        os.path.join('instance', 'devalert.db'),
        'devalert.db',
        os.path.join('backend', 'instance', 'devalert.db')
    ]
    
    db_path = None
    for p in possible_paths:
        if os.path.exists(p):
            db_path = p
            break
            
    if not db_path:
        print("Could not find devalert.db automatically.")
        # Try to find any .db file in instance
        if os.path.exists('instance'):
            for f in os.listdir('instance'):
                if f.endswith('.db'):
                    db_path = os.path.join('instance', f)
                    break
    
    if not db_path:
        print("Database file not found.")
        return

    print(f"Migrating database at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Add columns to users table
    for col, type in [('resume_text', 'TEXT'), ('resume_updated_at', 'DATETIME')]:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {type}")
            print(f"Added {col} to users")
        except sqlite3.OperationalError:
            print(f"{col} already exists in users")

    # Add columns to tracked_events table
    for col, type in [('match_score', 'INTEGER'), ('match_explanation', 'TEXT')]:
        try:
            cursor.execute(f"ALTER TABLE tracked_events ADD COLUMN {col} {type}")
            print(f"Added {col} to tracked_events")
        except sqlite3.OperationalError:
            print(f"{col} already exists in tracked_events")

    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
