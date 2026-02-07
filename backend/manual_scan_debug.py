from app import create_app
from routes.scanner import ai_scan_and_save
import traceback
import os

def manual_scan():
    app = create_app()
    with app.app_context():
        output = []
        try:
            output.append("--- Starting Manual AI Scan ---")
            output.append(f"GEMINI_API_KEY present: {bool(os.getenv('GEMINI_API_KEY'))}")
            
            result = ai_scan_and_save()
            output.append(f"✅ Scan result: {result}")
        except Exception as e:
            output.append(f"❌ Scan failed with error: {e}")
            output.append(traceback.format_exc())
            
        with open('manual_scan_results.txt', 'w', encoding='utf-8') as f:
            f.write('\n'.join(output))
        print("Results written to manual_scan_results.txt")

if __name__ == "__main__":
    manual_scan()
