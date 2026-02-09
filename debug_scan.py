import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import create_app
from models import db
from routes.scanner import ai_scan_and_save

def run_debug_scan():
    print("--- Starting Debug AI Scan ---")
    app = create_app()
    with app.app_context():
        try:
            print("Calling ai_scan_and_save directly...")
            # We don't pass the app object here to test the fallback logic as well, 
            # or pass it to test the primary path. Let's pass it for full integration test.
            result = ai_scan_and_save(app)
            print(f"Result: {result}")
        except Exception as e:
            print(f"CRITICAL ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    run_debug_scan()
