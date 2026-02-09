"""
AI Scanner Service with Google Custom Search API
Searches Google for real hackathons and internships
"""
from flask import Blueprint, jsonify, request, current_app
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from models import db, Hackathon, Internship, User, Notification
import requests
import os
import re

scanner_bp = Blueprint('scanner', __name__)

# Initialize scheduler
scheduler = BackgroundScheduler()
scan_results = []

# Google Custom Search API configuration
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
GOOGLE_CSE_ID = os.getenv('GOOGLE_CSE_ID', '')

def check_link_validity(url):
    """Perform a HEAD request to check if a link is still alive"""
    try:
        response = requests.head(url, timeout=5, allow_redirects=True)
        return response.status_code < 400
    except:
        try:
            # Fallback to GET if HEAD is blocked
            response = requests.get(url, timeout=5, stream=True)
            return response.status_code < 400
        except:
            return False

def get_dynamic_queries(event_type):
    """Use Gemini to generate fresh search queries"""
    default_hacks = ["hackathon 2026 India", "coding competition India 2026", "MLH hackathons 2026"]
    default_interns = ["software engineer intern 2026 India", "tech internship 2026", "summer intern 2026 Bangalore"]
    
    try:
        import google.generativeai as genai
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key: return default_hacks if event_type == 'hackathon' else default_interns
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-pro')
        
        current_date = datetime.now().strftime("%B %Y")
        prompt = f"Generate 3 highly specific Google search queries to find the LATEST and ACTIVE {event_type}s in India for students as of {current_date}. Ensure queries focus on 2026 opportunities. Return only the 3 queries, one per line."
        
        response = model.generate_content(prompt)
        queries = [q.strip() for q in response.text.split('\n') if q.strip()]
        queries = [re.sub(r'^\d+\.\s*', '', q) for q in queries] # Remove numbering if AI added it
        
        print(f"DEBUG: Gemini generated queries for {event_type}: {queries}")
        return queries[:3] if len(queries) >= 3 else (default_hacks if event_type == 'hackathon' else default_interns)
    except Exception as e:
        print(f"DEBUG: Gemini Query generation error: {e}")
        return default_hacks if event_type == 'hackathon' else default_interns

def create_notifications_for_event(event_type, event_id, title):
    """Create notifications for all users when a new event is found"""
    try:
        users = User.query.all()
        for user in users:
            notification = Notification(
                user_id=user.id,
                event_type=event_type,
                event_id=event_id,
                title=f"New {event_type.capitalize()} Available!",
                message=f"Check out: {title}"
            )
            db.session.add(notification)
        db.session.commit()
        print(f"✅ Created notifications for {len(users)} users about: {title}")
    except Exception as e:
        print(f"❌ Error creating notifications: {str(e)}")
        db.session.rollback()

def google_search(query, num_results=10):
    """
    Perform Google Custom Search
    Returns list of search results with title, link, and snippet
    """
    if not GOOGLE_API_KEY or not GOOGLE_CSE_ID:
        print("⚠️  Google API credentials not configured. Using fallback documentation data.")
        return get_fallback_results(query)
    
    try:
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            'key': GOOGLE_API_KEY,
            'cx': GOOGLE_CSE_ID,
            'q': query,
            'num': num_results
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        results = []
        
        if 'items' in data:
            for item in data['items']:
                results.append({
                    'title': item.get('title', ''),
                    'link': item.get('link', ''),
                    'snippet': item.get('snippet', ''),
                    'source': extract_domain(item.get('link', ''))
                })
        
        return results
    except Exception as e:
        print(f"❌ Google Search error: {str(e)}")
        return get_fallback_results(query)

def extract_domain(url):
    """Extract domain name from URL"""
    try:
        match = re.search(r'https?://(?:www\.)?([^/]+)', url)
        if match:
            domain = match.group(1)
            # Clean up common domains
            if 'unstop.com' in domain:
                return 'unstop'
            elif 'devfolio.co' in domain:
                return 'devfolio'
            elif 'linkedin.com' in domain:
                return 'linkedin'
            elif 'mlh.io' in domain:
                return 'mlh'
            elif 'devpost.com' in domain:
                return 'devpost'
            elif 'internshala.com' in domain:
                return 'internshala'
            elif 'wellfound.com' in domain:
                return 'wellfound'
            else:
                return domain.split('.')[0]
        return 'web'
    except:
        return 'web'

