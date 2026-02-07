try:
    import lxml
    from bs4 import BeautifulSoup
    soup = BeautifulSoup("<html></html>", "lxml")
    print("✅ lxml is working")
except Exception as e:
    print(f"❌ lxml error: {e}")
    import traceback
    traceback.print_exc()
