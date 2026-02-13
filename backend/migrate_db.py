import os
import sqlite3
from config import Config

def migrate():
    db_uri = Config.SQLALCHEMY_DATABASE_URI
    if not db_uri.startswith('sqlite:///'):
        print(f"Unsupported database for auto-migration via this script: {db_uri}")
        return

    db_path = db_uri.replace('sqlite:///', '')
    # If it's a relative path, it might need adjustment based on where this script is run
    if not os.path.isabs(db_path):
        # Config.py sets it relative to backend/instance usually
        # But let's check common locations
        possible_paths = [
            db_path,
            os.path.join('instance', 'devalert.db'),
            os.path.join('backend', 'instance', 'devalert.db'),
            'devalert.db'
        ]
        for p in possible_paths:
            if os.path.exists(p):
                db_path = p
                break

    print(f"Migrating database at: {db_path}")
    if not os.path.exists(db_path):
        print("Database file not found. Nothing to migrate.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Add columns to users table
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN resume_text TEXT")
        print("Added resume_text to users")
    except sqlite3.OperationalError:
        print("resume_text already exists in users")

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN resume_updated_at DATETIME")
        print("Added resume_updated_at to users")
    except sqlite3.OperationalError:
        print("resume_updated_at already exists in users")

    # Add columns to tracked_events table
    try:
        cursor.execute("ALTER TABLE tracked_events ADD COLUMN match_score INTEGER")
        print("Added match_score to tracked_events")
    except sqlite3.OperationalError:
        print("match_score already exists in tracked_events")

    try:
        cursor.execute("ALTER TABLE tracked_events ADD COLUMN match_explanation TEXT")
        print("Added match_explanation to tracked_events")
    except sqlite3.OperationalError:
        print("match_explanation already exists in tracked_events")

    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