def scrape_unstop(category="hackathons"):
    """Scrape Unstop for current hackathons/internships"""
    try:
        url = "https://unstop.com/api/public/opportunity/search-result"
        params = {
            'opportunity': category,
            'per_page': 10,
            'oppstatus': 'open'
        }
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=15)
        
        if response.status_code != 200:
             return []
             
        data = response.json()
        results = []
        
        if 'data' in data and 'data' in data['data']:
            items = data['data']['data']
            for item in items:
                title = item.get('title', 'Unknown Event')
                seo_url = item.get('seo_url', '')
                link = f"https://unstop.com/{seo_url}" if seo_url else ""
                
                if link:
                    results.append({
                        'title': title,
                        'link': link,
                        'snippet': f"Active {category[:-1]} on Unstop. Organized by {item.get('organisation', {}).get('name', 'Unstop found')}.",
                        'source': 'unstop'
                    })
        
        return results
    except Exception as e:
        print(f"⚠️ Unstop {category} API error: {e}")
        return []

def scrape_devpost():
    """Scrape Devpost for current hackathons"""
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        url = "https://devpost.com/hackathons"
        response = requests.get(url, headers=headers, timeout=10)
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(response.text, 'html.parser')
        results = []
        for card in soup.select('.hackathon-tile, .hackathon-listing-item, .side-card'):
            title_el = card.select_one('h3, .title, .hackathon-title')
            link_el = card.select_one('a[href]')
            if title_el and link_el:
                results.append({
                    'title': title_el.get_text().strip(),
                    'link': link_el['href'] if link_el['href'].startswith('http') else f"https://devpost.com{link_el['href']}",
                    'snippet': f"Active hackathon on Devpost: {title_el.get_text().strip()}",
                    'source': 'devpost'
                })
        return results[:5]
    except Exception as e:
        print(f"⚠️ Devpost scrape error: {e}")
        return []

def get_fallback_results(query):
    """Fallback data - Try multiple scrapers, then use hardcoded data"""
    print(f"🔍 AI Scanner: Using scraper fallback for: {query}")
    
    scraped_data = []
    if 'hackathon' in query.lower():
        scraped_data.extend(scrape_unstop("hackathons"))
        if not scraped_data:
            scraped_data.extend(scrape_devpost())
    elif 'internship' in query.lower():
        scraped_data.extend(scrape_unstop("internships"))
    
    if scraped_data:
        return scraped_data
    
    # Final hardcoded fallback if all else fails
    if 'hackathon' in query.lower():
        return [
            {'title': 'Smart India Hackathon 2026', 'link': 'https://www.sih.gov.in/', 'snippet': 'National level hackathon for innovative solutions.', 'source': 'sih.gov.in'},
            {'title': 'ETHIndia 2026 - Ethereum Hackathon', 'link': 'https://ethindia.co/', 'snippet': 'India\'s largest Ethereum hackathon.', 'source': 'devfolio'}
        ]
    else:
        return [
            {'title': 'Google SWE Intern 2026', 'link': 'https://careers.google.com/students/', 'snippet': 'Software Engineering Intern positions at Google India.', 'source': 'google'}
        ]

def parse_event_data(search_result, event_type):
    """Parse search result into event data structure"""
    title = search_result['title']
    snippet = search_result['snippet']
    link = search_result['link']
    source = search_result['source']
    
    location = 'India'
    mode = 'hybrid'
    if 'online' in title.lower() or 'virtual' in title.lower():
        mode = 'online'
    
    if event_type == 'hackathon':
        return {
            'title': title[:200],
            'description': snippet[:500],
            'organizer': source.capitalize(),
            'location': location,
            'mode': mode,
            'deadline': datetime.now() + timedelta(days=30),
            'start_date': datetime.now() + timedelta(days=35),
            'registration_link': link,
            'status': 'pending',
            'source': source
        }
    else:
        return {
            'title': title[:200],
            'company': source.capitalize(),
            'description': snippet[:500],
            'location': location,
            'mode': mode,
            'duration': '3 months',
            'deadline': datetime.now() + timedelta(days=20),
            'skills_required': 'Programming',
            'application_link': link,
            'status': 'pending',
            'source': source
        }

