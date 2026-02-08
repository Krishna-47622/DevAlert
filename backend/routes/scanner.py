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
        print("⚠️  Google API credentials not configured. Using fallback data.")
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
            elif 'angel.co' in domain or 'wellfound.com' in domain:
                return 'wellfound'
            else:
                return domain.split('.')[0]
        return 'web'
    except:
        return 'web'

def scrape_unstop(category="hackathons"):
    """Scrape Unstop using their public API"""
    try:
        # Use Unstop's public API for reliable results
        # Endpoint: https://unstop.com/api/public/opportunity/search-result
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
        
        print(f"DEBUG: Fetching Unstop API for {category}...")
        response = requests.get(url, params=params, headers=headers, timeout=15)
        
        if response.status_code != 200:
             print(f"⚠️ Unstop API failed: {response.status_code}")
             return []
             
        data = response.json()
        results = []
        
        if 'data' in data and 'data' in data['data']:
            items = data['data']['data']
            for item in items:
                # Extract relevant fields
                title = item.get('title', 'Unknown Event')
                seo_url = item.get('seo_url', '')
                logo_url = item.get('logoUrl2', '') # Optional
                
                # Construct full link
                link = f"https://unstop.com/{seo_url}" if seo_url else ""
                
                if link:
                    results.append({
                        'title': title,
                        'link': link,
                        'snippet': f"Active {category[:-1]} on Unstop. Organized by {item.get('organisation', {}).get('name', 'Unstop found')}.",
                        'source': 'unstop'
                    })
        
        print(f"DEBUG: Unstop API found {len(results)} items")
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
    print(f"🔍 Attempting scraper fallback for: {query}")
    
    scraped_data = []
    if 'hackathon' in query.lower():
        unstop_hacks = scrape_unstop("hackathons")
        print(f"DEBUG: Unstop found {len(unstop_hacks)} hackathons")
        scraped_data.extend(unstop_hacks)
        
        if not unstop_hacks:
            devpost_hacks = scrape_devpost()
            print(f"DEBUG: Devpost found {len(devpost_hacks)} hackathons")
            scraped_data.extend(devpost_hacks)
    elif 'internship' in query.lower():
        unstop_interns = scrape_unstop("internships")
        print(f"DEBUG: Unstop found {len(unstop_interns)} internships")
        scraped_data.extend(unstop_interns)
    
    if scraped_data:
        print(f"✅ Found {len(scraped_data)} results total via scraping")
        return scraped_data
    
    print("⚠️ No results found via scraping, using hardcoded fallback.")

    # Original hardcoded fallback if scraping fails or returns nothing
    if 'hackathon' in query.lower():
        return [
            {
                'title': 'Smart India Hackathon 2026',
                'link': 'https://www.sih.gov.in/',
                'snippet': 'National level hackathon for innovative solutions. Prize pool of ₹1 Crore. Register now!',
                'source': 'sih.gov.in'
            },
            {
                'title': 'ETHIndia 2026 - Ethereum Hackathon',
                'link': 'https://ethindia.co/',
                'snippet': 'India\'s largest Ethereum hackathon. Build decentralized applications. Win exciting prizes.',
                'source': 'devfolio'
            },
            {
                'title': 'Google Solution Challenge 2026',
                'link': 'https://developers.google.com/community/gdsc-solution-challenge',
                'snippet': 'Build solutions for UN Sustainable Development Goals using Google technology.',
                'source': 'google'
            },
            {
                'title': 'Hacktoberfest 2026 - Open Source',
                'link': 'https://hacktoberfest.com/',
                'snippet': 'Global celebration of open source. Contribute to projects and win swag.',
                'source': 'hacktoberfest'
            }
        ]
    else:  # internship
        return [
            {
                'title': 'Google Software Engineering Intern 2026',
                'link': 'https://careers.google.com/students/',
                'snippet': 'Software Engineering Intern positions at Google India. Competitive stipend and learning opportunities.',
                'source': 'google'
            },
            {
                'title': 'Microsoft SWE Internship Program 2026',
                'link': 'https://careers.microsoft.com/students',
                'snippet': 'Join Microsoft IDC for summer internship. Work on cutting-edge technology and cloud systems.',
                'source': 'microsoft'
            },
            {
                'title': 'Amazon SDE Intern - 2026 Grad',
                'link': 'https://www.amazon.jobs/en/teams/internships-for-students',
                'snippet': 'Software Development Engineer Intern role. 6-month internship with full-time conversion opportunity.',
                'source': 'amazon'
            },
            {
                'title': 'NVIDIA Deep Learning Intern',
                'link': 'https://www.nvidia.com/en-us/about-nvidia/careers/university/',
                'snippet': 'Work on next-gen AI and GPU computing at NVIDIA Bangalore.',
                'source': 'nvidia'
            }
        ]

