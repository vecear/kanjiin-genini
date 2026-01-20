
// Mock Global Data
const NAME_READINGS = {
    "菅田将暉": [["菅", "す"], ["田", "だ"], ["将", "まさ"], ["暉", "き"]]
};
const NAME_NAMES_SORTED = ["菅田将暉"];

const SURNAME_READINGS = { "菅田": [["菅", "す"], ["田", "だ"]] };
const SURNAME_NAMES_SORTED = ["菅田"];

const GIVEN_NAME_READINGS = { "将暉": [["将", "まさ"], ["暉", "き"]] };
const GIVEN_NAMES_SORTED = ["将暉"]; // Assume "Masaki" is a common given name

const PLACE_READINGS = { "東京": "とうきょう" }; // String format for place
const PLACE_NAMES_SORTED = ["東京"];

const COMMON_READINGS = {};
const COMMON_NAMES_SORTED = [];

const CORE_READINGS = {};
const CORE_NAMES_SORTED = [];

// Mock optional split helper (needed for Place names string format)
function splitFurigana(text, reading) {
    // Simple dummy implementation for test
    if (text === "東京") return [{ char: "東", reading: "とう" }, { char: "京", reading: "きょう" }];
    return [];
}

const KANJI_ONLY_PATTERN = /[\u4E00-\u9FAF]/;

// Helper constants - we need these to be defined if we copy-pasted only the function
// But matchNameWithSpaces and generateRubyWithSpaces are in content.js.
// We should probably just load content.js in node if possible, or copy them again.
// Let's copy them for safety in this standalone script.

function matchNameWithSpaces(textChars, name) {
    const nameChars = [...name];
    let tIdx = 0; // index in textChars
    let nIdx = 0; // index in nameChars
    const spaceRegex = /[\s\u3000\u00A0]/; // Include non-breaking space

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
        return tIdx;
    }

    return 0;
}

function generateRubyWithSpaces(originalText, readingPairs) {
    let result = '';
    let tIdx = 0;
    let pIdx = 0;
    const textChars = [...originalText];
    const spaceRegex = /[\s\u3000\u00A0]/;

    while (tIdx < textChars.length) {
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
            // pair is [char, reading]
            // We assume text matches dictionary at this point (verified by matchNameWithSpaces)
            const reading = pair[1];
            result += `<ruby>${char}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`;
            pIdx++;
        } else {
            // Should not happen if matched correctly, but fallback
            result += char;
        }
        tIdx++;
    }

    return result;
}

// PASTE autoAnnotateText logic here (or include via require if we could)
// Copy-pasting the updated logic for testing
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
        // ... skipping others for simplicity in test
    ];

    while (i < chars.length) {
        const char = chars[i];

        if (KANJI_ONLY_PATTERN.test(char)) {
            let matched = false;
            const remainingChars = chars.slice(i);

            // 1. Try Standard Dictionaries (Place, Name, Common, Core)
            for (const dict of dictionaries) {
                if (!dict.names || dict.names.length === 0) continue;

                for (const word of dict.names) {
                    const matchLen = matchNameWithSpaces(remainingChars, word);

                    if (matchLen > 0) {
                        const pairs = dict.readings[word];
                        const originalSegment = remainingChars.slice(0, matchLen).join('');

                        if (Array.isArray(pairs) && Array.isArray(pairs[0])) {
                            result += generateRubyWithSpaces(originalSegment, pairs);
                        } else {
                            if (typeof pairs === 'string') {
                                const splitPairs = splitFurigana(word, pairs);
                                const pairArray = splitPairs.map(p => [p.char, p.reading]);
                                result += generateRubyWithSpaces(originalSegment, pairArray);
                            } else {
                                result += generateRubyWithSpaces(originalSegment, pairs);
                            }
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

                for (const surname of SURNAME_NAMES_SORTED) {
                    const surnameLen = matchNameWithSpaces(remainingChars, surname);
                    if (surnameLen > 0) {
                        const afterSurnameChars = remainingChars.slice(surnameLen);
                        let spaceOffset = 0;
                        const spaceRegex = /[\s\u3000\u00A0]/;
                        while (spaceOffset < afterSurnameChars.length && spaceRegex.test(afterSurnameChars[spaceOffset])) {
                            spaceOffset++;
                        }

                        const afterSpaceChars = afterSurnameChars.slice(spaceOffset);

                        for (const given of GIVEN_NAMES_SORTED) {
                            const givenLen = matchNameWithSpaces(afterSpaceChars, given);
                            if (givenLen > 0) {
                                const surnamePairs = SURNAME_READINGS[surname];
                                const givenPairs = GIVEN_NAME_READINGS[given];

                                const surnameSegment = remainingChars.slice(0, surnameLen).join('');
                                result += generateRubyWithSpaces(surnameSegment, surnamePairs);

                                const spacerSegment = afterSurnameChars.slice(0, spaceOffset).join('');
                                result += spacerSegment;

                                const givenSegment = afterSpaceChars.slice(0, givenLen).join('');
                                result += generateRubyWithSpaces(givenSegment, givenPairs);

                                i += surnameLen + spaceOffset + givenLen;
                                matched = true;
                                break;
                            }
                        }
                    }
                    if (matched) break;
                }
            }

            if (!matched) {
                result += char; // Simplified fallback for test
                i++;
            }
        } else {
            result += char;
            i++;
        }
    }

    return result;
}

// Test Function
function test(label, input, expectedParts) {
    console.log(`Running test: ${label}`);
    const output = autoAnnotateText(input);
    let pass = true;
    for (const part of expectedParts) {
        if (!output.includes(part)) {
            console.log(`  MISSING: ${part}`);
            console.log(`  OUTPUT: ${output}`);
            pass = false;
        }
    }
    if (pass) console.log("  PASS");
    else console.log("  FAIL");
}

console.log("--- START GLOBAL SMART TESTS ---");
test("Full Name (Legacy)", "菅田将暉 is cool", ["<ruby>菅", "<ruby>暉"]);
test("Place Name with Spaces", "住まいは東　京です", ["<ruby>東", "　", "<ruby>京"]);
test("Combinatorial Name with NBSP", "菅田\u00A0将暉さん", ["<ruby>菅", "\u00A0", "<ruby>将"]); 
