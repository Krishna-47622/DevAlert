
import sys
import os
from services.scanner_service import get_scanner_service
from app import create_app

def trigger_manual_scan():
    app = create_app()
    with app.app_context():
        print("🚀 Starting Manual AI Scan...")
        service = get_scanner_service()
        if not service:
            print("❌ Service initialization failed. Check .env")
            return
        
        # Run scan for India
        result = service.run_scan(region="India")
        
        print("\n" + "="*50)
        print("✅ SCAN RESULT:")
        print(result)
        print("="*50 + "\n")
        
        # Save to file for the agent to read
        with open("manual_scan_output.txt", "w", encoding="utf-8") as f:
            f.write(result)

if __name__ == "__main__":
    trigger_manual_scan()
