
const fs = require('fs');
const content = fs.readFileSync('core_dict.js', 'utf8');
const match = content.match(/"大変":\[\[.*?\]\]/);
if (match) {
    console.log(match[0]);
} else {
    console.log("NOT FOUND");
}
