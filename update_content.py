
import os

path = r'c:\Users\wseu\Desktop\Code\kanjiin-genini\content.js'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_functions = """// Helper to check if text matches a name, skipping spaces
// Returns matched length in 'textChars' (number of characters consumed) or 0
function matchNameWithSpaces(textChars, startIndex, name) {
  const nameChars = [...name];
  let tIdx = startIndex; // current index in textChars
  let nIdx = 0; // index in nameChars
  const spaceRegex = /[\\s\\u3000\\u00A0\\u200B-\\u200D\\uFEFF]/;

  while (nIdx < nameChars.length && tIdx < textChars.length) {
    const tChar = textChars[tIdx];

    // Skip spaces in text
    if (spaceRegex.test(tChar)) {
      tIdx++;
      continue;
    }

    // Check match
    if (tChar !== nameChars[nIdx]) {
      return 0;
    }

    tIdx++;
    nIdx++;
  }

  // Must match full name
  if (nIdx === nameChars.length) {
    return tIdx - startIndex;
  }

  return 0;
}

// Global cache for dictionary hashes
const dictionaryHashes = new Map();

function getDictionaryHash(nameList) {
  if (dictionaryHashes.has(nameList)) {
    return dictionaryHashes.get(nameList);
  }

  const hash = new Map();
  for (const word of nameList) {
    const firstChar = word[0];
    if (!hash.has(firstChar)) {
      hash.set(firstChar, []);
    }
    hash.get(firstChar).push(word);
  }
  dictionaryHashes.set(nameList, hash);
  return hash;
}

// Helper to generate ruby with spaces preserved
// textChars: the array of characters from the page
// startIndex: where the match starts
// matchLen: how many characters from textChars were consumed
// readingPairs: array of [char, reading] from dictionary
function generateRubyWithSpaces(textChars, startIndex, matchLen, readingPairs) {
  let result = '';
  let tIdx = startIndex;
  let pIdx = 0;
  const endIdx = startIndex + matchLen;
  const spaceRegex = /[\\s\\u3000\\u00A0\\u200B-\\u200D\\uFEFF]/;

  while (tIdx < endIdx) {
    const char = textChars[tIdx];

    // Output spaces as-is
    if (spaceRegex.test(char)) {
      result += char;
      tIdx++;
      continue;
    }

    // Output ruby for matched character
    if (pIdx < readingPairs.length) {
      const pair = readingPairs[pIdx];
      const reading = pair[1];
      result += `<ruby>${char}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`;
      pIdx++;
    } else {
      result += char;
    }
    tIdx++;
  }

  return result;
}

function convertToRuby(text) {
  // First, process mixed kanji+kana words (e.g., 受ける（うける）)
  // This must come first to avoid partial matches by FURIGANA_PATTERN
  let result = text.replace(MIXED_FURIGANA_PATTERN, (match, word, furigana) => {
    // Only use mixed processing if the word actually contains both kanji and kana
    if (isMixedWord(word)) {
      return convertMixedToRuby(word, furigana);
    }
    // If it's pure kanji, let FURIGANA_PATTERN handle it
    return match;
  });

  // Then, process pure kanji words (e.g., 漢字（かんじ）)
  result = result.replace(FURIGANA_PATTERN, (match, chars, furigana) => {
    const pairs = splitFurigana(chars, furigana);
    return pairs.map(({ char, reading }) =>
      `<ruby>${char}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`
    ).join('');
  });

  return result;
}

// Kanji Unicode range regex
const KANJI_ONLY_PATTERN = /[\\u4E00-\\u9FAF]/;

// Auto-annotate text by adding furigana to all kanji using dictionary
// Priority: Place Name > Full Name > Common Word > Core Word > (Combinatorial Name) > Single Kanji
function autoAnnotateText(text) {
  let result = '';
  let i = 0;
  const chars = [...text];

  // Dictionaries ordered by priority
  const dictionaries = [
    {
      names: (typeof PLACE_NAMES_SORTED !== 'undefined') ? PLACE_NAMES_SORTED : [],
      readings: (typeof PLACE_READINGS !== 'undefined') ? PLACE_READINGS : {},
      type: 'standard'
    },
    {
      names: (typeof NAME_NAMES_SORTED !== 'undefined') ? NAME_NAMES_SORTED : [],
      readings: (typeof NAME_READINGS !== 'undefined') ? NAME_READINGS : {},
      type: 'standard'
    },
    {
      names: (typeof COMMON_NAMES_SORTED !== 'undefined') ? COMMON_NAMES_SORTED : [],
      readings: (typeof COMMON_READINGS !== 'undefined') ? COMMON_READINGS : {},
      type: 'standard'
    },
    {
      names: (typeof CORE_NAMES_SORTED !== 'undefined') ? CORE_NAMES_SORTED : [],
      readings: (typeof CORE_READINGS !== 'undefined') ? CORE_READINGS : {},
      type: 'standard'
    },
    {
      names: (typeof CONJUGATED_NAMES_SORTED !== 'undefined') ? CONJUGATED_NAMES_SORTED : [],
      readings: (typeof CONJUGATED_READINGS !== 'undefined') ? CONJUGATED_READINGS : {},
      type: 'standard'
    }
  ];

  while (i < chars.length) {
    const char = chars[i];

    // Check if it's a kanji
    if (KANJI_ONLY_PATTERN.test(char)) {
      let matched = false;

      // 1. Try Standard Dictionaries (Place, Name, Common, Core)
      for (const dict of dictionaries) {
        if (!dict.names || dict.names.length === 0) continue;

        // Optimized lookup using first-character hash
        const hash = getDictionaryHash(dict.names);
        const candidates = hash.get(char) || [];

        for (const word of candidates) {
          const matchLen = matchNameWithSpaces(chars, i, word);

          if (matchLen > 0) {
            const pairs = dict.readings[word];

            if (Array.isArray(pairs) && Array.isArray(pairs[0])) {
              result += generateRubyWithSpaces(chars, i, matchLen, pairs);
            } else if (typeof pairs === 'string') {
              const pairArray = splitFurigana(word, pairs).map(p => [p.char, p.reading]);
              result += generateRubyWithSpaces(chars, i, matchLen, pairArray);
            } else {
              result += generateRubyWithSpaces(chars, i, matchLen, pairs);
            }

            i += matchLen;
            matched = true;
            break;
          }
        }
        if (matched) break;
      }

      // 2. Try Combinatorial Name Matching (Surname + Given Name)
      if (!matched &&
        typeof SURNAME_NAMES_SORTED !== 'undefined' &&
        typeof GIVEN_NAMES_SORTED !== 'undefined') {

        const surnameHash = getDictionaryHash(SURNAME_NAMES_SORTED);
        const surnameCandidates = surnameHash.get(char) || [];

        for (const surname of surnameCandidates) {
          const surnameLen = matchNameWithSpaces(chars, i, surname);
          if (surnameLen > 0) {
            let spaceOffset = 0;
            const spaceRegex = /[\\s\\u3000\\u00A0\\u200B-\\u200D\\uFEFF]/;
            while (i + surnameLen + spaceOffset < chars.length && spaceRegex.test(chars[i + surnameLen + spaceOffset])) {
              spaceOffset++;
            }

            const nextCharIdx = i + surnameLen + spaceOffset;
            if (nextCharIdx < chars.length) {
              const nextChar = chars[nextCharIdx];
              const givenHash = getDictionaryHash(GIVEN_NAMES_SORTED);
              const givenCandidates = givenHash.get(nextChar) || [];

              for (const given of givenCandidates) {
                const givenLen = matchNameWithSpaces(chars, nextCharIdx, given);
                if (givenLen > 0) {
                  const surnamePairs = SURNAME_READINGS[surname];
                  const givenPairs = GIVEN_NAME_READINGS[given];

                  result += generateRubyWithSpaces(chars, i, surnameLen, surnamePairs);
                  result += chars.slice(i + surnameLen, i + surnameLen + spaceOffset).join('');
                  result += generateRubyWithSpaces(chars, nextCharIdx, givenLen, givenPairs);

                  i += surnameLen + spaceOffset + givenLen;
                  matched = true;
                  break;
                }
              }
            }
          }
          if (matched) break;
        }
      }

      // 3. Fallback: Single Kanji
      if (!matched) {
        const readings = typeof KANJI_READINGS !== 'undefined' ? KANJI_READINGS[char] : null;
        if (readings && readings.length > 0) {
          const reading = readings[0];
          result += `<ruby>${char}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`;
        } else {
          result += char;
        }
        i++;
      }
    } else {
      result += char;
      i++;
    }
  }

  return result;
}
"""

# Find the start of the section to replace
start_idx = -1
for idx, line in enumerate(lines):
    if "function matchNameWithSpaces" in line or "// Helper to check if text matches a name" in line:
        start_idx = idx
        break

# Find the end of the section (the return result; line of autoAnnotateText or the following })
end_idx = -1
for idx in range(len(lines) - 1, -1, -1):
    if "function hasKanji" in lines[idx]:
        # The line before hasKanji should be the end of autoAnnotateText (a closing brace)
        # We want to keep hasKanji onward
        end_idx = idx
        break

if start_idx != -1 and end_idx != -1:
    new_content = "".join(lines[:start_idx]) + new_functions + "\\n" + "".join(lines[end_idx:])
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Successfully updated content.js from line {start_idx+1} to {end_idx}")
else:
    print(f"Failed to find boundary indices: start={start_idx}, end={end_idx}")
