import requests
from bs4 import BeautifulSoup

def test_unstop(category="hackathons"):
    print(f"\n--- Testing Unstop {category} ---")
    url = f"https://unstop.com/{category}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    try:
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        pattern = f'/{category}/'
        
        results = []
        found_links = set()
        
        # Try specific card selectors
        cards = soup.select('.opportunity-card, .card-content, .card-wrapper')
        print(f"DEBUG: Found {len(cards)} card elements")
        
        for card in cards:
            link = card.select_one('a[href]')
            if link and pattern in link['href']:
                href = link['href']
                title = card.get_text().strip().split('\n')[0]
                if href not in found_links and len(title) > 5:
                    results.append({'title': title[:50], 'link': href})
                    found_links.add(href)

        if not results:
            print("DEBUG: No cards found, trying all links...")
            for link in soup.find_all('a', href=True):
                href = link['href']
                if pattern in href and href not in found_links:
                    text = link.get_text().strip()
                    if text and len(text) > 10:
                        results.append({'title': text.split('\n')[0][:50], 'link': href})
                        found_links.add(href)
                        if len(results) >= 5: break

        for i, r in enumerate(results):
            print(f"{i+1}. {r['title']} -> {r['link']}")
            
        return len(results)
    except Exception as e:
        print(f"Error: {e}")
        return 0

def test_devpost():
    print("\n--- Testing Devpost ---")
    url = "https://devpost.com/hackathons"
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        results = []
        for card in soup.select('.hackathon-tile, .hackathon-listing-item, .side-card'):
            title_el = card.select_one('h3, .title, .hackathon-title')
            link_el = card.select_one('a[href]')
            if title_el and link_el:
                results.append({'title': title_el.get_text().strip(), 'link': link_el['href']})
                if len(results) >= 5: break
                
        for i, r in enumerate(results):
            print(f"{i+1}. {r['title']} -> {r['link']}")
        return len(results)
    except Exception as e:
        print(f"Error: {e}")
        return 0

if __name__ == "__main__":
    test_unstop("hackathons")
    test_unstop("internships")
    test_devpost()
