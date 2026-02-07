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
import json
import re

class AIScanner:
    """Gemini AI-powered social media scanner for hackathons and internships"""
    
    def __init__(self, api_key):
        """Initialize Gemini AI client"""
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
        """Scan for hackathons and internships in India"""
        if not self.enabled:
            print("AI scanning is disabled. Please provide a valid Gemini API key.")
            return
        
        try:
            # Scan for hackathons
            hackathons = self._scan_hackathons()
            print(f"Found {len(hackathons)} hackathons")
            
            # Scan for internships
            internships = self._scan_internships()
            print(f"Found {len(internships)} internships")
            
            # Save to database
            self._save_opportunities(hackathons, internships)
            
        except Exception as e:
            print(f"Error during AI scanning: {e}")
    
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
                        mode=h_data.get('mode', h_data.get('Mode', 'hybrid')).lower(),
                        deadline=datetime.fromisoformat(h_data.get('deadline', h_data.get('Deadline'))),
                        start_date=datetime.fromisoformat(h_data.get('start_date', h_data.get('Start date'))) if h_data.get('start_date') or h_data.get('Start date') else None,
                        end_date=datetime.fromisoformat(h_data.get('end_date', h_data.get('End date'))) if h_data.get('end_date') or h_data.get('End date') else None,
                        prize_pool=h_data.get('prize_pool', h_data.get('Prize pool')),
                        registration_link=h_data.get('registration_link', h_data.get('Registration link')),
                        status='pending',
                        source='ai_scan'
                    )
                    db.session.add(hackathon)
            
            # Save internships
            for i_data in internships_data:
                # Check if already exists (by title and company)
                existing = Internship.query.filter_by(
                    title=i_data.get('title', i_data.get('Title')),
                    company=i_data.get('company', i_data.get('Company name'))
                ).first()
                
                if not existing:
                    internship = Internship(
                        title=i_data.get('title', i_data.get('Title')),
                        company=i_data.get('company', i_data.get('Company name')),
                        description=i_data.get('description', i_data.get('Description')),
                        location=i_data.get('location', i_data.get('Location')),
                        mode=i_data.get('mode', i_data.get('Mode', 'hybrid')).lower(),
                        duration=i_data.get('duration', i_data.get('Duration')),
                        stipend=i_data.get('stipend', i_data.get('Stipend')),
                        deadline=datetime.fromisoformat(i_data.get('deadline', i_data.get('Deadline'))),
                        start_date=datetime.fromisoformat(i_data.get('start_date', i_data.get('Start date'))) if i_data.get('start_date') or i_data.get('Start date') else None,
                        skills_required=i_data.get('skills_required', i_data.get('Skills required')),
                        application_link=i_data.get('application_link', i_data.get('Application link')),
                        status='pending',
                        source='ai_scan'
                    )
                    db.session.add(internship)
            
            db.session.commit()
            print("Opportunities saved to database successfully")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error saving opportunities: {e}")
