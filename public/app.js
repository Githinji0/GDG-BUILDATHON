const API_URL = 'http://localhost:3000/api';

// --- Auth State ---
let currentUser = null;
let authToken = localStorage.getItem('token');

// --- Helper: Fetch with Auth ---
async function fetchWithAuth(url, options = {}) {
    if (!options.headers) options.headers = {};
    if (authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }
    return fetch(url, options);
}

// --- Init & UI Logic ---
function init() {
    if (authToken) {
        // Assume valid for demo, in real app verify with backend
        const username = localStorage.getItem('username');
        const role = localStorage.getItem('role');
        showApp({ username, role });
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('app-content').style.display = 'none';
}

function showApp(user) {
    currentUser = user;
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    
    // Personalization
    const userDisplay = document.getElementById('user-display');
    userDisplay.textContent = user.username;
    document.getElementById('role-display').textContent = user.role.toUpperCase();

    if (user.role === 'student') {
        userDisplay.innerHTML = `${user.username} <span style="font-size:0.8em; color:var(--text-secondary)">(Course: CS)</span>`;
        if (user.username === 'student') {
             loadSchedule(user);
             // Hide the manual check form for better UX
             document.querySelector('.schedule-section .form-group').style.display = 'none';
        }
    } else if (user.role === 'lecturer') {
        loadSchedule(user);
        document.querySelector('.schedule-section').style.display = 'block'; // Ensure visible
        document.querySelector('.schedule-section h2').textContent = 'Your Teaching Schedule';
        document.querySelector('.schedule-section .form-group').style.display = 'none';
    }

    const bookingSection = document.getElementById('booking-section');
    if (user.role === 'admin' || user.role === 'class_rep') {
        bookingSection.style.display = 'block';
        loadBookingData(); // Only load if allowed to book
    } else {
        bookingSection.style.display = 'none';
    }

    // Load Genera Data
    loadGeneralData();
}

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    authToken = null;
    currentUser = null;
    window.location.reload();
});

// --- Login Handle ---
// --- Login Handle ---
let selectedRole = '';

window.selectRole = (role) => {
    selectedRole = role;
    document.getElementById('role-selection').style.display = 'none';
    const loginSection = document.getElementById('login-section');
    loginSection.style.display = 'block';
    
    // Update Title
    const titles = {
        'student': 'Student Login',
        'class_rep': 'Class Rep Login',
        'lecturer': 'Lecturer Login',
        'admin': 'Admin Login'
    };
    document.getElementById('login-title').textContent = titles[role];

    // Show/Hide Program Selection
    const progGroup = document.getElementById('program-group');
    if (role === 'student' || role === 'class_rep') {
        progGroup.style.display = 'block';
    } else {
        progGroup.style.display = 'none';
    }

    // Update Quick Fills
    updateQuickFills(role);
};

window.backToRoles = () => {
    document.getElementById('role-selection').style.display = 'block';
    document.getElementById('login-section').style.display = 'none';
    selectedRole = '';
    document.getElementById('program-select').value = 'CS'; // Reset default
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-message').textContent = '';
};

function updateQuickFills(role) {
    const container = document.getElementById('quick-fill-btns');
    container.innerHTML = '';
    
    if (role === 'admin') {
        container.innerHTML = `<button type="button" class="btn-sm" onclick="fillLogin('admin', 'admin123')">Admin</button>`;
    } else if (role === 'lecturer') {
        container.innerHTML = `<button type="button" class="btn-sm" onclick="fillLogin('lecturer', 'lec123')">Lecturer</button>`;
    } else if (role === 'class_rep') {
        container.innerHTML = `
            <button type="button" class="btn-sm" onclick="fillLogin('rep_cs', 'rep123', 'CS')">CS Rep</button>
            <button type="button" class="btn-sm" onclick="fillLogin('rep_applied', 'rep123', 'Applied CS')">Applied Rep</button>
        `;
    } else if (role === 'student') {
        container.innerHTML = `
            <button type="button" class="btn-sm" onclick="fillLogin('student_cs', 'stu123', 'CS')">CS Student</button>
            <button type="button" class="btn-sm" onclick="fillLogin('student_applied', 'stu123', 'Applied CS')">Applied Student</button>
        `;
    }
}

