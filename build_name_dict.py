import json
import os
import re

# Hall of Fame and expanded lists
# Note: In a real module we would import this, but due to file structure we'll copy-paste or simple-load.
# Actually, let's just assume the content of hall_of_fame.py is available or pasted here.
# To keep it runnable as a standalone script easily without module issues:
try:
    from hall_of_fame import HALL_OF_FAME, MODERN_POLITICIANS, MODERN_CELEBRITIES, TOP_SURNAMES
except ImportError:
    # Fallback if run in an environment where import fails (though it should work locally)
    print("Warning: Could not import hall_of_fame.py. Using empty lists.")
    HALL_OF_FAME = []
    MODERN_POLITICIANS = []
    MODERN_CELEBRITIES = []
    TOP_SURNAMES = ["佐藤", "鈴木", "高橋", "田中", "渡辺", "伊藤", "中村", "小林", "山本", "加藤"]

# Combine all high-priority target names into a set for fast lookup
TARGET_NAMES = set()
for name in MODERN_POLITICIANS: TARGET_NAMES.add(name)
for name in MODERN_CELEBRITIES: TARGET_NAMES.add(name)

def build():
    print("Loading JmnedictFurigana.json...")
    with open('JmnedictFurigana.json', 'r', encoding='utf-8-sig') as f:
        data = json.load(f)
    
    name_readings = {}

    # 1. Add Hall of Fame (Detailed entries with manually defined furigana if any)
    for name, pairs in HALL_OF_FAME:
        name_readings[name] = pairs

    # 2. Process JmnedictFurigana
    print("Filtering entries...")
    for entry in data:
        text = entry['text']
        
        # Priority Check: Is this a celebrity/politician we specifically want?
        is_target_name = text in TARGET_NAMES
        
        # Heuristics for general names:
        # - Starts with a top surname AND total length is 3-4 (likely surname + given)
        # - Only include Kanji-only entries to ensure they are actually names
        is_kanji_only = re.fullmatch(r'[\u4E00-\u9FAF]{2,4}', text) is not None
        starts_with_top_surname = any(text.startswith(s) for s in TOP_SURNAMES)
        
        # Inclusion Logic:
        # 1. It's in our specific TARGET_NAMES list (Whitelist)
        # 2. OR it matches the "Common Surname + 3-4 char" heuristic (General coverage)
        should_include = is_target_name or (is_kanji_only and (starts_with_top_surname or text in TOP_SURNAMES))
        
        if should_include:
            # Extract split furigana
            pairs = []
            for item in entry['furigana']:
                ruby = item['ruby']
                rt = item.get('rt', '')
                pairs.append([ruby, rt if rt else ruby])
            
            # Avoid overwriting existing (unless it's a target name, might want to ensure we get a hit)
            # If it's a target name, we definitely want it. If it's general heuristic, only if new.
            if text not in name_readings:
                name_readings[text] = pairs
                
        # Optional: Limit count if still too large.
        # For expanded request, let's bump the limit.
        if len(name_readings) > 40000: # Increased from 20000 -> 40000 based on "as much as possible"
            break

    # Sort names by length descending
    sorted_names = sorted(name_readings.keys(), key=lambda x: len(x), reverse=True)
    
    print(f"Total names in dictionary: {len(name_readings)}")
    
    output_path = 'name_dict.js'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("// Specialized Japanese name dictionary (Historical and Modern)\n")
        f.write("const NAME_READINGS = ")
        json.dump(name_readings, f, ensure_ascii=False, indent=2)
        f.write(";\n\n")
        f.write("const NAME_NAMES_SORTED = ")
        json.dump(sorted_names, f, ensure_ascii=False, indent=2)
        f.write(";\n")

    print(f"Successfully generated {output_path}")

if __name__ == "__main__":
    build()
