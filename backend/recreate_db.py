import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

from app import create_app
from models import db

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        print("Dropping all tables...")
        db.drop_all()
        print("Creating all tables...")
        db.create_all()
        print("Database schema updated successfully.")
