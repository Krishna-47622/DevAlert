import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import create_app
from models import db, User, Hackathon, Internship, Notification, Application

# Define Source (Local SQLite)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
SOURCE_DB_PATH = os.path.join(BASE_DIR, "instance", "devalert.db")
SOURCE_DB_URI = f'sqlite:///{SOURCE_DB_PATH}'

def migrate():
    # 1. Check Target
    target_url = os.getenv('DATABASE_URL')
    if not target_url:
        print("❌ Error: DATABASE_URL environment variable is not set.")
        print("Usage: $env:DATABASE_URL='<your_render_postgres_url>'; python migrate_data.py")
        return

    print(f"📂 Source DB: {SOURCE_DB_URI}")
    print(f"🚀 Target DB: {target_url.split('@')[1] if '@' in target_url else '...'} (Remote)")

    if not os.path.exists(SOURCE_DB_PATH):
        print("❌ Error: Local database file not found at", SOURCE_DB_PATH)
        return

    # 2. Setup Source Connection
    try:
        source_engine = create_engine(SOURCE_DB_URI)
        SourceSession = sessionmaker(bind=source_engine)
        source_session = SourceSession()
    except Exception as e:
        print(f"❌ Failed to connect to source DB: {e}")
        return

    # 3. Setup Target (via Flask App)
    app = create_app()
    
    with app.app_context():
        print("⏳ Connecting to Target Database...")
        try:
            db.create_all() # Ensure tables exist
        except Exception as e:
            print(f"❌ Failed to connect/create tables in Target DB: {e}")
            return

        print("✅ Connection Successful. Starting migration...")

        # --- Helper to Copy Data ---
        def copy_table(Model, name):
            print(f"   Processing {name}...", end=" ")
            try:
                # Fetch from Source
                items = source_session.query(Model).all()
                count = 0
                for item in items:
                    # Merge checks for primary key existence and updates/inserts via Target Session
                    # We utilize make_transient to detach strictly
                    source_session.expunge(item)
                    db.session.merge(item)
                    count += 1
                
                print(f"Migrated {count} records.")
                return True
            except Exception as e:
                print(f"❌ Error migrating {name}: {e}")
                return False

        # --- Execute Migration Order (Respect Foreign Keys) ---
        # 1. Users (Independent)
        copy_table(User, "Users")
        
        # 2. Host Requests? (Part of User model)

        # 3. Hackathons & Internships (Might depend on User if we added host_id)
        copy_table(Hackathon, "Hackathons")
        copy_table(Internship, "Internships")

        # 4. Applications (Depends on User and Opportunity)
        copy_table(Application, "Applications")

        # 5. Notifications (Depends on User)
        copy_table(Notification, "Notifications")

        # Commit all changes
        try:
            print("💾 Committing changes to Target DB...")
            db.session.commit()
            print("🎉 MIGRATION COMPLETE! Your local data is now on Render.")
        except Exception as e:
            print(f"❌ Commit failed: {e}")
            db.session.rollback()

if __name__ == "__main__":
    migrate()
