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
import time

scanner_bp = Blueprint('scanner', __name__)

# Initialize scheduler
scheduler = BackgroundScheduler()
scan_results = []

# Google Custom Search API configuration
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
GOOGLE_CSE_ID = os.getenv('GOOGLE_CSE_ID', '')

def check_link_validity(url):
    """Perform a HEAD request to check if a link is still alive with browser-like headers"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    try:
        response = requests.head(url, timeout=5, allow_redirects=True, headers=headers)
        if response.status_code < 400: return True
        # If 403 or 405, it might just be bot protection on HEAD, try GET
        if response.status_code in [403, 404, 405]:
            response = requests.get(url, timeout=5, stream=True, headers=headers)
            return response.status_code < 400
        return False
    except:
        try:
            # Fallback to GET if HEAD fails
            response = requests.get(url, timeout=5, stream=True, headers=headers)
            return response.status_code < 400
        except:
            return False

def fetch_page_text(url):
    """Fetch and clean text content from a URL for Gemini analysis"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.extract()
            
        # Get text
        text = soup.get_text()
        
        # Break into lines and remove leading and trailing whitespace
        lines = (line.strip() for line in text.splitlines())
        # Break multi-headlines into a line each
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        # Drop blank lines
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return text[:5000] # Limit context size
    except Exception as e:
        print(f"DEBUG: Failed to fetch text from {url}: {e}")
        return ""

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
    """Use gemini-1.5-flash to analyze and extract detailed structured data"""
    try:
        import google.generativeai as genai
        import json
        GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
        
        if not GEMINI_API_KEY:
            return event_block
            
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        url = event_block.get('registration_link') or event_block.get('application_link')
        page_text = ""
        if url:
             page_text = fetch_page_text(url)
             
        # Combine snippet and page text
        context = f"Title: {event_block.get('title')}\nSnippet: {event_block.get('description')}\nPage Text: {page_text[:3000]}"
        
        prompt = f"""
        I am providing information about a potential student opportunity. 
        Analyze the text below and extract details into a STRICT JSON format.
        
        STRICT JSON SCHEMA:
        {{
            "name": "Full Name of Opportunity",
            "dates": "Start and End dates as string",
            "location": "City, Country or 'Online'",
            "prize_pool": "Amount or 'Not specified'",
            "deadline": "YYYY-MM-DD",
            "mode": "Online/Offline/Hybrid",
            "is_internship_inside_hackathon": true/false,
            "is_legit": true/false (false if old/dead/scam),
            "is_future_event": true/false (true if after {datetime.now().strftime('%Y-%m-%d')}),
            "skills": "comma separated key skills"
        }}
        
        TEXT TO ANALYZE:
        {context}
        """
        
        response = model.generate_content(prompt)
        text = response.text
        
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if not json_match:
            return event_block
            
        data = json.loads(json_match.group(0))
        
        is_legit = data.get('is_legit', True)
        is_future = data.get('is_future_event', True)
        
        if not is_legit or not is_future:
            print(f">>> [Scanner] AI Filtering Event: '{data.get('name')}' (Legit: {is_legit}, Future: {is_future})", flush=True)
            return None
            
        # Update event block with high-fidelity data
        event_block['title'] = data.get('name', event_block['title'])
        event_block['location'] = data.get('location', event_block['location'])
        event_block['mode'] = data.get('mode', event_block['mode'])
        event_block['skills_required'] = data.get('skills', event_block.get('skills_required', 'Programming'))
        
        if 'prize_pool' in data and data.get('prize_pool') != 'Not specified':
            event_block['prize_pool'] = data.get('prize_pool')
            
        try:
            event_block['deadline'] = datetime.strptime(data.get('deadline'), '%Y-%m-%d')
        except:
            pass
            
        # HANDLE INTERNSHIP DETECTION WITHIN HACKATHON
        if data.get('is_internship_inside_hackathon') and event_block.get('type') == 'hackathon':
             event_block['also_internship'] = True
             print(f"DEBUG: Found internship opportunity inside hackathon: {event_block['title']}")
            
        return event_block
    except Exception as e:
        print(f"DEBUG: Gemini 1.5 Analysis Error: {e}")
        return event_block



