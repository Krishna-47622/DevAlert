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
    
    # Render deployment check
    if os.getenv('RENDER'):
        # On Render, use /tmp for SQLite (ephemeral but writable)
        # OR use the provided DATABASE_URL if it's Postgres
        db_url = os.getenv('DATABASE_URL')
        if db_url and 'postgres' in db_url:
            SQLALCHEMY_DATABASE_URI = db_url
        else:
            SQLALCHEMY_DATABASE_URI = 'sqlite:////tmp/devalert.db'
            print("🚀 Running on Render: Using /tmp/devalert.db")
    else:
        # Local development
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
