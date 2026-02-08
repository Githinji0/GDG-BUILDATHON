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

    if (user.role === 'student' || user.role === 'class_rep') {
        userDisplay.innerHTML = `${user.username} <span style="font-size:0.8em; color:var(--text-secondary)">(Course: CS)</span>`;
        // Load schedule for both Student and Class Rep
        loadSchedule(user);
    } else if (user.role === 'lecturer') {
        loadSchedule(user);
        document.querySelector('.schedule-section').style.display = 'block'; // Ensure visible
        document.querySelector('.schedule-section h2').textContent = 'Your Teaching Schedule';
    } else if (user.role === 'admin') {
        // Option: Admin sees a global schedule? Or nothing for now?
        // Let's leave Admin with just Booking/Venue management for simplicity, 
        // or functionality to "Simulate" a student view.
        // For now, no auto-load schedule for Admin to avoid errors with "me" endpoint.
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
            li.innerHTML = formatFn(item); // Changed from textContent to innerHTML to support buttons
            list.appendChild(li);
        });
    }
}

function loadGeneralData() {
    const venueGrid = document.getElementById('venue-grid');
    if (!venueGrid) return; // Guard clause
    
    venueGrid.innerHTML = '<p>Loading venues...</p>';

    fetchWithAuth(`${API_URL}/venues`)
        .then(res => res.json())
        .then(data => {
            // Smart update to prevent flicker
            // If grid is empty, build from scratch. If not, update classes/status.
            if (venueGrid.children.length === 0 || venueGrid.children.length !== data.length) {
                venueGrid.innerHTML = '';
                data.forEach(v => {
                    const card = createVenueCard(v);
                    venueGrid.appendChild(card);
                });
            } else {
                 // Update existing cards
                 Array.from(venueGrid.children).forEach((card, index) => {
                     const v = data[index];
                     updateVenueCard(card, v);
                 });
            }
        })
        .catch(err => {
            console.error(err);
            // Don't show error on poll failure to avoid annoyance
        });
}

function createVenueCard(v) {
    const card = document.createElement('div');
    updateVenueCard(card, v);
    return card;
}

function updateVenueCard(card, v) {
    const isMaintenance = v.status === 'maintenance';
    card.className = `venue-card ${isMaintenance ? 'maintenance' : ''}`;
    
    let actionBtn = '';
    if (currentUser && currentUser.role === 'admin') {
        const btnClass = isMaintenance ? 'btn-success' : 'btn-danger';
        const btnText = isMaintenance ? 'Set Available' : 'Set Maintenance';
        const nextStatus = isMaintenance ? 'available' : 'maintenance';
        actionBtn = `<div class="actions"><button class="btn-xs ${btnClass}" onclick="toggleVenueStatus(${v.venue_id}, '${nextStatus}')">${btnText}</button></div>`;
    }

    card.innerHTML = `
        <h3>${v.name}</h3>
        <p>Capacity: ${v.capacity}</p>
        <div class="status-badge">${isMaintenance ? '⚠ MAINTENANCE' : '✔ AVAILABLE'}</div>
        ${actionBtn}
    `;
}

