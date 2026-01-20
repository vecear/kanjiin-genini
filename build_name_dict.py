import json
import os
import re

# Embedded lists since hall_of_fame.py is missing
TOP_SURNAMES = [
    "佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺", "山本", "中村", "小林", "加藤",
    "吉田", "山田", "佐々木", "山口", "松本", "井上", "木村", "林", "斎藤", "清水",
    "山崎", "森", "池田", "橋本", "阿部", "石川", "山下", "中島", "石井", "小川",
    "前田", "岡田", "長谷川", "藤田", "後藤", "近藤", "村上", "遠藤", "青木", "坂本",
    "斉藤", "福田", "太田", "西村", "藤井", "金子", "和田", "中山", "村田", "上田",
    "原", "柴田", "酒井", "工藤", "宮崎", "横山", "宮本", "内田", "高木", "安藤",
    "菅田", "大谷", "米津", "星野", "広瀬", "石原", "新垣", "綾瀬", "土屋", "吉岡"
]

COMMON_GIVEN_NAMES = [
    "将暉", "翔平", "玄師", "源", "すず", "さとみ", "結衣", "はるか", "太鳳", "里帆",
    "太郎", "一郎", "健太", "直人", "雄太", "大輔", "誠", "剛", "健", "涼大",
    "大翔", "蓮", "陽翔", "結菜", "陽菜", "美月", "結愛", "美咲", "花", "さくら",
    "愛", "美紅", "七海", "未来", "菜摘", "大樹", "翔", "翼", "拓海", "亮太",
    "一真", "健太郎", "拓也", "直樹", "和也", "貴浩", "大知", "康介", "優", "真",
    "彩", "優花", "美優", "美緒", "春香", "明日香", "由佳", "愛美", "里奈", "沙羅",
    "賢人", "亮", "隆之介", "流星", "北斗", "将生", "文哉", "倫也", "涼真", "聡",
    "博己", "亮平", "桃李", "太賀", "正孝", "剛典", "涼介", "雅紀", "智", "宏",
    "竜也", "理", "蒼汰", "周平", "真剣佑", "郷敦", "匠海", "淳", "雄大", "大志",
    "啓太", "祥太朗", "遥亮", "衛二", "圭祐", "李光人", "春奈", "愛菜", "環奈", "美波",
    "美桜", "祐希", "由里子", "沙莉", "優実", "若菜", "夏希", "芽育", "菜乃華", "沙良",
    "架純", "彩", "由紀恵", "芽郁", "七菜", "果耶", "あやみ", "ふみ", "萌音", "萌歌",
    "菜々子", "コウ", "涼子", "恵梨香", "ゆり子", "ひかり", "あおい", "未華子", "美玲", "希",
    "華", "麦", "充希", "文乃", "美智子", "菜奈", "杏奈", "遥", "琳加"
]

# Custom Name Readings Dictionary (Manual Overrides for common names)
# Format: "Name": [["Char", "Reading"], ...]
MANUAL_READINGS = {
    # Add any specific readings here if Jmdict is missing them or for custom combos
    "菅田": [["菅", "す"], ["田", "だ"]],
    "将暉": [["将", "まさ"], ["暉", "き"]],
    "大谷": [["大", "おお"], ["谷", "たに"]],
    "翔平": [["翔", "しょう"], ["平", "へい"]],
}

def generate_pairs(text, full_reading=None):
    """Simple heuristic to generate pairs if we don't have dictionary data"""
    if text in MANUAL_READINGS:
        return MANUAL_READINGS[text]
        
    pairs = []
    # Very basic dummy generation if no manual data
    # In a real scenario, we'd use a kanji dictionary to lookup readings
    # For now, if we don't have it, we might skip or use a placeholder
    return pairs

def load_jmnedict():
    jmnedict_path = 'JmnedictFurigana.json'
    if not os.path.exists(jmnedict_path):
        print(f"Warning: {jmnedict_path} not found. Skipping Jmnedict.")
        return {}

    print(f"Loading {jmnedict_path}...")
    try:
        with open(jmnedict_path, 'r', encoding='utf-8-sig') as f:
            data = json.load(f)
            
        converted = {}
        for entry in data:
            word = entry['text']
            parts = []
            for f_part in entry['furigana']:
                ruby = f_part['ruby']
                rt = f_part.get('rt', ruby) # Use ruby as reading if rt missing (kana)
                parts.append([ruby, rt])
            converted[word] = parts
        return converted
    except Exception as e:
        print(f"Error loading Jmnedict: {e}")
        return {}

