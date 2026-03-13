"""
AI Scanner Service with Google Custom Search API
Searches Google for real hackathons and internships
"""
from flask import Blueprint, jsonify, request, current_app
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from models import db, Hackathon, Internship, User, Notification, AppSetting
import requests
import os
import re
import time
import threading
from urllib.parse import urljoin, urlparse
from services.opportunity_service import is_opportunity_expired_centralized
from sqlalchemy import text

scanner_bp = Blueprint('scanner', __name__)

# Initialize scheduler
scheduler = BackgroundScheduler()
scan_results = []

def is_auto_approve_enabled():
    """Read auto-approve state from the database (persists across restarts)"""
    try:
        def get_val():
            return AppSetting.get('auto_approve_enabled', 'false')
        val = db_safe_query(get_val)
        return val.lower() == 'true'
    except Exception:
        return False


# Google Custom Search API configuration
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY', '')
GOOGLE_CSE_ID = os.getenv('GOOGLE_CSE_ID', '')

from services.match_service import get_match_service

def safe_generate_content(prompt):
    """Resilient content generation using MatchService (handles SDK/REST fallback)"""
    try:
        service = get_match_service()
        return service.generate_content(prompt)
    except Exception as e:
        print(f"❌ [Scanner] safe_generate_content fatal error: {e}", flush=True)
        return None

def db_safe_query(func, *args, **kwargs):
    """Execute a DB operation with retry logic for connection drops"""
    max_retries = 2
    for attempt in range(max_retries):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            error_str = str(e).lower()
            if "closed the connection" in error_str or "terminated abnormally" in error_str or "connection" in error_str:
                print(f"⚠️ [Scanner] DB connection drop detected (Attempt {attempt+1}/{max_retries}). Recovering...", flush=True)
                try:
                    db.session.rollback()
                    db.session.remove()
                    # Re-verify connection
                    db.session.execute(text("SELECT 1"))
                except:
                    pass
                if attempt == max_retries - 1: raise
                time.sleep(1)
                continue
            raise

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
    except Exception as e:
        print(f"❌ Error creating notifications: {str(e)}")
        db.session.rollback()

from services.scanner_service import get_scanner_service

def google_search(query, num_results=10):
    """
    Perform Google Custom Search using AIScannerService (with Mock Fallback)
    Returns list of search results with title, link, snippet, and source
    """
    try:
        service = get_scanner_service()
        if not service:
            print(f">>> [Scanner] Service unavailable (API keys missing), using scraper fallback for: {query}", flush=True)
            return get_fallback_results(query)
        
        # Uses the service's robust search
        items = service.search_google(query, num_results)
        
        # If service returns empty list or fails internally (e.g. 403/401), 
        # get_scanner_service().search_google already returns _get_mock_data(query).
        # We want to TRY real scrapers if it's mock data or empty.
        
        is_mock = any("Smart India Hackathon" in str(item.get('title')) or "Google Software Engineering Intern" in str(item.get('title')) for item in items[:2])
        
        if not items or is_mock:
            print(f">>> [Scanner] Google Search returned mock/empty results for '{query}'. Trying scrapers...", flush=True)
            scraper_results = get_fallback_results(query)
            if scraper_results:
                return scraper_results
            
        results = []
        for item in items:
            results.append({
                'title': item.get('title', ''),
                'link': item.get('link', ''),
                'snippet': item.get('snippet', ''),
                'source': extract_domain(item.get('link', ''))
            })
            
        return results
    except Exception as e:
        print(f"❌ Google Search wrapper error: {str(e)}", flush=True)
        return get_fallback_results(query)

