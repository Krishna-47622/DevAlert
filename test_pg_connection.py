
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

DB_URL = os.getenv('DATABASE_URL')
print(f"Testing Connection to: {DB_URL.split('@')[1] if '@' in DB_URL else 'Unknown'}")

try:
    conn = psycopg2.connect(DB_URL, connect_timeout=10)
    print("✅ Connection Successful!")
    
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM users;")
    count = cur.fetchone()[0]
    print(f"✅ Users Count: {count}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"❌ Connection Failed: {e}")
