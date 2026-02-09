
import os
from dotenv import load_dotenv
load_dotenv()

from app import create_app
from models import db, Notification
from sqlalchemy import inspect

def verify_and_fix_db():
    app = create_app()
    with app.app_context():
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        print("\n🔍 Checking Database Tables...")
        print(f"Existing Tables: {tables}")
        
        if 'notifications' not in tables:
            print("⚠️ WARNING: 'notifications' table is MISSING!")
            print("creating missing tables...")
            db.create_all()
            print("✅ 'notifications' table created.")
        else:
            print("✅ 'notifications' table exists.")
            
        # Verify columns too?
        cols = [c['name'] for c in inspector.get_columns('notifications')]
        print(f"Columns in notifications: {cols}")

if __name__ == "__main__":
    verify_and_fix_db()
