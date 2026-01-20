import json

try:
    with open('JmdictFurigana.json', 'r', encoding='utf-8-sig') as f:
        data = json.load(f)
        print(f"Total entries: {len(data)}")
        
        # Check first 5
        print("--- First 5 entries ---")
        for i in range(min(5, len(data))):
            print(json.dumps(data[i], indent=2, ensure_ascii=False))
            
        # Search for "日本" to see if it has priority tags
        print("\n--- Searching for '日本' ---")
        found = 0
        for entry in data:
            if entry.get('text') == '日本':
                print(json.dumps(entry, indent=2, ensure_ascii=False))
                found += 1
                if found >= 2: break

except Exception as e:
    print(f"Error: {e}")
