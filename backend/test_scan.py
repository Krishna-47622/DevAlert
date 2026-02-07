import sys
import os
import io

# Force utf-8 for stdout/stderr
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Add current directory to path
sys.path.append(os.getcwd())

from flask import Flask
from models import db

from config import Config

def create_test_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    db.init_app(app)
    
    return app

if __name__ == "__main__":
    app = create_test_app()
    
    with app.app_context():
        try:
            print("Importing ai_scan_and_save...")
            from routes.scanner import ai_scan_and_save
            print("Import successful. Running scan...")
            result = ai_scan_and_save()
            if 'error' in result:
                print("SCAN FAILED WITH ERROR:")
                print(result['error'])
            else:
                print("Scan Success:", result)
        except Exception as e:
            print("Exception during test execution:")
            print(e)
            import traceback
            traceback.print_exc()
