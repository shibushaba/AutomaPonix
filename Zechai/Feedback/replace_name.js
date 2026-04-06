const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (!file.includes('node_modules') && (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.sql'))) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');
files.push('./index.html');
files.push('./v3-migration.sql');
files.push('./supabase-schema.sql');

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content
        .replace(/Zechai/g, 'Revumate')
        .replace(/ZECHAI/g, 'REVUMATE')
        .replace(/zechai/g, 'revumate');
    
    if (file.endsWith('index.html')) {
        newContent = newContent.replace('<title>feedback</title>', '<title>Revumate</title>');
    }

    if (content !== newContent) {
         fs.writeFileSync(file, newContent, 'utf8');
         console.log('Updated: ' + file);
    }
});
