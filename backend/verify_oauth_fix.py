
from urllib.parse import urlencode, quote
import json

# Simulate a user with a large resume
# Standard user data
user_data = {
    'id': 1,
    'username': 'testuser',
    'email': 'test@example.com',
    'role': 'participant',
    'organization': None,
    'designation': None,
    'is_host_approved': False,
    'requested_host_access': False,
    'email_verified': True,
    'two_factor_enabled': False,
    'oauth_provider': 'google',
    'full_name': 'Test User',
    'display_name': 'Tester',
    'theme_preference': 'dark',
    'resume_text': 'A' * 5000, # Large resume text (5KB)
    'resume_link': 'https://example.com/resume.pdf',
    'resume_updated_at': '2023-01-01T00:00:00',
    'created_at': '2023-01-01T00:00:00',
    'match_explanation': 'B' * 1000, # Large explanation
    'notes': 'C' * 500
}

# 1. Original Behavior (All fields)
original_json = json.dumps(user_data)
original_quoted = quote(original_json)
original_params = urlencode({
    'token': 'some_jwt_token',
    'user': original_quoted
})

print(f"Original Request Line Size: {len(original_params)} bytes")
if len(original_params) > 4094:
    print("❌ WOULD FAIL: Request line too large (> 4094 bytes)")
else:
    print("✅ WOULD PASS")

print("-" * 30)

# 2. Fixed Behavior (Sanitized)
url_safe_user = {
    k: v for k, v in user_data.items() 
    if k not in ['resume_text', 'resume_link', 'match_explanation', 'notes'] and v is not None
}

fixed_json = json.dumps(url_safe_user)
fixed_quoted = quote(fixed_json)
fixed_params = urlencode({
    'token': 'some_jwt_token',
    'user': fixed_quoted
})

print(f"Fixed Request Line Size: {len(fixed_params)} bytes")
if len(fixed_params) > 4094:
    print("❌ WOULD FAIL: Still too large")
else:
    print("✅ FIXED: Request line size is safe")

# Calculate reduction
reduction = len(original_params) - len(fixed_params)
print(f"Size reduction: {reduction} bytes")
