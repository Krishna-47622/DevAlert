import sys
import os

from app import create_app
from routes.scanner import cleanup_expired_opportunities

print("Creating app context...", flush=True)
app = create_app()

print("Triggering link cleanup manually...", flush=True)
with app.app_context():
    cleanup_expired_opportunities(app)
print("Done!", flush=True)
