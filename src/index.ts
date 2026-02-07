import { UniversitySystem } from './UniversitySystem';

const system = new UniversitySystem();

console.log("--- Initializing System ---");

// 1. Add Venues
const venueA = system.addVenue("Lecture Hall A", 100);
const venueB = system.addVenue("Lab 1", 30);
const venueC = system.addVenue("Lecture Hall C", 60);
console.log(`Added Venues: ID ${venueA} (Cap 100), ID ${venueB} (Cap 30), ID ${venueC} (Cap 60)`);

// 2. Add Lecturers
const lecturer1 = system.addLecturer("Dr. Smith", "Computer Science");
console.log(`Added Lecturer: ID ${lecturer1}`);

// 3. Add Students
const student1 = system.addStudent("Alice", "CS");
console.log(`Added Student: ID ${student1}`);

// 4. Booking Scenarios
console.log("\n--- Booking Scenarios ---");

const day = "Monday";
const time = "10:00-12:00";

// Scenario A: Successful Booking
console.log(`Attempting to book Venue ${venueA} for 'Intro to CS' on ${day} at ${time}...`);
const success1 = system.bookClass("Intro to CS", lecturer1, venueA, day, time);
console.log(`Booking Result: ${success1 ? "SUCCESS" : "FAILED"}`);

// Scenario B: Double Booking (Failure)
console.log(`Attempting to book Venue ${venueA} AGAIN for 'Advanced AI' on ${day} at ${time}...`);
const success2 = system.bookClass("Advanced AI", lecturer1, venueA, day, time);
console.log(`Booking Result: ${success2 ? "SUCCESS" : "FAILED (Expected)"}`);

// Scenario C: Suggest Alternatives
if (!success2) {
    console.log(`\nBooking failed. Suggesting alternatives for capacity 50...`);
    const alternatives = system.suggestAlternatives(50, day, time);
    if (alternatives.length > 0) {
        console.log("Available Venues:");
        alternatives.forEach(v => console.log(`- ${v.name} (ID: ${v.venue_id}, Capacity: ${v.capacity})`));
    } else {
        console.log("No suitable venues found.");
    }
}

// 5. Student Enrollment
console.log("\n--- Student Enrollment ---");
// Assuming the first class booking was successful and has ID 1 (sqlite autoincrement starts at 1)
// In a real app we'd get the class ID from the booking result or a query, but for this demo we assume ID 1.
if (success1) {
    const classId = 1;
    system.enrollStudent(student1, classId);
    console.log(`Enrolled Student ${student1} in Class ${classId}`);

    console.log("\n--- Student Schedule ---");
    const schedule = system.getStudentSchedule(student1);
    console.table(schedule);
}
