
// Mock Global Data
const CONJUGATED_READINGS = {
    "食べました": [["食", "た"], ["べました", ""]],
    "美しかった": [["美", "うつく"], ["しかった", ""]]
};
const CONJUGATED_NAMES_SORTED = ["食べました", "美しかった"];

const KANJI_ONLY_PATTERN = /[\u4E00-\u9FAF]/;
const PLACE_NAMES_SORTED = [];
const PLACE_READINGS = {};
const NAME_NAMES_SORTED = [];
const NAME_READINGS = {};
const COMMON_NAMES_SORTED = [];
const COMMON_READINGS = {};
const CORE_NAMES_SORTED = [];
const CORE_READINGS = {};
const SURNAME_NAMES_SORTED = [];
const GIVEN_NAMES_SORTED = [];

// Helper functions (Simplified)
function matchNameWithSpaces(textChars, name) {
    const nameChars = [...name];
    let tIdx = 0; let nIdx = 0;
    const spaceRegex = /[\s\u3000\u00A0\u200B-\u200D\uFEFF]/;
    while (nIdx < nameChars.length && tIdx < textChars.length) {
        if (spaceRegex.test(textChars[tIdx])) { tIdx++; continue; }
        if (textChars[tIdx] !== nameChars[nIdx]) return 0;
        tIdx++; nIdx++;
    }
    return (nIdx === nameChars.length) ? tIdx : 0;
}

function generateRubyWithSpaces(originalText, readingPairs) {
    let result = '';
    let tIdx = 0;
    let pIdx = 0;
    const textChars = [...originalText];
    const spaceRegex = /[\s\u3000\u00A0\u200B-\u200D\uFEFF]/;
    while (tIdx < textChars.length) {
        if (spaceRegex.test(textChars[tIdx])) { result += textChars[tIdx]; tIdx++; continue; }
        if (pIdx < readingPairs.length) {
            const pair = readingPairs[pIdx];
            const reading = pair[1];
            result += `<ruby>${textChars[tIdx]}<rt>${reading}</rt></ruby>`;
            pIdx++;
        } else {
            result += textChars[tIdx];
        }
        tIdx++;
    }
    return result;
}

function autoAnnotateText(text) {
    let result = '';
    let i = 0;
    const chars = [...text];
    const dictionaries = [
        { names: CONJUGATED_NAMES_SORTED, readings: CONJUGATED_READINGS, type: 'standard' }
    ];

    while (i < chars.length) {
        const char = chars[i];
        if (KANJI_ONLY_PATTERN.test(char)) {
            let matched = false;
            const remainingChars = chars.slice(i);
            for (const dict of dictionaries) {
                for (const word of dict.names) {
                    const matchLen = matchNameWithSpaces(remainingChars, word);
                    if (matchLen > 0) {
                        const pairs = dict.readings[word];
                        result += generateRubyWithSpaces(remainingChars.slice(0, matchLen).join(''), pairs);
                        i += matchLen;
                        matched = true;
                        break;
                    }
                }
                if (matched) break;
            }
            if (!matched) { result += char; i++; }
        } else {
            result += char; i++;
        }
    }
    return result;
}

console.log("--- START CONJUGATION TEST ---");
const test1 = autoAnnotateText("ご飯をたべました"); // Hiragana
const test2 = autoAnnotateText("ご飯を食 べました"); // Spaced
const test3 = autoAnnotateText("景色は美しかった");

console.log("Test 1 (Hiragana only should skip dictionary):", test1);
console.log("Test 2 (Spaced Kanji):", test2);
console.log("Test 3 (Adjective):", test3);

if (test2.includes("ruby") && test3.includes("ruby")) {
    console.log("ALL PASS");
} else {
    console.log("FAIL");
}
