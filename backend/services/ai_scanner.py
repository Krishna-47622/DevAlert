import os
try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except Exception as e:
    print(f"Warning: google-generativeai not available: {e}")
    GENAI_AVAILABLE = False
    genai = None
from datetime import datetime, timedelta
from models import db, Hackathon, Internship
from services.aggregation_service import AggregationService
import json
import re

class AIScanner:
    """Gemini AI-powered scanner for hackathons and internships"""
    
    def __init__(self, api_key):
        """Initialize Gemini AI client and Aggregation Service"""
        self.aggregation_service = AggregationService()
        if not GENAI_AVAILABLE:
            print("Warning: google-generativeai package not available. AI scanning will be disabled.")
            self.enabled = False
            return
            
        if not api_key:
            print("Warning: Gemini API key not provided. AI scanning will be disabled.")
            self.enabled = False
            return
        
        try:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-pro')
            self.enabled = True
            print("Gemini AI scanner initialized successfully")
        except Exception as e:
            print(f"Error initializing Gemini AI: {e}")
            self.enabled = False
    
    def scan_for_opportunities(self):
        """Aggregate from sources and refine using AI"""
        if not self.enabled:
            print("AI scanning is disabled. Please provide a valid Gemini API key.")
            return
        
        try:
            # 1. Scraping / Aggregation Phase
            print("Starting aggregation phase...")
            raw_opportunities = self.aggregation_service.get_fresh_opportunities()
            
            # 2. Refinement Phase (High Accuracy)
            print(f"Refining {len(raw_opportunities)} opportunities with Gemini...")
            internships = self.refine_aggregated_opportunities(raw_opportunities)
            print(f"Refined {len(internships)} internships")
            
            # 3. Legacy AI Discovery Phase (Backup)
            print("Running discovery scan for additional hackathons...")
            hackathons = self._scan_hackathons()
            print(f"Found {len(hackathons)} hackathons")
            
            # 4. Save to database
            self._save_opportunities(hackathons, internships)
            
        except Exception as e:
            print(f"Error during AI scanning: {e}")

    def refine_aggregated_opportunities(self, raw_data):
        """Use Gemini to extract structured data from raw scraping results"""
        if not raw_data: return []
        
        prompt = f"""
        Extract structured data from the following raw internship listings found on LinkedIn and other boards.
        
        Raw Data:
        {json.dumps(raw_data[:20])} # Process in batches for better accuracy
        
        For each entry, provide:
        - title (job role)
        - company (company name)
        - description (2 sentence summary)
        - location (city/state)
        - mode (online/offline/hybrid)
        - duration (e.g. "6 months")
        - stipend (specific value or "Not mentioned")
        - deadline (ISO YYYY-MM-DD or null)
        - start_date (ISO YYYY-MM-DD or null)
        - skills_required (comma-separated list)
        - application_link (the URL provided)
        
        Format as a JSON array. Only return JSON.
        """
        
        try:
            response = self.model.generate_content(prompt)
            json_match = re.search(r'\[.*\]', response.text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return []
        except Exception as e:
            print(f"Error refining opportunities: {e}")
            return []
    
    def _scan_hackathons(self):
        """Use Gemini AI to find hackathon opportunities"""
        prompt = """
        You are a helpful assistant that finds hackathon opportunities in India.
        
        Please provide a list of 5 current or upcoming hackathons in India. For each hackathon, provide:
        - Title
        - Organizer
        - Description (brief, 2-3 sentences)
        - Location (city/state in India or "Online")
        - Mode (online/offline/hybrid)
        - Deadline (in ISO format YYYY-MM-DD)
        - Start date (in ISO format YYYY-MM-DD)
        - End date (in ISO format YYYY-MM-DD)
        - Prize pool (if available)
        - Registration link (use a placeholder if not available)
        
        Format your response as a JSON array of objects. Make the data realistic and relevant to current trends in tech.
        Only return the JSON array, no additional text.
        """
        
        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            
            # Extract JSON from response
            json_match = re.search(r'\[.*\]', text, re.DOTALL)
            if json_match:
                hackathons_data = json.loads(json_match.group())
                return hackathons_data
            else:
                print("Could not extract JSON from AI response")
                return []
                
        except Exception as e:
            print(f"Error scanning hackathons: {e}")
            return []
    
    def _scan_internships(self):
        """Use Gemini AI to find internship opportunities"""
        prompt = """
        You are a helpful assistant that finds internship opportunities in India.
        
        Please provide a list of 5 current or upcoming internship opportunities in India. For each internship, provide:
        - Title (job role)
        - Company name
        - Description (brief, 2-3 sentences about the role)
        - Location (city/state in India or "Remote")
        - Mode (online/offline/hybrid)
        - Duration (e.g., "3 months", "6 months")
        - Stipend (e.g., "₹15,000/month" or "Unpaid")
        - Deadline (in ISO format YYYY-MM-DD)
        - Start date (in ISO format YYYY-MM-DD)
        - Skills required (comma-separated)
        - Application link (use a placeholder if not available)
        
        Format your response as a JSON array of objects. Make the data realistic and relevant to current tech industry trends.
        Only return the JSON array, no additional text.
        """
        
        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            
            # Extract JSON from response
            json_match = re.search(r'\[.*\]', text, re.DOTALL)
            if json_match:
                internships_data = json.loads(json_match.group())
                return internships_data
            else:
                print("Could not extract JSON from AI response")
                return []
                
        except Exception as e:
            print(f"Error scanning internships: {e}")
            return []
    
    def _save_opportunities(self, hackathons_data, internships_data):
        """Save scanned opportunities to database"""
        try:
            # Save hackathons
            for h_data in hackathons_data:
                # Check if already exists (by title and organizer)
                existing = Hackathon.query.filter_by(
                    title=h_data.get('title', h_data.get('Title')),
                    organizer=h_data.get('organizer', h_data.get('Organizer'))
                ).first()
                
                if not existing:
                    hackathon = Hackathon(
                        title=h_data.get('title', h_data.get('Title')),
                        description=h_data.get('description', h_data.get('Description')),
                        organizer=h_data.get('organizer', h_data.get('Organizer')),
                        location=h_data.get('location', h_data.get('Location')),
                        mode=str(h_data.get('mode', h_data.get('Mode', 'hybrid'))).lower(),
                        deadline=self._parse_date(h_data.get('deadline', h_data.get('Deadline'))),
                        start_date=self._parse_date(h_data.get('start_date', h_data.get('Start date'))),
                        end_date=self._parse_date(h_data.get('end_date', h_data.get('End date'))),
                        prize_pool=h_data.get('prize_pool', h_data.get('Prize pool')),
                        registration_link=h_data.get('registration_link', h_data.get('Registration link')),
                        status='pending',
                        source='ai_scan'
                    )
                    db.session.add(hackathon)
            
            # Save internships
            for i_data in internships_data:
                # Handle potential case variations or field names from AI
                title = i_data.get('title', i_data.get('Title'))
                company = i_data.get('company', i_data.get('Company name', i_data.get('Company')))
                link = i_data.get('application_link', i_data.get('Application link', i_data.get('link')))
                
                if not title or not company: continue

                # Check if already exists (by title and company)
                existing = Internship.query.filter_by(
                    title=title,
                    company=company
                ).first()
                
                if not existing:
                    # Detect source branding
                    source = i_data.get('source', 'LinkedIn' if 'linkedin.com' in str(link) else 'ai_scan')
                    if not i_data.get('source'):
                        board = self.aggregation_service.detect_job_board(str(link))
                        if board: source = board

                    internship = Internship(
                        title=title,
                        company=company,
                        description=i_data.get('description', i_data.get('Description')),
                        location=i_data.get('location', i_data.get('Location')),
                        mode=str(i_data.get('mode', i_data.get('Mode', 'hybrid'))).lower(),
                        duration=i_data.get('duration', i_data.get('Duration')),
                        stipend=i_data.get('stipend', i_data.get('Stipend')),
                        deadline=self._parse_date(i_data.get('deadline', i_data.get('Deadline'))),
                        start_date=self._parse_date(i_data.get('start_date', i_data.get('Start date'))),
                        skills_required=i_data.get('skills_required', i_data.get('Skills required')),
                        application_link=link,
                        status='pending',
                        source=source
                    )
                    db.session.add(internship)
            
            db.session.commit()
            print("Opportunities saved to database successfully")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error saving opportunities: {e}")
    def _parse_date(self, date_str):
        """Helper to safely parse ISO dates from AI response"""
        if not date_str:
            return None
        try:
            # Handle YYYY-MM-DD or partial ISO strings
            if isinstance(date_str, str):
                # Simple extraction of YYYY-MM-DD
                match = re.search(r'(\d{4}-\d{2}-\d{2})', date_str)
                if match:
                    return datetime.fromisoformat(match.group(1))
            return None
        except (ValueError, TypeError):
            return None
