
import sys
import os

# Ensure backend directory is in path
sys.path.append(os.getcwd())

from services.match_service import MatchService

def test_parsing():
    print("Initializing MatchService...")
    service = MatchService(api_key="dummy")
    
    test_cases = [
        # Case 1: Clean JSON
        ("""{
            "score": 85,
            "explanation": "Good match."
        }""", True),
        
        # Case 2: Markdown Code Block
        ("""```json
        {
            "score": 90,
            "explanation": "Excellent match."
        }
        ```""", True),
        
        # Case 3: Markdown without 'json'
        ("""```
        {
            "score": 88,
            "explanation": "Markdown block."
        }
        ```""", True),
        
        # Case 4: Text before and after
        ("""Here is the result:
        {
            "score": 75,
            "explanation": "Average match."
        }
        Hope this helps.""", True),
        
        # Case 5: Extra braces in text AFTER JSON (The specific failure case)
        ("""
        {
            "score": 60,
            "explanation": "Text after."
        }
        Note: I ignored the section {Projects}.
        """, True),
        
        # Case 6: Nested braces inside JSON (Should pass)
        ("""
        {
            "score": 95,
            "explanation": "Matches {keyword} perfectly."
        }
        """, True),
        
        # Case 7: Invalid JSON (Should fail)
        ("""{ "score": 85, }""", False) 
    ]
    
    print("\nRunning Verification Tests...\n")
    all_passed = True
    
    for i, (text, should_pass) in enumerate(test_cases, 1):
        print(f"--- Case {i} ---")
        score, explanation = service._parse_ai_response(text)
        print(f"Input snippet: {text[:20]}...")
        print(f"Result: Score={score}, Explanation='{explanation}'")
        
        is_success = (score > 0)
        
        if is_success == should_pass:
            print("✅ PASSED")
        else:
            print(f"❌ FAILED - Expected {'Success' if should_pass else 'Failure'}, got {'Success' if is_success else 'Failure'}")
            all_passed = False
        print("-" * 20)
        
    if all_passed:
        print("\n✅✅ ALL TESTS PASSED! Parsing logic is robust.")
    else:
        print("\n❌❌ SOME TESTS FAILED.")

if __name__ == "__main__":
    test_parsing()
