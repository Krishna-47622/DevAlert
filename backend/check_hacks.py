from app import create_app
from models import db, Hackathon

app = create_app()
with app.app_context():
    hacks = Hackathon.query.all()
    print(f"Total hackathons: {len(hacks)}")
    for h in hacks:
        print(f"- {h.title} ({h.source})")
