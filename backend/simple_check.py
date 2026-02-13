
with open("debug_output.txt", "w") as f:
    f.write("Hello from Python File Write\n")
    import sys
    f.write(sys.version + "\n")
    import scanner_service
    f.write("Imported scanner_service\n")
