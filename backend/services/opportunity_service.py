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
    """Unified logic to check if an opportunity registration is closed or expired.
    
    CONSERVATIVE approach: only returns True if there is STRONG evidence
    the opportunity is closed. If in doubt, returns False (keeps the item).
    Never marks an item expired if the page can't be fetched.
    """
    if not url or not url.startswith('http'):
        return False
        
    page_text = fetch_page_text_minimal(url)
    if not page_text:
        # Can't fetch page = assume it's still valid (conservative)
        return False
    
    # Only match very specific, unambiguous phrases that clearly indicate closure
    # These must be full phrases, not single words like "expired"
    strong_expiration_signals = [
        r'registration[s]?\s+(is|are|have been)\s+closed',
        r'no longer accepting\s+(responses|applications|entries)',
        r'applications\s+are\s+closed',
        r'this form is no longer accepting responses',
        r'opportunity has expired',
        r'registrations?\s+closed',
        r'event is no longer active',
        r'not accepting any more entries',
    ]
    
    matches = 0
    for pattern in strong_expiration_signals:
        if re.search(pattern, page_text):
            matches += 1
    
    # Require at least ONE strong signal
    return matches >= 1

