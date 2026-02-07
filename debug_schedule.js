const Database = require('better-sqlite3');
const db = new Database('university.db');

console.log("--- Users & Programs ---");
const students = db.prepare('SELECT student_id, name, course FROM Students').all();
console.table(students);

const users = db.prepare('SELECT user_id, username, role, related_id FROM Users').all();
console.table(users);

console.log("\n--- Classes & Programs ---");
const classes = db.prepare('SELECT class_id, course_name, day, time_slot, status, program FROM Classes').all();
console.table(classes);

console.log("\n--- Testing Schedule Query for Student ID 1 ---");
try {
    const student = db.prepare('SELECT course FROM Students WHERE student_id = ?').get(1);
    if (student) {
        console.log(`Student 1 Course: ${student.course}`);
        const schedule = db.prepare('SELECT * FROM Classes WHERE program = ?').all(student.course);
        console.table(schedule);
    } else {
        console.log("Student 1 not found");
    }
} catch (e) {
    console.error(e);
}