def extract_domain(url):
    """Extract and format domain name from URL for branding"""
    try:
        match = re.search(r'https?://(?:www\.)?([^/]+)', url)
        if match:
            domain = match.group(1).lower()
            # Clean up common domains
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
            
            # Fallback: Capitalize the first part of the domain
            parts = domain.split('.')
            return parts[0].capitalize() if parts else 'Web'
        return 'Web'
    except:
        return 'Web'

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
                if not seo_url: continue
                
                # Check if seo_url is already a full URL
                if seo_url.startswith(('http://', 'https://')):
                    link = seo_url
                else:
                    # Remove leading slash if present to avoid double slash
                    clean_seo = seo_url.lstrip('/')
                    link = f"https://unstop.com/{clean_seo}"
                
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
        # Try Unstop first
        scraped_data.extend(scrape_unstop("hackathons"))
        # Try Devpost second
        devpost_results = scrape_devpost()
        for dr in devpost_results:
            if not any(sr['link'] == dr['link'] for sr in scraped_data):
                scraped_data.append(dr)
    elif 'internship' in query.lower():
        scraped_data.extend(scrape_unstop("internships"))
    
    if scraped_data:
        print(f">>> [Scanner] Scrapers found {len(scraped_data)} real items to process.", flush=True)
        return scraped_data
    
    print(f">>> [Scanner] All scrapers failed for '{query}'. Using final hardcoded fallback.", flush=True)
    
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
    mode = 'Hybrid'
    if 'online' in title.lower() or 'virtual' in title.lower():
        mode = 'Online'
    
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
    """Use Gemini to analyze and extract detailed structured data"""
    try:
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
        
        text_response = safe_generate_content(prompt)
        if not text_response:
            return event_block # Return basic block if AI fails
        
        json_match = re.search(r'\{.*\}', text_response, re.DOTALL)
        if not json_match:
            return event_block
            
        import json
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
            
        return event_block
    except Exception as e:
        print(f"DEBUG: Gemini Analysis Error: {e}")
        return event_block

def get_dynamic_queries(event_type):
    """Use Gemini to generate fresh search queries targeting specific sources requested by user"""
    sources = {
        'hackathon': "Devpost, MLH, Devfolio, HackerEarth, Hack Club, AngelHack",
        'internship': "LinkedIn, Internshala, Google Careers (STEP/SWE), Levels.fyi, AICTE Internship Portal, Unstop"
    }
    
    default_hacks = ["site:devfolio.co hackathon 2025 2026", "site:mlh.io 2025 2026", "site:devpost.com hackathon India 2026", "site:hackerearth.com hackathons India 2026"]
    default_interns = ["site:internshala.com software intern 2025 2026", "site:unstop.com internships 2026", "site:careers.google.com student roles India", "site:internship.aicte-india.org"]
    
    try:
        prompt = f"""
        Generate 8 highly targeted Google search queries (using site: operator where possible) to find the LATEST and ACTIVE {event_type}s for 2026.
        Target these platforms specifically: {sources.get(event_type)}.
        Focus on India-based or Global-remote opportunities for students.
        Exclude any results from 2025 or earlier.
        Return ONLY the queries, one per line.
        """
        
        text_response = safe_generate_content(prompt)
        if not text_response:
            return default_hacks if event_type == 'hackathon' else default_interns
            
        queries = [q.strip() for q in text_response.split('\n') if q.strip() and ('site:' in q or event_type in q.lower())]
        return queries[:8] if len(queries) >= 3 else (default_hacks if event_type == 'hackathon' else default_interns)
    except Exception as e:
        print(f"DEBUG: Dynamic query error: {e}")
        return default_hacks if event_type == 'hackathon' else default_interns

def get_absolute_url(base_url, relative_url):
    """Convert relative URL to absolute URL with domain-smart handling"""
    if not relative_url: return ""
    
    relative_url = relative_url.strip()
    
    # If it's already a full clear URL, return as is
    if relative_url.startswith(('http://', 'https://')):
        return relative_url
        
    # Handle cases where Gemini returns 'unstop.com/...' without protocol
    common_domains = ['unstop.com', 'devfolio.co', 'mlh.io', 'devpost.com', 'hackerearth.com']
    for domain in common_domains:
        if relative_url.startswith(domain):
            return f"https://{relative_url}"
            
    # Standard join for truly relative paths
    return urljoin(base_url, relative_url)

DIRECT_SOURCES = {
    'hackathon': [
        'https://devfolio.co/hackathons',
        'https://mlh.io/seasons/2026/events',
        'https://devpost.com/hackathons',
        'https://hackerearth.com/challenges/hackathon/'
    ],
    'internship': [
        'https://internshala.com/internships',
        'https://unstop.com/internships',
        'https://internship.aicte-india.org/module_admin/index.php',
        'https://careers.google.com/students/'
    ]
}

