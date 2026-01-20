import json

for i in range(1, 6):
    filename = f'n{i}.json'
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"--- {filename} ({len(data)} entries) ---")
            print(json.dumps(data[0], indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error {filename}: {e}")
