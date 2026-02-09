import requests
from bs4 import BeautifulSoup
import re

def scrape_unstop(category="hackathons"):
    print(f"Testing Unstop API ({category})...")
    try:
        # Unstop API endpoint (speculative but common)
        # Try: https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&per_page=10
        # Actually, let's try to hit the main search API if possible.
        # Based on network analysis of unstop.com:
        url = "https://unstop.com/api/public/opportunity/search-result"
        params = {
            'opportunity': category,
            'per_page': 10
        }
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=15)
        print(f"API Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if 'data' in data and 'data' in data['data']:
                items = data['data']['data']
                print(f"API found {len(items)} items")
                if items:
                    print("Example Item:", items[0].get('title'))
                    return [item.get('title') for item in items]
            else:
                 print("API returned JSON but structure is different:", data.keys())
                 
        else:
            print(f"API Failed: {response.text[:100]}")
            
        return []
    except Exception as e:
        print(f"Error: {e}")
        return []

def scrape_devpost():
    print("\nTesting Devpost...")
    try:
        url = "https://devpost.com/hackathons"
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        
        response = requests.get(url, headers=headers, timeout=15)
        print(f"Status Code: {response.status_code}")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        results = []
        
        tiles = soup.select('.hackathon-tile')
        print(f"Found {len(tiles)} .hackathon-tile")
        
        listings = soup.select('.hackathon-listing-item')
        print(f"Found {len(listings)} .hackathon-listing-item")
        
        side_cards = soup.select('.side-card')
        print(f"Found {len(side_cards)} .side-card")
        
        return results
    except Exception as e:
        print(f"Error: {e}")
        return []

if __name__ == "__main__":
    scrape_unstop("hackathons")
    scrape_devpost()