def extract_bulk_from_page(url, event_type):
    """Fetch page text and use Gemini for bulk opportunity extraction"""
    print(f"[AI Scanner] Directly scanning source: {url}")
    page_text = fetch_page_text(url)
    if not page_text or len(page_text) < 200:
        print(f"DEBUG: Page text too short or empty for {url}")
        return []

    try:
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

        text_response = safe_generate_content(prompt)
        if not text_response:
            return []

        json_match = re.search(r'\{.*\}', text_response, re.DOTALL)
        if not json_match: return []

        import json
        data = json.loads(json_match.group(0))
        extracted = data.get('opportunities', [])
        print(f">>> [Scanner] Gemini extracted {len(extracted)} raw opportunities from {url}", flush=True)
        
        # Post-process links and validate
        valid_results = []
        base_domain = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
        
        for opp in extracted:
            opp['link'] = get_absolute_url(base_domain, opp.get('link'))
            if not check_link_validity(opp['link']):
                print(f">>> [Scanner] Dead link filtered: {opp['link']}", flush=True)
                continue
            
            # Content-based expiration check
            if is_opportunity_expired_centralized(opp['link']):
                print(f">>> [Scanner] Expired/Closed opportunity filtered: {opp['link']}", flush=True)
                continue
                
            valid_results.append(opp)
        
        print(f">>> [Scanner] {len(valid_results)}/{len(extracted)} items passed link validation for {url}", flush=True)
        return valid_results
    except Exception as e:
        print(f"❌ [Scanner] Direct extraction error for {url}: {e}", flush=True)
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
            
            # 1. SPECIALIZED AGGREGATION (High priority - LinkedIn, etc.)
            from services.aggregation_service import AggregationService
            agg_service = AggregationService()
            
            if e_type == 'internship':
                print(">>> [Scanner] Running specialized LinkedIn internship scan...", flush=True)
                linkedin_results = agg_service.scrape_linkedin_internships()
                for res in linkedin_results:
                    def check_exists():
                        return ModelClass.query.filter_by(title=res['title'], company=res['company']).first()
                    
                    if db_safe_query(check_exists):
                        continue
                    
                    event_data = {
                        'title': res['title'],
                        'company': res['company'],
                        'description': res.get('raw_text', '')[:500],
                        'location': res.get('location', 'India'),
                        'mode': 'Hybrid',
                        'application_link': res['link'],
                        'source': 'LinkedIn'
                    }
                    enriched = analyze_with_gemini(event_data)
                    if enriched:
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
                            source='LinkedIn'
                        )
                        def save_entry():
                            db.session.add(entry)
                            db.session.flush()
                            return entry.id
                            
                        entry_id = db_safe_query(save_entry)
                        create_notifications_for_event(e_type, entry_id, entry.title)
                        new_interns += 1
                        print(f">>> [Scanner] SAVED (LinkedIn): {entry.title}", flush=True)

            # 2. DIRECT SCANNING (Source Crawling)
            for direct_url in DIRECT_SOURCES.get(e_type, []):
                print(f">>> [Scanner] Direct Scan URL: {direct_url}", flush=True)
                bulk_results = extract_bulk_from_page(direct_url, e_type)
                for res in bulk_results:
                    def check_exists_bulk():
                        return ModelClass.query.filter_by(title=res['name']).first()
                        
                    if db_safe_query(check_exists_bulk): 
                        print(f">>> [Scanner] Skipping duplicate: {res['name']}", flush=True)
                        continue
                    
                    print(f">>> [Scanner] Found new potential candidate: {res['name']}", flush=True)
                    source_name = extract_domain(direct_url)
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
                        'source': source_name
                    }
                    
                    enriched = analyze_with_gemini(event_data)
                    if not enriched: continue
                    
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
                            source=enriched.get('source', 'Web')
                        )
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
                            source=enriched.get('source', 'Web')
                        )
                    
                    def save_bulk_entry():
                        db.session.add(entry)
                        db.session.flush()
                        return entry.id
                        
                    entry_id = db_safe_query(save_bulk_entry)
                    create_notifications_for_event(e_type, entry_id, entry.title)
                    if e_type == 'hackathon': new_hacks += 1
                    else: new_interns += 1
                    print(f">>> [Scanner] SAVED: {entry.title}", flush=True)
            queries = get_dynamic_queries(e_type)
            print(f">>> [Scanner] Google Discovery queries for {e_type}: {len(queries)}", flush=True)
            for q in queries:
                print(f">>> [Scanner] Running discovery query: {q}", flush=True)
                results = google_search(q, num_results=5)
                for res in results:
                    if not check_link_validity(res['link']): 
                        print(f">>> [Scanner] Filtered (Invalid Link): {res['link']}", flush=True)
                        continue
                    def check_exists_disc():
                        return ModelClass.query.filter_by(title=res['title']).first()
                        
                    if db_safe_query(check_exists_disc): 
                        print(f">>> [Scanner] Filtered (Duplicate): {res['title']}", flush=True)
                        continue
                    
                    print(f">>> [Scanner] Discovery candidate: {res['title']}", flush=True)
                    event_data = parse_event_data(res, e_type)
                    enriched = analyze_with_gemini(event_data)
                    if not enriched: continue
                    
                    if e_type == 'hackathon':
                         entry = Hackathon(
                             title=enriched.get('title'),
                             description=enriched.get('description'),
                             organizer=enriched.get('organizer'),
                             location=enriched.get('location'),
                             mode=enriched.get('mode'),
                             deadline=enriched.get('deadline'),
                             prize_pool=enriched.get('prize_pool'),
                             registration_link=enriched.get('registration_link'),
                             status='pending',
                             source=enriched.get('source', 'Web')
                         )
                    else:
                         entry = Internship(
                             title=enriched.get('title'),
                             company=enriched.get('company'),
                             description=enriched.get('description'),
                             location=enriched.get('location'),
                             mode=enriched.get('mode'),
                             duration=enriched.get('duration', '3 months'),
                             deadline=enriched.get('deadline'),
                             skills_required=enriched.get('skills_required', 'Programming'),
                             application_link=enriched.get('application_link'),
                             status='pending',
                             source=enriched.get('source', 'Web')
                         )
                    
                    def save_disc_entry():
                        db.session.add(entry)
                        db.session.flush()
                        return entry.id
                        
                    entry_id = db_safe_query(save_disc_entry)
                    create_notifications_for_event(e_type, entry_id, entry.title)
                    if e_type == 'hackathon': new_hacks += 1
                    else: new_interns += 1
                    print(f">>> [Scanner] SAVED ({e_type}): {entry.title}", flush=True)
                    
                    # Periodic session refresh to prevent Supabase timeouts
                    if (new_hacks + new_interns) % 5 == 0:
                        db.session.commit()
                        db.session.remove()
            
        print(f">>> [Scanner] Committing final results ({new_hacks} hacks, {new_interns} interns)...", flush=True)
        def final_commit():
            db.session.commit()
            return True
        db_safe_query(final_commit)
        
        result = {
            'timestamp': datetime.now().isoformat(),
            'new_hackathons': new_hacks,
            'new_internships': new_interns,
            'status': 'success'
        }
        
        global scan_results
        scan_results.append(result)
        return result
        
    except Exception as e:
        print(f"❌ Database error in scan: {e}")
        db.session.rollback()
        raise

