
const fs = require('fs');
const files = ['place_dict.js', 'name_dict.js'];
files.forEach(f => {
    if (!fs.existsSync(f)) return;
    const content = fs.readFileSync(f, 'utf8');
    const sortedMatch = content.match(/const (?:PLACE|NAME|SURNAME|GIVEN)_NAMES_SORTED = (\[.*?\]);/g);
    if (sortedMatch) {
        sortedMatch.forEach(m => {
            const listName = m.split(' = ')[0].split(' ').pop();
            const list = JSON.parse(m.split(' = ')[1].replace(';', ''));
            if (list.includes("大")) {
                console.log(`Includes "大" in ${listName}`);
            }
            if (list.includes("変")) {
                console.log(`Includes "変" in ${listName}`);
            }
        });
    }
});
