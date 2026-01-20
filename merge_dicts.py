import json
import os

def main():
    jlpt_words = set()
    # 1. Load JLPT words
    for i in range(1, 6):
        filename = f'n{i}.json'
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for entry in data:
                    kanji = entry.get('kanji')
                    if kanji:
                        jlpt_words.add(kanji)
    
    print(f"Loaded {len(jlpt_words)} unique kanji words from JLPT N1-N5")

    # 2. Load JmdictFurigana and filter
    core_readings = {}
    with open('JmdictFurigana.json', 'r', encoding='utf-8-sig') as f:
        jmdict = json.load(f)
        for entry in jmdict:
            text = entry.get('text')
            if text in jlpt_words:
                # Convert furigana array to a compact format: [ [ruby, rt], ... ]
                # If rt is empty (kana part), it might be missing or empty string
                pairs = []
                for f in entry.get('furigana', []):
                    ruby = f.get('ruby', '')
                    rt = f.get('rt', '')
                    pairs.append([ruby, rt])
                
                # Only add if we have pairs
                if pairs:
                    core_readings[text] = pairs

    print(f"Matched {len(core_readings)} words with precise furigana from JmdictFurigana")

    # 3. Sort names by length (descending) for greedy matching
    sorted_names = sorted(core_readings.keys(), key=len, reverse=True)

    # 4. Generate JavaScript file
    with open('core_dict.js', 'w', encoding='utf-8') as f:
        f.write("// Core Dictionary: JLPT N1-N5 vocabulary with precise furigana alignment\n")
        f.write("const CORE_READINGS = " + json.dumps(core_readings, ensure_ascii=False, separators=(',', ':')) + ";\n")
        f.write("const CORE_NAMES_SORTED = " + json.dumps(sorted_names, ensure_ascii=False, separators=(',', ':')) + ";\n")

    print(f"Generated core_dict.js successfully")

if __name__ == "__main__":
    main()