def ai_scan_and_save(app=None):
    """
    Main scanning function with background safety.
    """
    print(f">>> [Scanner Thread] Worker started at {datetime.now()}", flush=True)
    try:
        def set_scanning_true():
            AppSetting.set('is_scanning', 'true')
        db_safe_query(set_scanning_true)
    except:
        pass
    time.sleep(2)
    
    try:
        if app:
            with app.app_context():
                return _perform_scan()
        else:
            from app import create_app
            temp_app = create_app()
            with temp_app.app_context():
                return _perform_scan()
    except Exception as e:
        print(f"❌ [Scanner Thread] Scan failed: {e}", flush=True)
        return {'error': str(e)}
    finally:
        try:
            def set_scanning_false():
                AppSetting.set('is_scanning', 'false')
            db_safe_query(set_scanning_false)
            db.session.remove()
        except:
            pass

@scanner_bp.route('/scan', methods=['POST'])
def trigger_scan():
    """Manual scan trigger - runs in background with DB safety"""
    from flask import current_app
    app_obj = current_app._get_current_object()
    print(f">>> [Admin] Launching scanner thread...", flush=True)
    
    # Run in background to avoid 502 timeout
    thread = threading.Thread(target=ai_scan_and_save, args=(app_obj,))
    thread.daemon = True
    thread.start()
    
    return jsonify({
        "status": "success",
        "message": "AI scan triggered successfully in background. Results will appear soon.",
        "timestamp": datetime.now().isoformat()
    })

