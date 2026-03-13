import re
import requests
from bs4 import BeautifulSoup

def fetch_page_text_minimal(url):
    """Fetch and clean text content from a URL (centralized version)"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove noise
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.extract()
            
        text = soup.get_text()
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return text[:4000].lower()
    except Exception:
        return ""

def is_opportunity_expired_centralized(url):
    """Unified logic to check if an opportunity registration is closed or expired"""
    if not url or not url.startswith('http'):
        return False
        
    page_text = fetch_page_text_minimal(url)
    if not page_text:
        return False
        
    expiration_patterns = [
        r'registration[s]? (is|have) closed',
        r'no longer accepting (responses|applications)',
        r'expired',
        r'event (is|has) finished',
        r'applications are closed',
        r'deadline has passed',
        r'sold out',
        r'event (is|has) over',
        r'this form is no longer accepting responses',
        r'opportunity has expired',
        r'registrations closed',
        r'apply now button is disabled',
        r'event is no longer active',
        r'has ended',
        r'not accepting any more entries'
    ]
    
    for pattern in expiration_patterns:
        if re.search(pattern, page_text):
            return True
            
    return False
