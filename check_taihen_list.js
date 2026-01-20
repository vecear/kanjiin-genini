
const fs = require('fs');
const content = fs.readFileSync('core_dict.js', 'utf8');
const sortedMatch = content.match(/const CORE_NAMES_SORTED = (\[.*?\]);/);
if (sortedMatch) {
    const sorted = JSON.parse(sortedMatch[1]);
    console.log("Includes 大変:", sorted.includes("大変"));
} else {
    console.log("CORE_NAMES_SORTED NOT FOUND");
}
