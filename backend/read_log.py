import os

log_path = 'error.log'
if os.path.exists(log_path):
    try:
        # Try different encodings
        for enc in ['utf-16', 'utf-8', 'cp1252']:
            try:
                with open(log_path, 'r', encoding=enc) as f:
                    lines = f.readlines()
                    print(f"--- Last 20 lines (Encoding: {enc}) ---")
                    for line in lines[-20:]:
                        print(line.strip())
                break
            except:
                continue
    except Exception as e:
        print(f"Error reading log: {e}")
else:
    print("error.log not found")
