"""
Seed script to populate database with dummy data
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import db, User, Hackathon, Internship
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta

def seed_data():
    app = create_app()
    
    with app.app_context():
        # Clear existing data
        print("Clearing existing data...")
        db.drop_all()
        db.create_all()
        
        # Create admin user
        print("Creating admin user...")
        admin = User(
            username='Krishna',
            email='krishna@example.com',
            password_hash=generate_password_hash('1234'),
            role='admin'
        )
        db.session.add(admin)
        
        # Create some sample users
        print("Creating sample users...")
        hoster1 = User(
            username='techhost',
            email='techhost@example.com',
            password_hash=generate_password_hash('password'),
            role='hoster'
        )
        db.session.add(hoster1)
        
        participant1 = User(
            username='developer1',
            email='dev1@example.com',
            password_hash=generate_password_hash('password'),
            role='participant'
        )
        db.session.add(participant1)
        
        db.session.commit()
        
        # Add Hyderabad hackathons
        print("Adding Hyderabad hackathons...")
        hackathons_data = [
            {
                'title': 'Hyderabad AI Hackathon 2026',
                'description': 'Build innovative AI solutions for real-world problems. Win prizes worth 5 lakhs!',
                'organizer': 'T-Hub',
                'location': 'Hyderabad, T-Hub',
                'mode': 'Hybrid',
                'deadline': datetime.now() + timedelta(days=15),
                'registration_link': 'https://www.linkedin.com/posts/t-hub-hyderabad_ai-hackathon-innovation-activity-7158934567890123456',
                'prize_pool': '₹5,00,000',
                'source': 'linkedin',
                'status': 'approved'
            },
            {
                'title': 'Smart City Hackathon Hyderabad',
                'description': 'Develop solutions for urban challenges in Hyderabad. Collaborate with city officials.',
                'organizer': 'IIIT Hyderabad',
                'location': 'Hyderabad, IIIT-H',
                'mode': 'In-person',
                'deadline': datetime.now() + timedelta(days=30),
                'registration_link': 'https://twitter.com/iiit_hyderabad/status/1750123456789012345',
                'prize_pool': '₹3,00,000',
                'source': 'X',
                'status': 'approved'
            },
            {
                'title': 'FinTech Innovation Challenge',
                'description': 'Create next-gen financial technology solutions. Mentorship from industry experts.',
                'organizer': 'HITEC City Innovation Hub',
                'location': 'Hyderabad, HITEC City',
                'mode': 'Hybrid',
                'deadline': datetime.now() + timedelta(days=45),
                'registration_link': 'https://www.instagram.com/p/C3ABcDEfGHI/',
                'prize_pool': '₹4,00,000',
                'source': 'instagram',
                'status': 'approved'
            },
            {
                'title': 'Healthcare Tech Hackathon',
                'description': 'Build healthcare solutions using AI and IoT. Prize pool: 3 lakhs.',
                'organizer': 'Gachibowli Tech Park',
                'location': 'Hyderabad, Gachibowli',
                'mode': 'In-person',
                'deadline': datetime.now() + timedelta(days=60),
                'registration_link': 'https://www.linkedin.com/events/healthcare-tech-hackathon-7159876543210987654',
                'prize_pool': '₹3,00,000',
                'source': 'linkedin',
                'status': 'approved'
            },
            {
                'title': 'Blockchain Developers Meetup & Hack',
                'description': 'Weekend hackathon focused on blockchain and Web3 technologies.',
                'organizer': 'Web3 Hyderabad',
                'location': 'Hyderabad, Madhapur',
                'mode': 'In-person',
                'deadline': datetime.now() + timedelta(days=20),
                'registration_link': 'https://twitter.com/web3hyderabad/status/1751234567890123456',
                'prize_pool': '₹2,00,000',
                'source': 'X',
                'status': 'approved'
            }
        ]
        
        for hack_data in hackathons_data:
            hackathon = Hackathon(**hack_data)
            db.session.add(hackathon)
        
        # Add some internships
        print("Adding internships...")
        internships_data = [
            {
                'title': 'Research Intern',
                'company': 'Microsoft Research (IDC)',
                'description': 'Focus: AI/ML, NLP, Computer Vision. Eligibility: B.Tech, Master\'s, or PhD students.',
                'location': 'Hyderabad',
                'mode': 'In-office',
                'duration': 'Summer 2026',
                'stipend': 'Competitive',
                'deadline': datetime.now() + timedelta(days=45),
                'application_link': 'https://careers.microsoft.com/students/us/en/us-research-internship',
                'skills_required': 'AI/ML, NLP, Computer Vision',
                'source': 'microsoft',
                'status': 'approved'
            },
            {
                'title': 'Data Science Internship',
                'company': 'Amazon',
                'description': 'Focus: Machine Learning, SQL, and Python-based business solutions. Eligibility: Penultimate or final year students.',
                'location': 'Hyderabad',
                'mode': 'Hybrid',
                'duration': '6 months',
                'stipend': '₹45,000/month',
                'deadline': datetime.now() + timedelta(days=30),
                'application_link': 'https://www.amazon.jobs/en/teams/university-tech',
                'skills_required': 'Machine Learning, SQL, Python',
                'source': 'amazon',
                'status': 'approved'
            },
            {
                'title': '2026 Summer Internship',
                'company': 'Wells Fargo',
                'description': 'Focus: Corporate & Investment Banking / Finance. Hyderabad location.',
                'location': 'Hyderabad',
                'mode': 'Hybrid',
                'duration': 'Summer 2026',
                'stipend': '₹40,000/month',
                'deadline': datetime.now() + timedelta(days=60),
                'application_link': 'https://www.wellsfargojobs.com/',
                'skills_required': 'Finance, Banking, Data Analysis',
                'source': 'wellsfargo',
                'status': 'approved'
            },
            {
                'title': 'Tech Intern',
                'company': 'Tech Mahindra / Gleecus TechLabs',
                'description': 'Focus: Full Stack Development, Python, and AI/ML.',
                'location': 'Hyderabad',
                'mode': 'In-office',
                'duration': '6 months',
                'stipend': '₹20,000/month',
                'deadline': datetime.now() + timedelta(days=15),
                'application_link': 'https://in.indeed.com/jobs?q=Tech+Mahindra&l=Hyderabad',
                'skills_required': 'Full Stack, Python, AI/ML',
                'source': 'indeed',
                'status': 'approved'
            }
        ]
        
        for intern_data in internships_data:
            internship = Internship(**intern_data)
            db.session.add(internship)
        
        db.session.commit()
        print("\n" + "="*50)
        print("✅ Database seeded successfully!")
        print("="*50)
        print(f"   👤 Admin: vschaitanya29@gmail.com / 1234")
        print(f"   🏆 {len(hackathons_data)} hackathons added (Hyderabad)")
        print(f"   💼 {len(internships_data)} internships added")
        print("="*50)

if __name__ == '__main__':
    seed_data()
