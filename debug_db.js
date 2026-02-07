const Database = require('better-sqlite3');
const db = new Database('university.db');

console.log("--- Existing Classes ---");
try {
    const classes = db.prepare('SELECT * FROM Classes').all();
    console.table(classes);
} catch (e) {
    console.log("No classes found or error:", e.message);
}

console.log("\n--- Venues ---");
try {
    const venues = db.prepare('SELECT * FROM Venues').all();
    console.table(venues);
} catch (e) {
    console.log("Error reading venues:", e.message);
}
