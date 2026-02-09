import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import create_app
from models import db, Hackathon, Internship

def fix_malformed_links():
    app = create_app()
    with app.app_context():
        print("🔍 Checking for malformed Unstop links...")
        
        # Helper to clean link
        def clean_link(link):
            if not link: return link
            if "unstop.com/https:" in link:
                clean = link.split("unstop.com/https:")[1]
                return f"https:{clean}"
            if "unstop.com//opportunity" in link:
                return link.replace("unstop.com//opportunity", "unstop.com/opportunity")
            if "https://https://" in link:
                return link.replace("https://https://", "https://")
            return link

        # Fix Hackathons
        hacks = Hackathon.query.filter(
            (Hackathon.registration_link.like('%unstop.com/https:%')) | 
            (Hackathon.registration_link.like('%https://https://%'))
        ).all()
        
        for h in hacks:
            old = h.registration_link
            h.registration_link = clean_link(h.registration_link)
            print(f"✅ Fixed Hackathon: {h.title}\n   Old: {old}\n   New: {h.registration_link}")

        # Fix Internships
        interns = Internship.query.filter(
            (Internship.application_link.like('%unstop.com/https:%')) | 
            (Internship.application_link.like('%https://https://%'))
        ).all()
        
        for i in interns:
            old = i.application_link
            i.application_link = clean_link(i.application_link)
            print(f"✅ Fixed Internship: {i.title}\n   Old: {old}\n   New: {i.application_link}")

        db.session.commit()
        print(f"🎉 Cleanup complete. Fixed {len(hacks)} hackathons and {len(interns)} internships.")

if __name__ == "__main__":
    fix_malformed_links()
