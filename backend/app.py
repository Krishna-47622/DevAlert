import os
import sys
import subprocess
from dotenv import load_dotenv

# Load environment variables at the very beginning
load_dotenv()

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required
from config import Config
from models import db
from routes.auth import auth_bp
from routes.hackathons import hackathons_bp
from routes.internships import internships_bp
from routes.admin import admin_bp
from routes.scanner import scanner_bp, start_scheduler, stop_scheduler
from routes.applications import applications_bp
from routes.notifications import notifications_bp
import atexit

def create_app():
    """Create and configure Flask application"""
    app = Flask(__name__, static_folder='../frontend/dist')
    app.config.from_object(Config)
    
    # Initialize extensions
    CORS(app, origins=Config.CORS_ORIGINS)
    db.init_app(app)
    jwt = JWTManager(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(hackathons_bp, url_prefix='/api/hackathons')
    app.register_blueprint(internships_bp, url_prefix='/api/internships')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(scanner_bp, url_prefix='/api/scanner')
    app.register_blueprint(applications_bp, url_prefix='/api/applications')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    
    # JWT Error Handlers
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        print(f"❌ JWT Invalid Token: {error}")
        return jsonify({'error': 'Invalid token', 'message': error}), 422

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        print(f"❌ JWT Missing Token: {error}")
        return jsonify({'error': 'Authorization required', 'message': error}), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        print(f"❌ JWT Expired: {jwt_payload}")
        return jsonify({'error': 'Token expired', 'message': 'Please login again'}), 401
    
    # Create database tables
    with app.app_context():
        db.create_all()
        print("Database initialized successfully")
    
    # Initialize and start scheduler
    try:
        start_scheduler(app)
        atexit.register(stop_scheduler)
        print("✅ AI Scanner scheduler started successfully.")
    except Exception as e:
        print(f"Warning: Scheduler could not be started: {e}")
        print("AI scanning will not be available, but the app will continue to function.")
    
    # Serve React frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        """Serve React app"""
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'healthy', 'message': 'DevAlert API is running'}), 200
    
    return app

def build_frontend():
    """Build React frontend if not already built"""
    frontend_path = Config.FRONTEND_SOURCE_PATH
    build_path = Config.FRONTEND_BUILD_PATH
    
    # Check if build exists
    if os.path.exists(build_path) and os.path.exists(os.path.join(build_path, 'index.html')):
        print("Frontend build already exists. Skipping build.")
        return True
    
    print("Building React frontend...")
    
    # Check if frontend directory exists
    if not os.path.exists(frontend_path):
        print("Warning: Frontend directory not found.")
        return False
    
    # Check if node_modules exists
    node_modules = os.path.join(frontend_path, 'node_modules')
    if not os.path.exists(node_modules):
        print("Installing frontend dependencies...")
        try:
            subprocess.run(['npm', 'install'], cwd=frontend_path, check=True, shell=True)
        except subprocess.CalledProcessError:
            return False
    
    # Build frontend
    try:
        print("Running npm run build...")
        subprocess.run(['npm', 'run', 'build'], cwd=frontend_path, check=True, shell=True)
        print("Frontend built successfully!")
        return True
    except subprocess.CalledProcessError:
        return False


# Create global app instance for Gunicorn if user runs app:app
# (This acts as a fallback if WSGI isn't used)
app = create_app()

if __name__ == '__main__':
    print("=" * 60)
    print("DevAlert - Hackathon & Internship Alert Platform")
    print("=" * 60)
    
    # Build frontend before starting server
    print("\nChecking frontend build...")
    build_success = build_frontend()
    
    # Run the app instance
    print("\nStarting Flask server...")
    
    print("\n" + "=" * 60)
    print("Server is running!")
    print("API: http://localhost:5000/api")
    print("Frontend: http://localhost:5000")
    print("=" * 60 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
