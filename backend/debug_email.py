import sys

# Redirect stdout/stderr to file because console capture is flaky
sys.stdout = open('debug_output.txt', 'w', encoding='utf-8')
sys.stderr = sys.stdout

print("Starting debug script...", flush=True)

try:
    from app import app
    from models import User
    from services.email_service import send_password_reset_email
    print("Imports successful", flush=True)
except Exception as e:
    print(f"Import Error: {e}", flush=True)
    sys.exit(1)

with app.app_context():
    email = "krishnachaitanya2008reddy@gmail.com"
    print(f"----- DEBUGGING USER: {email} -----", flush=True)
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        print("❌ User NOT found in database!", flush=True)
    else:
        print(f"✅ User found: ID={user.id}, Username={user.username}, Role={user.role}", flush=True)
        print(f"   OAuth Provider: {user.oauth_provider}", flush=True)
        # Handle None password hash gracefully for printing
        pw_hash = user.password_hash if user.password_hash else "None (OAuth)"
        print(f"   Password Hash: {pw_hash}", flush=True)
        
        print("\n----- ATTEMPTING TO SEND RESET EMAIL -----", flush=True)
        try:
            # use a known good URL just in case
            result = send_password_reset_email(user, "http://localhost:5173")
            print(f"Function returned: {result}", flush=True)
            print("Note: The actual sending happens in a background thread.", flush=True)
            print("Wait a few seconds for thread output...", flush=True)
        except Exception as e:
            print(f"❌ Error calling function: {e}", flush=True)

import time
time.sleep(10) # Wait for thread
print("\n----- DONE -----", flush=True)