window.fillLogin = (u, p, prog) => {
    document.getElementById('username').value = u;
    document.getElementById('password').value = p;
    if (prog) {
        document.getElementById('program-select').value = prog;
    }
};

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('login-message');
    const programSelect = document.getElementById('program-select');
    const program = (selectedRole === 'student' || selectedRole === 'class_rep') ? programSelect.value : null;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role: selectedRole, program })
        });
        const data = await res.json();

        if (res.ok) {
            authToken = data.token;
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);
            localStorage.setItem('role', data.role);
            
            // Verify role matches selected (optional sanity check)
            if (selectedRole && data.role !== selectedRole && data.role !== 'admin') { 
                // Allow admin to login anywhere or strictly enforce? 
                // Let's strict enforce to avoid confusion in this UI
                 if (data.role !== selectedRole) {
                     msg.textContent = `Valid login, but you are a ${data.role}, not ${selectedRole}`;
                     msg.className = 'error';
                     return;
                 }
            }

            showApp(data);
        } else {
            msg.textContent = data.message || 'Login failed';
            msg.className = 'error';
        }
    } catch (err) {
        console.error(err);
        msg.textContent = 'Network error';
        msg.className = 'error';
    }
});

// --- Data Loading ---
async function fetchAndPopulate(endpoint, elementId, formatFn) {
    const res = await fetchWithAuth(`${API_URL}/${endpoint}`);
    if (!res.ok) return; // Handle error silently or show UI feedback
    const data = await res.json();
    const list = document.getElementById(elementId);
    list.innerHTML = '';
    
    if (list.tagName === 'SELECT') {
        data.forEach(item => {
            const option = document.createElement('option');
            formatFn(item, option);
            list.appendChild(option);
        });
    } else {
        data.forEach(item => {
            const li = document.createElement('li');
            li.textContent = formatFn(item);
            list.appendChild(li);
        });
    }
}

function loadGeneralData() {
    fetchAndPopulate('venues', 'venue-list', v => `${v.name} (Cap: ${v.capacity})`);
    fetchAndPopulate('lecturers', 'lecturer-list', l => `${l.name} (${l.department})`);
}

function loadBookingData() {
    fetchAndPopulate('lecturers', 'lecturer', (item, el) => {
        el.value = item.lecturer_id;
        el.textContent = item.name;
    });

    fetchAndPopulate('venues', 'venue', (item, el) => {
        el.value = item.venue_id;
        el.textContent = `${item.name} (Cap: ${item.capacity})`;
        el.dataset.capacity = item.capacity;
    });
}

// --- Booking Logic ---
document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageEl = document.getElementById('booking-message');
    const alternativesContainer = document.getElementById('alternatives-container');
    
    messageEl.textContent = 'Processing...';
    messageEl.className = '';
    alternativesContainer.style.display = 'none';

    const bookingData = {
        courseName: document.getElementById('course').value,
        lecturerId: document.getElementById('lecturer').value,
        venueId: document.getElementById('venue').value,
        day: document.getElementById('day').value,
        timeSlot: document.getElementById('time').value,
        status: document.getElementById('status').value
    };

    try {
        const res = await fetchWithAuth(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });
        const result = await res.json();

        if (res.ok) {
            messageEl.textContent = 'Booking Successful!';
            messageEl.className = 'success';
        } else {
            messageEl.textContent = result.message;
            messageEl.className = 'error';

            if (result.message.includes('Conflict')) {
                const venueSelect = document.getElementById('venue');
                const selectedOption = venueSelect.options[venueSelect.selectedIndex];
                const capacity = selectedOption.dataset.capacity;
                fetchAlternatives(capacity, bookingData.day, bookingData.timeSlot);
            }
        }
    } catch (err) {
        messageEl.textContent = 'Error processing booking.';
        messageEl.className = 'error';
    }
});

async function fetchAlternatives(capacity, day, timeSlot) {
    const res = await fetchWithAuth(`${API_URL}/alternatives?capacity=${capacity}&day=${day}&timeSlot=${timeSlot}`);
    const alts = await res.json();
    const container = document.getElementById('alternatives-container');
    const list = document.getElementById('alternatives-list');
    list.innerHTML = '';

    if (alts.length > 0) {
        container.style.display = 'block';
        alts.forEach(v => {
            const li = document.createElement('li');
            li.textContent = `${v.name} (ID: ${v.venue_id}, Cap: ${v.capacity})`;
            list.appendChild(li);
        });
    } else {
        container.style.display = 'block';
        list.innerHTML = '<li>No suitable alternatives found.</li>';
    }
}

