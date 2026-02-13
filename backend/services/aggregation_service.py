import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime
import json

class AggregationService:
    """Service to aggregate opportunities from various external sources"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }

    def scrape_linkedin_internships(self, limit=10):
        """Scrape public LinkedIn job listings for internships in India"""
        print("Scraping LinkedIn for internships...")
        # Using public LinkedIn job search URL (no auth required for basic listing)
        url = "https://www.linkedin.com/jobs/search?keywords=Software%20Engineer%20Internship&location=India&geoId=102713980&f_TPR=r86400&position=1&pageNum=0"
        
        try:
            response = requests.get(url, headers=self.headers, timeout=15)
            if response.status_code != 200:
                print(f"LinkedIn scrape failed with status: {response.status_code}")
                return []
                
            soup = BeautifulSoup(response.text, 'html.parser')
            jobs = []
            
            # LinkedIn often uses 'base-card' or 'job-search-card' for public listings
            job_cards = soup.select('.base-card, .job-search-card')
            
            for card in job_cards[:limit]:
                title_el = card.select_one('.base-search-card__title')
                company_el = card.select_one('.base-search-card__subtitle')
                location_el = card.select_one('.job-search-card__location')
                link_el = card.select_one('a.base-card__full-link')
                
                if title_el and company_el and link_el:
                    jobs.append({
                        'title': title_el.get_text().strip(),
                        'company': company_el.get_text().strip(),
                        'location': location_el.get_text().strip() if location_el else 'India',
                        'link': link_el['href'].split('?')[0],
                        'source': 'LinkedIn',
                        'raw_text': card.get_text(separator=' ').strip()
                    })
            
            return jobs
        except Exception as e:
            print(f"Error scraping LinkedIn: {e}")
            return []

    def detect_job_board(self, url):
        """Identify if a URL belongs to Greenhouse, Lever, or other major boards"""
        if 'greenhouse.io' in url:
            return 'Greenhouse'
        elif 'lever.co' in url:
            return 'Lever'
        return None

    def get_fresh_opportunities(self):
        """Run all scrapers and return a unified list of raw opportunities"""
        all_raw_data = []
        
        # 1. LinkedIn
        linkedin_jobs = self.scrape_linkedin_internships()
        all_raw_data.extend(linkedin_jobs)
        
        # 2. We can add more sources here (e.g., parsing specific company boards)
        
        print(f"Aggregation complete. Found {len(all_raw_data)} raw opportunities.")
        return all_raw_data

if __name__ == "__main__":
    # Test script
    service = AggregationService()
    results = service.get_fresh_opportunities()
    for i, res in enumerate(results):
        print(f"{i+1}. {res['title']} at {res['company']} ({res['source']})")
