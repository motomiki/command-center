
try:
    from google import genai
    from google.genai import types
    print("google-genai imported successfully")
    
    # Try to find what as_image() returns or if there is an Image class
    # Since we can't easily call the API without credentials/cost, let's inspect the types if possible
    
    # Look for Image class in types
    if hasattr(types, "Image"):
        print("Found types.Image")
        import inspect
        print(inspect.signature(types.Image.save))
        print(dir(types.Image))
    else:
        print("types.Image not found")
        # Search in genai
        for name in dir(genai):
            if "Image" in name:
                print(f"Found candidate in genai: {name}")

except ImportError:
    print("google-genai not installed")
except Exception as e:
    print(f"Error: {e}")
