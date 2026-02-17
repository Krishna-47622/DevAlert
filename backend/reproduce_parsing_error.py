
import re
import json

def _parse_ai_response(text):
    """Extract score and explanation from AI JSON string (Original Implementation)"""
    try:
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            print(f"DEBUG: Regex matched: {json_match.group()}")
            data = json.loads(json_match.group())
            return data.get('score', 0), data.get('explanation', "No explanation provided.")
        return 0, "Failed to parse AI response."
    except Exception as e:
        print(f"Error parsing AI response: {e}")
        return 0, "Error format in AI response."

# Test Cases
test_cases = [
    # Case 1: Clean JSON (Should Pass)
    """{
        "score": 85,
        "explanation": "Good match."
    }""",
    
    # Case 2: Markdown Code Block (Should Pass currently if regex finds inner {})
    """```json
    {
        "score": 85,
        "explanation": "Good match."
    }
    ```""",
    
    # Case 3: Text before and after (Should Pass if no extra braces)
    """Here is the result:
    {
        "score": 85,
        "explanation": "Good match."
    }
    Hope this helps.""",
    
    # Case 4: Extra braces in text AFTER JSON (Likely FAIL with greedy match)
    """
    {
        "score": 85,
        "explanation": "Good match."
    }
    Note: I ignored the section {Projects}.
    """,
    
    # Case 5: Broken JSON (Trailing comma)
    """{
        "score": 85,
        "explanation": "Good match.",
    }"""
]

print("Running Reproduction Tests...\n")
for i, case in enumerate(test_cases, 1):
    print(f"--- Case {i} ---")
    score, explanation = _parse_ai_response(case)
    print(f"Result: Score={score}, Explanation='{explanation}'")
    if explanation == "Error format in AI response.":
        print("❌ FAILED (Caught Exception)")
    elif explanation == "Failed to parse AI response.":
        print("❌ FAILED (No Regex Match)")
    else:
        print("✅ PASSED")
    print("\n")