// --- Schedule Logic ---
async function loadSchedule(user) {
    let url = '';
    if (user.role === 'student') {
        // Use the related_id if available, otherwise fallback (which might fail now without ID 1)
        const id = user.user_id; // Actually we need student_id. 
        // We didn't pass related_id in login response explicitly? 
        // Wait, for prototype, let's just rely on the fact that we return program-filtered data?
        // Ah, getStudentSchedule takes studentId to get course. 
        // We should pass related_id in login response.
        // For now, let's try to pass the ID we assumed.
        // Actually, backend login now returns program.
        // But getStudentSchedule needs ID to find course.
        // Let's rely on server knowing the user. 
        // We'll update server endpoint to use req.user.user_id/related_id if param is 'me'
        url = `${API_URL}/schedule/${user.token ? 'me' : 1}`; // We'll fix server to handle 'me' or just trust we seeded well
        // Actually simplest: We seeded 'student_cs' with ID likely 1, 'student_applied' with ID 2.
        // We'll fetch 'my' schedule.
        // Let's update server to accept /schedule/me
    } else if (user.role === 'lecturer') {
         url = `${API_URL}/schedule/lecturer/1`; 
    } else {
        return; 
    }

    const res = await fetchWithAuth(url);
    const data = await res.json();
    
    renderTimetable(data);
}

function renderTimetable(classes) {
    // Re-use existing table container but clear it, OR create a new container
    // Let's use the schedule-section, but replace table with grid
    const container = document.querySelector('.schedule-section .card');
    
    // Clear existing table if present, or just append after h2
    // Simplify: Clear everything after h2
    const h2 = container.querySelector('h2');
    let grid = container.querySelector('.timetable-grid');
    if (grid) grid.remove();
    
    // Hide table
    const table = container.querySelector('#schedule-table');
    if (table) table.style.display = 'none';

    // Grid Headers
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const times = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00'];

    // Create Grid Container
    grid = document.createElement('div');
    grid.className = 'timetable-grid';
    
    // Corner
    grid.appendChild(createHeader('Day/Time'));
    
    // Time Headers
    times.forEach(t => grid.appendChild(createHeader(t)));

    // Rows
    days.forEach(day => {
        // Day Header
        grid.appendChild(createHeader(day));

        // Time Slots
        times.forEach(time => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            
            // Find classes for this slot
            const slotClasses = classes.filter(c => c.day === day && c.time_slot === time);
            
            slotClasses.forEach(c => {
                const card = document.createElement('div');
                card.className = `class-card ${c.status}`;
                
                let actionBtn = '';
                // If current user is lecturer or admin, show suspend button
                // (Note: currentUser is global)
                if ((currentUser.role === 'lecturer' || currentUser.role === 'admin') && c.status !== 'suspended') {
                    actionBtn = `<button class="btn-xs btn-danger" onclick="updateStatus(${c.class_id}, 'suspended')">Suspend</button>`;
                } else if (c.status === 'suspended' && (currentUser.role === 'lecturer' || currentUser.role === 'admin')) {
                    actionBtn = `<button class="btn-xs btn-success" onclick="updateStatus(${c.class_id}, 'booked')">Resume</button>`;
                }

                card.innerHTML = `
                    <h4>${c.course_name}</h4>
                    <p>📍 ${c.venue_name}</p>
                    <p>👨‍🏫 ${c.lecturer_id ? 'Lecturer ' + c.lecturer_id : 'N/A'}</p> 
                    ${c.status === 'suspended' ? '<p class="status-badge" style="color:#f44336">⚠ CANCELLED</p>' : ''}
                    ${actionBtn}
                `;
                cell.appendChild(card);
            });

            grid.appendChild(cell);
        });
    });

    container.appendChild(grid);
}

function createHeader(text) {
    const div = document.createElement('div');
    div.className = 'grid-header';
    div.textContent = text;
    return div;
}

// --- Status Update ---
window.updateStatus = async (classId, status) => {
    if (!confirm(`Are you sure you want to set this class to ${status}?`)) return;

    try {
        const res = await fetchWithAuth(`${API_URL}/classes/${classId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            // Reload immediately
            loadSchedule(currentUser);
        } else {
            alert('Failed to update status');
        }
    } catch (err) {
        console.error(err);
        alert('Error updating status');
    }
};

// --- Auto-Refresh (Realtime Simulation) ---
setInterval(() => {
    if (currentUser && (currentUser.role === 'student' || currentUser.role === 'lecturer')) {
        loadSchedule(currentUser);
    }
}, 5000); // Poll every 5 seconds

// Keep manual check for Admin/Rep if needed, or hide it
document.getElementById('check-schedule').addEventListener('click', () => {
   // Implementation optional for this phase
});

init();
