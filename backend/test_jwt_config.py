from app import create_app
from flask_jwt_extended import create_access_token, decode_token
import os

def test_jwt():
    app = create_app()
    with app.app_context():
        # Create a token
        token = create_access_token(identity="1")
        print(f"Generated Token: {token[:20]}...")
        
        # Decode/Verify
        try:
            decoded = decode_token(token)
            print(f"✅ Decoded Identity: {decoded['sub']}")
        except Exception as e:
            print(f"❌ Verification failed: {e}")

if __name__ == "__main__":
    test_jwt()
