import json
import os
import glob

def load_jmdict():
    print("Loading JmdictFurigana.json...")
    with open('JmdictFurigana.json', 'r', encoding='utf-8-sig') as f:
        data = json.load(f)
    print(f"Loaded {len(data)} entries from Jmdict.")
    
    # Create word -> reading map
    # Handle multiple readings? JDD doesn't specify reading, so we just pick the first/most common from Jmdict
    # or keep all? For now, we just want to know "Is this Key a frequent word?"
    # If it is, we use the reading from Jmdict.
    word_map = {}
    for entry in data:
        word = entry['text']
        # Extract reading from furigana
        # "furigana": [{"ruby": "食", "rt": "た"}, "べ", "る"]
        # Wait, format is complex.
        # But commonly we just want the simple reading?
        # JmdictFurigana also has "reading" field usually?
        # Let's peek at Jmdict format if needed, but usually it has 'reading'.
        reading = entry.get('reading')
        if not reading and 'furigana' in entry:
            # Construct reading from furigana if missing (unlikely)
            pass
        
        # We store the furigana object or reading for use in content.js
        # For simplicity, we store the same structure as name_dict: [ [ruby, rt], ... ]
        # But JmdictFurigana 'furigana' field is ALREADY in the format we can process or adapt.
        
        # content.js expects: dict[word] = [ {ruby, rt}, ... ] (Actually array of parts)
        # JmdictFurigana 'furigana' is: [ {ruby, rt}, string, ... ]
        # My content.js usually expects [ [ruby, rt], [ruby, rt] ] where simple strings are just [string, ""] or treated as kana.
        # name_dict.js has: "Name": [ ["Kanji", "Reading"], ... ]
        
        # Let's stick to the content.js expectation.
        # We need to convert Jmdict format to Extension format.
        # Jmdict: {"text": "食べる", "furigana": [{"ruby": "食", "rt": "た"}, "べる"]} (example)
        # Extension: "食べる": [ ["食", "た"], ["べる", ""] ] (approx)
        
        converted_parts = []
        if 'furigana' in entry:
            for part in entry['furigana']:
                if isinstance(part, dict):
                    converted_parts.append([part['ruby'], part.get('rt', '')])
                else:
                    converted_parts.append([part, ""]) # Kana only
        
        word_map[word] = converted_parts
        
    return word_map

def load_jdd_text():
    print("Loading JDD Corpus...")
    jdd_files = glob.glob('jdd_data/*.json')
    full_text = ""
    for file in jdd_files:
        try:
            with open(file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for dialogue in data:
                    for utt in dialogue['utterances']:
                        full_text += utt['utterance'] + "\n"
        except Exception as e:
            print(f"Error reading {file}: {e}")
            
    print(f"Loaded {len(full_text)} chars of JDD text.")
    return full_text

def build():
    word_map = load_jmdict()
    jdd_text = load_jdd_text()
    
    print("Optimizing search with substring sets...")
    # Generate all substrings of length 1 to 15 (covering most words)
    # This is O(TextLength * MaxWordLength)
    # 1.2M * 15 = 18M ops. Fast.
    jdd_substrings = set()
    max_len = 15
    text_len = len(jdd_text)
    
    for length in range(1, max_len + 1):
        for i in range(text_len - length + 1):
            jdd_substrings.add(jdd_text[i : i+length])
            
    print(f"Generated {len(jdd_substrings)} unique substrings from JDD.")

    jdd_entries = {}
    count = 0
    for word, reading_parts in word_map.items():
        if len(word) < 2: continue 
        if len(word) > max_len: continue # Skip very long words not covered
        
        # Check pure kana? (Logic update: skip pure kana)
        has_kanji = any('\u4e00' <= c <= '\u9faf' for c in word)
        if not has_kanji: continue
        
        # O(1) Lookup
        if word in jdd_substrings:
            jdd_entries[word] = reading_parts
            count += 1

            
    print(f"Found {len(jdd_entries)} words in JDD Corpus.")
    
    # Sort
    sorted_keys = sorted(jdd_entries.keys(), key=len, reverse=True)
    
    output_path = 'jdd_dict.js'
    print(f"Writing to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("// JDD Frequency Dictionary (High Priority Common Words)\n")
        
        f.write("const JDD_READINGS = ")
        json.dump(jdd_entries, f, ensure_ascii=False)
        f.write(";\n\n")
        
        f.write("const JDD_NAMES_SORTED = ")
        json.dump(sorted_keys, f, ensure_ascii=False)
        f.write(";\n")
        
    print("Done.")

if __name__ == "__main__":
    build()
