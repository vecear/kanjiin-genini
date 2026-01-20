
const fs = require('fs');
const content = fs.readFileSync('core_dict.js', 'utf8');
const sortedMatch = content.match(/const CORE_NAMES_SORTED = (\[.*?\]);/);
if (sortedMatch) {
    const sorted = JSON.parse(sortedMatch[1]);
    const index = sorted.indexOf("大変");
    console.log("Index of 大変:", index);
    console.log("Surrounding:", sorted.slice(index - 5, index + 5));
}
