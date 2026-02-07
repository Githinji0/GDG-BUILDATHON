import { DB } from './db';
import { Venue, Lecturer, Student, Class, User } from './models';
import { Database } from 'better-sqlite3';
import bcrypt from 'bcryptjs';

export class UniversitySystem {
    private db: Database;

    constructor() {
        this.db = new DB().instance;
        this.seedUsers();
    }

    private seedUsers() {
        // Check if users exist
        const count = this.db.prepare('SELECT COUNT(*) as count FROM Users').get() as { count: number };
        if (count.count === 0) {
            this.registerUser('admin', 'admin123', 'admin');

            // Programs
            const prog1 = 'CS';
            const prog2 = 'Applied CS';

            // Create Students first to link them
            const s1 = this.addStudent('Student CS', prog1);
            this.registerUser('student_cs', 'stu123', 'student', s1);

            const s2 = this.addStudent('Student Applied', prog2);
            this.registerUser('student_applied', 'stu123', 'student', s2);

            const r1 = this.addStudent('Class Rep CS', prog1);
            this.registerUser('rep_cs', 'rep123', 'class_rep', r1);

            const r2 = this.addStudent('Class Rep Applied', prog2);
            this.registerUser('rep_applied', 'rep123', 'class_rep', r2);

            // Legacy/Generic users (optional, keeping for compatibility if needed)
            this.registerUser('lecturer', 'lec123', 'lecturer');
            // this.registerUser('student', 'stu123', 'student'); // Replaced by specific ones

            // Seed Venues
            const venues = [
                { name: 'Lecture Hall A', cap: 100 }, { name: 'Lecture Hall B', cap: 100 },
                { name: 'Lab 1 [CS]', cap: 30 }, { name: 'Lab 2 [Eng]', cap: 30 },
                { name: 'Seminar Room 1', cap: 20 }, { name: 'Seminar Room 2', cap: 20 },
                { name: 'Auditorium', cap: 500 }, { name: 'Exam Hall', cap: 200 },
                { name: 'Studio A', cap: 50 }, { name: 'Studio B', cap: 50 }
            ];
            venues.forEach(v => this.addVenue(v.name, v.cap));

            // Seed Lecturers
            const depts = ['CS', 'Engineering', 'Math', 'Physics', 'Arts'];
            for (let i = 1; i <= 20; i++) {
                const dept = depts[Math.floor(Math.random() * depts.length)];
                this.addLecturer(`Dr. Lecturer ${i}`, dept);
            }

            console.log("Seeded default users, venues, and lecturers.");
        }
    }

    // --- Users ---
    registerUser(username: string, password: string, role: string, relatedId?: number): number {
        const hash = bcrypt.hashSync(password, 10);
        const stmt = this.db.prepare('INSERT INTO Users (username, password_hash, role, related_id) VALUES (?, ?, ?, ?)');
        const info = stmt.run(username, hash, role, relatedId || null);
        return info.lastInsertRowid as number;
    }

    getUser(username: string): User | undefined {
        return this.db.prepare('SELECT * FROM Users WHERE username = ?').get(username) as User | undefined;
    }

    verifyUser(username: string, password: string): User | null {
        const user = this.getUser(username);
        if (user && bcrypt.compareSync(password, user.password_hash)) {
            return user;
        }
        return null;
    }

    // --- Venues ---
    addVenue(name: string, capacity: number): number {
        const stmt = this.db.prepare('INSERT INTO Venues (name, capacity) VALUES (?, ?)');
        const info = stmt.run(name, capacity);
        return info.lastInsertRowid as number;
    }

    getVenues(): Venue[] {
        return this.db.prepare('SELECT * FROM Venues').all() as Venue[];
    }

    // --- Lecturers ---
    addLecturer(name: string, department: string): number {
        const stmt = this.db.prepare('INSERT INTO Lecturers (name, department) VALUES (?, ?)');
        const info = stmt.run(name, department);
        return info.lastInsertRowid as number;
    }

