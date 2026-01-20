// Regex to match kanji/numbers followed by furigana in parentheses (excludes katakana)
const FURIGANA_PATTERN = /([\u4E00-\u9FAF0-9０-９]+)[\s\u3000]*[（(][\s\u3000]*([\u3040-\u309F\u30A0-\u30FF]+)[\s\u3000]*[）)]/g;

// Regex to match kanji+kana mixed words followed by furigana in parentheses
// e.g., 受ける（うける）, 食べる（たべる）, 読み方（よみかた）
const MIXED_FURIGANA_PATTERN = /([\u4E00-\u9FAF][\u4E00-\u9FAF\u3040-\u309F\u30A0-\u30FF]*)[\s\u3000]*[（(][\s\u3000]*([\u3040-\u309F\u30A0-\u30FF]+)[\s\u3000]*[）)]/g;

// Track processed elements
let processedElements = new WeakSet();
let currentMode = 'bracket'; // 'off', 'bracket', 'auto'
let savedMode = 'bracket';   // Mode to restore after releasing hotkey
let isHotkeyHeld = false;
let isToggleActive = false;  // For toggle mode
let hotkeyKey = 'disabled';  // Default hotkey (disabled)
let hotkeyMode = 'hold';     // 'hold' or 'toggle'
let hotkeyTarget = 'auto';   // 'bracket' or 'auto' - which mode to trigger with hotkey

// Japanese number readings dictionary
const NUMBER_READINGS = {
  '1': ['いち', 'いっ', 'ひと'],
  '2': ['に', 'ふた'],
  '3': ['さん', 'さっ', 'み', 'みっ'],
  '4': ['よん', 'し', 'よ', 'よっ'],
  '5': ['ご', 'いつ'],
  '6': ['ろく', 'ろっ', 'む', 'むっ'],
  '7': ['なな', 'しち', 'なの'],
  '8': ['はち', 'はっ', 'や', 'やっ'],
  '9': ['きゅう', 'く', 'ここの'],
  '0': ['れい', 'ぜろ'],
  '１': ['いち', 'いっ', 'ひと'],
  '２': ['に', 'ふた'],
  '３': ['さん', 'さっ', 'み', 'みっ'],
  '４': ['よん', 'し', 'よ', 'よっ'],
  '５': ['ご', 'いつ'],
  '６': ['ろく', 'ろっ', 'む', 'むっ'],
  '７': ['なな', 'しち', 'なの'],
  '８': ['はち', 'はっ', 'や', 'やっ'],
  '９': ['きゅう', 'く', 'ここの'],
  '０': ['れい', 'ぜろ'],
};

// Try to match number reading at start of furigana
function matchNumberReading(char, furigana) {
  const readings = NUMBER_READINGS[char];
  if (!readings) return null;
  for (const reading of readings) {
    if (furigana.startsWith(reading)) {
      return reading;
    }
  }
  return null;
}

// Dakuten/Handakuten mapping (base kana -> [voiced, half-voiced])
const VOICED_KANA = {
  'か': ['が'], 'き': ['ぎ'], 'く': ['ぐ'], 'け': ['げ'], 'こ': ['ご'],
  'さ': ['ざ'], 'し': ['じ'], 'す': ['ず'], 'せ': ['ぜ'], 'そ': ['ぞ'],
  'た': ['だ'], 'ち': ['ぢ'], 'つ': ['づ'], 'て': ['で'], 'と': ['ど'],
  'は': ['ば', 'ぱ'], 'ひ': ['び', 'ぴ'], 'ふ': ['ぶ', 'ぷ'], 'へ': ['べ', 'ぺ'], 'ほ': ['ぼ', 'ぽ'],
};

// Get base kana (remove dakuten/handakuten)
function getBaseKana(kana) {
  for (const [base, variants] of Object.entries(VOICED_KANA)) {
    if (variants.includes(kana)) return base;
  }
  return kana;
}

