export interface Venue {
    venue_id: number;
    name: string;
    capacity: number;
}

export interface Lecturer {
    lecturer_id: number;
    name: string;
    department: string;
}

export interface Student {
    student_id: number;
    name: string;
    course: string;
}

export interface User {
    user_id: number;
    username: string;
    password_hash: string;
    role: 'admin' | 'lecturer' | 'student' | 'class_rep';
    related_id?: number;
}

export interface Class {
    class_id: number;
    course_name: string;
    lecturer_id: number;
    venue_id: number;
    day: string;
    time_slot: string;
    status: 'booked' | 'temporary';
}

export interface Enrollment {
    enrollment_id: number;
    student_id: number;
    class_id: number;
}
