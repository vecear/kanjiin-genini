import json
import os

def conjugate_verb(word, furigana_list):
    """
    Generates common conjugations for a verb.
    word: dictionary form (e.g., "食べる", "話す")
    furigana_list: list of dicts [{"ruby": "食", "rt": "た"}, {"ruby": "べる"}]
    """
    if not word or len(word) < 2:
        return []

    last_char = word[-1]
    stem_word = word[:-1]
    
    # Try to find the splitting point in furigana
    # We assume the last character of the word is the conjugation suffix
    stem_furigana = []
    suffix_ruby = ""
    
    # Reconstruct stem furigana and identify suffix part
    current_text = ""
    for item in furigana_list:
        ruby = item["ruby"]
        rt = item.get("rt", "")
        
        if current_text + ruby == word:
            # This is the last part, if it's longer than 1 char, we might need to split it
            # but usually Jmdict splits okurigana
            if len(ruby) > 1 and ruby.endswith(last_char):
                 stem_furigana.append({"ruby": ruby[:-1], "rt": rt[:-1] if rt else ""})
                 suffix_ruby = last_char
            else:
                 suffix_ruby = ruby
            break
        elif current_text + ruby <= word:
            stem_furigana.append(item)
            current_text += ruby
        else:
            # Overlap, shouldn't happen with good Jmdict
            break

    if not suffix_ruby or suffix_ruby != last_char:
        return []

    conjugations = []
    
    # Helpers to format output
    def add_conj(suffix_k, suffix_r_extra=""):
        # suffix_k: the new kana suffix
        new_text = stem_word + suffix_k
        new_furigana = []
        for sf in stem_furigana:
            new_furigana.append([sf["ruby"], sf.get("rt", sf["ruby"])])
        # Add the new kana suffix (no ruby needed for pure kana)
        new_furigana.append([suffix_k, ""])
        conjugations.append((new_text, new_furigana))

    # --- Godan/Ichidan Heuristics ---
    # This is simplified. In a real system we'd check POS.
    # Here we'll generate both if it looks like it could be either (ends in る)
    
    # 1. Ichidan (and some Godan) - stems ending in -i/-e
    if last_char == "る":
        # Ichidan: Drop る
        # ます, た, て, ない, られる, させる, よう
        for s in ["ます", "ました", "ません", "た", "て", "ない", "られる", "させる", "よう"]:
            add_conj(s)

    # 2. Godan endings
    godan_rules = {
        "う": {"masu": "い", "te": "った", "ta": "った", "nai": "わ"},
        "く": {"masu": "き", "te": "いて", "ta": "いた", "nai": "か"},
        "ぐ": {"masu": "ぎ", "te": "いで", "ta": "いだ", "nai": "が"},
        "す": {"masu": "し", "te": "して", "ta": "した", "nai": "さ"},
        "つ": {"masu": "ち", "te": "った", "ta": "った", "nai": "た"},
        "ぬ": {"masu": "に", "te": "んで", "ta": "んだ", "nai": "な"},
        "む": {"masu": "み", "te": "んで", "ta": "んだ", "nai": "ま"},
        "ぶ": {"masu": "び", "te": "んで", "ta": "んだ", "nai": "ば"},
        "る": {"masu": "り", "te": "った", "ta": "った", "nai": "ら"},
    }

    if last_char in godan_rules:
        r = godan_rules[last_char]
        # ます
        add_conj(r["masu"] + "ます")
        add_conj(r["masu"] + "ました")
        # た/て
        add_conj(r["te"])
        add_conj(r["ta"])
        # ない
        add_conj(r["nai"] + "ない")

    return conjugations

def conjugate_adj(word, furigana_list):
    """Generates conjugations for I-Adjectives"""
    if not word.endswith("い") or len(word) < 2:
        return []

    stem_word = word[:-1]
    stem_furigana = []
    current_text = ""
    for item in furigana_list:
        ruby = item["ruby"]
        if current_text + ruby == word:
             if len(ruby) > 1:
                 stem_furigana.append({"ruby": ruby[:-1], "rt": item.get("rt", "")[:-1] if item.get("rt") else ""})
             break
        else:
            stem_furigana.append(item)
            current_text += ruby

    conjugations = []
    def add_conj(suffix_k):
        new_text = stem_word + suffix_k
        new_furigana = []
        for sf in stem_furigana:
            new_furigana.append([sf["ruby"], sf.get("rt", sf["ruby"])])
        new_furigana.append([suffix_k, ""])
        conjugations.append((new_text, new_furigana))

    # く, かった, くない, ければ
    for s in ["く", "かった", "くない", "ければ", "かったです", "くないです"]:
        add_conj(s)
    
    return conjugations

def build():
    print("Loading JmdictFurigana.json...")
    input_path = 'JmdictFurigana.json'
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    with open(input_path, 'r', encoding='utf-8-sig') as f:
        data = json.load(f)

    conj_readings = {}

    print("Generating conjugations...")
    # Limit to most common words to keep file size reasonable
    # For this task, we'll process a subset or focused list if large
    count = 0
    for entry in data:
        text = entry["text"]
        # Basics: must contain kanji and end in verb/adj kana
        if not any(0x4E00 <= ord(c) <= 0x9FAF for c in text):
            continue
            
        conjs = []
        if text.endswith(("る", "う", "く", "ぐ", "す", "つ", "ぬ", "む", "ぶ")):
            conjs = conjugate_verb(text, entry["furigana"])
        elif text.endswith("い"):
            conjs = conjugate_adj(text, entry["furigana"])
            
        for c_text, c_pairs in conjs:
            if c_text not in conj_readings:
                conj_readings[c_text] = c_pairs
        
        count += 1
        if count % 10000 == 0:
            print(f"Processed {count} entries...")
        
        # Performance/Size limit for extension
        if len(conj_readings) > 30000:
            break

    # Sort by length descending
    sorted_names = sorted(conj_readings.keys(), key=len, reverse=True)

    print(f"Generated {len(conj_readings)} conjugated forms.")

    output_path = 'conjugated_dict.js'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("// Auto-generated conjugated forms (Verbs and Adjectives)\n")
        f.write("const CONJUGATED_READINGS = ")
        json.dump(conj_readings, f, ensure_ascii=False, indent=2)
        f.write(";\n\n")
        f.write("const CONJUGATED_NAMES_SORTED = ")
        json.dump(sorted_names, f, ensure_ascii=False, indent=2)
        f.write(";\n")

    print(f"Successfully generated {output_path}")

if __name__ == "__main__":
    build()
