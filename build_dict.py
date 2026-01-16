import json
import re

# Load the complete kanji dictionary
with open('kanji_full.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f'Total kanji in source: {len(data)}')

# Build dictionary: kanji -> list of all possible readings
# Format: { "漢": ["かん"], "字": ["じ", "あざ", "あざな"] }
kanji_readings = {}

for kanji, info in data.items():
    readings = []
    
    # Add on'yomi readings (already in hiragana)
    on_readings = info.get('readings_on', [])
    readings.extend(on_readings)
    
    # Add kun'yomi readings (remove okurigana markers like "はな.す" -> "はな")
    kun_readings = info.get('readings_kun', [])
    for kun in kun_readings:
        # Remove okurigana part (after the dot)
        base = kun.split('.')[0]
        # Remove any dash suffixes
        base = base.rstrip('-')
        if base and base not in readings:
            readings.append(base)
    
    if readings:
        kanji_readings[kanji] = readings

print(f'Kanji with readings: {len(kanji_readings)}')

# Save as JSON
with open('kanji_readings_full.json', 'w', encoding='utf-8') as f:
    json.dump(kanji_readings, f, ensure_ascii=False, indent=2)

# Generate JS file for the extension
js_content = 'const KANJI_READINGS = ' + json.dumps(kanji_readings, ensure_ascii=False, separators=(',', ':')) + ';'
with open('kanji_dict.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f'Generated kanji_dict.js: {len(js_content)} bytes')

# Show samples
test_kanji = ['一', '二', '三', '強', '化', '漢', '字', '日', '本', '語', '教', '育', '東', '京', '電', '話']
for k in test_kanji:
    if k in kanji_readings:
        print(f'{k}: {kanji_readings[k]}')
