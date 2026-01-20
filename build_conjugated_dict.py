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
        # ます, た, て, ない, られる, させる, よう, ている, ています, ていた, ていました
        for s in ["ます", "ました", "ません", "た", "て", "ない", "られる", "させる", "よう", "ている", "ています", "ていた", "ていました"]:
            add_conj(s)

    # 2. Godan endings
    godan_rules = {
        "う": {"masu": "い", "te": "った", "ta": "った", "nai": "わ", "t": "って"},
        "く": {"masu": "き", "te": "いて", "ta": "いた", "nai": "か", "t": "いて"},
        "ぐ": {"masu": "ぎ", "te": "いで", "ta": "いだ", "nai": "が", "t": "いで"},
        "す": {"masu": "し", "te": "して", "ta": "した", "nai": "さ", "t": "して"},
        "つ": {"masu": "ち", "te": "った", "ta": "った", "nai": "た", "t": "って"},
        "ぬ": {"masu": "に", "te": "んで", "ta": "んだ", "nai": "な", "t": "んで"},
        "む": {"masu": "み", "te": "んで", "ta": "んだ", "nai": "ま", "t": "んで"},
        "ぶ": {"masu": "び", "te": "んで", "ta": "んだ", "nai": "ば", "t": "んで"},
        "る": {"masu": "り", "te": "った", "ta": "った", "nai": "ら", "t": "って"},
    }

    if last_char in godan_rules:
        r = godan_rules[last_char]
        # ます forms
        for s in ["ます", "ました", "ません"]:
            add_conj(r["masu"] + s)
        # た/て forms
        add_conj(r["te"])
        add_conj(r["ta"])
        # ている/ています forms
        for s in ["いる", "います", "いた", "いました"]:
            add_conj(r["t"] + s)
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
    # Manual add: Force-include common verbs to ensure coverage
    manual_adds = [
        {"text": "思う", "furigana": [{"ruby": "思", "rt": "おも"}, {"ruby": "う"}]},
        {"text": "行く", "furigana": [{"ruby": "行", "rt": "い"}, {"ruby": "く"}]},
        {"text": "見る", "furigana": [{"ruby": "見", "rt": "み"}, {"ruby": "る"}]},
        {"text": "言う", "furigana": [{"ruby": "言", "rt": "い"}, {"ruby": "う"}]},
        {"text": "出る", "furigana": [{"ruby": "出", "rt": "で"}, {"ruby": "る"}]},
        {"text": "作る", "furigana": [{"ruby": "作", "rt": "つく"}, {"ruby": "る"}]},
        {"text": "使う", "furigana": [{"ruby": "使", "rt": "つか"}, {"ruby": "う"}]},
        {"text": "入る", "furigana": [{"ruby": "入", "rt": "はい"}, {"ruby": "る"}]},
        {"text": "着る", "furigana": [{"ruby": "着", "rt": "き"}, {"ruby": "る"}]},
        {"text": "笑う", "furigana": [{"ruby": "笑", "rt": "わら"}, {"ruby": "う"}]},
        {"text": "食べる", "furigana": [{"ruby": "食", "rt": "た"}, {"ruby": "べる"}]},
        {"text": "寝る", "furigana": [{"ruby": "寝", "rt": "ね"}, {"ruby": "る"}]},
        {"text": "知る", "furigana": [{"ruby": "知", "rt": "し"}, {"ruby": "る"}]},
        {"text": "考える", "furigana": [{"ruby": "考", "rt": "かんが"}, {"ruby": "える"}]},
        {"text": "待つ", "furigana": [{"ruby": "待", "rt": "ま"}, {"ruby": "つ"}]},
        {"text": "聞く", "furigana": [{"ruby": "聞", "rt": "き"}, {"ruby": "く"}]},
        {"text": "話す", "furigana": [{"ruby": "話", "rt": "はな"}, {"ruby": "す"}]},
        {"text": "買える", "furigana": [{"ruby": "買", "rt": "か"}, {"ruby": "える"}]},
        {"text": "帰る", "furigana": [{"ruby": "帰", "rt": "かえ"}, {"ruby": "る"}]},
        {"text": "会う", "furigana": [{"ruby": "会", "rt": "あ"}, {"ruby": "う"}]},
        {"text": "やる", "furigana": [{"ruby": "や"}, {"ruby": "る"}]},
        {"text": "送る", "furigana": [{"ruby": "送", "rt": "おく"}, {"ruby": "る"}]},
        {"text": "死ぬ", "furigana": [{"ruby": "死", "rt": "し"}, {"ruby": "ぬ"}]},
        {"text": "飛ぶ", "furigana": [{"ruby": "飛", "rt": "と"}, {"ruby": "ぶ"}]},
        {"text": "飲む", "furigana": [{"ruby": "飲", "rt": "の"}, {"ruby": "む"}]},
        {"text": "持つ", "furigana": [{"ruby": "持", "rt": "も"}, {"ruby": "つ"}]},
        {"text": "立つ", "furigana": [{"ruby": "立", "rt": "た"}, {"ruby": "つ"}]},
        {"text": "呼ぶ", "furigana": [{"ruby": "呼", "rt": "よ"}, {"ruby": "ぶ"}]},
        {"text": "起きる", "furigana": [{"ruby": "起", "rt": "お"}, {"ruby": "きる"}]},
        {"text": "乗る", "furigana": [{"ruby": "乗", "rt": "の"}, {"ruby": "る"}]},
        {"text": "始まる", "furigana": [{"ruby": "始", "rt": "はじ"}, {"ruby": "まる"}]},
        {"text": "覚える", "furigana": [{"ruby": "覚", "rt": "おぼ"}, {"ruby": "える"}]},
        {"text": "教える", "furigana": [{"ruby": "教", "rt": "おし"}, {"ruby": "える"}]},
        {"text": "歩く", "furigana": [{"ruby": "歩", "rt": "ある"}, {"ruby": "く"}]},
        {"text": "走る", "furigana": [{"ruby": "走", "rt": "はし"}, {"ruby": "る"}]},
        {"text": "座る", "furigana": [{"ruby": "座", "rt": "すわ"}, {"ruby": "る"}]},
        {"text": "売る", "furigana": [{"ruby": "売", "rt": "う"}, {"ruby": "る"}]},
        {"text": "続く", "furigana": [{"ruby": "続", "rt": "つづ"}, {"ruby": "く"}]},
        {"text": "決める", "furigana": [{"ruby": "決", "rt": "き"}, {"ruby": "める"}]},
        {"text": "止める", "furigana": [{"ruby": "止", "rt": "と"}, {"ruby": "める"}]},
        {"text": "変わる", "furigana": [{"ruby": "変", "rt": "か"}, {"ruby": "わる"}]},
        {"text": "違う", "furigana": [{"ruby": "違", "rt": "ちが"}, {"ruby": "う"}]},
        {"text": "動く", "furigana": [{"ruby": "動", "rt": "うご"}, {"ruby": "く"}]},
        {"text": "楽しむ", "furigana": [{"ruby": "楽", "rt": "たの"}, {"ruby": "しむ"}]},
        {"text": "感じる", "furigana": [{"ruby": "感", "rt": "かん"}, {"ruby": "じる"}]},
        {"text": "直す", "furigana": [{"ruby": "直", "rt": "なお"}, {"ruby": "す"}]},
        {"text": "触る", "furigana": [{"ruby": "触", "rt": "さわ"}, {"ruby": "る"}]},
        {"text": "喜ぶ", "furigana": [{"ruby": "喜", "rt": "よろこ"}, {"ruby": "ぶ"}]},
        {"text": "戻る", "furigana": [{"ruby": "戻", "rt": "もど"}, {"ruby": "る"}]},
        {"text": "泳ぐ", "furigana": [{"ruby": "泳", "rt": "およ"}, {"ruby": "ぐ"}]},
        {"text": "歌う", "furigana": [{"ruby": "歌", "rt": "うた"}, {"ruby": "う"}]},
        {"text": "買う", "furigana": [{"ruby": "買", "rt": "か"}, {"ruby": "う"}]},
        {"text": "来る", "furigana": [{"ruby": "来", "rt": "く"}, {"ruby": "る"}]},
        {"text": "書く", "furigana": [{"ruby": "書", "rt": "か"}, {"ruby": "く"}]},
        {"text": "読む", "furigana": [{"ruby": "読", "rt": "よ"}, {"ruby": "む"}]},
        {"text": "遊ぶ", "furigana": [{"ruby": "遊", "rt": "あそ"}, {"ruby": "ぶ"}]},
        {"text": "通う", "furigana": [{"ruby": "通", "rt": "かよ"}, {"ruby": "う"}]},
        {"text": "選ぶ", "furigana": [{"ruby": "選", "rt": "えら"}, {"ruby": "ぶ"}]},
        {"text": "困る", "furigana": [{"ruby": "困", "rt": "こま"}, {"ruby": "る"}]},
        {"text": "落ちる", "furigana": [{"ruby": "落", "rt": "お"}, {"ruby": "ちる"}]},
        {"text": "消える", "furigana": [{"ruby": "消", "rt": "き"}, {"ruby": "える"}]},
        {"text": "決まる", "furigana": [{"ruby": "決", "rt": "き"}, {"ruby": "まる"}]},
        {"text": "泊まる", "furigana": [{"ruby": "泊", "rt": "と"}, {"ruby": "まる"}]},
        {"text": "借りる", "furigana": [{"ruby": "借", "rt": "か"}, {"ruby": "りる"}]},
        {"text": "貸す", "furigana": [{"ruby": "貸", "rt": "か"}, {"ruby": "す"}]},
        {"text": "頼む", "furigana": [{"ruby": "頼", "rt": "たの"}, {"ruby": "む"}]}
    ]
    count = 0
    for entry in manual_adds + data:
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