// Check if a reading matches at the start of remaining furigana
// Returns the matched length or 0 if no match
function matchReading(remaining, reading) {
  const remainingChars = [...remaining];
  const readingChars = [...reading];

  if (readingChars.length > remainingChars.length) return 0;

  for (let i = 0; i < readingChars.length; i++) {
    const rBase = getBaseKana(remainingChars[i]);
    const dBase = getBaseKana(readingChars[i]);
    if (rBase !== dBase && remainingChars[i] !== readingChars[i]) {
      return 0;
    }
  }
  return readingChars.length;
}

// Find where the next kanji's reading starts in the remaining furigana
// Returns { splitIndex, matchedReading } or null
function findSplitForNextKanji(remaining, nextKanjiReadings) {
  const remainingChars = [...remaining];

  // Try each possible split point (from position 1 onward)
  for (let splitIdx = 1; splitIdx < remainingChars.length; splitIdx++) {
    const afterSplit = remainingChars.slice(splitIdx).join('');

    // Check if any reading of the next kanji matches at this position
    for (const reading of nextKanjiReadings) {
      if (matchReading(afterSplit, reading) > 0) {
        return { splitIndex: splitIdx, matchedReading: reading };
      }
    }
  }
  return null;
}

// Helper to wrap text in ruby only if necessary
function wrapInRuby(text, reading) {
  if (!reading) return text;

  // Normalize both to Hiragana for comparison to catch Katakana/Hiragana matches
  const normText = katakanaToHiragana(text.trim());
  const normReading = katakanaToHiragana(reading.trim());

  if (normReading === normText) return text;
  return `<ruby>${text}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`;
}

// Check if character is a kanji
function isKanji(char) {
  const code = char.charCodeAt(0);
  return code >= 0x4E00 && code <= 0x9FAF;
}

// Check if character is hiragana
function isHiragana(char) {
  const code = char.charCodeAt(0);
  return code >= 0x3040 && code <= 0x309F;
}

// Check if character is katakana
function isKatakana(char) {
  const code = char.charCodeAt(0);
  return code >= 0x30A0 && code <= 0x30FF;
}

// Convert katakana to hiragana for comparison
function katakanaToHiragana(str) {
  return [...str].map(char => {
    const code = char.charCodeAt(0);
    if (code >= 0x30A0 && code <= 0x30FF) {
      return String.fromCharCode(code - 0x60);
    }
    return char;
  }).join('');
}

// Process mixed kanji+kana word with furigana
// e.g., 受ける（うける）-> <ruby>受<rt>う</rt></ruby>ける
// e.g., 受け付ける（うけつける）-> <ruby>受<rt>う</rt></ruby>け<ruby>付<rt>つ</rt></ruby>ける
function convertMixedToRuby(word, furigana) {
  const pairs = splitFurigana(word, furigana);
  return pairs.map(({ char, reading }) => wrapInRuby(char, reading)).join('');
}

// Check if furigana sequence matches word kana sequence (with tolerance for voicing)
function matchKanaSequence(furigana, wordKana) {
  if (wordKana.length > furigana.length) return false;
  for (let i = 0; i < wordKana.length; i++) {
    const f = furigana[i];
    const w = wordKana[i];
    if (f !== w && getBaseKana(f) !== getBaseKana(w)) {
      return false;
    }
  }
  return true;
}

// Check if word contains mixed kanji and kana (not pure kanji)
function isMixedWord(word) {
  let hasKanji = false;
  let hasKana = false;
  for (const char of word) {
    if (isKanji(char)) hasKanji = true;
    if (isHiragana(char) || isKatakana(char)) hasKana = true;
  }
  return hasKanji && hasKana;
}

