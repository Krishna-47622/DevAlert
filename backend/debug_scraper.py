import requests
from bs4 import BeautifulSoup
import os

def debug_scrape(category="hackathons"):
    url = f"https://unstop.com/{category}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    
    print(f"Fetching {url}...")
    response = requests.get(url, headers=headers, timeout=15)
    print(f"Status Code: {response.status_code}")
    
    with open('unstop_debug.html', 'w', encoding='utf-8') as f:
        f.write(response.text)
    
    soup = BeautifulSoup(response.text, 'html.parser')
    links = soup.find_all('a', href=True)
    print(f"Total links found: {len(links)}")
    
    match_count = 0
    for link in links:
        if f'/{category}/' in link['href']:
            match_count += 1
            if match_count < 5:
                print(f"Match: {link['href']} - {link.get_text().strip()}")
                
    print(f"Total pattern matches: {match_count}")

if __name__ == "__main__":
    debug_scrape()
