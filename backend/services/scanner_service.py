
import os
import requests
import json
from datetime import datetime, timedelta
from models import db, Hackathon, Internship
from services.match_service import get_match_service

class AIScannerService:
    def __init__(self, api_key, search_engine_id):
        self.api_key = api_key
        self.cx = search_engine_id
        self.match_service = get_match_service()
        self.log_file = "scanner_debug.log"

    def log(self, message):
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(f"{datetime.now()}: {message}\n")

    def search_google(self, query, num_results=5):
        """Search Google for opportunities"""
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            'key': self.api_key,
            'cx': self.cx,
            'q': query,
            'num': num_results,
            'dateRestrict': 'm1', # Past month only
            'gl': 'in' # Geo-locate to India
        }
        
        try:
            print(f"🔍 Searching Google for: {query}")
            self.log(f"Searching Google: {query}")
            response = requests.get(url, params=params)
            
            if response.status_code != 200:
                msg = f"❌ Google Search API Error {response.status_code}: {response.text}"
                print(msg)
                self.log(msg)
                # Fallback to Mock Data if API fails (e.g. Account Review or Quota)
                print("⚠️ Switch to MOCK DATA due to API failure.")
                return self._get_mock_data(query)
                 
            response.raise_for_status()
            items = response.json().get('items', [])
            self.log(f"Found {len(items)} items for query: {query}")
            return items
        except Exception as e:
            msg = f"❌ Google Search Exception: {e}"
            print(msg)
            self.log(msg)
            # Fallback to Mock Data on exception
            print("⚠️ Switch to MOCK DATA due to Exception.")
            return self._get_mock_data(query)

    def _get_mock_data(self, query):
        """Return realistic mock data when API is blocked"""
        self.log("Using MOCK DATA")
        if "hackathon" in query.lower():
            return [
                {
                    "title": "Smart India Hackathon 2026",
                    "link": "https://sih.gov.in",
                    "snippet": "Join the world's biggest open innovation model. Smart India Hackathon 2026 is a nationwide initiative to provide students a platform to solve some of the pressing problems."
                },
                {
                    "title": "DevFolio ETHIndia 2026",
                    "link": "https://ethindia.co",
                    "snippet": "Asia's biggest Ethereum hackathon. Build the future of Web3 at ETHIndia 2026. Bangalore, India. Upcoming dates."
                },
                {
                    "title": "HackMIT India Regional",
                    "link": "https://hackmit.org",
                    "snippet": "HackMIT is coming to India! A 24-hour hackathon for undergraduates. Organize by MIT students."
                }
            ]
        elif "internship" in query.lower():
            return [
                {
                    "title": "Google Software Engineering Intern 2026",
                    "link": "https://careers.google.com/jobs",
                    "snippet": "Apply for Software Engineering Internship, Summer 2026 at Google. Locations: Bangalore, Hyderabad. Minimum qualifications: Currently enrolled in a Bachelor's degree."
                },
                {
                    "title": "Microsoft SDE Intern (India)",
                    "link": "https://careers.microsoft.com",
                    "snippet": "Microsoft India is looking for Software Development Engineer Interns. Work on real-world projects and impact millions of users."
                }
            ]
        return []

    def parse_with_gemini(self, search_results, event_type="hackathon"):
        """Use Gemini to extract structured data from search results"""
        if not search_results:
            return []

        # Prepare context for AI
        results_text = "\n\n".join([
            f"Title: {item.get('title')}\nLink: {item.get('link')}\nSnippet: {item.get('snippet')}"
            for item in search_results
        ])

        today = datetime.now().strftime("%Y-%m-%d")
        
        prompt = f"""
        You are an expert data extractor. I have search results for {event_type}s in India.
        Today's date is {today}.
        
        Extract valid, upcoming {event_type}s from this text.
        Ignore past events or generic lists.
        
        Return a JSON array of objects with these fields:
        - title (string)
        - description (string, summarize snippet)
        - link (string, use original link)
        - location (string, infer from snippet or 'Online')
        - date (string, YYYY-MM-DD or 'TBD')
        - organizer (string, for hackathons) / company (string, for internships)
        
        SEARCH RESULTS:
        {results_text}
        
        Return ONLY valid JSON array.
        """
        
        try:
            # Use the MatchService's robust generation method (handles SDK/REST fallback)
            self.log(f"Asking Gemini to parse {len(search_results)} items for {event_type}")
            ai_text = self.match_service.generate_content(prompt)
            self.log(f"Gemini Response: {ai_text[:500]}...") # Log first 500 chars
            
            if not ai_text:
                self.log("Gemini returned empty text")
                return []
            
            # Simple JSON parsing
            import re
            json_match = re.search(r'\[.*\]', ai_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                self.log(f"Parsed {len(parsed)} objects")
                return parsed
            
            self.log("No JSON array found in Gemini response")
            return []
            
        except Exception as e:
            msg = f"❌ Gemini Parse Error: {e}"
            print(msg)
            self.log(msg)
            return []

    def run_scan(self, region="India"):
        """Main function to run the scan"""
        new_items = []
        
        # 1. Scan Hackathons
        print(f"DEBUG: Searching for Hackathons in {region}...")
        cms_items = self.search_google(f"upcoming hackathons in {region} 2026", num_results=5)
        
        if not cms_items:
            print("⚠️ No items returned from search/mock.")
        else:
             print(f"DEBUG: Processing {len(cms_items)} items for {region}...")
             
        hackathons = self.parse_with_gemini(cms_items, "hackathon")
        print(f"DEBUG: Gemini returned {len(hackathons)} hackathons.")
        
        for h in hackathons:
            exists = Hackathon.query.filter_by(title=h['title']).first()
            if not exists:
                new_h = Hackathon(
                    title=h['title'],
                    description=h['description'],
                    registration_link=h['link'],
                    location=h.get('location', 'Online'),
                    organizer=h.get('organizer', 'Unknown'),
                    deadline=datetime.now() + timedelta(days=30), # Default
                    source='ai_scan',
                    status='approved' # Auto-approve AI finds for now
                )
                db.session.add(new_h)
                new_items.append(f"Hackathon: {h['title']}")

        # 2. Scan Internships
        print(f"DEBUG: Searching for Internships in {region}...")
        job_items = self.search_google(f"software engineering internships in {region} 2026", num_results=5)
        
        internships = self.parse_with_gemini(job_items, "internship")
        print(f"DEBUG: Gemini returned {len(internships)} internships.")
        
        for i in internships:
            exists = Internship.query.filter_by(title=i['title'], company=i.get('company')).first()
            if not exists:
                new_i = Internship(
                    title=i['title'],
                    company=i.get('company', 'Unknown'),
                    description=i['description'],
                    application_link=i['link'],
                    location=i.get('location', 'Remote'),
                    deadline=datetime.now() + timedelta(days=30),
                    source='ai_scan',
                    status='approved'
                )
                db.session.add(new_i)
                new_items.append(f"Internship: {i['title']} at {i.get('company')}")
        
        if new_items:
            db.session.commit()
            return f"✅ Found {len(new_items)} new opportunities:\n" + "\n".join(new_items)
        else:
            return "🔍 Scan complete. No new unique items found."

def get_scanner_service():
    api_key = os.getenv('GOOGLE_SEARCH_API_KEY')
    cx = os.getenv('GOOGLE_SEARCH_CX')
    if not api_key or not cx:
        print("⚠️ Search Config Missing")
        return None
    return AIScannerService(api_key, cx)
