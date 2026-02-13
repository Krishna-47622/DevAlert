
import sys
import os
from dotenv import load_dotenv

# Force load .env
load_dotenv()

def log_status(msg):
    with open("scan_status.txt", "a", encoding="utf-8") as f:
        f.write(msg + "\n")
    print(msg)

def trigger_manual_scan():
    try:
        log_status("🚀 Starting Manual AI Scan v2...")
        
        # Ensure backend directory is in path
        sys.path.append(os.getcwd())
        
        from app import create_app
        from services.scanner_service import get_scanner_service
        
        app = create_app()
        with app.app_context():
            log_status("🔹 App context created.")
            service = get_scanner_service()
            if not service:
                log_status("❌ Service initialization failed. Check .env")
                return
            
            log_status("🔹 Service initialized. Running scan...")
            # Run scan for India
            result = service.run_scan(region="India")
            
            log_status("\n✅ SCAN RESULT:")
            log_status(str(result))
            
    except Exception as e:
        log_status(f"❌ Exception: {e}")
        import traceback
        log_status(traceback.format_exc())

if __name__ == "__main__":
    # Clear previous status
    with open("scan_status.txt", "w") as f:
        f.write("")
    trigger_manual_scan()
