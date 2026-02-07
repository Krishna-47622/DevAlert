from app import create_app
from models import Hackathon, Internship

app = create_app()

with app.app_context():
    print("--- Hackathons ---")
    hacks = Hackathon.query.all()
    for h in hacks:
        print(f"- {h.title} (Source: {h.source})")
        
    print("\n--- Internships ---")
    interns = Internship.query.all()
    for i in interns:
        print(f"- {i.title} (Source: {i.source})")