// Split furigana across characters using complete reading dictionary
function splitFurigana(chars, furigana) {
  const charArray = [...chars];
  const result = [];
  let remaining = furigana;

  if (charArray.length === 1) {
    return [{ char: charArray[0], reading: furigana }];
  }

  for (let i = 0; i < charArray.length; i++) {
    const char = charArray[i];
    const isLast = i === charArray.length - 1;

    if (isLast) {
      result.push({ char, reading: remaining });
    } else {
      // 1. Try number reading first
      const numReading = matchNumberReading(char, remaining);
      if (numReading) {
        result.push({ char, reading: numReading });
        remaining = remaining.slice(numReading.length);
        continue;
      }

      // 2. Try dictionary-based split using complete readings
      const nextChar = charArray[i + 1];
      const nextReadings = typeof KANJI_READINGS !== 'undefined' ? KANJI_READINGS[nextChar] : null;

      if (nextReadings && Array.isArray(nextReadings)) {
        const split = findSplitForNextKanji(remaining, nextReadings);
        if (split) {
          const kanaArray = [...remaining];
          result.push({ char, reading: kanaArray.slice(0, split.splitIndex).join('') });
          remaining = kanaArray.slice(split.splitIndex).join('');
          continue;
        }
      }

      // 3. Fallback: estimate based on remaining length
      const charsLeft = charArray.length - i;
      const avgLen = Math.ceil([...remaining].length / charsLeft);
      const reading = [...remaining].slice(0, avgLen).join('');
      result.push({ char, reading });
      remaining = [...remaining].slice(avgLen).join('');
    }
  }
  return result;
}


// Helper to check if text matches a name, skipping spaces
// Returns matched length in 'textChars' (number of characters consumed) or 0
function matchNameWithSpaces(textChars, startIndex, name) {
  const nameChars = [...name];
  let tIdx = startIndex; // current index in textChars
  let nIdx = 0; // index in nameChars
  const spaceRegex = /[\s\u3000\u00A0\u200B-\u200D\uFEFF]/;

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

  // Sort candidates by length descending to prioritize longer matches
  for (const [key, candidates] of hash) {
    candidates.sort((a, b) => b.length - a.length);
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
  const endIdx = startIndex + matchLen;
  const spaceRegex = /[\s\u3000\u00A0\u200B-\u200D\uFEFF]/;

  for (const pair of readingPairs) {
    const charBlock = pair[0];
    const reading = pair[1];

    let charsMatchedInBlock = 0;
    const blockTextChars = [...charBlock];
    let collectedText = '';

    while (charsMatchedInBlock < blockTextChars.length && tIdx < endIdx) {
      const tChar = textChars[tIdx];

      if (spaceRegex.test(tChar)) {
        result += tChar;
        tIdx++;
        continue;
      }

      collectedText += tChar;
      charsMatchedInBlock++;
      tIdx++;
    }

    result += wrapInRuby(collectedText, reading);
  }

  // Add any remaining spaces/characters in the match range (e.g. trailing match whitespace)
  while (tIdx < endIdx) {
    result += textChars[tIdx];
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
    return pairs.map(({ char, reading }) => wrapInRuby(char, reading)).join('');
  });

  return result;
}