def analyze_with_gemini(event_block):
    """Use Gemini AI to analyze and enrich event data"""
    try:
        import google.generativeai as genai
        import json
        GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
        
        if not GEMINI_API_KEY:
            print("DEBUG: GEMINI_API_KEY not found for enrichment")
            return event_block
            
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-pro')
        
        prompt = f"""
        Analyze this opportunity:
        Title: {event_block.get('title')}
        Description: {event_block.get('description')}
        Link: {event_block.get('registration_link') or event_block.get('application_link')}
        
        Extract the following and return ONLY STRICT JSON:
        {{
            "skills": "comma separated skills",
            "mode": "Online/Offline/Hybrid",
            "location": "City, State, India",
            "deadline": "YYYY-MM-DD (must be after {datetime.now().strftime('%Y-%m-%d')})",
            "is_legit": true/false (false if it looks like a dead page or scam),
            "is_old": true/false (true if the event is for 2025, 2024 or earlier)
        }}
        """
        
        response = model.generate_content(prompt)
        text = response.text
        
        # Robust JSON extraction
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if not json_match:
            print(f"DEBUG: Gemini did not return JSON for {event_block.get('title')}")
            return event_block
            
        data = json.loads(json_match.group(0))
        
        if data.get('is_old') or not data.get('is_legit'):
            print(f"DEBUG: Gemini filtered out {event_block.get('title')} (Old: {data.get('is_old')}, Legit: {data.get('is_legit')})")
            return None
            
        event_block['skills_required'] = data.get('skills', 'Programming')
        event_block['mode'] = data.get('mode', 'Hybrid')
        event_block['location'] = data.get('location', 'India')
        
        deadline_str = data.get('deadline')
        if deadline_str:
            try:
                event_block['deadline'] = datetime.strptime(deadline_str, '%Y-%m-%d')
            except:
                pass
                
        return event_block
    except Exception as e:
        print(f"DEBUG: Gemini analysis error: {e}")
        return event_block

def ai_scan_and_save(app=None):
    """Main scanning function"""
    print(f"[AI Scanner] Starting scan process at {datetime.now()}")
    
    try:
        from app import create_app
        if app:
            with app.app_context():
                return _perform_scan()
        elif current_app:
            return _perform_scan()
        else:
            temp_app = create_app()
            with temp_app.app_context():
                return _perform_scan()
    except Exception as e:
        print(f"❌ Scan failed: {e}")
        return {'error': str(e)}

def _perform_scan():
    """Internal scan logic"""
    try:
        new_hackathons = 0
        new_internships = 0
        
        # 1. Process Hackathons
        h_queries = get_dynamic_queries('hackathon')
        for q in h_queries:
            results = google_search(q, num_results=5)
            for res in results:
                if not check_link_validity(res['link']): continue
                
                event_data = parse_event_data(res, 'hackathon')
                if Hackathon.query.filter_by(title=res['title']).first(): continue
                
                enriched = analyze_with_gemini(event_data)
                if not enriched: continue
                
                hackathon = Hackathon(**enriched)
                db.session.add(hackathon)
                db.session.flush()
                create_notifications_for_event('hackathon', hackathon.id, hackathon.title)
                new_hackathons += 1
        
        # 2. Process Internships
        i_queries = get_dynamic_queries('internship')
        for q in i_queries:
            results = google_search(q, num_results=5)
            for res in results:
                if not check_link_validity(res['link']): continue
                
                event_data = parse_event_data(res, 'internship')
                if Internship.query.filter_by(title=res['title']).first(): continue
                
                enriched = analyze_with_gemini(event_data)
                if not enriched: continue
                
                internship = Internship(**enriched)
                db.session.add(internship)
                db.session.flush()
                create_notifications_for_event('internship', internship.id, internship.title)
                new_internships += 1

        db.session.commit()
        result = {
            'timestamp': datetime.now().isoformat(),
            'new_hackathons': new_hackathons,
            'new_internships': new_internships,
            'total_found': new_hackathons + new_internships
        }
        
        global scan_results
        scan_results.append(result)
        scan_results = scan_results[-10:]
        print(f"✅ Scan finished: {new_hackathons} Hacks, {new_internships} Internships.")
        return result
        
    except Exception as e:
        print(f"❌ Database error in scan: {e}")
        db.session.rollback()
        raise

@scanner_bp.route('/scan', methods=['POST'])
def trigger_scan():
    return jsonify({"message": "Scan started", "result": ai_scan_and_save()})

@scanner_bp.route('/results', methods=['GET'])
def get_scan_results():
    return jsonify({"results": scan_results})

@scanner_bp.route('/schedule', methods=['GET'])
def get_schedule_status():
    jobs = scheduler.get_jobs()
    return jsonify({
        "running": scheduler.running,
        "jobs": [{"id": j.id, "next": j.next_run_time.isoformat() if j.next_run_time else None} for j in jobs]
    })

def start_scheduler(app):
    """Start the background scheduler"""
    if not scheduler.running:
        scheduler.add_job(func=ai_scan_and_save, trigger="interval", minutes=60, id='ai_scanner', args=[app])
        scheduler.start()
        print("✅ Scheduler running every 60 minutes")

def stop_scheduler():
    """Stop the scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        print("⏹️  AI Scanner scheduler stopped")
