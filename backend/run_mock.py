
import sys
import os

# Ensure backend directory is in path
sys.path.append(os.getcwd())

from services.scanner_service import AIScannerService

def test_mock():
    print("Testing Mock Data Fallback...")
    
    # Init service with dummy keys
    service = AIScannerService("DUMMY_KEY", "DUMMY_CX")
    
    # Force search_google to fail/return mock directly
    # But since we implemented fallback in search_google, we can just call it
    # We expect it to try API, fail (since dummy key), and return mock
    
    print("Calling search_google with 'hackathon'...")
    hackathons = service.search_google("hackathon")
    print(f"Got {len(hackathons)} results")
    
    with open("mock_result.txt", "w", encoding="utf-8") as f:
        f.write(f"Results: {len(hackathons)}\n")
        import json
        f.write(json.dumps(hackathons, indent=2))
        
    print("Done.")

if __name__ == "__main__":
    test_mock()