def build():
    print("Building Name Dictionary...")
    
    # Load Jmnedict data
    jmnedict_entries = load_jmnedict()
    print(f"Loaded {len(jmnedict_entries)} entries from Jmnedict.")

    name_readings = {} # Full dictionary (Jmnedict + others)
    surname_readings = {}
    given_name_readings = {}
    
    # 1. Start with Jmnedict as the base for NAME_READINGS
    name_readings.update(jmnedict_entries)

    # 2. Build Surnames (Keep existing hardcoded logic for categorization, optional)
    for surname in TOP_SURNAMES:
        if surname in jmnedict_entries:
            surname_readings[surname] = jmnedict_entries[surname]
        else:
            pairs = generate_pairs(surname)
            if not pairs and surname in MANUAL_READINGS: 
                 pairs = MANUAL_READINGS[surname]
            if pairs:
                 surname_readings[surname] = pairs
            # Also add to main dict if not present
            if surname not in name_readings and surname in surname_readings:
                 name_readings[surname] = surname_readings[surname]

    # 3. Build Given Names
    for given in COMMON_GIVEN_NAMES:
        if given in jmnedict_entries:
             given_name_readings[given] = jmnedict_entries[given]
        else:
            pairs = generate_pairs(given)
            if not pairs and given in MANUAL_READINGS:
                 pairs = MANUAL_READINGS[given]
            if pairs:
                given_name_readings[given] = pairs
            if given not in name_readings and given in given_name_readings:
                 name_readings[given] = given_name_readings[given]

    # 4. Integrate Manual Readings (Priority Overrides)
    for k, v in MANUAL_READINGS.items():
        name_readings[k] = v
        # Also update split lists if they are in there
        if k in surname_readings: surname_readings[k] = v
        if k in given_name_readings: given_name_readings[k] = v

    # 5. Recover existing data (optional, but Jmnedict is likely superior)
    # We skip recovering from old name_dict.js to avoid staleness, assuming Jmnedict is the source of truth now.

    # Sort keys for matcher
    # Sorting 160k keys might be slow but necessary for greedy matching if we iterate keys.
    # However, content.js might just lookup?
    # content.js: `autoAnnotateText` iterates `dictionaryHashes`.
    # Wait, `content.js` doesn't iterate `NAME_READINGS` keys directly for matching usually?
    # Let's check logic: `matchNameWithSpaces` is called.
    # Actually `content.js` seems to create a `dictionaryHashes` map.
    # But `autoAnnotateText` iterates... what?
    # It might need `NAME_NAMES_SORTED` if it does greedy matching against text.
    # Yes, `const NAME_NAMES_SORTED` is written.
    # Optimizing: sorting 100k items is fine in Python.
    
    print("Sorting keys...")
    sorted_names = sorted(name_readings.keys(), key=len, reverse=True)
    sorted_surnames = sorted(surname_readings.keys(), key=len, reverse=True)
    sorted_given_names = sorted(given_name_readings.keys(), key=len, reverse=True)

    print(f"Surnames: {len(surname_readings)}, Given: {len(given_name_readings)}, Full/Total: {len(name_readings)}")

    output_path = 'name_dict.js'
    print(f"Writing to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("// Specialized Japanese name dictionary (Split & Full)\n")
        
        f.write("const NAME_READINGS = ")
        json.dump(name_readings, f, ensure_ascii=False) # remove indent for lighter file
        f.write(";\n\n")
        
        f.write("const NAME_NAMES_SORTED = ")
        json.dump(sorted_names, f, ensure_ascii=False)
        f.write(";\n\n")

        f.write("const SURNAME_READINGS = ")
        json.dump(surname_readings, f, ensure_ascii=False)
        f.write(";\n\n")
        
        f.write("const SURNAME_NAMES_SORTED = ")
        json.dump(sorted_surnames, f, ensure_ascii=False)
        f.write(";\n\n")

        f.write("const GIVEN_NAME_READINGS = ")
        json.dump(given_name_readings, f, ensure_ascii=False)
        f.write(";\n\n")
        
        f.write("const GIVEN_NAMES_SORTED = ")
        json.dump(sorted_given_names, f, ensure_ascii=False)
        f.write(";\n")

    print(f"Successfully generated {output_path}")

if __name__ == "__main__":
    build()

