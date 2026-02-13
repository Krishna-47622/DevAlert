import re
import requests
import io
import json
from bs4 import BeautifulSoup

try:
    import google.generativeai as genai
    SDK_AVAILABLE = True
except Exception as e:
    print(f"⚠️ AI SDK Warning: Failed to load google-generativeai. This is likely due to Python 3.14 incompatibility. AI features will use REST fallback. Error: {e}")
    SDK_AVAILABLE = False

from datetime import datetime

class MatchService:
    """Service to calculate match scores between resumes and opportunities using Gemini"""
    
    def __init__(self, api_key):
        """Initialize Gemini client or prepare for REST API calls"""
        self.api_key = api_key
        self.enabled = bool(api_key)
        
        if SDK_AVAILABLE and self.enabled:
            try:
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel('gemini-flash-latest')
                self.sdk_ready = True
            except Exception as e:
                print(f"Error initializing Match SDK: {e}")
                self.sdk_ready = False
        else:
            self.sdk_ready = False

    def calculate_score(self, resume_text, opportunity_details, resume_link=None):
        """
        Compare resume with opportunity and return a score and explanation.
        If resume_text is empty and resume_link is provided, attempts to fetch content.
        """
        if not resume_text and resume_link:
            resume_text = self._fetch_url_content(resume_link)

        if not resume_text:
            return 0, "Please provide your resume text or a public link in Account Settings."

        if not self.enabled:
            return 0, "AI matching is currently unavailable (API key missing)."

        prompt = f"""
        You are an expert career counselor and technical recruiter. 
        Analyze the following resume against the provided opportunity details and calculate a match score.
        
        RESUME:
        {resume_text}
        
        OPPORTUNITY:
        Title: {opportunity_details.get('title')}
        Organizer/Company: {opportunity_details.get('organizer') or opportunity_details.get('company')}
        Description: {opportunity_details.get('description')}
        Skills Required: {opportunity_details.get('skills_required', 'Not specified')}
        
        Task:
        1. Calculate a match score between 0 and 100 based on skills, experience, and role alignment.
        2. Provide a 2-sentence explanation of why this score was given, highlighting strengths or gaps.
        
        Format your response as a STRICT JSON object:
        {{
            "score": 85,
            "explanation": "Your background in React and Node.js perfectly aligns with the project requirements. However, you lack the specific experience with GraphQL mentioned in the description."
        }}
        
        Only return the JSON.
        """
        
        # Try SDK first if available
        if self.sdk_ready:
            try:
                response = self.model.generate_content(prompt)
                return self._parse_ai_response(response.text)
            except Exception as e:
                print(f"SDK Match failed: {e}. Trying REST fallback...")
        
        # REST API Fallback (Bypasses SDK issues on Python 3.14)
        return self._calculate_score_rest(prompt, resume_text, opportunity_details)

    def _calculate_score_rest(self, prompt, resume_text, opportunity_details):
        """Direct REST call to Gemini API"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={self.api_key}"
        headers = {'Content-Type': 'application/json'}
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }
        
        print(f"DEBUG: Attempting REST Match with URL: {url}")
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            print(f"DEBUG: Response Status: {response.status_code}")
            if response.status_code != 200:
                print(f"Gemini REST Error {response.status_code}: {response.text}")
            response.raise_for_status()
            data = response.json()
            
            # Extract text from Gemini REST response structure
            try:
                ai_text = data['candidates'][0]['content']['parts'][0]['text']
                return self._parse_ai_response(ai_text)
            except (KeyError, IndexError) as e:
                print(f"REST Response parse error: {e}. Raw Data: {data}")
                return self._calculate_fallback_score(resume_text, opportunity_details)
                
        except Exception as e:
            print(f"REST API Match failed: {e}")
            if 'response' in locals() and hasattr(response, 'text'):
                 print(f"Response text: {response.text}")
            return self._calculate_fallback_score(resume_text, opportunity_details)

    def _parse_ai_response(self, text):
        """Extract score and explanation from AI JSON string"""
        try:
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return data.get('score', 0), data.get('explanation', "No explanation provided.")
            return 0, "Failed to parse AI response."
        except Exception as e:
            print(f"Error parsing AI response: {e}")
            return 0, "Error format in AI response."

    def _calculate_fallback_score(self, resume_text, opportunity_details):
        """Simple keyword matching fallback when both SDK and REST fail"""
        if not resume_text:
            return 0, "Wait! We couldn't read your resume from that link. Could you paste the text instead?"
            
        resume_text = resume_text.lower()
        
        # Extract keywords from title and skills
        keywords = set()
        title = opportunity_details.get('title', '').lower()
        skills = opportunity_details.get('skills_required', '').lower()
        description = opportunity_details.get('description', '').lower()
        
        # Common tech keywords to look for
        tech_stack = ['python', 'javascript', 'react', 'node', 'java', 'cpp', 'html', 'css', 'sql', 'aws', 'docker', 'machine learning', 'ai']
        found_keywords = [k for k in tech_stack if k in title or k in skills or k in description]
        keywords.update(found_keywords)
        
        if not keywords:
            return 50, "AI matching fell back to basic scoring. This usually happens if your GEMINI_API_KEY is missing, invalid, or has no quota left. Please check your backend .env file."

        matches = [k for k in keywords if k in resume_text]
        score = int((len(matches) / len(keywords)) * 100) if keywords else 50
        
        # Cap score for fallback
        score = min(max(score, 30), 90)
        
        explanation = f"Using keyword-based analysis. Matched skills: {', '.join(matches[:3])}. (AI failed to connect; check your GEMINI_API_KEY)"
        if not matches:
            explanation = "No direct keyword matches found. (AI failed to connect; ensure GEMINI_API_KEY is set in backend/.env)"
            
        return score, explanation

    def _fetch_url_content(self, url):
        """Fetch text content from a public URL"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            content_type = response.headers.get('Content-Type', '').lower()
            
            if 'application/pdf' in content_type:
                try:
                    import PyPDF2
                    pdf_file = io.BytesIO(response.content)
                    reader = PyPDF2.PdfReader(pdf_file)
                    text = ""
                    for page in reader.pages:
                        extracted = page.extract_text()
                        if extracted:
                            text += extracted + "\n"
                    return text.strip() if text.strip() else None
                except Exception as e:
                    print(f"PDF Error: {e}")
                    return None
            
            # HTML or Text
            soup = BeautifulSoup(response.content, 'html.parser')
            for script in soup(["script", "style"]):
                script.extract()
            return soup.get_text(separator=' ', strip=True)
            
        except Exception as e:
            print(f"Error fetching URL content: {e}")
            return None

def get_match_service():
    from flask import current_app
    return MatchService(current_app.config['GEMINI_API_KEY'])
