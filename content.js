// Regex to match kanji/numbers followed by furigana in parentheses (excludes katakana)
const FURIGANA_PATTERN = /([\u4E00-\u9FAF0-9０-９]+)[\s\u3000]*[（(][\s\u3000]*([\u3040-\u309F\u30A0-\u30FF]+)[\s\u3000]*[）)]/g;

// Track processed elements
let processedElements = new WeakSet();
let currentMode = 'bracket'; // 'off', 'bracket', 'auto'
let savedMode = 'bracket';   // Mode to restore after releasing hotkey
let isHotkeyHeld = false;
let isToggleActive = false;  // For toggle mode
let hotkeyKey = 'disabled';  // Default hotkey (disabled)
let hotkeyMode = 'hold';     // 'hold' or 'toggle'

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
  return text.replace(FURIGANA_PATTERN, (match, chars, furigana) => {
    const pairs = splitFurigana(chars, furigana);
    return pairs.map(({ char, reading }) =>
      `<ruby>${char}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`
    ).join('');
  });
}

// Kanji Unicode range regex
const KANJI_ONLY_PATTERN = /[\u4E00-\u9FAF]/;

// Auto-annotate text by adding furigana to all kanji using dictionary
function autoAnnotateText(text) {
  let result = '';
  const chars = [...text];

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    // Check if it's a kanji
    if (KANJI_ONLY_PATTERN.test(char)) {
      const readings = typeof KANJI_READINGS !== 'undefined' ? KANJI_READINGS[char] : null;
      if (readings && readings.length > 0) {
        // Use first reading (most common)
        const reading = readings[0];
        result += `<ruby>${char}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`;
      } else {
        result += char;
      }
    } else {
      result += char;
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
  return FURIGANA_PATTERN.test(text);
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

function walkTextNodes(element, mode) {
  if (processedElements.has(element)) return;

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
    let shouldProcess = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && checkFn(node.textContent || '')) {
            shouldProcess = true;
            break;
          }
        }
      }
      if (shouldProcess) break;
    }
    if (shouldProcess) {
      clearTimeout(window._furiganaTimeout);
      window._furiganaTimeout = setTimeout(processPageContent, 100);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
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
  // Backward compatibility
  if (message.action === 'toggleFurigana') {
    currentMode = message.enabled ? 'bracket' : 'off';
    currentMode !== 'off' ? processPageContent() : revertFurigana();
  }
});

function init() {
  console.log('Furigana Converter: Initializing...');
  chrome.storage.sync.get(['furiganaMode', 'furiganaEnabled', 'hotkeyKey'], (result) => {
    // Support new mode or fallback to old enabled flag
    if (result.furiganaMode) {
      currentMode = result.furiganaMode;
    } else if (result.furiganaEnabled === false) {
      currentMode = 'off';
    } else {
      currentMode = 'bracket';
    }
    savedMode = currentMode;

    // Load hotkey setting
    if (result.hotkeyKey) {
      hotkeyKey = result.hotkeyKey;
    }

    if (currentMode !== 'off') {
      processPageContent();
    }
    initObserver();
    initHotkeyListener();
    console.log('Furigana Converter: Ready, mode:', currentMode, ', hotkey:', hotkeyKey);
  });
}

// Hotkey hold-to-show feature
function initHotkeyListener() {
  document.addEventListener('keydown', (e) => {
    if (hotkeyKey !== 'disabled' && e.key === hotkeyKey && !isHotkeyHeld && currentMode !== 'auto') {
      isHotkeyHeld = true;
      savedMode = currentMode;
      revertFurigana();
      currentMode = 'auto';
      processPageContent();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === hotkeyKey && isHotkeyHeld) {
      isHotkeyHeld = false;
      revertFurigana();
      currentMode = savedMode;
      if (currentMode !== 'off') {
        processPageContent();
      }
    }
  });

  // Handle blur (e.g., user switches tab while holding key)
  window.addEventListener('blur', () => {
    if (isHotkeyHeld) {
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

