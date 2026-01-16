import json
import re

with open('kanji_raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Build dictionary: kanji -> first kana of reading
kanji_dict = {}
for row in data:
    for cell in row:
        if cell:
            lines = cell.split('\n')
            if len(lines) >= 1:
                first_line = lines[0]
                # Pattern: grade+strokes + space? + kana + kanji
                # Examples: '1①い一', '2⑦か何', '3⑤ し仕'
                match = re.search(r'[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*([ぁ-んァ-ン])(.+)$', first_line)
                if match:
                    kana = match.group(1)
                    kanji = match.group(2).strip()
                    if len(kanji) == 1:  # Only single kanji
                        kanji_dict[kanji] = kana

print(f'Extracted {len(kanji_dict)} kanji entries')

# Save as JSON
with open('kanji_readings.json', 'w', encoding='utf-8') as f:
    json.dump(kanji_dict, f, ensure_ascii=False, indent=2)
print('Saved to kanji_readings.json')

# Show samples
items = list(kanji_dict.items())[:20]
for k, v in items:
    print(f'{k} -> {v}')
