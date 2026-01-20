
import os

path = r'c:\Users\wseu\Desktop\Code\kanjiin-genini\content.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find hasFuriganaPattern
pattern = '  function hasFuriganaPattern(text) {'
if pattern in content:
    # We want to replace all indented function starts from here onwards
    # Actually let's just replace the leading 2 spaces of all lines from hasFuriganaPattern onwards
    parts = content.split(pattern)
    header = parts[0]
    rest = pattern + parts[1]
    
    # Fix first function line
    fixed_start = 'function hasFuriganaPattern(text) {'
    
    # Fix all lines starting with 2 spaces
    lines = rest.splitlines()
    # The first line is exactly the pattern, but splitlines might have moved it
    # Since we split by pattern, parts[1] starts after the pattern.
    
    lines = parts[1].splitlines()
    fixed_rest_lines = []
    for line in lines:
        if line.startswith('  '):
            fixed_rest_lines.append(line[2:])
        else:
            fixed_rest_lines.append(line)
    
    new_content = header + fixed_start + '\n' + '\n'.join(fixed_rest_lines)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully re-indented content.js")
else:
    print("Could not find indented hasFuriganaPattern")
