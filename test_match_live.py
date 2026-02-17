import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app
from models import db, User, Hackathon
from services.match_service import MatchService

def test_match():
    with app.app_context():
        # Get first user with resume
        user = User.query.filter(User.resume_text != None).first()
        if not user:
            print("❌ No user with resume found.")
            return

        # Get first hackathon
        event = Hackathon.query.first()
        if not event:
            print("❌ No hackathon found.")
            return

        print(f"Testing Match for User: {user.username}")
        print(f"Event: {event.title}")
        print(f"Resume Length: {len(user.resume_text)}")
        print(f"Event Desc Length: {len(event.description)}")

        api_key = os.getenv('GEMINI_API_KEY')
        print(f"Using API Key: {api_key[:10]}...")

        service = MatchService(api_key)
        
        opportunity_details = {
            'title': event.title,
            'description': event.description,
            'organizer': event.organizer
        }

        print("\n--- Starting Match ---")
        try:
            score, explanation = service.calculate_score(user.resume_text, opportunity_details)
            print(f"\n✅ Match Result:\nScore: {score}\nExplanation: {explanation}")
        except Exception as e:
            print(f"\n❌ Match Failed: {e}")

if __name__ == "__main__":
    test_match()
