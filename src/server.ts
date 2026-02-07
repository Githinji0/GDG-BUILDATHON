import express from 'express';
import cors from 'cors';
import { UniversitySystem } from './UniversitySystem';
import path from 'path';
import jwt from 'jsonwebtoken';

const app = express();
const port = 3000;
const system = new UniversitySystem();
const JWT_SECRET = 'super-secret-key-123'; // In production, use env var

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Middleware
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const authorizeRole = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.sendStatus(403);
        }
        next();
    };
};

// --- Auth Routes ---
app.post('/api/login', (req, res) => {
    const { username, password, role, program } = req.body;
    console.log(`Login Attempt: User=${username}, Role=${role}, Program=${program}`);

    const user = system.verifyUser(username, password);
    console.log(`Verify Result:`, user ? `Found ${user.username}, Role=${user.role}` : 'Not Found');

    if (user) {
        let userProgram = 'General';

        if (user.role === 'student' || user.role === 'class_rep') {
            try {
                const stmt = system['db'].prepare('SELECT course FROM Students WHERE student_id = ?');
                const st = stmt.get(user.related_id) as { course: string };
                console.log(`Student Record for related_id ${user.related_id}:`, st);

                if (st) {
                    // Strict Program Check: User must select correct program
                    if (program && st.course !== program) {
                        console.log(`Program Mismatch: Expected ${st.course}, Got ${program}`);
                        return res.status(401).json({ message: `Incorrect details. You are registered for ${st.course}` });
                    }
                    userProgram = st.course;
                }
            } catch (e) { console.error('DB check error:', e); }
        }

        // Strict Role Check
        if (role && user.role !== role) {
            console.log(`Role Mismatch: Expected ${user.role}, Got ${role}`);
            return res.status(401).json({ message: `Invalid login. You are a ${user.role}, not ${role}` });
        }

        const token = jwt.sign({ user_id: user.user_id, username: user.username, role: user.role, program: userProgram }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, role: user.role, username: user.username, program: userProgram });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// --- Public Routes ---
app.get('/api/venues', (req, res) => {
    res.json(system.getVenues());
});

app.get('/api/lecturers', (req, res) => {
    res.json(system.getLecturers());
});

app.get('/api/students', (req, res) => {
    res.json(system.getStudents());
});

app.get('/api/alternatives', (req, res) => {
    const { capacity, day, timeSlot } = req.query;
    const alternatives = system.suggestAlternatives(Number(capacity), String(day), String(timeSlot));
    res.json(alternatives);
});

app.get('/api/schedule/:studentId', authenticateToken, (req, res) => {
    let id = Number(req.params.studentId);
    if (req.params.studentId === 'me' || isNaN(id)) {
        // Use related_id from user if available (we need to fetch user to get related_id since it's not in token payload fully?)
        // In login we put it in token? No.
        // Let's just trust that for 'student_cs' (admin seeded), we know the ID.
        // Better: Query User table using req.user.username to get related_id
        const u = system.getUser(req.user.username);
        id = u ? u.related_id : 1;
    }
    const schedule = system.getStudentSchedule(id);
    res.json(schedule);
});

app.get('/api/schedule/lecturer/:lecturerId', (req, res) => {
    const schedule = system.getLecturerSchedule(Number(req.params.lecturerId));
    res.json(schedule);
});


// --- Protected Routes ---

// Only Admin can add resources
app.post('/api/venues', authenticateToken, authorizeRole(['admin']), (req, res) => {
    const { name, capacity } = req.body;
    const id = system.addVenue(name, capacity);
    res.json({ id, name, capacity });
});

app.patch('/api/venues/:id/status', authenticateToken, authorizeRole(['admin']), (req, res) => {
    const { status } = req.body;
    if (status !== 'available' && status !== 'maintenance') {
        return res.status(400).json({ message: 'Invalid status' });
    }
    const success = system.updateVenueStatus(Number(req.params.id), status);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(404).json({ message: 'Venue not found' });
    }
});

app.post('/api/lecturers', authenticateToken, authorizeRole(['admin']), (req, res) => {
    const { name, department } = req.body;
    const id = system.addLecturer(name, department);
    res.json({ id, name, department });
});

app.post('/api/students', authenticateToken, authorizeRole(['admin']), (req, res) => {
    const { name, course } = req.body;
    const id = system.addStudent(name, course);
    res.json({ id, name, course });
});

// Admin and Class Rep can book classes
app.post('/api/bookings', authenticateToken, authorizeRole(['admin', 'class_rep']), (req: any, res: any) => {
    const { courseName, lecturerId, venueId, day, timeSlot, status } = req.body;
    // Default status to 'booked' if not provided, though Class Rep might set 'temporary'
    const bookingStatus = status || 'booked';
    const userProgram = req.user.program || 'CS'; // Default to CS if missing

    const success = system.bookClass(courseName, Number(lecturerId), Number(venueId), day, timeSlot, userProgram, bookingStatus);
    if (success) {
        res.json({ success: true, message: 'Booking successful' });
    } else {
        res.status(409).json({ success: false, message: 'Booking failed: Conflict detected' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