def parse_event_data(search_result, event_type):
    """
    Parse search result into event data structure
    Uses simple heuristics to extract information
    """
    title = search_result['title']
    snippet = search_result['snippet']
    link = search_result['link']
    source = search_result['source']
    
    # Extract location (simple heuristic)
    location = 'India'
    cities = ['Hyderabad', 'Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Chennai', 'Kolkata']
    for city in cities:
        if city.lower() in title.lower() or city.lower() in snippet.lower():
            location = city
            break
    
    # Determine mode
    mode = 'hybrid'
    if 'online' in title.lower() or 'virtual' in title.lower():
        mode = 'online'
    elif 'offline' in title.lower() or 'in-person' in title.lower():
        mode = 'in-person'
    
    if event_type == 'hackathon':
        # Extract prize pool if mentioned
        prize_match = re.search(r'₹[\d,]+|Rs\.?\s*[\d,]+|\$[\d,]+', snippet)
        prize_pool = prize_match.group(0) if prize_match else None
        
        return {
            'title': title[:200],  # Limit length
            'description': snippet[:500],
            'organizer': source.capitalize(),
            'location': location,
            'mode': mode,
            'deadline': datetime.now() + timedelta(days=30),
            'start_date': datetime.now() + timedelta(days=35),
            'prize_pool': prize_pool,
            'registration_link': link,
            'status': 'pending',
            'source': source
        }
    else:  # internship
        # Extract duration
        duration = '3 months'
        if 'summer' in title.lower() or 'summer' in snippet.lower():
            duration = '3 months (Summer)'
        elif '6 month' in snippet.lower():
            duration = '6 months'
        
        # Extract stipend if mentioned
        stipend_match = re.search(r'₹[\d,]+/month|Rs\.?\s*[\d,]+\s*per\s*month', snippet)
        stipend = stipend_match.group(0) if stipend_match else None
        
        return {
            'title': title[:200],
            'company': source.capitalize(),
            'description': snippet[:500],
            'location': location,
            'mode': mode,
            'duration': duration,
            'stipend': stipend,
            'deadline': datetime.now() + timedelta(days=20),
            'skills_required': 'Programming, Problem Solving',
            'application_link': link,
            'status': 'pending',
            'source': source
        }

def analyze_with_gemini(event_block):
    """
    Use Gemini AI to analyze and enrich event data
    Lazy import to avoid startup conflicts
    """
    try:
        import google.generativeai as genai
        GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
        
        if not GEMINI_API_KEY:
            return event_block
            
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-pro')
    except Exception as e:
        print(f"Gemini init error: {e}")
        return event_block

    try:
        prompt = f'''
        Analyze this {event_block.get('company', 'event')} opportunity:
        Title: {event_block.get('title')}
        Description: {event_block.get('description')}
        
        Extract the following if available (return JSON format):
        - skills_required (comma separated)
        - mode (Online/Offline/Hybrid)
        - location (City, Country)
        - is_legit (true/false assessment)
        '''
        
        response = model.generate_content(prompt)
        # In a real app, we would parse the JSON. 
        # For now, we'll just log it or use it to tag 'ai_verified'
        print(f"Gemini Analysis: {response.text[:100]}...")
        
        # Simple enrichment example
        if 'Remote' in response.text or 'Online' in response.text:
            event_block['mode'] = 'Online'
            
        return event_block
    except Exception as e:
        print(f"Gemini Error: {e}")
        return event_block