@scanner_bp.route('/results', methods=['GET'])
def get_scan_results():
    return jsonify({"results": scan_results[-10:]})

@scanner_bp.route('/schedule', methods=['GET'])
def get_schedule_status():
    jobs = scheduler.get_jobs()
    return jsonify({
        "running": scheduler.running,
        "jobs": [{"id": j.id, "next": j.next_run_time.isoformat() if j.next_run_time else None} for j in jobs]
    })

def auto_approve_oldest_5(app=None):
    """Automatically approve the 5 oldest pending hackathons and internships"""
    def _check_and_approve():
        if not is_auto_approve_enabled():
            print("[Auto-Approve] Skipped — feature is disabled.", flush=True)
            return
        
        print("[Auto-Approve] Running scheduled auto-approval of oldest 5 pending items...", flush=True)
        try:
            approved = []
            pending_hacks = Hackathon.query.filter_by(status='pending').order_by(Hackathon.created_at.asc()).limit(3).all()
            pending_interns = Internship.query.filter_by(status='pending').order_by(Internship.created_at.asc()).limit(2).all()
            
            for h in pending_hacks:
                h.status = 'approved'
                approved.append(f"Hackathon: {h.title}")
            for i in pending_interns:
                i.status = 'approved'
                approved.append(f"Internship: {i.title}")
            
            db.session.commit()
            print(f"[Auto-Approve] Approved {len(approved)} items: {approved}", flush=True)
        except Exception as e:
            print(f"[Auto-Approve] Error: {e}", flush=True)
            db.session.rollback()
    
    if app:
        with app.app_context():
            _check_and_approve()
    else:
        from app import create_app
        temp_app = create_app()
        with temp_app.app_context():
            _check_and_approve()

# is_opportunity_expired was replaced by services.opportunity_service.is_opportunity_expired_centralized


def cleanup_expired_opportunities(app=None):
    """Periodically check all active opportunities and auto-expire them if the page is dead"""
    def _run_cleanup():
        print("[Cleanup] Starting URL-based expiration check...", flush=True)
        try:
            expired_count = 0
            # Check Hackathons
            hackathons = Hackathon.query.filter_by(status='approved').all()
            for h in hackathons:
                if h.registration_link and is_opportunity_expired_centralized(h.registration_link):
                    h.status = 'expired'
                    expired_count += 1
            
            # Check Internships
            internships = Internship.query.filter_by(status='approved').all()
            for i in internships:
                if i.application_link and is_opportunity_expired_centralized(i.application_link):
                    i.status = 'expired'
                    expired_count += 1
            
            db.session.commit()
            print(f"[Cleanup] Finished. Expired {expired_count} opportunities based on link contents.", flush=True)
        except Exception as e:
            print(f"[Cleanup] Error: {e}", flush=True)
            db.session.rollback()

    if app:
        with app.app_context():
            _run_cleanup()
    else:
        from app import create_app
        temp_app = create_app()
        with temp_app.app_context():
            _run_cleanup()


def start_scheduler(app):
    if not scheduler.running:
        scheduler.add_job(func=ai_scan_and_save, trigger="interval", minutes=60, id='ai_scanner_v2', args=[app])
        scheduler.add_job(func=auto_approve_oldest_5, trigger="interval", hours=24, id='auto_approve_job', args=[app])
        scheduler.add_job(func=cleanup_expired_opportunities, trigger="interval", hours=12, id='cleanup_expired_job', args=[app])
        scheduler.start()
        print("✅ Advanced AI Scanner v2 scheduler started (with 24h auto-approve job & 12h link cleanup job)")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print("⏹️  AI Scanner scheduler stopped")
