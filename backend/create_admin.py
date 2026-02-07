import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

from app import create_app
from models import db, User

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        if not User.query.filter_by(username='admin').first():
            admin = User(username='admin', email='admin@example.com', role='admin')
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print("Admin user created successfully. Username: admin, Password: admin123")
        else:
            print("Admin user already exists.")