def get_dynamic_queries(event_type):
    """Use Gemini to generate fresh search queries targeting specific sources requested by user"""
    sources = {
        'hackathon': "Devpost, MLH, Devfolio, HackerEarth, Hack Club, AngelHack",
        'internship': "LinkedIn, Internshala, Google Careers (STEP/SWE), Levels.fyi, AICTE Internship Portal, Unstop"
    }
    
    default_hacks = ["site:devfolio.co hackathon 2026", "site:mlh.io 2026", "site:devpost.com India", "site:hackerearth.com hackathons"]
    default_interns = ["site:internshala.com software intern 2026", "site:unstop.com internships", "site:careers.google.com student roles", "site:internship.aicte-india.org"]
    
    try:
        import google.generativeai as genai
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key: return default_hacks if event_type == 'hackathon' else default_interns
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        current_date = datetime.now().strftime("%B %Y")
        prompt = f"""
        Generate 8 highly targeted Google search queries (using site: operator where possible) to find the LATEST and ACTIVE {event_type}s for 2026.
        Target these platforms specifically: {sources.get(event_type)}.
        Focus on India-based or Global-remote opportunities for students.
        Exclude any results from 2025 or earlier.
        Return ONLY the queries, one per line.
        """
        
        response = model.generate_content(prompt)
        queries = [q.strip() for q in response.text.split('\n') if q.strip() and ('site:' in q or event_type in q.lower())]
        return queries[:8] if len(queries) >= 3 else (default_hacks if event_type == 'hackathon' else default_interns)
    except Exception as e:
        print(f"DEBUG: Dynamic query error: {e}")
        return default_hacks if event_type == 'hackathon' else default_interns

from urllib.parse import urljoin, urlparse

DIRECT_SOURCES = {
    'hackathon': [
        'https://devfolio.co/hackathons',
        'https://mlh.io/seasons/2026/events',
        'https://devpost.com/hackathons',
        'https://hackathons.hackclub.com/',
        'https://www.hackerearth.com/challenges/hackathon/'
    ],
    'internship': [
        'https://internshala.com/internships',
        'https://unstop.com/internships',
        'https://internship.aicte-india.org/module_admin/index.php',
        'https://careers.google.com/students/'
    ]
}

def get_absolute_url(base_url, relative_url):
    """Convert relative URL to absolute URL"""
    if not relative_url: return ""
    if relative_url.startswith(('http://', 'https://')):
        return relative_url
    return urljoin(base_url, relative_url)

def extract_bulk_from_page(url, event_type):
    """Fetch page text and use Gemini for bulk opportunity extraction"""
    print(f"[AI Scanner] Directly scanning source: {url}")
    page_text = fetch_page_text(url)
    if not page_text or len(page_text) < 200:
        print(f"DEBUG: Page text too short or empty for {url}")
        return []

    try:
        import google.generativeai as genai
        import json
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key: return []

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = f"""
        I am providing the text content from a web page: {url}
        Extract a LIST of all ACTIVE and FUTURE {event_type}s for late 2025 or 2026.
        Ignore old or finished events.
        
        STRICT JSON FORMAT:
        {{
            "opportunities": [
                {{
                    "name": "Full Title",
                    "link": "Relative or Absolute Link",
                    "deadline": "YYYY-MM-DD",
                    "location": "City, Country or 'Online'",
                    "prize_pool": "Amount or 'Not specified'",
                    "organizer": "Company or Org Name",
                    "description": "Short summary",
                    "mode": "Online/Offline/Hybrid"
                }}
            ]
        }}
        
        PAGE TEXT CONTENT:
        {page_text[:8000]}
        """

        response = model.generate_content(prompt)
        text = response.text
        
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if not json_match: return []

        data = json.loads(json_match.group(0))
        extracted = data.get('opportunities', [])
        print(f">>> [Scanner] Gemini extracted {len(extracted)} raw opportunities from {url}", flush=True)
        
        # Post-process links and validate
        valid_results = []
        base_domain = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
        
        for opp in extracted:
            opp['link'] = get_absolute_url(base_domain, opp.get('link'))
            if check_link_validity(opp['link']):
                valid_results.append(opp)
            else:
                print(f">>> [Scanner] Invalid link filtered: {opp['link']}", flush=True)
        
        print(f">>> [Scanner] {len(valid_results)}/{len(extracted)} items passed link validation for {url}", flush=True)
        return valid_results
    except Exception as e:
        print(f"❌ [Scanner] Direct extraction error for {url}: {e}", flush=True)
        import traceback
        traceback.print_exc()
        return []

