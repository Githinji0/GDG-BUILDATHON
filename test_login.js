const http = require('http');

function post(url, body) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, body: data });
            });
        });

        req.on('error', (e) => reject(e));
        req.write(body);
        req.end();
    });
}

async function testLogin(username, password, role, program) {
    console.log(`\nTesting: ${username} as ${role} (${program || 'None'})`);
    try {
        const result = await post('http://localhost:3000/api/login', JSON.stringify({ username, password, role, program }));
        console.log(`Status: ${result.status}`);
        console.log('Response:', result.body);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function run() {
    // Wait a bit to ensure server is ready (it should be running already)
    await testLogin('student_cs', 'stu123', 'student', 'CS');
    await testLogin('student_cs', 'stu123', 'student', 'Applied CS'); // Should fail
    await testLogin('admin', 'admin123', 'admin', null);
    await testLogin('rep_cs', 'rep123', 'class_rep', 'CS');
}

run();
