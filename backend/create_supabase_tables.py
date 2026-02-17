
import os
from app import create_app
from models import db
from dotenv import load_dotenv

load_dotenv()

def create_tables():
    supabase_url = os.getenv('SUPABASE_DATABASE_URL')
    if not supabase_url:
        print("❌ Error: SUPABASE_DATABASE_URL not found in .env")
        return

    print(f"🚀 Initializing Schema in Supabase...")
    
    # Temporarily override the app's database configuration
    app = create_app()
    app.config['SQLALCHEMY_DATABASE_URI'] = supabase_url
    
    with app.app_context():
        try:
            db.create_all()
            print("✅ Tables created successfully!")
        except Exception as e:
            print(f"❌ Error creating tables: {e}")

if __name__ == "__main__":
    create_tables()
