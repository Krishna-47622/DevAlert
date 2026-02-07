import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Application configuration"""
    
    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Database settings
    basedir = os.path.abspath(os.path.dirname(__file__))
    instance_path = os.path.join(basedir, "instance")
    if not os.path.exists(instance_path):
        os.makedirs(instance_path, exist_ok=True)
        
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', f'sqlite:///{os.path.join(instance_path, "devalert.db")}')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT settings
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours
    
    # Gemini AI settings
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    
    # CORS settings
    CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:5000']
    
    # Frontend build path
    FRONTEND_BUILD_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'dist')
    FRONTEND_SOURCE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
