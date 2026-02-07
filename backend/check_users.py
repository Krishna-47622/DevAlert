from app import create_app
from models import db, User

app = create_app()

with app.app_context():
    users = User.query.all()
    print(f"\n{'ID':<5} {'Username':<20} {'Email':<30} {'Role':<15} {'Host Approved':<15}")
    print("-" * 85)
    for user in users:
        print(f"{user.id:<5} {user.username:<20} {user.email:<30} {user.role:<15} {user.is_host_approved:<15}")
    print("\n")
