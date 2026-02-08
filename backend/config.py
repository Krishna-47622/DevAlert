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
        # OR use the provided DATABASE_URL (Postgres, MySQL, etc.)
        db_url = os.getenv('DATABASE_URL')
        if db_url:
            # Fix for SQLAlchemy requiring postgresql:// instead of postgres://
            if db_url.startswith("postgres://"):
                db_url = db_url.replace("postgres://", "postgresql://", 1)
            # Fix for MySQL: Ensure it uses pymysql driver if not specified
            elif db_url.startswith("mysql://") and "pymysql" not in db_url:
                db_url = db_url.replace("mysql://", "mysql+pymysql://", 1)
                
            SQLALCHEMY_DATABASE_URI = db_url
            print(f"🚀 Running on Render: Using External Database ({db_url.split(':')[0]})")
        else:
            SQLALCHEMY_DATABASE_URI = 'sqlite:////tmp/devalert.db'
            print("⚠️ Running on Render: Using EPHEMERAL SQLite (Data lost on restart)")
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
    
    # Email settings - Mailgun API
    MAIL_SERVICE = os.getenv('MAIL_SERVICE', 'brevo')  # 'smtp', 'mailgun', or 'brevo'
    
    # Mailgun
    MAILGUN_API_KEY = os.getenv('MAILGUN_API_KEY', '')
    MAILGUN_DOMAIN = os.getenv('MAILGUN_DOMAIN', '')
    
    # Brevo (Sendinblue)
    BREVO_API_KEY = os.getenv('BREVO_API_KEY', '')
    
    MAIL_FROM_EMAIL = os.getenv('MAIL_FROM_EMAIL', 'noreply@devalert.com')
    
    # Legacy SMTP settings (kept for reference)
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USE_SSL = os.getenv('MAIL_USE_SSL', 'False').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')
    MAIL_FROM_EMAIL = os.getenv('MAIL_FROM_EMAIL', 'noreply@devalert.com')
    
    # Frontend URL (for email links)
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    
    # OAuth - Google
    GOOGLE_OAUTH_CLIENT_ID = os.getenv('GOOGLE_OAUTH_CLIENT_ID', '')
    GOOGLE_OAUTH_CLIENT_SECRET = os.getenv('GOOGLE_OAUTH_CLIENT_SECRET', '')
    
    # OAuth - GitHub
    GITHUB_OAUTH_CLIENT_ID = os.getenv('GITHUB_OAUTH_CLIENT_ID', '')
    GITHUB_OAUTH_CLIENT_SECRET = os.getenv('GITHUB_OAUTH_CLIENT_SECRET', '')
    
    # CORS settings
    CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:5000']
    
    # Frontend build path
    FRONTEND_BUILD_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'dist')
    FRONTEND_SOURCE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