// Kanji Unicode range regex
const KANJI_ONLY_PATTERN = /[\u4E00-\u9FAF]/;

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

      // Universal Longest Match Priority
      let bestMatch = null;

      // 1. Evaluate Standard Dictionaries (Place, Name, Common, Core, Conjugated)
      for (const dict of dictionaries) {
        if (!dict.names || dict.names.length === 0) continue;

        const hash = getDictionaryHash(dict.names);
        const candidates = hash.get(char) || [];

        for (const word of candidates) {
          // Optimization: Since candidates are sorted by length descending,
          // the first match for this dictionary is the longest.
          // If we already have a better (or equal length but higher priority) match, skip checking this dictionary.
          if (bestMatch && bestMatch.sourceLength >= word.length) {
            break;
          }

          const matchLen = matchNameWithSpaces(chars, i, word);
          if (matchLen > 0) {
            bestMatch = {
              type: 'standard',
              matchLen: matchLen,
              sourceLength: word.length,
              word: word,
              readings: dict.readings[word]
            };
            break;
          }
        }
      }

      // 2. Evaluate Combinatorial Name Matching (Surname + Given Name)
      if (typeof SURNAME_NAMES_SORTED !== 'undefined' && typeof GIVEN_NAMES_SORTED !== 'undefined') {
        const surnameHash = getDictionaryHash(SURNAME_NAMES_SORTED);
        const surnameCandidates = surnameHash.get(char) || [];

        for (const surname of surnameCandidates) {
          const surnameLen = matchNameWithSpaces(chars, i, surname);
          if (surnameLen > 0) {
            let spaceOffset = 0;
            const spaceRegex = /[\s\u3000\u00A0\u200B-\u200D\uFEFF]/;
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
                  const totalSourceLen = surname.length + given.length;
                  const totalMatchLen = surnameLen + spaceOffset + givenLen;

                  // Update bestMatch if this combinatorial name is longer
                  if (!bestMatch || totalSourceLen > bestMatch.sourceLength) {
                    bestMatch = {
                      type: 'combinatorial',
                      matchLen: totalMatchLen,
                      sourceLength: totalSourceLen,
                      surname: surname,
                      surnameLen: surnameLen,
                      spaceOffset: spaceOffset,
                      given: given,
                      givenLen: givenLen,
                      surnamePairs: SURNAME_READINGS[surname],
                      givenPairs: GIVEN_NAME_READINGS[given]
                    };
                  }
                  // Longest match for this surname
                  break;
                }
              }
            }
          }
        }
      }

      // Apply the best match found
      if (bestMatch) {
        if (bestMatch.type === 'standard') {
          const pairs = bestMatch.readings;
          if (Array.isArray(pairs) && Array.isArray(pairs[0])) {
            result += generateRubyWithSpaces(chars, i, bestMatch.matchLen, pairs);
          } else if (typeof pairs === 'string') {
            const pairArray = splitFurigana(bestMatch.word, pairs).map(p => [p.char, p.reading]);
            result += generateRubyWithSpaces(chars, i, bestMatch.matchLen, pairArray);
          } else {
            // bestMatch.readings could be an object if it came from something unexpected
            const pairArray = Array.isArray(pairs) ? pairs : [[bestMatch.word, pairs]];
            result += generateRubyWithSpaces(chars, i, bestMatch.matchLen, pairArray);
          }
          i += bestMatch.matchLen;
        } else if (bestMatch.type === 'combinatorial') {
          result += generateRubyWithSpaces(chars, i, bestMatch.surnameLen, bestMatch.surnamePairs);
          result += chars.slice(i + bestMatch.surnameLen, i + bestMatch.surnameLen + bestMatch.spaceOffset).join('');
          result += generateRubyWithSpaces(chars, i + bestMatch.surnameLen + bestMatch.spaceOffset, bestMatch.givenLen, bestMatch.givenPairs);
          i += bestMatch.matchLen;
        }
        matched = true;
      }

      // 3. Fallback: Single Kanji
      if (!matched) {
        const readings = typeof KANJI_READINGS !== 'undefined' ? KANJI_READINGS[char] : null;
        if (readings && readings.length > 0) {
          result += wrapInRuby(char, readings[0]);
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

function hasKanji(text) {
  return KANJI_ONLY_PATTERN.test(text);
}

function hasFuriganaPattern(text) {
  FURIGANA_PATTERN.lastIndex = 0;
  MIXED_FURIGANA_PATTERN.lastIndex = 0;
  return FURIGANA_PATTERN.test(text) || MIXED_FURIGANA_PATTERN.test(text);
}

// Process text node for bracket mode
function processTextNodeBracket(textNode) {
  const text = textNode.textContent;
  if (!hasFuriganaPattern(text)) return;

  const temp = document.createElement('span');
  temp.className = 'furigana-converted';
  temp.dataset.original = text;
  temp.dataset.mode = 'bracket';
  temp.innerHTML = convertToRuby(text);

  const parent = textNode.parentNode;
  if (parent) {
    parent.insertBefore(temp, textNode);
    parent.removeChild(textNode);
  }
}

// Process text node for auto mode
function processTextNodeAuto(textNode) {
  const text = textNode.textContent;
  if (!hasKanji(text)) return;

  const temp = document.createElement('span');
  temp.className = 'furigana-converted';
  temp.dataset.original = text;
  temp.dataset.mode = 'auto';
  temp.innerHTML = autoAnnotateText(text);

  const parent = textNode.parentNode;
  if (parent) {
    parent.insertBefore(temp, textNode);
    parent.removeChild(textNode);
  }
}

function walkTextNodes(element, mode, forceReprocess = false) {
  // Skip if already processed, unless force reprocess is set
  if (!forceReprocess && processedElements.has(element)) return;

  const skipTags = ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'RUBY', 'RT', 'RP'];
  if (skipTags.includes(element.tagName)) return;

  const checkFn = mode === 'auto' ? hasKanji : hasFuriganaPattern;
  const processFn = mode === 'auto' ? processTextNodeAuto : processTextNodeBracket;

  const textNodes = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (node.parentElement) {
        if (skipTags.includes(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.classList.contains('furigana-converted')) return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let node;
  while ((node = walker.nextNode())) {
    if (checkFn(node.textContent)) textNodes.push(node);
  }

  textNodes.forEach(processFn);
  processedElements.add(element);
}

function processPageContent() {
  if (currentMode === 'off') return;

  const checkFn = currentMode === 'auto' ? hasKanji : hasFuriganaPattern;

  document.querySelectorAll('p, span, div, li, td, th, h1, h2, h3, h4, h5, h6, a').forEach(el => {
    if (checkFn(el.textContent || '') && !processedElements.has(el)) {
      walkTextNodes(el, currentMode);
    }
  });
}

function revertFurigana() {
  document.querySelectorAll('.furigana-converted').forEach(el => {
    const original = el.dataset.original;
    if (original) {
      el.parentNode.insertBefore(document.createTextNode(original), el);
      el.parentNode.removeChild(el);
    }
  });
  // Reset processed elements set (WeakSet has no clear method)
  processedElements = new WeakSet();
}

function initObserver() {
  const observer = new MutationObserver((mutations) => {
    if (currentMode === 'off') return;

    const checkFn = currentMode === 'auto' ? hasKanji : hasFuriganaPattern;
    const nodesToProcess = new Set();

    for (const mutation of mutations) {
      // Handle added nodes (both elements and text nodes)
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Skip if it's our own converted element
            if (node.classList && node.classList.contains('furigana-converted')) continue;
            if (checkFn(node.textContent || '')) {
              nodesToProcess.add(node);
            }
          } else if (node.nodeType === Node.TEXT_NODE) {
            // Text node added - process its parent
            if (node.parentElement && checkFn(node.textContent || '')) {
              if (!node.parentElement.classList.contains('furigana-converted')) {
                nodesToProcess.add(node.parentElement);
              }
            }
          }
        }
      }
      // Handle text content changes (characterData)
      if (mutation.type === 'characterData') {
        const target = mutation.target;
        if (target.parentElement && checkFn(target.textContent || '')) {
          if (!target.parentElement.classList.contains('furigana-converted')) {
            nodesToProcess.add(target.parentElement);
          }
        }
      }
    }

    if (nodesToProcess.size > 0) {
      clearTimeout(window._furiganaTimeout);
      window._furiganaTimeout = setTimeout(() => {
        // Force reprocess these elements even if they were processed before
        nodesToProcess.forEach(el => {
          if (el && el.nodeType === Node.ELEMENT_NODE) {
            walkTextNodes(el, currentMode, true); // forceReprocess = true
          }
        });
      }, 100);
    }
  });

  // Observe childList, subtree, AND characterData for text changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'setMode') {
    const newMode = message.mode;

    // If changing mode, revert first then process with new mode
    if (newMode !== currentMode) {
      revertFurigana();
      currentMode = newMode;
      savedMode = newMode;
      isToggleActive = false; // Reset toggle state
      if (currentMode !== 'off') {
        processPageContent();
      }
    }
  }
  // Handle hotkey change
  if (message.action === 'setHotkey') {
    hotkeyKey = message.hotkey;
    if (message.hotkeyMode) {
      hotkeyMode = message.hotkeyMode;
    }
    isToggleActive = false; // Reset toggle state
    console.log('Furigana Converter: Hotkey changed to', hotkeyKey, 'mode:', hotkeyMode);
  }
  // Handle hotkey mode change
  if (message.action === 'setHotkeyMode') {
    hotkeyMode = message.hotkeyMode;
    isToggleActive = false; // Reset toggle state
    console.log('Furigana Converter: Hotkey mode changed to', hotkeyMode);
  }
  // Handle hotkey target change
  if (message.action === 'setHotkeyTarget') {
    hotkeyTarget = message.hotkeyTarget;
    isToggleActive = false; // Reset toggle state
    console.log('Furigana Converter: Hotkey target changed to', hotkeyTarget);
  }
  // Backward compatibility
  if (message.action === 'toggleFurigana') {
    currentMode = message.enabled ? 'bracket' : 'off';
    currentMode !== 'off' ? processPageContent() : revertFurigana();
  }
});