def _perform_scan():
    """Internal scan logic with direct site crawling and fallback search"""
    print(f">>> [Scanner] _perform_scan loop started. Sources: {list(DIRECT_SOURCES.keys())}", flush=True)
    try:
        new_hacks = 0
        new_interns = 0
        
        task_configs = [
            ('hackathon', Hackathon),
            ('internship', Internship)
        ]
        
        for e_type, ModelClass in task_configs:
            print(f">>> [Scanner] Mode: {e_type}", flush=True)
            # 1. DIRECT SCANNING (Higher priority/quality)
            for direct_url in DIRECT_SOURCES.get(e_type, []):
                print(f">>> [Scanner] Direct Scan URL: {direct_url}", flush=True)
                bulk_results = extract_bulk_from_page(direct_url, e_type)
                for res in bulk_results:
                    if ModelClass.query.filter_by(title=res['name']).first(): 
                        print(f">>> [Scanner] Skipping duplicate: {res['name']}", flush=True)
                        continue
                    
                    print(f">>> [Scanner] Found new potential candidate: {res['name']}", flush=True)
                    # Prepare for enrichment/save
                    event_data = {
                        'title': res['name'],
                        'description': res['description'],
                        'organizer': res['organizer'] if e_type == 'hackathon' else None,
                        'company': res['organizer'] if e_type == 'internship' else None,
                        'location': res['location'],
                        'mode': res['mode'],
                        'registration_link': res['link'] if e_type == 'hackathon' else None,
                        'application_link': res['link'] if e_type == 'internship' else None,
                        'source': 'direct_scan'
                    }
                    
                    # High-fidelity enrichment per individual event
                    enriched = analyze_with_gemini(event_data)
                    if not enriched: 
                        print(f">>> [Scanner] Enrichment rejected: {res['name']}", flush=True)
                        continue
                    
                    # Final Field Mapping
                    if e_type == 'hackathon':
                        entry = Hackathon(
                            title=enriched['title'],
                            description=enriched['description'],
                            organizer=enriched.get('organizer', 'Unknown'),
                            location=enriched['location'],
                            mode=enriched['mode'],
                            deadline=enriched.get('deadline'),
                            prize_pool=enriched.get('prize_pool', 'Not specified'),
                            registration_link=enriched['registration_link'],
                            status='pending',
                            source='direct_scan'
                        )
                        db.session.add(entry)
                        db.session.flush()
                        create_notifications_for_event('hackathon', entry.id, entry.title)
                        new_hacks += 1
                        print(f">>> [Scanner] SAVED Hackathon: {entry.title}", flush=True)
                    else:
                        entry = Internship(
                            title=enriched['title'],
                            company=enriched.get('company', 'Unknown'),
                            description=enriched['description'],
                            location=enriched['location'],
                            mode=enriched['mode'],
                            duration='3 months',
                            deadline=enriched.get('deadline'),
                            skills_required=enriched.get('skills_required', 'Programming'),
                            application_link=enriched['application_link'],
                            status='pending',
                            source='direct_scan'
                        )
                        db.session.add(entry)
                        db.session.flush()
                        create_notifications_for_event('internship', entry.id, entry.title)
                        new_interns += 1
                        print(f">>> [Scanner] SAVED Internship: {entry.title}", flush=True)

            # 2. GOOGLE SEARCH FALLBACK (Discovery)
            queries = get_dynamic_queries(e_type)
            print(f">>> [Scanner] Google Discovery queries for {e_type}: {len(queries)}", flush=True)
            for q in queries:
                print(f">>> [Scanner] Running discovery query: {q}", flush=True)
                results = google_search(q, num_results=5)
                print(f">>> [Scanner] Search found {len(results)} raw results", flush=True)
                for res in results:
                    if not check_link_validity(res['link']): 
                        print(f">>> [Scanner] Filtered (Invalid Link): {res['link']}", flush=True)
                        continue
                    if ModelClass.query.filter_by(title=res['title']).first(): 
                        print(f">>> [Scanner] Filtered (Duplicate): {res['title']}", flush=True)
                        continue
                    
                    print(f">>> [Scanner] Discovery candidate: {res['title']}", flush=True)
                    event_data = parse_event_data(res, e_type)
                    enriched = analyze_with_gemini(event_data)
                    if not enriched: continue
                    
                    if e_type == 'hackathon':
                         final_data = {
                             'title': enriched.get('title'),
                             'description': enriched.get('description'),
                             'organizer': enriched.get('organizer'),
                             'location': enriched.get('location'),
                             'mode': enriched.get('mode'),
                             'deadline': enriched.get('deadline'),
                             'prize_pool': enriched.get('prize_pool'),
                             'registration_link': enriched.get('registration_link'),
                             'status': 'pending',
                             'source': 'ai_scan'
                         }
                         entry = Hackathon(**final_data)
                         db.session.add(entry)
                    else:
                         final_data = {
                             'title': enriched.get('title'),
                             'company': enriched.get('company'),
                             'description': enriched.get('description'),
                             'location': enriched.get('location'),
                             'mode': enriched.get('mode'),
                             'duration': enriched.get('duration', '3 months'),
                             'deadline': enriched.get('deadline'),
                             'skills_required': enriched.get('skills_required', 'Programming'),
                             'application_link': enriched.get('application_link'),
                             'status': 'pending',
                             'source': 'ai_scan'
                         }
                         entry = Internship(**final_data)
                         db.session.add(entry)
                    
                    db.session.flush()
                    create_notifications_for_event(e_type, entry.id, entry.title)
                    if e_type == 'hackathon': new_hacks += 1
                    else: new_interns += 1
                    print(f">>> [Scanner] SAVED ({e_type}): {entry.title}", flush=True)
            
        print(f">>> [Scanner] Committing {new_hacks + new_interns} new entries to database...", flush=True)
        db.session.commit()
        
        result = {
            'timestamp': datetime.now().isoformat(),
            'new_hackathons': new_hacks,
            'new_internships': new_interns,
            'status': 'success'
        }
        
        global scan_results
        scan_results.append(result)
        print(f"✅ Advanced Direct Scan complete: Found {new_hacks} Hacks, {new_interns} Internships.")
        return result
        
    except Exception as e:
        print(f"❌ Database error in scan: {e}")
        db.session.rollback()
        raise