    getLecturers(): Lecturer[] {
        return this.db.prepare('SELECT * FROM Lecturers').all() as Lecturer[];
    }

    // --- Students ---
    addStudent(name: string, course: string): number {
        const stmt = this.db.prepare('INSERT INTO Students (name, course) VALUES (?, ?)');
        const info = stmt.run(name, course);
        return info.lastInsertRowid as number;
    }

    getStudents(): Student[] {
        return this.db.prepare('SELECT * FROM Students').all() as Student[];
    }

    // --- Booking / Classes ---
    checkAvailability(venueId: number, day: string, timeSlot: string): boolean {
        console.log(`Checking availability for Venue: ${venueId}, Day: ${day}, Slot: ${timeSlot}`);
        const stmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM Classes 
      WHERE venue_id = ? AND day = ? AND time_slot = ?
    `);
        const result = stmt.get(venueId, day, timeSlot) as { count: number };
        console.log(`Conflict check result: ${result.count}`);
        return result.count === 0;
    }

    bookClass(courseName: string, lecturerId: number, venueId: number, day: string, timeSlot: string, program: string, status: 'booked' | 'temporary' | 'suspended' = 'booked'): boolean {
        if (!this.checkAvailability(venueId, day, timeSlot)) {
            return false;
        }

        try {
            const stmt = this.db.prepare(`
        INSERT INTO Classes (course_name, lecturer_id, venue_id, day, time_slot, status, program)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(courseName, lecturerId, venueId, day, timeSlot, status, program);
            return true;
        } catch (error) {
            console.error("Booking error:", error);
            return false;
        }
    }

    updateVenueStatus(venueId: number, status: 'available' | 'maintenance'): boolean {
        try {
            const stmt = this.db.prepare('UPDATE Venues SET status = ? WHERE venue_id = ?');
            const info = stmt.run(status, venueId);
            return info.changes > 0;
        } catch (error) {
            console.error("Update venue status error:", error);
            return false;
        }
    }

    // --- Status Updates ---
    updateClassStatus(classId: number, status: string): boolean {
        try {
            const stmt = this.db.prepare('UPDATE Classes SET status = ? WHERE class_id = ?');
            const info = stmt.run(status, classId);
            return info.changes > 0;
        } catch (error) {
            console.error("Update status error:", error);
            return false;
        }
    }

    // --- Alternatives ---
    suggestAlternatives(requiredCapacity: number, day: string, timeSlot: string): Venue[] {
        // Find venues with enough capacity that are NOT booked at the specific time
        const stmt = this.db.prepare(`
      SELECT * FROM Venues 
      WHERE capacity >= ? 
      AND venue_id NOT IN (
        SELECT venue_id FROM Classes WHERE day = ? AND time_slot = ?
      )
    `);
        return stmt.all(requiredCapacity, day, timeSlot) as Venue[];
    }

    // --- Enrollment ---
    enrollStudent(studentId: number, classId: number): void {
        const stmt = this.db.prepare('INSERT INTO Enrollments (student_id, class_id) VALUES (?, ?)');
        stmt.run(studentId, classId);
    }

    getStudentSchedule(studentId: number): any[] {
        // For this phase, we return ALL classes that match the student's course
        // First get student course
        const student = this.db.prepare('SELECT course FROM Students WHERE student_id = ?').get(studentId) as Student;
        if (!student) return [];

        // For demo simplicity, if course is CS, return all CS classes. 
        const stmt = this.db.prepare(`
            SELECT C.*, V.name as venue_name 
            FROM Classes C
            JOIN Venues V ON C.venue_id = V.venue_id
            WHERE C.course_name LIKE ?
        `);
        return stmt.all(`%${student.course}%`);
    }

    getLecturerSchedule(lecturerId: number): any[] {
        const stmt = this.db.prepare(`
            SELECT C.*, V.name as venue_name 
            FROM Classes C
            JOIN Venues V ON C.venue_id = V.venue_id
            WHERE C.lecturer_id = ?
        `);
        return stmt.all(lecturerId);
    }
}