function init() {
  console.log('Furigana Converter: Initializing...');
  chrome.storage.sync.get(['furiganaMode', 'furiganaEnabled', 'hotkeyKey', 'hotkeyMode', 'hotkeyTarget'], (result) => {
    // Support new mode or fallback to old enabled flag
    if (result.furiganaMode) {
      currentMode = result.furiganaMode;
    } else if (result.furiganaEnabled === false) {
      currentMode = 'off';
    } else {
      currentMode = 'bracket';
    }
    savedMode = currentMode;

    // Load hotkey settings
    if (result.hotkeyKey) {
      hotkeyKey = result.hotkeyKey;
    }
    if (result.hotkeyMode) {
      hotkeyMode = result.hotkeyMode;
    }
    if (result.hotkeyTarget) {
      hotkeyTarget = result.hotkeyTarget;
    }

    if (currentMode !== 'off') {
      processPageContent();
    }
    initObserver();
    initHotkeyListener();
    console.log('Furigana Converter: Ready, mode:', currentMode, ', hotkey:', hotkeyKey, ', hotkeyMode:', hotkeyMode, ', hotkeyTarget:', hotkeyTarget);
  });
}

// Hotkey feature (hold or toggle)
// Only works when main mode is 'off'
function initHotkeyListener() {
  document.addEventListener('keydown', (e) => {
    if (hotkeyKey === 'disabled' || e.key !== hotkeyKey) return;
    // Hotkey only works when main mode is 'off'
    if (savedMode !== 'off' && !isHotkeyHeld && !isToggleActive) return;

    if (hotkeyMode === 'hold') {
      // Hold mode: show on keydown
      if (!isHotkeyHeld) {
        isHotkeyHeld = true;
        savedMode = currentMode;
        revertFurigana();
        currentMode = hotkeyTarget; // Use configured target mode
        processPageContent();
      }
    } else if (hotkeyMode === 'toggle') {
      // Toggle mode: toggle on keydown (only once per keypress)
      if (!isHotkeyHeld) {
        isHotkeyHeld = true; // Prevent repeat
        if (isToggleActive) {
          // Turn off
          isToggleActive = false;
          revertFurigana();
          currentMode = savedMode;
          if (currentMode !== 'off') {
            processPageContent();
          }
        } else {
          // Turn on
          isToggleActive = true;
          savedMode = currentMode;
          revertFurigana();
          currentMode = hotkeyTarget; // Use configured target mode
          processPageContent();
        }
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key !== hotkeyKey) return;

    if (hotkeyMode === 'hold' && isHotkeyHeld) {
      // Hold mode: revert on keyup
      isHotkeyHeld = false;
      revertFurigana();
      currentMode = savedMode;
      if (currentMode !== 'off') {
        processPageContent();
      }
    } else if (hotkeyMode === 'toggle') {
      // Toggle mode: just reset the keydown flag
      isHotkeyHeld = false;
    }
  });

  // Handle blur (e.g., user switches tab while holding key)
  window.addEventListener('blur', () => {
    if (hotkeyMode === 'hold' && isHotkeyHeld) {
      isHotkeyHeld = false;
      revertFurigana();
      currentMode = savedMode;
      if (currentMode !== 'off') {
        processPageContent();
      }
    }
  });
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();

