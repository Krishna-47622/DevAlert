
from services.scanner_service import get_scanner_service
from app import create_app
import sys

app = create_app()

with app.app_context():
    print("🚀 Initializing Scanner Service...")
    scanner = get_scanner_service()
    
    if not scanner:
        print("❌ Service not initialized. Check .env keys.", flush=True)
        sys.exit(1)
        
    print("🔍 Running test scan for 'India'...")
    # Run a small test scan (it defaults to 5 results)
    result = scanner.run_scan(region="India")
    
    print("\n✅ Scan Result:")
    print(result)
    
    with open("scan_result.txt", "w", encoding="utf-8") as f:
        f.write(result)
