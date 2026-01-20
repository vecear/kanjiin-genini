
const fs = require('fs');

// Mock Data from dictionaries
const CORE_READINGS = JSON.parse(fs.readFileSync('core_dict.js', 'utf8').match(/const CORE_READINGS = (\{.*?\});/)[1]);
const CORE_NAMES_SORTED = JSON.parse(fs.readFileSync('core_dict.js', 'utf8').match(/const CORE_NAMES_SORTED = (\[.*?\]);/)[1]);

const dictionaries = [
    { names: [], readings: {}, type: 'place' },
    { names: [], readings: {}, type: 'name' },
    { names: [], readings: {}, type: 'common' },
    { names: CORE_NAMES_SORTED, readings: CORE_READINGS, type: 'core' }
];

// Helper functions (Simplified from content.js)
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

function autoAnnotateText(text) {
    let result = '';
    let i = 0;
    const chars = [...text];
    while (i < chars.length) {
        const char = chars[i];
        if (/[\u4E00-\u9FAF]/.test(char)) {
            let matched = false;
            const remainingChars = chars.slice(i);
            for (const dict of dictionaries) {
                for (const word of dict.names.slice(0, 10000)) { // Limit for speed in test
                    // Actually, we need to search specifically for "大変"
                    if (word === "大変" || word.startsWith("大変")) {
                        const matchLen = matchNameWithSpaces(remainingChars, word);
                        if (matchLen > 0) {
                            result += `[MATCH:${word}]`;
                            i += matchLen;
                            matched = true;
                            break;
                        }
                    }
                }
                if (matched) break;

                // Try direct find if not matched in first 10k
                const tryWord = "大変";
                const matchLen = matchNameWithSpaces(remainingChars, tryWord);
                if (matchLen > 0) {
                    result += `[MATCH:${tryWord}]`;
                    i += matchLen;
                    matched = true;
                    break;
                }
            }
            if (!matched) { result += char; i++; }
        } else {
            result += char; i++;
        }
    }
    return result;
}

console.log(autoAnnotateText("大変だと思います"));
