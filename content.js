// Regex to match kanji followed by furigana in parentheses
// Matches: 漢字（ひらがな）, 漢字(ひらがな), 漢字 （ひらがな）, 漢字 ( ひらがな ) etc.
// Kanji range: \u4E00-\u9FAF (CJK Unified Ideographs)
// Hiragana range: \u3040-\u309F
// \s* matches optional whitespace, \u3000 is full-width space
const FURIGANA_PATTERN = /([\u4E00-\u9FAF]+)[\s\u3000]*[（(][\s\u3000]*([\u3040-\u309F]+)[\s\u3000]*[）)]/g;

// Track processed elements to avoid reprocessing
const processedElements = new WeakSet();

// Store original text content for reverting
const originalContents = new WeakMap();

// Global enabled state
let isEnabled = true;

/**
 * Convert text with furigana pattern to ruby HTML
 */
function convertToRuby(text) {
  return text.replace(FURIGANA_PATTERN, (match, kanji, furigana) => {
    return `<ruby>${kanji}<rp>(</rp><rt>${furigana}</rt><rp>)</rp></ruby>`;
  });
}

/**
 * Check if text contains furigana pattern
 */
function hasFuriganaPattern(text) {
  FURIGANA_PATTERN.lastIndex = 0;
  return FURIGANA_PATTERN.test(text);
}

/**
 * Process a single text node
 */
function processTextNode(textNode) {
  const text = textNode.textContent;

  if (!hasFuriganaPattern(text)) {
    return;
  }

  // Create a temporary container to parse the HTML
  const temp = document.createElement('span');
  temp.className = 'furigana-converted';
  temp.dataset.original = text;
  temp.innerHTML = convertToRuby(text);

  // Replace the text node with the new content
  const parent = textNode.parentNode;
  if (parent) {
    parent.insertBefore(temp, textNode);
    parent.removeChild(textNode);
  }
}

/**
 * Walk through all text nodes in an element
 */
function walkTextNodes(element) {
  if (processedElements.has(element)) {
    return;
  }

  // Skip script, style, textarea, input elements
  const skipTags = ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'RUBY', 'RT', 'RP'];
  if (skipTags.includes(element.tagName)) {
    return;
  }

  // Collect text nodes first (to avoid modifying while iterating)
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip if parent is already a ruby element or converted span
        if (node.parentElement) {
          if (skipTags.includes(node.parentElement.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.parentElement.classList.contains('furigana-converted')) {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let node;
  while ((node = walker.nextNode())) {
    if (hasFuriganaPattern(node.textContent)) {
      textNodes.push(node);
    }
  }

  // Process collected text nodes
  textNodes.forEach(processTextNode);

  processedElements.add(element);
}

/**
 * Process all message containers in Gemini
 */
function processGeminiMessages() {
  if (!isEnabled) return;

  // Gemini response containers - these selectors might need adjustment
  const selectors = [
    '.message-content',
    '.model-response-text',
    '[data-message-author-role="model"]',
    '.markdown-main-panel',
    'message-content',
    '.response-container'
  ];

  // Try multiple selectors and also process the main content area
  const contentArea = document.querySelector('main') || document.body;

  // Process elements matching our selectors
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      if (!processedElements.has(el)) {
        walkTextNodes(el);
      }
    });
  });

  // Also process any paragraph or span that might contain Japanese text
  document.querySelectorAll('p, span, div, li').forEach(el => {
    const text = el.textContent || '';
    if (hasFuriganaPattern(text) && !processedElements.has(el)) {
      walkTextNodes(el);
    }
  });
}

/**
 * Revert all converted elements back to original text
 */
function revertFurigana() {
  document.querySelectorAll('.furigana-converted').forEach(el => {
    const original = el.dataset.original;
    if (original) {
      const textNode = document.createTextNode(original);
      el.parentNode.insertBefore(textNode, el);
      el.parentNode.removeChild(el);
    }
  });
  // Clear the WeakSet by creating a new one
  processedElements.delete = () => { };
}

/**
 * Initialize the observer to watch for new content
 */
function initObserver() {
  const observer = new MutationObserver((mutations) => {
    if (!isEnabled) return;

    let shouldProcess = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const text = node.textContent || '';
            if (hasFuriganaPattern(text)) {
              shouldProcess = true;
              break;
            }
          }
        }
      }
      if (shouldProcess) break;
    }

    if (shouldProcess) {
      // Debounce processing
      clearTimeout(window._furiganaTimeout);
      window._furiganaTimeout = setTimeout(processGeminiMessages, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleFurigana') {
    isEnabled = message.enabled;
    if (isEnabled) {
      processGeminiMessages();
    } else {
      revertFurigana();
    }
  }
});

// Run on page load
function init() {
  console.log('Furigana Converter: Initializing...');

  // Load saved state
  chrome.storage.sync.get(['furiganaEnabled'], (result) => {
    isEnabled = result.furiganaEnabled !== false;
    if (isEnabled) {
      processGeminiMessages();
    }
    initObserver();
    console.log('Furigana Converter: Ready, enabled:', isEnabled);
  });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
