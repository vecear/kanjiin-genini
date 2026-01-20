
const fs = require('fs');

// Mock dictionaries
const KANJI_READINGS = {
    '大': ['だい', 'たい'],
    '変': ['へん']
};
const CORE_NAMES_SORTED = ["大変", "日本海", "お住まい"];
const CORE_READINGS = {
    "大変": [["大", "たい"], ["変", "へん"]],
    "日本海": [["日本海", "にほんかい"]],
    "お住まい": [["お", ""], ["住", "す"], ["まい", ""]]
};

// Functions from content.js
function matchNameWithSpaces(textChars, startIndex, name) {
    const nameChars = [...name];
    let tIdx = startIndex;
    let nIdx = 0;
    const spaceRegex = /[\s\u3000\u00A0\u200B-\u200D\uFEFF]/;

    while (nIdx < nameChars.length && tIdx < textChars.length) {
        const tChar = textChars[tIdx];
        if (spaceRegex.test(tChar)) {
            tIdx++;
            continue;
        }
        if (tChar !== nameChars[nIdx]) {
            return 0;
        }
        tIdx++;
        nIdx++;
    }
    if (nIdx === nameChars.length) {
        return tIdx - startIndex;
    }
    return 0;
}

const dictionaryHashes = new Map();
function getDictionaryHash(nameList) {
    if (dictionaryHashes.has(nameList)) return dictionaryHashes.get(nameList);
    const hash = new Map();
    for (const word of nameList) {
        const firstChar = word[0];
        if (!hash.has(firstChar)) hash.set(firstChar, []);
        hash.set(firstChar, [...hash.get(firstChar), word]);
    }
    dictionaryHashes.set(nameList, hash);
    return hash;
}

function generateRubyWithSpaces(textChars, startIndex, matchLen, readingPairs) {
    let result = '';
    let tIdx = startIndex;
    let pIdx = 0;
    const endIdx = startIndex + matchLen;
    const spaceRegex = /[\s\u3000\u00A0\u200B-\u200D\uFEFF]/;

    while (tIdx < endIdx) {
        const char = textChars[tIdx];
        if (spaceRegex.test(char)) {
            result += char;
            tIdx++;
            continue;
        }
        if (pIdx < readingPairs.length) {
            const pair = readingPairs[pIdx];
            result += `<ruby>${char}<rp>(</rp><rt>${pair[1]}</rt><rp>)</rp></ruby>`;
            pIdx++;
        } else {
            result += char;
        }
        tIdx++;
    }
    return result;
}

const KANJI_ONLY_PATTERN = /[\u4E00-\u9FAF]/;

function autoAnnotateText(text) {
    let result = '';
    let i = 0;
    const chars = [...text];
    const dictionaries = [
        { names: [], readings: {}, type: 'standard' },
        { names: [], readings: {}, type: 'standard' },
        { names: [], readings: {}, type: 'standard' },
        { names: CORE_NAMES_SORTED, readings: CORE_READINGS, type: 'standard' },
        { names: [], readings: {}, type: 'standard' }
    ];

    while (i < chars.length) {
        const char = chars[i];
        if (KANJI_ONLY_PATTERN.test(char)) {
            let matched = false;
            for (const dict of dictionaries) {
                if (!dict.names || dict.names.length === 0) continue;
                const hash = getDictionaryHash(dict.names);
                const candidates = hash.get(char) || [];
                for (const word of candidates) {
                    const matchLen = matchNameWithSpaces(chars, i, word);
                    if (matchLen > 0) {
                        const pairs = dict.readings[word];
                        result += generateRubyWithSpaces(chars, i, matchLen, pairs);
                        i += matchLen;
                        matched = true;
                        break;
                    }
                }
                if (matched) break;
            }
            if (!matched) {
                const readings = KANJI_READINGS[char];
                if (readings && readings.length > 0) {
                    result += `<ruby>${char}<rp>(</rp><rt>${readings[0]}</rt><rp>)</rp></ruby>`;
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

const text = "日本海側にお住まいの方は 「大変だ」 と思います。";
console.log("Input:", text);
console.log("Output:", autoAnnotateText(text));
