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

def build():
    print("Building Name Dictionary...")
    
    name_readings = {}
    surname_readings = {}
    given_name_readings = {}
    
    # 1. Build Surnames
    for surname in TOP_SURNAMES:
        pairs = generate_pairs(surname)
        if not pairs and surname in MANUAL_READINGS: 
             pairs = MANUAL_READINGS[surname]
        
        # If still no pairs, try to load from existing NAME_READINGS or just store simple
        # For this prototype, we'll try to use what we have in MANUAL or skip
        # Actually, let's just create entries. Use a simple heuristic or lookup from a map if available.
        # Since we lack a full dictionary in this script, we'll rely on the existing name_dict.js content 
        # normally, but here we will just ensure the keys are present for the matcher.
        # The content.js matcher needs the PAIRS to generate ruby. 
        # If pairs are missing, we can't generate ruby.
        if pairs:
             surname_readings[surname] = pairs

    # 2. Build Given Names
    for given in COMMON_GIVEN_NAMES:
        pairs = generate_pairs(given)
        if not pairs and given in MANUAL_READINGS:
             pairs = MANUAL_READINGS[given]
        if pairs:
            given_name_readings[given] = pairs
            
    # 3. Build Full Names (Legacy + High Priority)
    # We can keep some, but the goal is to use combinatorial.
    # Let's verify what data we actually have.
    # Since we can't easily parse Jmdict here without the file and big logic, 
    # and the user wants to Fix "Suda Masaki", let's ensure those specific ones are in the split dicts.
    
    # We need to populate surname_readings and given_name_readings with actual pairs.
    # Since we are running blindly without the big dict, let's add a quick lookup map from the CURRENT name_dict.js
    # if we can read it. But we are overwriting it.
    # Strategy: Parse the EXISTING name_dict.js to recover readings!
    
    current_name_dict_path = 'name_dict.js'
    if os.path.exists(current_name_dict_path):
        print("Recovering data from existing name_dict.js...")
        with open(current_name_dict_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Extract JSON part. heavily simplified regex
            match = re.search(r'const NAME_READINGS = (\{.*?\});', content, re.DOTALL)
            if match:
                try:
                    existing_data = json.loads(match.group(1))
                    
                    # Populate surnames
                    for s in TOP_SURNAMES:
                        if s in existing_data:
                            surname_readings[s] = existing_data[s]
                        elif s in MANUAL_READINGS: # Fallback
                             surname_readings[s] = MANUAL_READINGS[s]

                    # Populate given names
                    # Existing dict only has FULL names usually, but maybe some single names?
                    # Or we have to scan the full names to extract given names?
                    # That's hard. Let's look for exact matches of given names in the dict.
                    for g in COMMON_GIVEN_NAMES:
                        if g in existing_data:
                            given_name_readings[g] = existing_data[g]
                        elif g in MANUAL_READINGS:
                            given_name_readings[g] = MANUAL_READINGS[g]
                            
                    # Start with all existing full names for backward compatibility
                    name_readings = existing_data
                    
                except json.JSONDecodeError:
                    print("Failed to parse existing name_dict.js")

    # Add Manual overrides to split dicts just in case
    for k, v in MANUAL_READINGS.items():
        if k in TOP_SURNAMES: surname_readings[k] = v
        if k in COMMON_GIVEN_NAMES: given_name_readings[k] = v

    # Sort keys for matcher
    sorted_names = sorted(name_readings.keys(), key=len, reverse=True)
    sorted_surnames = sorted(surname_readings.keys(), key=len, reverse=True)
    sorted_given_names = sorted(given_name_readings.keys(), key=len, reverse=True)

    print(f"Surnames: {len(surname_readings)}, Given: {len(given_name_readings)}, Full: {len(name_readings)}")

    output_path = 'name_dict.js'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("// Specialized Japanese name dictionary (Split & Full)\n")
        
        f.write("const NAME_READINGS = ")
        json.dump(name_readings, f, ensure_ascii=False, indent=2)
        f.write(";\n\n")
        
        f.write("const NAME_NAMES_SORTED = ")
        json.dump(sorted_names, f, ensure_ascii=False, indent=2)
        f.write(";\n\n")

        f.write("const SURNAME_READINGS = ")
        json.dump(surname_readings, f, ensure_ascii=False, indent=2)
        f.write(";\n\n")
        
        f.write("const SURNAME_NAMES_SORTED = ")
        json.dump(sorted_surnames, f, ensure_ascii=False, indent=2)
        f.write(";\n\n")

        f.write("const GIVEN_NAME_READINGS = ")
        json.dump(given_name_readings, f, ensure_ascii=False, indent=2)
        f.write(";\n\n")
        
        f.write("const GIVEN_NAMES_SORTED = ")
        json.dump(sorted_given_names, f, ensure_ascii=False, indent=2)
        f.write(";\n")

    print(f"Successfully generated {output_path}")

if __name__ == "__main__":
    build()
