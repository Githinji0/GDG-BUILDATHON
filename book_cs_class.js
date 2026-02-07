const Database = require('better-sqlite3');
const db = new Database('university.db');

console.log("--- Booking a CS Class ---");
try {
    const stmt = db.prepare(`
        INSERT INTO Classes (course_name, lecturer_id, venue_id, day, time_slot, status, program)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    // Book Intro to CS for CS program
    stmt.run('Intro to CS', 1, 1, 'Monday', '10:00-12:00', 'booked', 'CS');
    console.log("Booked 'Intro to CS' for 'CS' program.");
} catch (e) {
    console.error("Booking failed:", e.message);
}

console.log("\n--- Verifying Schedule for Student 1 (CS) ---");
const schedule = db.prepare('SELECT * FROM Classes WHERE program = ?').all('CS');
console.table(schedule);
