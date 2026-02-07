import sys
from app import create_app
from models import db, User

app = create_app()

def update_role(username, role):
    with app.app_context():
        user = User.query.filter_by(username=username).first()
        if not user:
            print(f"User {username} not found!")
            return
        
        user.role = role
        if role == 'hoster':
            user.is_host_approved = True
            
        db.session.commit()
        print(f"Updated {username} to {role} (Approved: {user.is_host_approved})")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python update_roles.py <username> <role>")
    else:
        update_role(sys.argv[1], sys.argv[2])
