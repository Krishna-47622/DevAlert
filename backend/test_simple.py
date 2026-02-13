
try:
    with open("simple_test.txt", "w") as f:
        f.write("Hello from simple test")
    print("Done writing to simple_test.txt")
except Exception as e:
    print(f"Error: {e}")
