import json

with open('JmdictFurigana.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(json.dumps(data[:5], indent=2, ensure_ascii=False))
