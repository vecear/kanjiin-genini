
import json

TARGETS = ["食べる", "話す", "美しい", "綺麗"]

try:
    with open('JmdictFurigana.json', 'r', encoding='utf-8-sig') as f:
        data = json.load(f)
        
    found_count = 0
    for entry in data:
        if entry.get('text') in TARGETS:
            print(json.dumps(entry, indent=2, ensure_ascii=False))
            found_count += 1
            if found_count >= len(TARGETS) * 2: # Stop after finding variants
                break
                
except Exception as e:
    print(e)
