
const fs = require('fs');
const content = fs.readFileSync('core_dict.js', 'utf8');
const lines = content.split('\n');
console.log("LAST LINE LENGTH:", lines[lines.length - 1].length);
console.log("LAST LINE PREVIEW:", lines[lines.length - 1].substring(0, 100));

// Find the line that defines CORE_NAMES_SORTED
const sortedMatch = content.match(/const CORE_NAMES_SORTED = (\[.*?\]);/);
if (sortedMatch) {
    const sorted = JSON.parse(sortedMatch[1]);
    console.log("First 5:", sorted.slice(0, 5));
    console.log("Last 5:", sorted.slice(-5));

    // Check if sorted by length descending
    let isSorted = true;
    for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].length < sorted[i + 1].length) {
            isSorted = false;
            console.log(`Broke at index ${i}: ${sorted[i]} vs ${sorted[i + 1]}`);
            break;
        }
    }
    console.log("Is Sorted by Length Descending:", isSorted);
} else {
    console.log("CORE_NAMES_SORTED NOT FOUND");
}
