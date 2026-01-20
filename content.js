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
  const chars = [...word];
  const furiganaChars = [...katakanaToHiragana(furigana)];

  // Step 1: Find all kana sequences in the word and their positions
  // This creates "anchors" that we can use to align with furigana
  const segments = []; // { type: 'kanji'|'kana', start, end, text }
  let segStart = 0;

  for (let i = 0; i <= chars.length; i++) {
    const isEnd = i === chars.length;
    const currIsKana = !isEnd && (isHiragana(chars[i]) || isKatakana(chars[i]));
    const prevIsKana = i > 0 && (isHiragana(chars[i - 1]) || isKatakana(chars[i - 1]));

    if (isEnd || (currIsKana !== prevIsKana && i > 0)) {
      if (i > segStart) {
        const text = chars.slice(segStart, i).join('');
        segments.push({
          type: prevIsKana ? 'kana' : 'kanji',
          start: segStart,
          end: i,
          text: text,
          hiragana: katakanaToHiragana(text)
        });
      }
      segStart = i;
    }
  }

  // Step 2: Find where each kana segment appears in the furigana
  // Use these as anchors to determine kanji readings
  let furiganaPos = 0;
  const segmentReadings = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    if (seg.type === 'kana') {
      // Find this kana sequence in the furigana starting from current position
      const kanaHira = seg.hiragana;
      let foundPos = -1;

      // Search for the kana sequence in furigana
      for (let searchPos = furiganaPos; searchPos <= furiganaChars.length - kanaHira.length; searchPos++) {
        const candidate = furiganaChars.slice(searchPos, searchPos + kanaHira.length).join('');
        if (matchKanaSequence(candidate, kanaHira)) {
          foundPos = searchPos;
          break;
        }
      }

      if (foundPos !== -1) {
        // The kanji segment before this gets the reading from furiganaPos to foundPos
        if (i > 0 && segments[i - 1].type === 'kanji') {
          segmentReadings[i - 1] = furiganaChars.slice(furiganaPos, foundPos).join('');
        }
        segmentReadings[i] = null; // Kana doesn't need reading
        furiganaPos = foundPos + kanaHira.length;
      } else {
        // Couldn't find kana - this shouldn't happen with valid input
        segmentReadings[i] = null;
      }
    } else {
      // Kanji segment - reading will be determined by next kana anchor
      // For now, mark as pending
      segmentReadings[i] = 'pending';
    }
  }

  // Step 3: Handle any remaining kanji at the end (no kana anchor after it)
  for (let i = 0; i < segments.length; i++) {
    if (segmentReadings[i] === 'pending') {
      // This kanji segment has no kana after it
      // Give it all remaining furigana, or split with next kanji using dictionary
      const remainingFurigana = furiganaChars.slice(furiganaPos).join('');

      // Check if there are more kanji segments after this
      let nextKanjiIdx = -1;
      for (let j = i + 1; j < segments.length; j++) {
        if (segments[j].type === 'kanji') {
          nextKanjiIdx = j;
          break;
        }
      }

      if (nextKanjiIdx === -1) {
        // This is the last kanji segment - it gets all remaining furigana
        segmentReadings[i] = remainingFurigana;
        furiganaPos = furiganaChars.length;
      } else {
        // There's another kanji after - need to split
        // For now, use dictionary-based splitting for the kanji characters
        segmentReadings[i] = remainingFurigana; // Will be split later
      }
    }
  }

  // Step 4: Build the result
  let result = '';

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    if (seg.type === 'kana') {
      // Output kana as-is
      result += seg.text;
    } else {
      // Kanji segment - need to add ruby
      const reading = segmentReadings[i] || '';
      const kanjiChars = [...seg.text];

      if (kanjiChars.length === 1) {
        // Single kanji
        result += `<ruby>${kanjiChars[0]}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`;
      } else {
        // Multiple kanji - split the reading using dictionary
        const pairs = splitFurigana(seg.text, reading);
        result += pairs.map(({ char, reading: r }) =>
          `<ruby>${char}<rp>(</rp><rt>${r}</rt><rp>)</rp></ruby>`
        ).join('');
      }
    }
  }

  return result;
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
const KANJI_ONLY_PATTERN = /[\u4E00-\u9FAF]/;

// Auto-annotate text by adding furigana to all kanji using dictionary
// Priority: place names > compound words > single kanji
function autoAnnotateText(text) {
  let result = '';
  let i = 0;
  const chars = [...text];
  const textLength = chars.length;

  while (i < textLength) {
    const char = chars[i];

    // Check if it's a kanji
    if (KANJI_ONLY_PATTERN.test(char)) {
      // Try to match place names first (longest match wins)
      let matched = false;

      if (typeof PLACE_NAMES_SORTED !== 'undefined' && typeof PLACE_READINGS !== 'undefined') {
        const remainingText = chars.slice(i).join('');

        for (const placeName of PLACE_NAMES_SORTED) {
          if (remainingText.startsWith(placeName)) {
            const fullReading = PLACE_READINGS[placeName];
            const pairs = splitFurigana(placeName, fullReading);
            result += pairs.map(({ char, reading }) =>
              `<ruby>${char}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`
            ).join('');
            i += [...placeName].length;
            matched = true;
            break;
          }
        }
      }

      // Try to match person names (newly added)
      if (!matched && typeof NAME_NAMES_SORTED !== 'undefined' && typeof NAME_READINGS !== 'undefined') {
        const remainingText = chars.slice(i).join('');

        for (const name of NAME_NAMES_SORTED) {
          if (remainingText.startsWith(name)) {
            const pairs = NAME_READINGS[name];
            // Format is [[ruby, rt], ...]
            result += pairs.map(([char, reading]) =>
              `<ruby>${char}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`
            ).join('');
            i += [...name].length;
            matched = true;
            break;
          }
        }
      }

      // Try to match common words next
      if (!matched && typeof COMMON_NAMES_SORTED !== 'undefined' && typeof COMMON_READINGS !== 'undefined') {
        const remainingText = chars.slice(i).join('');

        for (const word of COMMON_NAMES_SORTED) {
          if (remainingText.startsWith(word)) {
            const fullReading = COMMON_READINGS[word];
            const pairs = splitFurigana(word, fullReading);
            result += pairs.map(({ char, reading }) =>
              `<ruby>${char}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`
            ).join('');
            i += [...word].length;
            matched = true;
            break;
          }
        }
      }

      // Try to match core vocabulary next (uses pre-split pairs)
      if (!matched && typeof CORE_NAMES_SORTED !== 'undefined' && typeof CORE_READINGS !== 'undefined') {
        const remainingText = chars.slice(i).join('');

        for (const word of CORE_NAMES_SORTED) {
          if (remainingText.startsWith(word)) {
            const pairs = CORE_READINGS[word];
            // Format is [[ruby, rt], ...]
            result += pairs.map(([char, reading]) =>
              `<ruby>${char}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`
            ).join('');
            i += [...word].length;
            matched = true;
            break;
          }
        }
      }

      // If no match, use single kanji dictionary
      if (!matched) {
        const readings = typeof KANJI_READINGS !== 'undefined' ? KANJI_READINGS[char] : null;
        if (readings && readings.length > 0) {
          // Use first reading (most common)
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

// Check if text contains any kanji
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