def ai_scan_and_save(app=None):
    """
    Main scanning function with two-stage processing.
    Designed to be thread-safe for background execution.
    """
    print(f">>> [Scanner Thread] Worker started at {datetime.now()}", flush=True)
    
    # Wait a moment for the parent request to complete and return its response
    try:
        print(">>> [Scanner Thread] Sleeping for 2s to allow parent response...", flush=True)
        time.sleep(2)
    except Exception as e:
        print(f">>> [Scanner Thread] Sleep interrupted: {e}", flush=True)

    print(f">>> [Scanner Thread] Starting Advanced Multi-Site Scan...", flush=True)
    
    try:
        if app:
            with app.app_context():
                print(">>> [Scanner Thread] App context acquired via passed app", flush=True)
                return _perform_scan()
        else:
            from flask import current_app
            try:
                # This might fail in a background thread if context not pushed
                if current_app:
                    print(">>> [Scanner Thread] App context found in current_app", flush=True)
                    return _perform_scan()
            except:
                pass
                
            print(">>> [Scanner Thread] Creating fresh app context...", flush=True)
            from app import create_app
            temp_app = create_app()
            with temp_app.app_context():
                return _perform_scan()
    except Exception as e:
        print(f"❌ [Scanner Thread] Scan failed with error: {e}", flush=True)
        import traceback
        traceback.print_exc()
        return {'error': str(e)}
    finally:
        print(">>> [Scanner Thread] Cleaning up session...", flush=True)
        try:
            db.session.remove()
        except:
            pass

@scanner_bp.route('/scan', methods=['POST'])
def trigger_scan():
    """Manual scan trigger - runs in background with DB safety"""
    app_obj = current_app._get_current_object()
    
    # CRITICAL: Clean up current request session and dispose pool
    # This prevents the background thread from inheriting corrupted state.
    db.session.remove()
    db.engine.dispose()
    
    thread = threading.Thread(target=ai_scan_and_save, args=(app_obj,))
    thread.daemon = True
    thread.start()
    
    return jsonify({
        "status": "success",
        "message": "Scan started in background. Results will appear in a few minutes.",
        "timestamp": datetime.now().isoformat()
    })

@scanner_bp.route('/results', methods=['GET'])
def get_scan_results():
    """Get last 10 results"""
    return jsonify({"results": scan_results[-10:]})

@scanner_bp.route('/schedule', methods=['GET'])
def get_schedule_status():
    """Scheduler info"""
    jobs = scheduler.get_jobs()
    return jsonify({
        "running": scheduler.running,
        "jobs": [{"id": j.id, "next": j.next_run_time.isoformat() if j.next_run_time else None} for j in jobs]
    })

def start_scheduler(app):
    """Start scan every 60m"""
    if not scheduler.running:
        scheduler.add_job(func=ai_scan_and_save, trigger="interval", minutes=60, id='ai_scanner_v2', args=[app])
        scheduler.start()
        print("✅ Advanced AI Scanner v2 scheduler started")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print("⏹️  AI Scanner scheduler stopped")