window.toggleVenueStatus = async (id, status) => {
    try {
        const res = await fetchWithAuth(`${API_URL}/venues/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            loadGeneralData(); 
            // Also reload booking data if we are in booking view
            if (document.getElementById('booking-section').style.display === 'block') {
                loadBookingData();
            }
        } else {
            alert('Failed to update venue status');
        }
    } catch (e) {
        console.error(e);
    }
};

function loadBookingData() {
    fetchAndPopulate('lecturers', 'lecturer', (item, el) => {
        el.value = item.lecturer_id;
        el.textContent = item.name;
    });

    fetchAndPopulate('venues', 'venue', (item, el) => {
        el.value = item.venue_id;
        let text = `${item.name} (Cap: ${item.capacity})`;
        if (item.status === 'maintenance') {
            text += ' [MAINTENANCE]';
            el.disabled = true;
        }
        el.textContent = text;
        el.dataset.capacity = item.capacity;
    });
}

// --- Booking Logic ---
// --- Booking Logic ---
let currentEditId = null; // Track if we are editing

window.setupBooking = (mode, data) => {
    const section = document.getElementById('booking-section');
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth' });

    const title = section.querySelector('h2');
    const submitBtn = section.querySelector('button[type="submit"]');

    if (mode === 'edit') {
        currentEditId = data.class_id;
        title.textContent = 'Edit Class';
        submitBtn.textContent = 'Update Class';
        
        document.getElementById('course').value = data.course_name;
        document.getElementById('lecturer').value = data.lecturer_id;
        document.getElementById('venue').value = data.venue_id;
        document.getElementById('day').value = data.day;
        document.getElementById('time').value = data.time_slot;
        document.getElementById('status').value = data.status || 'booked';
    } else {
        currentEditId = null;
        title.textContent = 'Book a Class';
        submitBtn.textContent = 'Book Class';
        
        document.getElementById('course').value = '';
        document.getElementById('day').value = data.day || 'Monday';
        document.getElementById('time').value = data.time || '08:00-10:00';
    }
    
    document.getElementById('booking-message').textContent = '';
    document.getElementById('alternatives-container').style.display = 'none';
};

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
        let url = `${API_URL}/bookings`;
        let method = 'POST';

        if (currentEditId) {
            url = `${API_URL}/classes/${currentEditId}`;
            method = 'PUT';
        }

        const res = await fetchWithAuth(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });
        const result = await res.json();

        if (res.ok) {
            messageEl.textContent = currentEditId ? 'Update Successful!' : 'Booking Successful!';
            messageEl.className = 'success';
            // Reload schedule to show changes
            if (currentUser) loadSchedule(currentUser);
            // Reset mode after success
            if (currentEditId) {
                setTimeout(() => {
                    currentEditId = null;
                    document.querySelector('#booking-section h2').textContent = 'Book a Class';
                    document.querySelector('#booking-section button[type="submit"]').textContent = 'Book Class';
                    document.getElementById('booking-form').reset();
                }, 2000);
            }
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
        console.error(err);
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
    if (user.role === 'student' || user.role === 'class_rep') {
        // Use the related_id if available, otherwise fallback (which might fail now without ID 1)
        // Server handles 'me' using the authenticated user's related_id
        url = `${API_URL}/schedule/me`; 
    } else if (user.role === 'lecturer') {
         url = `${API_URL}/schedule/lecturer/1`; 
    } else {
        return; 
    }

    try {
        const res = await fetchWithAuth(url);
        const data = await res.json();
        renderTimetable(data);
    } catch (e) {
        console.error("Load schedule error:", e);
    }
}

function renderTimetable(classes) {
    const container = document.querySelector('.schedule-section .card');
    
    // Check if grid exists
    let grid = container.querySelector('.timetable-grid');
    
    // Compatibility Check: If grid exists but cells don't have data attributes (from old render)
    // or if we just want to be safe, we can rebuild if it's invalid.
    if (grid && !grid.querySelector('.grid-cell[data-day]')) {
        grid.remove();
        grid = null;
    }

    if (!grid) {
        // Clear existing table/h2 if needed (initial load)
        const table = container.querySelector('#schedule-table');
        if (table) table.style.display = 'none';

        grid = document.createElement('div');
        grid.className = 'timetable-grid';
        
        // Headers
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const times = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00'];
        
        grid.appendChild(createHeader('Day/Time'));
        times.forEach(t => grid.appendChild(createHeader(t)));
        
        days.forEach(day => {
            grid.appendChild(createHeader(day));
            times.forEach(time => {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.day = day;
                cell.dataset.time = time;
                grid.appendChild(cell);
            });
        });
        container.appendChild(grid);
    }

    // Update cells content
    const cells = grid.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
        const day = cell.dataset.day;
        const time = cell.dataset.time;
        
        const slotClasses = classes.filter(c => c.day === day && c.time_slot === time);
        
        // Generate HTML for this cell
        let newHtml = '';
        if (slotClasses.length > 0) {
            slotClasses.forEach(c => {
                 let actionBtn = '';
                 const isRep = currentUser.role === 'class_rep' || currentUser.role === 'admin';

                 if ((currentUser.role === 'lecturer' || currentUser.role === 'admin') && c.status !== 'suspended') {
                      actionBtn += `<div style="margin-top:5px;"><button class="btn-xs btn-danger" onclick="updateStatus(${c.class_id}, 'suspended')">Suspend</button></div>`;
                 } else if (c.status === 'suspended' && (currentUser.role === 'lecturer' || currentUser.role === 'admin')) {
                      actionBtn += `<div style="margin-top:5px;"><button class="btn-xs btn-success" onclick="updateStatus(${c.class_id}, 'booked')">Resume</button></div>`;
                 }
                 
                 if (isRep) {
                     const safeData = JSON.stringify(c).replace(/"/g, '&quot;');
                     actionBtn += `<div style="margin-top:5px;"><button class="btn-xs btn-secondary" onclick="setupBooking('edit', ${safeData})">Edit</button></div>`;
                 }

                 newHtml += `
                    <div class="class-card ${c.status}">
                        <h4>${c.course_name}</h4>
                        <p>📍 ${c.venue_name}</p>
                        <p>👨‍🏫 ${c.lecturer_id ? 'Lecturers' : 'N/A'}</p> 
                        ${c.status === 'suspended' ? '<p class="status-badge" style="color:#f44336">⚠ CANCELLED</p>' : ''}
                        ${actionBtn}
                    </div>
                 `;
            });
        } else {
             if (currentUser.role === 'class_rep' || currentUser.role === 'admin') {
                 newHtml = `<button class="btn-xs btn-success" style="width:100%" onclick="setupBooking('add', {day:'${day}', time:'${time}'})">+ Add Class</button>`;
                 cell.classList.add('empty-slot-interactive');
             } else {
                 cell.classList.remove('empty-slot-interactive');
             }
        }
        
        // Only update DOM if changed
        if (cell.innerHTML !== newHtml) {
            cell.innerHTML = newHtml;
        }
    });
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
// --- Auto-Refresh (Realtime Simulation) ---
setInterval(() => {
    // Poll for everyone to ensure real-time updates
    if (currentUser) {
        // Only reload if we are on the schedule view
        const scheduleSection = document.querySelector('.schedule-section');
        if (scheduleSection && scheduleSection.style.display !== 'none') {
             loadSchedule(currentUser);
        }
        
        // Also reload venue status if on dashboard
        if (document.getElementById('venue-grid')) {
             loadGeneralData();
        }
    }
}, 3000); // Poll every 3 seconds



init();
