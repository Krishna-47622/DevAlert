from app import create_app
from models import db, User
from sqlalchemy import inspect
import os

def check():
    app = create_app()
    with app.app_context():
        inspector = inspect(db.engine)
        tables = ['users', 'hackathons', 'internships']
        
        output = []
        output.append("--- Database Schema Integrity Check ---")
        for table in tables:
            if table not in inspector.get_table_names():
                output.append(f"❌ Table '{table}' NOT FOUND!")
                continue
                
            columns = [c['name'] for c in inspector.get_columns(table)]
            output.append(f"\nTable '{table}':")
            output.append(f"  Columns: {', '.join(columns)}")
            
            # Specific checks
            if table == 'users':
                required = ['is_host_approved', 'requested_host_access', 'organization', 'designation']
                missing = [r for r in required if r not in columns]
                if missing: output.append(f"  ❌ Missing in users: {missing}")
                else: output.append("  ✅ Users table matches model.")
                
            if table in ['hackathons', 'internships']:
                if 'source' not in columns:
                    output.append(f"  ❌ Missing 'source' in {table}")
                else:
                    output.append(f"  ✅ {table.capitalize()} table has source column.")
        output.append("\n--- End of Check ---\n")
        
        with open('db_check_results.txt', 'w', encoding='utf-8') as f:
            f.write('\n'.join(output))
        print("Results written to db_check_results.txt")

if __name__ == "__main__":
    check()