def ai_scan_and_save(app=None):
    """
    Main scanning function - uses Google Custom Search to find real events
    """
    print(f"[AI Scanner] Starting scan at {datetime.now()}")
    
    try:
        from app import create_app
        if app:
            with app.app_context():
                return _perform_scan()
        elif current_app:
            return _perform_scan()
        else:
            # Last resort - create a temporary app context
            temp_app = create_app()
            with temp_app.app_context():
                return _perform_scan()
            
    except Exception as e:
        print(f"❌ Error during scan: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

def _perform_scan():
    """Internal scan function that runs within app context"""
    try:
        # Search queries for hackathons
        hackathon_queries = [
            "hackathon 2026 India registration open",
            "coding competition 2026 prizes",
            "student hackathon India 2026"
        ]
        
        # Search queries for internships
        internship_queries = [
            "tech internship 2026 India apply",
            "software engineering intern 2026",
            "summer internship 2026 computer science"
        ]
        
        new_hackathons = 0
        skipped_hackathons = 0
        new_internships = 0
        skipped_internships = 0
        
        # Search and process hackathons
        for query in hackathon_queries:
            results = google_search(query, num_results=3)
            
            for result in results:
                event_data = parse_event_data(result, 'hackathon')
                
                # Check if already exists
                existing = Hackathon.query.filter_by(
                    title=event_data['title']
                ).first()
                
                if not existing:
                    # Enrich with Gemini
                    event_data = analyze_with_gemini(event_data)
                    
                    hackathon = Hackathon(**event_data)
                    db.session.add(hackathon)
                    db.session.flush()
                    
                    # Create notifications
                    create_notifications_for_event('hackathon', hackathon.id, hackathon.title)
                    new_hackathons += 1
                else:
                    skipped_hackathons += 1
        
        # Search and process internships
        for query in internship_queries:
            results = google_search(query, num_results=3)
            
            for result in results:
                event_data = parse_event_data(result, 'internship')
                
                # Check if already exists
                existing = Internship.query.filter_by(
                    title=event_data['title']
                ).first()
                
                if not existing:
                    # Enrich with Gemini
                    event_data = analyze_with_gemini(event_data)
                    
                    internship = Internship(**event_data)
                    db.session.add(internship)
                    db.session.flush()
                    
                    # Create notifications
                    create_notifications_for_event('internship', internship.id, internship.title)
                    new_internships += 1
                else:
                    skipped_internships += 1
        
        db.session.commit()
        
        result = {
            'timestamp': datetime.now().isoformat(),
            'new_hackathons': new_hackathons,
            'new_internships': new_internships,
            'total_found': new_hackathons + new_internships,
            'api_configured': bool(GOOGLE_API_KEY and GOOGLE_CSE_ID)
        }
        
        # Store in scan results
        global scan_results
        scan_results.append(result)
        scan_results = scan_results[-20:]
        
        print(f"✅ Scan complete: {new_hackathons} new hackathons, {new_internships} new internships. (Skipped {skipped_hackathons + skipped_internships} existing)")
        return result
        
    except Exception as e:
        print(f"❌ Error during scan: {str(e)}")
        db.session.rollback()
        raise

@scanner_bp.route('/scan', methods=['POST'])
def trigger_scan():
    """Manually trigger a scan"""
    result = ai_scan_and_save()
    return jsonify({
        "message": "Scan completed",
        "result": result
    })

@scanner_bp.route('/results', methods=['GET'])
def get_scan_results():
    """Get recent scan results"""
    return jsonify({
        "results": scan_results,
        "total": len(scan_results)
    })

@scanner_bp.route('/schedule', methods=['GET'])
def get_schedule_status():
    """Get scheduler status"""
    jobs = scheduler.get_jobs()
    return jsonify({
        "scheduler_running": scheduler.running,
        "api_configured": bool(GOOGLE_API_KEY and GOOGLE_CSE_ID),
        "jobs": [{
            "id": job.id,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None
        } for job in jobs]
    })

def start_scheduler(app):
    """Start the background scheduler"""
    if not scheduler.running:
        # Schedule scan every 30 minutes
        scheduler.add_job(
            func=ai_scan_and_save,
            trigger="interval",
            minutes=30,
            id='ai_scanner',
            name='AI Web Scanner',
            replace_existing=True,
            args=[app] # Pass app instance
        )
        scheduler.start()
        print("✅ AI Scanner scheduler started - running every 30 minutes")

def stop_scheduler():
    """Stop the scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        print("⏹️  AI Scanner scheduler stopped")
