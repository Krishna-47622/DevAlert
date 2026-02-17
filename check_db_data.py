
from app import app
from models import db, User, Hackathon, Internship, TrackedEvent

def check_data():
    with app.app_context():
        print("\n--- Checking User Data ---")
        users_with_resume = User.query.filter(
            (User.resume_text != None) | (User.resume_link != None)
        ).count()
        total_users = User.query.count()
        print(f"Total Users: {total_users}")
        print(f"Users with Resume (Text or Link): {users_with_resume}")
        
        # Check specific user if possible (e.g. first one found)
        sample_user = User.query.filter(User.resume_text != None).first()
        if sample_user:
            print(f"Sample User ({sample_user.username}) Resume Length: {len(sample_user.resume_text)}")
        else:
            print("❌ No users have resume text!")

        print("\n--- Checking Event Data ---")
        hackathons = Hackathon.query.count()
        internships = Internship.query.count()
        print(f"Total Hackathons: {hackathons}")
        print(f"Total Internships: {internships}")
        
        sample_hack = Hackathon.query.first()
        if sample_hack:
            print(f"Sample Hackathon ({sample_hack.title}) Description Length: {len(sample_hack.description) if sample_hack.description else 0}")
        else:
            print("❌ No hackathons found!")

        print("\n--- Checking Tracked Events with Match Score ---")
        matched_events = TrackedEvent.query.filter(TrackedEvent.match_score != None).count()
        print(f"Tracked Events with Match Score: {matched_events}")

if __name__ == "__main__":
    check_data()
