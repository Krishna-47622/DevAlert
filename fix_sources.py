import sys
import os
import re

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import create_app
from models import db, Hackathon, Internship

def extract_domain(url):
    """Extract and format domain name from URL for branding"""
    if not url: return "Web"
    try:
        match = re.search(r'https?://(?:www\.)?([^/]+)', url)
        if match:
            domain = match.group(1).lower()
            mapping = {
                'unstop.com': 'Unstop',
                'devfolio.co': 'Devfolio',
                'linkedin.com': 'LinkedIn',
                'mlh.io': 'MLH',
                'devpost.com': 'Devpost',
                'internshala.com': 'Internshala',
                'wellfound.com': 'Wellfound',
                'hackerearth.com': 'HackerEarth',
                'hackclub.com': 'HackClub',
                'angelhack.com': 'AngelHack',
                'google.com': 'Google'
            }
            
            for key, val in mapping.items():
                if key in domain:
                    return val
            
            parts = domain.split('.')
            return parts[0].capitalize() if parts else 'Web'
        return 'Web'
    except:
        return 'Web'

def fix_all_sources():
    app = create_app()
    with app.app_context():
        print("🔍 Fixing existing sources and capitalization...")
        
        # Hackathons
        hacks = Hackathon.query.all()
        for h in hacks:
            old_src = h.source
            # Update source if generic
            if h.source in ['ai_scan', 'direct_scan', 'web', 'manual'] or (h.source and not h.source[0].isupper()):
                h.source = extract_domain(h.registration_link)
            
            # Fix capitalization for mode and location
            if h.mode and h.mode.lower() in ['online', 'offline', 'hybrid']:
                h.mode = h.mode.capitalize()
            if h.location and h.location.lower() == 'india':
                h.location = 'India'
            
            if h.source != old_src:
                print(f"✅ Updated Hackathon '{h.title}': {old_src} -> {h.source}")

        # Internships
        interns = Internship.query.all()
        for i in interns:
            old_src = i.source
            # Update source if generic
            if i.source in ['ai_scan', 'direct_scan', 'web', 'manual'] or (i.source and not i.source[0].isupper()):
                i.source = extract_domain(i.application_link)
            
            # Fix capitalization for mode and location
            if i.mode and i.mode.lower() in ['online', 'offline', 'hybrid']:
                i.mode = i.mode.capitalize()
            if i.location and i.location.lower() == 'india':
                i.location = 'India'
            
            if i.source != old_src:
                print(f"✅ Updated Internship '{i.title}': {old_src} -> {i.source}")

        db.session.commit()
        print("🎉 Cleanup complete.")

if __name__ == "__main__":
    fix_all_sources()
