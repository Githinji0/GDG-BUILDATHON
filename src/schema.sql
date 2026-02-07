CREATE TABLE IF NOT EXISTS Users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (
    role IN ('admin', 'lecturer', 'student', 'class_rep')
  ),
  related_id INTEGER -- Optional FK to Lecturers or Students
);

CREATE TABLE IF NOT EXISTS Venues (
  venue_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'maintenance'))
);

CREATE TABLE IF NOT EXISTS Lecturers (
  lecturer_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  department TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Students (
  student_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  course TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Classes (
  class_id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_name TEXT NOT NULL,
  lecturer_id INTEGER NOT NULL,
  venue_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'temporary', 'suspended')),
  program TEXT,
  FOREIGN KEY (lecturer_id) REFERENCES Lecturers (lecturer_id),
  FOREIGN KEY (venue_id) REFERENCES Venues (venue_id),
  UNIQUE (venue_id, day, time_slot)
);

CREATE TABLE IF NOT EXISTS Enrollments (
  enrollment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  class_id INTEGER NOT NULL,
  FOREIGN KEY (student_id) REFERENCES Students (student_id),
  FOREIGN KEY (class_id) REFERENCES Classes (class_id)
);